from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from statistics import median

from .agent import LocalAssistant
from .config import DB_PATH, DEFAULT_MODEL, DOCS_DIR, LOG_PATH
from .llm import OllamaClient
from .rag import RAGIndex


def _json_object(value: str) -> dict:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as error:
        raise argparse.ArgumentTypeError(f"JSON inválido: {error.msg}") from error
    if not isinstance(parsed, dict):
        raise argparse.ArgumentTypeError("As opções devem ser um objeto JSON, por exemplo {\"temperature\": 0.2}.")
    return parsed


def _think_value(value: str) -> bool | str:
    if value == "true":
        return True
    if value == "false":
        return False
    return value


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Assistente local pessoal")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest = subparsers.add_parser("ingest", help="Indexa documentos em data/docs")
    ingest.add_argument("--path", default=str(DOCS_DIR), help="Diretório com os documentos de origem")
    ingest.add_argument("--db", default=str(DB_PATH), help="Arquivo SQLite para o índice")

    ask = subparsers.add_parser("ask", help="Busca por resposta em documentos locais")
    ask.add_argument("question", help="Pergunta em linguagem natural")
    ask.add_argument("--top-k", type=int, default=3, help="Número de trechos relevantes")
    ask.add_argument(
        "--source",
        action="append",
        default=[],
        help="Limita a busca a um documento indexado; pode ser repetido",
    )
    ask.add_argument("--path", default=str(DOCS_DIR), help="Diretório com os documentos de origem")
    ask.add_argument("--db", default=str(DB_PATH), help="Arquivo SQLite para o índice")

    agent = subparsers.add_parser("agent", help="Responde usando o modelo local e seus documentos")
    agent.add_argument("question", help="Pergunta em linguagem natural")
    agent.add_argument("--top-k", type=int, default=3, help="Número de trechos relevantes")
    agent.add_argument(
        "--source",
        action="append",
        default=[],
        help="Limita o contexto a um documento indexado; pode ser repetido",
    )
    agent.add_argument("--path", default=str(DOCS_DIR), help="Diretório com os documentos de origem")
    agent.add_argument("--db", default=str(DB_PATH), help="Arquivo SQLite para o índice")
    agent.add_argument("--model", default=DEFAULT_MODEL, help="Modelo local para geração de respostas")
    agent.add_argument(
        "--options-json",
        type=_json_object,
        default=None,
        metavar="JSON",
        help="Opções de geração em JSON (use TPM_GENERATION_OPTIONS no PowerShell)",
    )
    agent.add_argument(
        "--think",
        type=_think_value,
        choices=(False, True, "low", "medium", "high", "max"),
        default=False,
        metavar="LEVEL",
        help="Controle de raciocínio Ollama: false, true, low, medium, high ou max",
    )

    logs = subparsers.add_parser("logs", help="Analisa métricas locais de chamadas Ollama")
    logs.add_argument("--path", default=str(LOG_PATH), help="Arquivo JSONL de métricas")
    logs.add_argument("--tail", type=int, default=20, help="Quantidade máxima de chamadas recentes")
    logs.add_argument(
        "--operation",
        choices=("all", "generate", "embed"),
        default="all",
        help="Filtra o tipo de operação exibida",
    )

    web = subparsers.add_parser("web", help="Abre o manual e chat local no navegador")
    web.add_argument("--port", type=int, default=8766, help="Porta local do servidor (loopback only)")

    return parser


def _format_duration(duration_ms: float | None) -> str:
    if duration_ms is None:
        return "n/a"
    return f"{duration_ms:.2f} ms | {duration_ms / 1000:.3f} s | {duration_ms / 60_000:.4f} min"


