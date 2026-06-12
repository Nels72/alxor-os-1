#!/bin/bash
# Démarrer l'API Presidio localement (dev/test)
# Usage: cd ops/presidio && ./start_local.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
  echo "ERROR: venv missing. Run: python3 -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

if fuser -s 5080/tcp 2>/dev/null; then
  echo "Port 5080 already in use. API may already be running."
  echo "  curl http://localhost:5080/health to verify."
  exit 0
fi

echo "Starting Presidio Alxor API on port 5080..."
PRESIDIO_PORT=5080 PRESIDIO_LOG_LEVEL=INFO venv/bin/python presidio_api.py
