#!/usr/bin/env bash
# Generate ConvoInsight FYP PowerPoint (macOS often has python3, not python)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/venv/bin/python3" ]]; then
  PYTHON="$ROOT/venv/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON="python3"
else
  echo "Error: python3 not found. Install Python 3 or create venv: python3 -m venv venv" >&2
  exit 1
fi

"$PYTHON" -m pip install -q python-pptx 2>/dev/null || "$PYTHON" -m pip install python-pptx
exec "$PYTHON" "$ROOT/scripts/generate_presentation.py"
