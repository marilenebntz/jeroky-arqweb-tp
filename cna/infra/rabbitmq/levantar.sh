#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

docker compose --env-file .env.local up -d --wait
docker compose --env-file .env.local exec -T rabbitmq \
  rabbitmqctl import_definitions /etc/rabbitmq/definitions.json

docker compose --env-file .env.local exec -T rabbitmq \
  rabbitmqctl list_queues name durable messages consumers
