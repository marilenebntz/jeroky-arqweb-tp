#!/usr/bin/env bash
set -euo pipefail

URL="${URL:-https://jeroky.local/alumnos}"
DURATION="${DURATION:-30}"
CONCURRENCY="${CONCURRENCY:-10}"

if ! command -v ab >/dev/null 2>&1; then
  echo "ApacheBench (ab) no está instalado." >&2
  echo "macOS: viene con Apache; Ubuntu: sudo apt install apache2-utils" >&2
  exit 1
fi

echo "Carga: $URL durante ${DURATION}s con concurrencia $CONCURRENCY"
ab -t "$DURATION" -c "$CONCURRENCY" -k "$URL"
