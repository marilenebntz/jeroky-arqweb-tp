#!/usr/bin/env bash
set -euo pipefail
if [[ "${EUID}" != 0 ]]; then echo 'Ejecutar con sudo en la VM Ubuntu.'; exit 1; fi
cd "$(dirname "$0")"
site=/etc/nginx/sites-available/arqui
link=/etc/nginx/sites-enabled/arqui
certs=/etc/nginx/certs/arqui
if [[ -e "$site" ]] && ! cmp -s arqui.nginx.conf "$site"; then
  echo 'Ya existe otro sitio arqui; no se reemplazó.'; exit 1
fi
if [[ -e "$link" || -L "$link" ]] && [[ "$(readlink "$link" || true)" != "$site" ]]; then
  echo 'Ya existe una entrada arqui diferente; no se reemplazó.'; exit 1
fi
install -d -m 755 "$certs"
if [[ -e "$certs/arqui.key" && -e "$certs/arqui.crt" ]]; then
  openssl x509 -noout -checkend 0 -checkhost arqui.local -in "$certs/arqui.crt"
elif [[ -e "$certs/arqui.key" || -e "$certs/arqui.crt" ]]; then
  echo 'Par de certificado incompleto; revisar sin sobrescribir.'; exit 1
else
  (umask 077; openssl req -x509 -newkey rsa:2048 -nodes -days 90 -config arqui.cnf -keyout "$certs/arqui.key" -out "$certs/arqui.crt")
  chmod 600 "$certs/arqui.key"
  chmod 644 "$certs/arqui.crt"
fi
created_site=0; created_link=0
if [[ ! -e "$site" ]]; then install -m 644 arqui.nginx.conf "$site"; created_site=1; fi
if [[ ! -L "$link" ]]; then ln -s "$site" "$link"; created_link=1; fi
if ! nginx -t; then
  if [[ "$created_link" == 1 ]]; then rm "$link"; fi
  if [[ "$created_site" == 1 ]]; then rm "$site"; fi
  echo 'Configuración rechazada; se retiraron solo las entradas recién creadas. No se recargó Nginx.'
  exit 1
fi
systemctl reload nginx
printf '%s\n' 'Sitio arqui.local instalado; jeroky.local conservado. Falta verificar desde la Mac y guardar evidencia.'
