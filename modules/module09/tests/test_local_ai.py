from __future__ import annotations

import json
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import request as urllib_request

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from tpm_ai.agent import LocalAssistant
from tpm_ai import cli
from tpm_ai.llm import OllamaClient
from tpm_ai.rag import RAGIndex
from tpm_ai import web


def test_missing_ollama_does_not_return_a_fabricated_answer(monkeypatch, tmp_path):
    client = OllamaClient(log_path=tmp_path / "missing-ollama.jsonl")
    monkeypatch.setattr(client, "is_available", lambda: False)

    answer = client.generate("Qual é a informação?")

    assert "Ollama não está disponível" in answer


def test_embedding_uses_current_ollama_api_response(monkeypatch, tmp_path):
    client = OllamaClient(log_path=tmp_path / "embedding.jsonl")
    requests = []

    def fake_post_json(path, payload):
        requests.append((path, payload))
        return {"embeddings": [[0.1, 0.2, 0.3]]}

    monkeypatch.setattr(client, "is_available", lambda: True)
    monkeypatch.setattr(client, "_post_json", fake_post_json)

    vector = client.embed("Local embedding smoke test")

    assert vector == [0.1, 0.2, 0.3]
    assert requests == [
        (
            "/api/embed",
            {"model": "nomic-embed-text", "input": "Local embedding smoke test"},
        )
    ]


def test_generation_disables_thinking_and_limits_output(monkeypatch, tmp_path):
    client = OllamaClient(log_path=tmp_path / "generation.jsonl")
    requests = []

    def fake_post_json(path, payload):
        requests.append((path, payload))
        return {"response": "A concise local answer."}

    monkeypatch.setattr(client, "is_available", lambda: True)
    monkeypatch.setattr(client, "_post_json", fake_post_json)

    answer = client.generate("Answer briefly.", system_prompt="Be concise.")

    assert answer == "A concise local answer."
    assert requests == [
        (
            "/api/generate",
            {
                "model": "qwen3.5:4b",
                "prompt": "Answer briefly.",
                "stream": False,
                "think": False,
                "options": {"num_predict": 128, "temperature": 0.2},
                "system": "Be concise.",
            },
        )
    ]


def test_rag_index_ingests_and_searches_user_learning_material(tmp_path):
    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    (docs_root / "fullstack.md").write_text(
        "# Desenvolvimento fullstack\n\nO projeto usa Python no backend e React no frontend.",
        encoding="utf-8",
    )
    db_path = tmp_path / "index.sqlite3"

    llm = OllamaClient(log_path=tmp_path / "calls.jsonl")
    llm.is_available = lambda: False
    index = RAGIndex(docs_root=docs_root, db_path=db_path, llm=llm)
    count = index.ingest(docs_root)

    assert count >= 1
    assert not index.is_empty()
    results = index.search("quais tecnologias são usadas no desenvolvimento fullstack", top_k=3)
    assert results
    assert any("fullstack" in result["title"].lower() or "fullstack" in result["content"].lower() for result in results)


def test_rag_search_can_be_limited_to_selected_documents(tmp_path):
    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    (docs_root / "portfolio.md").write_text(
        "Experiência profissional comprovada em gestão de projetos.",
        encoding="utf-8",
    )
    (docs_root / "studies.md").write_text(
        "Plano de estudos acadêmicos em inteligência artificial.",
        encoding="utf-8",
    )
    index = RAGIndex(
        docs_root=docs_root,
        db_path=tmp_path / "index.sqlite3",
        llm=OllamaClient(log_path=tmp_path / "calls.jsonl"),
    )
    index.ingest()

    documents = index.list_documents()
    selected_path = "docs/portfolio.md"
    matches = index.search("qual é minha experiência?", source_paths=[selected_path])

    assert len(documents) == 2
    assert index.resolve_source_paths([selected_path]) == [documents[0]["path"]]
    assert matches
    assert {match["path"] for match in matches} == {documents[0]["path"]}


def test_rag_rejects_source_not_in_index(tmp_path):
    index = RAGIndex(docs_root=tmp_path / "docs", db_path=tmp_path / "index.sqlite3")

    with pytest.raises(ValueError, match="execute `python -m tpm_ai.cli ingest`"):
        index.resolve_source_paths(["docs/not-indexed.md"])


