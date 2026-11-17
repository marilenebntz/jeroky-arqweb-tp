#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../infra/aislado"
python3 preparar_fuentes.py
python3 ../../observability/preparar.py
compose=(docker compose -p cna-arqui --env-file .env.local -f compose.yml -f ../../deploy/vm/compose.vm.yml)
"${compose[@]}" config --quiet
# Construcción secuencial para reducir consumo simultáneo; no garantiza recursos suficientes.
for service in backend frontend audit search export worker bridge; do
  "${compose[@]}" build "$service"
done
"${compose[@]}" up -d --wait --wait-timeout 240 db backend rabbitmq
"${compose[@]}" exec -T backend node /app/cna-seed.cjs
"${compose[@]}" exec -T rabbitmq rabbitmqctl import_definitions /etc/rabbitmq/definitions.json
"${compose[@]}" up -d --wait --wait-timeout 240 frontend audit search export worker bridge
# Observabilidad es opcional en esta VM de 4 GB; ya existe en el laboratorio de la Mac.
if [[ "${CNA_VM_OBSERVABILITY:-0}" == 1 ]]; then
  "${compose[@]}" up -d --wait prometheus grafana
fi
"${compose[@]}" ps
printf '%s\n' 'Servicios preparados en localhost. Falta instalar y validar el sitio arqui.local en el Nginx del host.'
