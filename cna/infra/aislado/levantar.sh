#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 ../../observability/preparar.py
compose=(docker compose --env-file .env.local -f compose.yml)
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
"${compose[@]}" up -d --build audit search export worker bridge
"${compose[@]}" up -d --wait prometheus grafana
"${compose[@]}" ps
echo 'Jeroky de Arquitectura disponible en http://localhost:3100'
echo 'Panel RED disponible en http://localhost:3150/d/cna-red'