def test_empty_rag_index_reports_empty(tmp_path):
    index = RAGIndex(docs_root=tmp_path / "docs", db_path=tmp_path / "index.sqlite3")

    assert index.is_empty()


def test_agent_parser_accepts_model_and_generation_options():
    args = cli._build_parser().parse_args(
        [
            "agent",
            "test question",
            "--model",
            "qwen3.5:4b",
            "--top-k",
            "2",
            "--source",
            "docs/perfil-profissional.md",
            "--source",
            "docs/perfil-e-objetivos.md",
            "--options-json",
            '{"temperature": 0.6, "num_ctx": 4096}',
            "--think",
            "low",
        ]
    )

    assert args.model == "qwen3.5:4b"
    assert args.top_k == 2
    assert args.source == ["docs/perfil-profissional.md", "docs/perfil-e-objetivos.md"]
    assert args.options_json == {"temperature": 0.6, "num_ctx": 4096}
    assert args.think == "low"


def test_agent_reads_generation_options_from_environment(monkeypatch, tmp_path):
    class CapturingAssistant:
        def __init__(self, **kwargs):
            pass

        def run(self, question, top_k, generation_options=None, think=False, source_paths=None):
            assert generation_options == {"temperature": 0.7, "seed": 12}
            assert source_paths is None
            return {"answer": "ok", "sources": []}

    monkeypatch.setattr(cli, "LocalAssistant", CapturingAssistant)
    monkeypatch.setattr(sys, "argv", ["tpm_ai.cli", "agent", "test question"])
    monkeypatch.setenv("TPM_GENERATION_OPTIONS", '{"temperature": 0.7, "seed": 12}')

    cli.main()


def test_agent_timeout_prints_guidance_without_traceback(monkeypatch, capsys):
    class TimeoutAssistant:
        def __init__(self, **kwargs):
            pass

        def run(self, question, top_k, generation_options=None, think=False, source_paths=None):
            raise TimeoutError("request timed out")

    monkeypatch.setattr(cli, "LocalAssistant", TimeoutAssistant)
    monkeypatch.setattr(sys, "argv", ["tpm_ai.cli", "agent", "teste"])

    with pytest.raises(SystemExit) as error:
        cli.main()

    captured = capsys.readouterr()
    assert error.value.code == 1
    assert "excedeu o tempo limite" in captured.err
    assert "Traceback" not in captured.err


def test_generation_logs_metrics_and_options_without_prompt_content(tmp_path, monkeypatch):
    log_path = tmp_path / "logs" / "ollama.jsonl"
    client = OllamaClient(log_path=log_path)
    captured_payloads = []

    def fake_post_json(path, payload):
        captured_payloads.append((path, payload))
        return {
            "response": "A measured answer.",
            "done_reason": "stop",
            "total_duration": 2_000_000_000,
            "load_duration": 100_000_000,
            "prompt_eval_count": 40,
            "prompt_eval_duration": 300_000_000,
            "eval_count": 12,
            "eval_duration": 1_200_000_000,
        }

    monkeypatch.setattr(client, "is_available", lambda: True)
    monkeypatch.setattr(client, "_post_json", fake_post_json)

    answer = client.generate(
        "private prompt content",
        system_prompt="private system prompt",
        options={"temperature": 0.7, "top_p": 0.85},
        think="low",
    )

    assert answer == "A measured answer."
    assert captured_payloads[0][1]["options"] == {
        "num_predict": 128,
        "temperature": 0.7,
        "top_p": 0.85,
    }
    event = json.loads(log_path.read_text(encoding="utf-8"))
    assert event["operation"] == "generate"
    assert event["status"] == "success"
    assert event["think"] == "low"
    assert event["ollama_stats"]["eval_count"] == 12
    assert event["timings"]["wall"]["seconds"] >= 0
    assert event["timings"]["generation"]["milliseconds"] == 1200
    assert event["response_characters"] == len(answer)
    assert "private prompt content" not in log_path.read_text(encoding="utf-8")
    assert "private system prompt" not in log_path.read_text(encoding="utf-8")


