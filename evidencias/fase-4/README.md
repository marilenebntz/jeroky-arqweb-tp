# Evidencias - Fase 4 (Hito 4: seguridad, resiliencia y defensa)

Estado: **completo** .

| Evidencia | Descripción | Archivo(s) | Estado |
|---|---|---|---|
| F4-E00 | Acceso funcional a Jeroky Soft mediante HTTPS y nombre local | `F4-E00-acceso-https.png` | Listo |
| F4-E01 | Red compartida, UFW y reducción de puertos expuestos | `F4-E01-firewall-y-puertos.txt`, `F4-E01-ufw-docker.png` | Listo |
| F4-E02 | Endurecimiento de Nginx y cabeceras de seguridad | `F4-E02-cabeceras-seguridad.txt`, `F4-E02-nginx-hardening.png` | Listo |
| F4-E03 | Revisión del almacenamiento de sesión y secretos ignorados por Git | `F4-E03-sesion-y-secretos.txt` | Listo |
| F4-E04 | Respuestas 404, 405 y disponibilidad de la API | `F4-E04-pruebas-error.txt`, `F4-E04-pruebas-http.png` | Listo |
| F4-E05 | Caída controlada del backend, HTTP 502, log y recuperación | `F4-E05-resiliencia-backend.txt` | Listo |
| F4-E06 | ApacheBench, recursos antes/después y comprobación final | `F4-E06-carga-y-recursos.txt`, `F4-E06-apachebench.png`, `F4-E06-recursos.png` | Listo |

## Resultado

El sistema quedó accesible únicamente por SSH y Nginx desde la red del
anfitrión. Las rutas internas no se exponen, las cabeceras reducen divulgación de
información y riesgos comunes, y la API se recuperó aproximadamente siete
segundos después de reiniciar el backend. La carga controlada terminó sin
solicitudes fallidas y con frontend y backend en HTTP 200.

## Reproducción

Los comandos repetibles están disponibles en `scripts/`. La prueba de
resiliencia es intencionalmente disruptiva durante unos segundos y requiere la
variable `CONFIRM_OUTAGE=yes`.
