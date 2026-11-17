#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 preparar_fuentes.py
python3 preparar_certificado.py
python3 ../../observability/preparar.py
compose=(docker compose -p "${CNA_PROJECT_NAME:-cna-arqui}" --env-file .env.local -f compose.yml)
if [[ -n "${CNA_COMPOSE_OVERRIDE:-}" ]]; then compose+=(-f "$CNA_COMPOSE_OVERRIDE"); fi
"${compose[@]}" up -d --build --wait db backend frontend rabbitmq
"${compose[@]}" exec -T backend node /app/cna-seed.cjs
"${compose[@]}" exec -T rabbitmq rabbitmqctl import_definitions /etc/rabbitmq/definitions.json
ready=false
for attempt in {1..30}; do
  count=$("${compose[@]}" exec -T rabbitmq rabbitmqctl -q list_queues name | awk '/^jeroky\./ {n++} END {print n+0}')
  if [[ "$count" == 6 ]]; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo 'Falta completar la importacion de las seis colas'
  exit 1
fi
"${compose[@]}" up -d --build --wait --wait-timeout 180 audit search export worker bridge
"${compose[@]}" run --rm --no-deps gateway nginx -t
"${compose[@]}" up -d --wait gateway prometheus grafana
"${compose[@]}" ps
echo 'Jeroky de Arquitectura disponible en http://localhost:3100'
echo 'Panel RED disponible en http://localhost:3150/d/cna-red'
