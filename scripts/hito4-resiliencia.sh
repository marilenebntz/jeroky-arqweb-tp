#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONFIRM_OUTAGE:-no}" != "yes" ]]; then
  echo "Esta prueba detiene temporalmente el backend."
  echo "Ejecutá: CONFIRM_OUTAGE=yes bash scripts/hito4-resiliencia.sh"
  exit 2
fi

BASE_URL="${BASE_URL:-https://jeroky.local}"
MAX_WAIT="${MAX_WAIT:-30}"
backend_started=no

restore_backend() {
  if [[ "$backend_started" != "yes" ]]; then
    docker compose start backend >/dev/null
  fi
}
trap restore_backend EXIT INT TERM

docker compose stop backend

down_code="$(curl --insecure --silent --output /dev/null +  --write-out '%{http_code}' "$BASE_URL/api/")"
echo "Backend detenido -> HTTP $down_code"
[[ "$down_code" == "502" ]]

start_epoch="$(date +%s)"
docker compose start backend >/dev/null
backend_started=yes

for ((second = 1; second <= MAX_WAIT; second++)); do
  code="$(curl --insecure --silent --output /dev/null +    --write-out '%{http_code}' "$BASE_URL/api/")"
  elapsed="$(( $(date +%s) - start_epoch ))"
  echo "Segundo $elapsed -> HTTP $code"
  if [[ "$code" == "200" ]]; then
    echo "Recuperación confirmada en $elapsed segundos."
    exit 0
  fi
  sleep 1
done

echo "La API no se recuperó dentro de $MAX_WAIT segundos." >&2
exit 1
