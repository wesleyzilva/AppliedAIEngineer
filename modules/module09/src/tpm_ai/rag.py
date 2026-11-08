from __future__ import annotations

import json
import math
import re
import sqlite3
from pathlib import Path
from typing import Iterable

from .config import DB_PATH, DOCS_DIR
from .llm import OllamaClient


class RAGIndex:
    def __init__(self, docs_root: str | Path | None = None, db_path: str | Path | None = None, llm: OllamaClient | None = None) -> None:
        self.docs_root = Path(docs_root) if docs_root is not None else DOCS_DIR
        self.db_path = Path(db_path) if db_path is not None else DB_PATH
        self.llm = llm or OllamaClient()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_db()

    def _initialize_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chunks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    embedding TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path)")
            conn.commit()

    def ingest(self, directory: str | Path | None = None) -> int:
        root = Path(directory) if directory is not None else self.docs_root
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM chunks")
            conn.commit()

        inserted = 0
        for file_path in self._iter_files(root):
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            chunks = self._chunk_text(content)
            for index, chunk in enumerate(chunks):
                embedding = self.llm.embed(chunk)
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(
                        "INSERT INTO chunks(path, title, content, chunk_index, embedding) VALUES(?, ?, ?, ?, ?)",
                        (str(file_path.relative_to(root.parent)), file_path.stem, chunk, index, json.dumps(embedding)),
                    )
                    conn.commit()
                inserted += 1
        return inserted

    def is_empty(self) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT 1 FROM chunks LIMIT 1").fetchone()
        return row is None

    def list_documents(self) -> list[dict[str, str]]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT path, title FROM chunks GROUP BY path, title ORDER BY path"
            ).fetchall()
        return [{"path": row[0], "title": row[1]} for row in rows]

    def resolve_source_paths(self, source_paths: list[str]) -> list[str]:
        available = {
            self._normalize_source_path(document["path"]): document["path"]
            for document in self.list_documents()
        }
        resolved = []
        unknown = []
        for source_path in source_paths:
            canonical_path = available.get(self._normalize_source_path(source_path))
            if canonical_path is None:
                unknown.append(source_path)
            elif canonical_path not in resolved:
                resolved.append(canonical_path)
        if unknown:
            paths = ", ".join(unknown)
            raise ValueError(
                f"Fonte(s) não encontrada(s) no índice: {paths}. "
                "Adicione os arquivos em data/docs e execute `python -m tpm_ai.cli ingest`."
            )
        return resolved

    def search(
        self,
        query: str,
        top_k: int = 3,
        source_paths: list[str] | None = None,
    ) -> list[dict]:
        query_terms = self._tokenize(query)
        if not query_terms:
            query_terms = ["documento", "status"]

        selected_paths = (
            {self._normalize_source_path(path) for path in source_paths}
            if source_paths is not None
            else None
        )
        query_embedding = self.llm.embed(query)
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT id, path, title, content, embedding FROM chunks ORDER BY id"
            ).fetchall()

        scored = []
        for row in rows:
            _, path, title, content, embedding_json = row
            if selected_paths is not None and self._normalize_source_path(path) not in selected_paths:
                continue
            content_lower = content.lower()
            content_score = sum(content_lower.count(term) for term in query_terms)
            title_score = sum(title.lower().count(term) for term in query_terms)
            embedding_score = self._cosine_similarity(query_embedding, json.loads(embedding_json))
            score = content_score * 2 + title_score * 4 + embedding_score
            scored.append({
                "id": row[0],
                "path": path,
                "title": title,
                "content": content,
                "score": score,
            })

        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:top_k]

    def _normalize_source_path(self, path: str) -> str:
        return path.replace("\\", "/").casefold()

    def _iter_files(self, root: Path) -> Iterable[Path]:
        if not root.exists():
            return []
        return sorted(
            [path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in {".md", ".txt", ".csv"}],
            key=lambda item: str(item),
        )

    def _chunk_text(self, text: str, chunk_size: int = 600) -> list[str]:
        normalized = text.replace("\r\n", "\n").strip()
        if not normalized:
            return []

        paragraphs = [part.strip() for part in re.split(r"\n\s*\n+", normalized) if part.strip()]
        chunks: list[str] = []
        current = ""
        for paragraph in paragraphs:
            if len(current) + len(paragraph) < chunk_size:
                current = (current + "\n\n" + paragraph).strip()
            else:
                if current:
                    chunks.append(current)
                current = paragraph
        if current:
            chunks.append(current)
        return chunks or [normalized[:chunk_size]]

    def _tokenize(self, text: str) -> list[str]:
        return [token.lower() for token in re.findall(r"[\wÀ-ÿ]+", text) if token]

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0

        dot = sum(a * b for a, b in zip(left, right))
        left_norm = math.sqrt(sum(value * value for value in left))
        right_norm = math.sqrt(sum(value * value for value in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return dot / (left_norm * right_norm)
