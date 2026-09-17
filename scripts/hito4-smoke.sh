#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://jeroky.local}"
CURL_OPTS=(--insecure --silent --output /dev/null)

check_status() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local actual

  actual="$(curl "${CURL_OPTS[@]}" --request "$method" --write-out '%{http_code}' "${BASE_URL}${path}")"
  printf '%-6s %-24s HTTP %s (esperado %s)\n' "$method" "$path" "$actual" "$expected"

  if [[ "$actual" != "$expected" ]]; then
    return 1
  fi
}

check_status GET /alumnos 200
check_status GET /api/ 200
check_status GET /ruta-inexistente 404
check_status TRACE / 405

printf '\nCabeceras de seguridad:\n'
curl --insecure --silent --head "$BASE_URL/alumnos" |
  grep -Ei '^(server|strict-transport-security|x-content-type-options|x-frame-options|referrer-policy):'
