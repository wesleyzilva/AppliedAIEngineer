from __future__ import annotations

import os
from pathlib import Path
from typing import Any

MODULE_ROOT = Path(
    os.getenv("TPM_WORKSPACE", str(Path(__file__).resolve().parents[2]))
).resolve()
WORKSPACE = MODULE_ROOT
DOCS_DIR = MODULE_ROOT / "data" / "docs"
DB_PATH = MODULE_ROOT / "data" / "local_ai_index.sqlite3"
OUTPUT_DIR = MODULE_ROOT / "outputs"
LOG_PATH = Path(os.getenv("TPM_LOG_PATH", str(MODULE_ROOT / "data" / "logs" / "ollama-calls.jsonl")))

DEFAULT_MODEL = os.getenv("TPM_CHAT_MODEL", "qwen3.5:4b")
DEFAULT_EMBED_MODEL = os.getenv("TPM_EMBED_MODEL", "nomic-embed-text")
OLLAMA_BASE_URL = os.getenv("TPM_OLLAMA_URL", "http://localhost:11434")
MAX_CONTEXT_CHARS = 2500
DEFAULT_GENERATION_OPTIONS: dict[str, Any] = {
    "num_predict": 128,
    "temperature": 0.2,
}
MANUAL_HTML_PATH = MODULE_ROOT / "manual-ia-local.html"
