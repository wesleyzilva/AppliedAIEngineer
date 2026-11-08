#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON="$ROOT/portable/runtime/linux/bin/python3"
OLLAMA="$ROOT/portable/runtime/linux/ollama/ollama"
MODEL_ROOT="$ROOT/portable/models/linux/ollama"
LOG_ROOT="$ROOT/portable/logs"
SERVER_PID=""

if [[ ! -x "$PYTHON" ]]; then
    echo "Python portátil não encontrado ou sem permissão de execução: $PYTHON" >&2
    exit 1
fi
if [[ ! -x "$OLLAMA" ]]; then
    echo "Ollama portátil não encontrado ou sem permissão de execução: $OLLAMA" >&2
    exit 1
fi
if [[ "$#" -eq 0 ]]; then
    echo 'Uso: ./run-local-ai.sh agent "Sua pergunta" [opções da CLI]' >&2
    exit 2
fi

if "$PYTHON" -c 'import socket; s=socket.socket(); s.settimeout(1); result=s.connect_ex(("127.0.0.1",11434)); s.close(); raise SystemExit(0 if result == 0 else 1)'; then
    echo "A porta 11434 já está ocupada. Feche o outro servidor Ollama antes de iniciar a versão do pendrive." >&2
    exit 1
fi

mkdir -p "$MODEL_ROOT" "$LOG_ROOT"
export TPM_WORKSPACE="$ROOT"
export TPM_OLLAMA_URL="http://127.0.0.1:11434"
export OLLAMA_HOST="127.0.0.1:11434"
export OLLAMA_MODELS="$MODEL_ROOT"
export PYTHONPATH="$ROOT/src"

cleanup() {
    if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID"
        wait "$SERVER_PID" || true
    fi
}
trap cleanup EXIT

"$OLLAMA" serve >"$LOG_ROOT/ollama-linux.log" 2>"$LOG_ROOT/ollama-linux-error.log" &
SERVER_PID=$!

ready=0
for _ in $(seq 1 30); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Ollama encerrou durante a inicialização. Consulte portable/logs/ollama-linux-error.log." >&2
        exit 1
    fi
    if "$PYTHON" -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=1).read()' >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 1
done
if [[ "$ready" -ne 1 ]]; then
    echo "Ollama não ficou disponível. Consulte portable/logs/ollama-linux-error.log." >&2
    exit 1
fi

cd "$ROOT"
"$PYTHON" -c 'import os,runpy,sys; sys.path.insert(0, os.path.join(os.environ["TPM_WORKSPACE"], "src")); runpy.run_module("tpm_ai.cli", run_name="__main__")' "$@"
