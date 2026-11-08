from __future__ import annotations

import hashlib
import json
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import request

from .config import (
    DEFAULT_EMBED_MODEL,
    DEFAULT_GENERATION_OPTIONS,
    DEFAULT_MODEL,
    LOG_PATH,
    OLLAMA_BASE_URL,
)


class OllamaClient:
    """Cliente leve para Ollama com fallback offline."""

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        embed_model: str = DEFAULT_EMBED_MODEL,
        base_url: str = OLLAMA_BASE_URL,
        log_path: str | Path = LOG_PATH,
    ) -> None:
        self.model = model
        self.embed_model = embed_model
        self.base_url = base_url.rstrip("/")
        self.log_path = Path(log_path)

    def is_available(self) -> bool:
        try:
            req = request.Request(f"{self.base_url}/api/tags", method="GET")
            with request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        options: dict[str, Any] | None = None,
        think: bool | str = False,
    ) -> str:
        started = time.perf_counter()
        call = {
            "operation": "generate",
            "model": self.model,
            "endpoint": "/api/generate",
            "input_characters": len(prompt),
            "system_characters": len(system_prompt or ""),
            "think": think,
            "stream": False,
            "options": {**DEFAULT_GENERATION_OPTIONS, **(options or {})},
        }
        if not self.is_available():
            self._log_call(call, started, status="unavailable_fallback")
            return self._fallback_response(prompt)

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "think": think,
            "options": call["options"],
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            data = self._post_json("/api/generate", payload)
        except Exception as error:
            self._log_call(
                call,
                started,
                status="error",
                error_type=type(error).__name__,
            )
            raise

        answer = str(data.get("response", "")).strip()
        status = "success" if answer else "empty_response_fallback"
        self._log_call(
            call,
            started,
            status=status,
            response_characters=len(answer),
            ollama_stats=self._response_stats(data),
            done_reason=data.get("done_reason"),
        )
        return answer or self._fallback_response(prompt)

    def embed(self, text: str) -> list[float]:
        started = time.perf_counter()
        call = {
            "operation": "embed",
            "model": self.embed_model,
            "endpoint": "/api/embed",
            "input_characters": len(text),
        }
        if not self.is_available():
            self._log_call(call, started, status="unavailable_fallback")
            return self._deterministic_embedding(text)

        payload = {
            "model": self.embed_model,
            "input": text,
        }
        try:
            data = self._post_json("/api/embed", payload)
            embeddings = data.get("embeddings")
            if isinstance(embeddings, list) and embeddings and isinstance(embeddings[0], list):
                vector = [float(value) for value in embeddings[0]]
                self._log_call(
                    call,
                    started,
                    status="success",
                    vector_dimensions=len(vector),
                    ollama_stats=self._response_stats(data),
                )
                return vector
            self._log_call(call, started, status="invalid_response_fallback")
        except Exception as error:
            self._log_call(
                call,
                started,
                status="error_fallback",
                error_type=type(error).__name__,
            )

        return self._deterministic_embedding(text)

    def _response_stats(self, data: dict[str, Any]) -> dict[str, Any]:
        fields = (
            "total_duration",
            "load_duration",
            "prompt_eval_count",
            "prompt_eval_duration",
            "eval_count",
            "eval_duration",
        )
        return {key: data[key] for key in fields if key in data}

    def _log_call(
        self,
        call: dict[str, Any],
        started: float,
        *,
        status: str,
        **details: Any,
    ) -> None:
        wall_duration_ms = round((time.perf_counter() - started) * 1000, 2)
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **call,
            "status": status,
            "wall_duration_ms": wall_duration_ms,
            "timings": {
                "wall": self._duration_units(wall_duration_ms),
                **{
                    name: self._duration_units(value / 1e6)
                    for field, name in (
                        ("total_duration", "ollama_total"),
                        ("load_duration", "model_load"),
                        ("prompt_eval_duration", "prompt_eval"),
                        ("eval_duration", "generation"),
                    )
                    if (value := details.get("ollama_stats", {}).get(field)) is not None
                },
            },
            **details,
        }
        try:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            with self.log_path.open("a", encoding="utf-8") as log_file:
                log_file.write(json.dumps(event, ensure_ascii=False) + "\n")
        except OSError as error:
            warnings.warn(
                f"Não foi possível gravar o log do Ollama em {self.log_path}: {error}",
                RuntimeWarning,
                stacklevel=2,
            )

    def _duration_units(self, duration_ms: float) -> dict[str, float]:
        return {
            "milliseconds": round(duration_ms, 2),
            "seconds": round(duration_ms / 1000, 3),
            "minutes": round(duration_ms / 60_000, 4),
        }

    def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        req = request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body or "{}")

    def _deterministic_embedding(self, text: str, size: int = 8) -> list[float]:
        tokens = [token for token in text.lower().replace("\n", " ").split() if token]
        if not tokens:
            return [0.0 for _ in range(size)]

        vector: list[float] = []
        for index in range(size):
            seed = f"{tokens[index % len(tokens)]}:{index}:{text[:32]}"
            digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
            scalar = int(digest[:8], 16) / 0xFFFFFFFF
            vector.append(round(scalar, 6))
        return vector

    def _fallback_response(self, prompt: str) -> str:
        del prompt
        return (
            "O Ollama não está disponível. Inicie o serviço local e tente novamente; "
            "nenhuma resposta foi gerada pelo modelo."
        )