def test_log_command_formats_wall_and_model_durations(tmp_path, capsys):
    log_path = tmp_path / "calls.jsonl"
    log_path.write_text(
        json.dumps(
            {
                "timestamp": "2026-11-08T12:00:00Z",
                "operation": "generate",
                "model": "qwen3.5:4b",
                "status": "success",
                "wall_duration_ms": 90_000,
                "options": {"temperature": 0.2},
                "ollama_stats": {
                    "load_duration": 2_000_000_000,
                    "prompt_eval_duration": 3_000_000_000,
                    "eval_duration": 4_000_000_000,
                    "eval_count": 20,
                },
            }
        )
        + "\n",
        encoding="utf-8",
    )

    cli._show_logs(log_path, tail=10, operation="generate")

    output = capsys.readouterr().out
    assert "90000.00 ms | 90.000 s | 1.5000 min" in output
    assert "2000.00 ms | 2.000 s | 0.0333 min" in output
    assert "5.00 tokens/s" in output


def test_local_web_chat_routes_to_assistant_and_returns_timing(monkeypatch):
    class CapturingAssistant:
        def __init__(self, **kwargs):
            pass

        def run(self, question, top_k, generation_options, think, conversation_history, source_paths):
            assert question == "How do I build a portfolio?"
            assert top_k == 2
            assert generation_options == {"temperature": 0.5}
            assert think == "low"
            assert conversation_history == [{"role": "user", "content": "Help me plan."}]
            assert source_paths == ["docs/perfil-profissional.md"]
            return {"answer": "Start with evidence-backed projects.", "sources": []}

    monkeypatch.setattr(web, "LocalAssistant", CapturingAssistant)
    server = ThreadingHTTPServer(("127.0.0.1", 0), web.LocalAIRequestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        body = json.dumps(
            {
                "question": "How do I build a portfolio?",
                "history": [{"role": "user", "content": "Help me plan."}],
                "model": "qwen3.5:4b",
                "top_k": 2,
                "sources": ["docs/perfil-profissional.md"],
                "options": {"temperature": 0.5},
                "think": "low",
            }
        ).encode("utf-8")
        req = urllib_request.Request(
            f"http://127.0.0.1:{server.server_port}/api/chat",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Origin": f"http://127.0.0.1:{server.server_port}",
            },
            method="POST",
        )
        with urllib_request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert result["answer"] == "Start with evidence-backed projects."
    assert result["wall_duration_ms"] >= 0
    assert result["wall_duration_seconds"] == round(result["wall_duration_ms"] / 1000, 3)
    assert result["wall_duration_minutes"] == round(result["wall_duration_ms"] / 60_000, 4)


def test_local_web_chat_rejects_non_local_origin():
    server = ThreadingHTTPServer(("127.0.0.1", 0), web.LocalAIRequestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        body = json.dumps({"question": "test"}).encode("utf-8")
        req = urllib_request.Request(
            f"http://127.0.0.1:{server.server_port}/api/chat",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Origin": "https://example.invalid",
            },
            method="POST",
        )
        with pytest.raises(urllib_request.HTTPError) as error:
            urllib_request.urlopen(req, timeout=5)
        assert error.value.code == 403
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_assistant_returns_answer_and_sources(tmp_path):
    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    (docs_root / "ai-study.md").write_text(
        "# Estudos de IA\n\nO material atual cobre RAG e avaliação de modelos.",
        encoding="utf-8",
    )
    (docs_root / "portfolio.md").write_text(
        "# Portfólio\n\nO projeto documenta experiências profissionais verificadas.",
        encoding="utf-8",
    )

    llm = OllamaClient(log_path=tmp_path / "calls.jsonl")
    llm.is_available = lambda: False
    assistant = LocalAssistant(docs_root=docs_root, db_path=tmp_path / "assistant.sqlite3", llm=llm)
    response = assistant.ask(
        "quais assuntos aparecem nos documentos?",
        top_k=2,
        source_paths=["docs/ai-study.md"],
    )

    assert "answer" in response
    assert response["answer"]
    assert {source["path"] for source in response["sources"]} == {"docs\\ai-study.md"}
