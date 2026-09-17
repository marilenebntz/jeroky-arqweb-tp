#!/usr/bin/env bash
set -euo pipefail

echo "Monitoreo continuo. Finalizá con Ctrl+C al terminar la prueba de carga."
docker stats jeroky-frontend jeroky-backend jeroky-db
