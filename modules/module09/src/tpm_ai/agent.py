from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import DOCS_DIR, MAX_CONTEXT_CHARS
from .llm import OllamaClient
from .rag import RAGIndex


class LocalAssistant:
    def __init__(
        self,
        docs_root: str | Path = DOCS_DIR,
        db_path: str | Path | None = None,
        llm: OllamaClient | None = None,
    ) -> None:
        self.llm = llm or OllamaClient()
        self.index = RAGIndex(docs_root=docs_root, db_path=db_path, llm=self.llm)
        if self.index.docs_root.exists() and self.index.is_empty():
            self.index.ingest(self.index.docs_root)

    def ask(
        self,
        question: str,
        top_k: int = 3,
        generation_options: dict[str, Any] | None = None,
        think: bool | str = False,
        conversation_history: list[dict[str, str]] | None = None,
        source_paths: list[str] | None = None,
    ) -> dict:
        resolved_sources = (
            self.index.resolve_source_paths(source_paths)
            if source_paths
            else None
        )
        matches = self.index.search(question, top_k=top_k, source_paths=resolved_sources)
        if not matches and self.index.is_empty() and self.index.docs_root.exists():
            self.index.ingest(self.index.docs_root)
            if source_paths:
                resolved_sources = self.index.resolve_source_paths(source_paths)
            matches = self.index.search(
                question,
                top_k=top_k,
                source_paths=resolved_sources,
            )
        if not matches:
            return {
                "answer": "Não encontrei conteúdo relevante no diretório local de documentação.",
                "sources": [],
            }

        context_chunks = []
        for match in matches:
            snippet = match["content"]
            if len(snippet) > 500:
                snippet = snippet[:500] + "..."
            context_chunks.append(f"[{match['title']}] {snippet}")

        context = "\n\n".join(context_chunks)
        if len(context) > MAX_CONTEXT_CHARS:
            context = context[:MAX_CONTEXT_CHARS] + "..."

        system_prompt = (
            "Você é um assistente pessoal de aprendizagem e trabalho, executado localmente. "
            "O usuário estuda e trabalha com gestão de projetos/TPM, desenvolvimento fullstack "
            "e inteligência artificial. Use o contexto recuperado como evidência sobre os arquivos "
            "do usuário; diferencie-o do conhecimento geral e cite os arquivos usados. "
            "Não invente fatos, métricas ou experiências. Se faltar evidência, diga isso claramente."
        )
        prompt = (
            f"Pergunta do usuário: {question}\n\n"
            f"Contexto relevante:\n{context}\n\n"
            "Responda em português de forma objetiva, didática e útil."
        )
        if conversation_history:
            history = "\n".join(
                f"{'Usuário' if message['role'] == 'user' else 'Assistente'}: {message['content']}"
                for message in conversation_history
            )
            prompt = (
                f"Histórico recente da conversa (contexto, não evidência documental):\n{history}\n\n"
                f"{prompt}"
            )

        answer = self.llm.generate(
            prompt,
            system_prompt=system_prompt,
            options=generation_options,
            think=think,
        )
        return {
            "answer": answer,
            "sources": [{"title": match["title"], "path": match["path"], "score": match["score"]} for match in matches],
        }

    def run(
        self,
        question: str,
        top_k: int = 3,
        generation_options: dict[str, Any] | None = None,
        think: bool | str = False,
        conversation_history: list[dict[str, str]] | None = None,
        source_paths: list[str] | None = None,
    ) -> dict:
        return self.ask(
            question,
            top_k=top_k,
            generation_options=generation_options,
            think=think,
            conversation_history=conversation_history,
            source_paths=source_paths,
        )
