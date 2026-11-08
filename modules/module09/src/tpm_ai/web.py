from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import perf_counter
from typing import Any
from urllib.parse import urlparse

from .agent import LocalAssistant
from .config import DEFAULT_MODEL, LOG_PATH, MANUAL_HTML_PATH
from .llm import OllamaClient
from .rag import RAGIndex

MAX_REQUEST_BYTES = 16_384
MAX_QUESTION_CHARACTERS = 8_000
MAX_HISTORY_MESSAGES = 8
MAX_HISTORY_MESSAGE_CHARACTERS = 4_000
MAX_SELECTED_SOURCES = 50
MAX_SOURCE_PATH_CHARACTERS = 500
MAX_LOG_EVENTS = 500
ALLOWED_THINK_VALUES = (False, True, "low", "medium", "high", "max")


def _response_body(
    *,
    question: str,
    result: dict[str, Any],
    duration_ms: float,
) -> dict[str, Any]:
    return {
        "question": question,
        **result,
        "wall_duration_ms": round(duration_ms, 2),
        "wall_duration_seconds": round(duration_ms / 1000, 3),
        "wall_duration_minutes": round(duration_ms / 60_000, 4),
    }


class LocalAIRequestHandler(BaseHTTPRequestHandler):
    server_version = "Module09LocalAI/1.0"
    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:
        route = urlparse(self.path).path
        if route == "/":
            self._send_file(MANUAL_HTML_PATH, "text/html; charset=utf-8")
            return
        if route == "/api/logs":
            self._send_logs()
            return
        if route == "/api/health":
            self._send_json({"status": "ok", "model": DEFAULT_MODEL})
            return
        if route == "/api/documents":
            self._send_json({"documents": RAGIndex().list_documents()})
            return
        self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/chat":
            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return
        if not self._is_local_origin():
            self._send_json({"error": "Requests must come from this local interface."}, HTTPStatus.FORBIDDEN)
            return

        content_length = self.headers.get("Content-Length")
        if content_length is None:
            self._send_json({"error": "Content-Length is required."}, HTTPStatus.LENGTH_REQUIRED)
            return
        try:
            body_size = int(content_length)
        except ValueError:
            self._send_json({"error": "Invalid Content-Length."}, HTTPStatus.BAD_REQUEST)
            return
        if body_size < 1 or body_size > MAX_REQUEST_BYTES:
            self._send_json({"error": f"Request must be between 1 and {MAX_REQUEST_BYTES} bytes."}, HTTPStatus.BAD_REQUEST)
            return
        if "application/json" not in self.headers.get("Content-Type", ""):
            self._send_json({"error": "Content-Type must be application/json."}, HTTPStatus.UNSUPPORTED_MEDIA_TYPE)
            return

        try:
            payload = json.loads(self.rfile.read(body_size))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json({"error": "Request body must be valid UTF-8 JSON."}, HTTPStatus.BAD_REQUEST)
            return
        if not isinstance(payload, dict):
            self._send_json({"error": "Request body must be a JSON object."}, HTTPStatus.BAD_REQUEST)
            return

        sources = payload.get("sources", [])
        if (
            not isinstance(sources, list)
            or len(sources) > MAX_SELECTED_SOURCES
            or any(
                not isinstance(source, str)
                or not source.strip()
                or len(source) > MAX_SOURCE_PATH_CHARACTERS
                for source in sources
            )
        ):
            self._send_json(
                {"error": f"sources must contain no more than {MAX_SELECTED_SOURCES} document paths."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        question = payload.get("question")
        if not isinstance(question, str) or not question.strip() or len(question) > MAX_QUESTION_CHARACTERS:
            self._send_json(
                {"error": f"Question must contain 1 to {MAX_QUESTION_CHARACTERS} characters."},
                HTTPStatus.BAD_REQUEST,
            )
            return

        model = payload.get("model", DEFAULT_MODEL)
        if not isinstance(model, str) or not model.strip() or len(model) > 200:
            self._send_json({"error": "Model must be a non-empty model tag."}, HTTPStatus.BAD_REQUEST)
            return

        top_k = payload.get("top_k", 3)
        if not isinstance(top_k, int) or isinstance(top_k, bool) or not 1 <= top_k <= 10:
            self._send_json({"error": "top_k must be an integer from 1 to 10."}, HTTPStatus.BAD_REQUEST)
            return

        options = payload.get("options", {})
        if not isinstance(options, dict) or any(not isinstance(key, str) for key in options):
            self._send_json({"error": "options must be a JSON object."}, HTTPStatus.BAD_REQUEST)
            return
        think = payload.get("think", False)
        if not (
            isinstance(think, bool)
            or isinstance(think, str) and think in ALLOWED_THINK_VALUES
        ):
            self._send_json(
                {"error": "think must be false, true, low, medium, high, or max."},
                HTTPStatus.BAD_REQUEST,
            )
            return
        history = payload.get("history", [])
        if not isinstance(history, list) or len(history) > MAX_HISTORY_MESSAGES:
            self._send_json(
                {"error": f"history must contain no more than {MAX_HISTORY_MESSAGES} messages."},
                HTTPStatus.BAD_REQUEST,
            )
            return
        if any(
            not isinstance(message, dict)
            or message.get("role") not in {"user", "assistant"}
            or not isinstance(message.get("content"), str)
            or len(message["content"]) > MAX_HISTORY_MESSAGE_CHARACTERS
            for message in history
        ):
            self._send_json({"error": "history messages require a user/assistant role and bounded text content."}, HTTPStatus.BAD_REQUEST)
            return

        started = perf_counter()
        try:
            assistant = LocalAssistant(llm=OllamaClient(model=model))
            result = assistant.run(
                question.strip(),
                top_k=top_k,
                generation_options=options,
                think=think,
                conversation_history=history,
                source_paths=sources or None,
            )
        except ValueError as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
            return
        except (TimeoutError, OSError) as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_GATEWAY)
            return
        duration_ms = (perf_counter() - started) * 1000
        self._send_json(
            _response_body(question=question.strip(), result=result, duration_ms=duration_ms)
        )

    def log_message(self, format: str, *args: Any) -> None:
        super().log_message(format, *args)

    def _is_local_origin(self) -> bool:
        origin = self.headers.get("Origin")
        return origin is None or origin == f"http://127.0.0.1:{self.server.server_port}"

    def _send_logs(self) -> None:
        events: list[dict[str, Any]] = []
        if LOG_PATH.exists():
            with LOG_PATH.open(encoding="utf-8") as log_file:
                lines = log_file.readlines()[-MAX_LOG_EVENTS:]
            for line in lines:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(event, dict):
                    events.append(event)
        self._send_json({"events": events, "path": str(LOG_PATH)})

    def _send_file(self, path: Path, content_type: str) -> None:
        try:
            body = path.read_bytes()
        except OSError as error:
            self._send_json({"error": f"Unable to read manual: {error}"}, HTTPStatus.INTERNAL_SERVER_ERROR)
            return
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def serve(port: int = 8766) -> None:
    if not 1 <= port <= 65535:
        raise ValueError("Port must be between 1 and 65535.")

    server = ThreadingHTTPServer(("127.0.0.1", port), LocalAIRequestHandler)
    print(f"Local AI manual and chat: http://127.0.0.1:{port}/")
    print("Server is bound to this computer only. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local AI web server.")
    finally:
        server.server_close()