def _show_logs(path: Path, tail: int, operation: str) -> None:
    if tail < 1:
        raise SystemExit("--tail deve ser maior que zero.")
    if not path.exists():
        raise SystemExit(f"Arquivo de log ainda não existe: {path}")

    events = []
    with path.open(encoding="utf-8") as log_file:
        for line_number, line in enumerate(log_file, start=1):
            try:
                event = json.loads(line)
            except json.JSONDecodeError as error:
                print(f"Aviso: linha {line_number} inválida: {error.msg}", file=sys.stderr)
                continue
            if operation == "all" or event.get("operation") == operation:
                events.append(event)

    recent = events[-tail:]
    if not recent:
        print(f"Nenhuma chamada encontrada para operation={operation}.")
        return

    print(f"Log: {path}")
    print(f"Exibindo {len(recent)} de {len(events)} eventos (filtro: {operation})")
    for event in recent:
        stats = event.get("ollama_stats", {})
        print(
            f"\n{event.get('timestamp', 'timestamp?')} | "
            f"{event.get('operation', '?')} | {event.get('model', '?')} | "
            f"status={event.get('status', '?')}"
        )
        print(f"  wall:       {_format_duration(event.get('wall_duration_ms'))}")
        timings = event.get("timings", {})
        for field, label in (
            ("load_duration", "model load"),
            ("prompt_eval_duration", "prompt eval"),
            ("eval_duration", "generation"),
            ("total_duration", "Ollama total"),
        ):
            if field in stats:
                duration_key = {
                    "load_duration": "model_load",
                    "prompt_eval_duration": "prompt_eval",
                    "eval_duration": "generation",
                    "total_duration": "ollama_total",
                }[field]
                duration_ms = timings.get(duration_key, {}).get("milliseconds", stats[field] / 1e6)
                print(f"  {label:<12} {_format_duration(duration_ms)}")
        if "eval_count" in stats:
            eval_duration = stats.get("eval_duration", 0)
            tokens_per_second = (
                stats["eval_count"] / (eval_duration / 1e9) if eval_duration else 0
            )
            print(
                f"  output:     {stats['eval_count']} tokens | "
                f"{tokens_per_second:.2f} tokens/s"
            )
        if event.get("options"):
            print(f"  options:    {json.dumps(event['options'], ensure_ascii=False)}")

    generations = [event for event in events if event.get("operation") == "generate"]
    wall_times = [
        float(event["wall_duration_ms"])
        for event in generations
        if isinstance(event.get("wall_duration_ms"), (int, float))
    ]
    if wall_times:
        print(
            "\nGeneration wall time "
            f"(n={len(wall_times)}): average {_format_duration(sum(wall_times) / len(wall_times))}; "
            f"median {_format_duration(median(wall_times))}"
        )


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="backslashreplace")

    parser = _build_parser()
    args = parser.parse_args()
    generation_options = getattr(args, "options_json", None)
    if args.command == "agent" and generation_options is None:
        try:
            generation_options = _json_object(os.getenv("TPM_GENERATION_OPTIONS", "{}"))
        except argparse.ArgumentTypeError as error:
            parser.error(f"TPM_GENERATION_OPTIONS: {error}")

    if args.command == "ingest":
        index = RAGIndex(docs_root=Path(args.path), db_path=Path(args.db))
        count = index.ingest(Path(args.path))
        print(json.dumps({"status": "ok", "ingested_chunks": count}, ensure_ascii=False))
        return

    if args.command == "ask":
        index = RAGIndex(docs_root=Path(args.path), db_path=Path(args.db))
        if index.is_empty():
            index.ingest(Path(args.path))
        try:
            source_paths = index.resolve_source_paths(args.source) if args.source else None
        except ValueError as error:
            parser.error(str(error))
        matches = index.search(args.question, top_k=args.top_k, source_paths=source_paths)
        print(json.dumps({"question": args.question, "results": matches}, ensure_ascii=False, indent=2))
        return

    if args.command == "agent":
        agent = LocalAssistant(
            docs_root=args.path,
            db_path=args.db,
            llm=OllamaClient(model=args.model),
        )
        try:
            if args.source:
                agent.index.resolve_source_paths(args.source)
        except ValueError as error:
            parser.error(str(error))
        try:
            answer = agent.run(
                args.question,
                top_k=args.top_k,
                generation_options=generation_options,
                think=args.think,
                source_paths=args.source or None,
            )
        except TimeoutError as error:
            print(
                "O Ollama excedeu o tempo limite ao gerar a resposta. "
                "Tente novamente com --top-k 1 para enviar menos contexto. "
                "Se continuar, valide primeiro com: "
                "ollama run qwen3.5:4b \"Responda apenas: ok\"",
                file=sys.stderr,
            )
            raise SystemExit(1) from error
        print(json.dumps(answer, ensure_ascii=False, indent=2))
        return

    if args.command == "logs":
        _show_logs(Path(args.path), args.tail, args.operation)
        return

    if args.command == "web":
        from .web import serve

        serve(args.port)
        return

    raise ValueError(f"Comando desconhecido: {args.command}")


if __name__ == "__main__":
    main()
