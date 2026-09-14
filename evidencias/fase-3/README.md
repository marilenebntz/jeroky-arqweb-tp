# Evidencias - Fase 3 (Hito 3: DNS local, TLS y mediciones)

Estado: **completo** (2026-09-14); pendiente redactar el procedimiento
reproducible en el informe final (LaTeX).

| Evidencia | Descripción | Archivo(s) | Estado |
|---|---|---|---|
| F3-E01 | Generación y verificación del certificado TLS autofirmado (sujeto, emisor, vigencia, SAN, huella SHA-256) | `F3-E01-certificado-tls.txt` | Listo |
| F3-E02 | Configuración de Nginx para HTTPS (443) con redirección 301 desde HTTP (80); verificación de handshake TLS 1.3 y carga por navegador | `F3-E02-nginx-https-config.txt` | Listo |
| F3-E03 | 10 mediciones de tiempos (DNS/conexión TCP/TLS/TTFB/total) sobre HTTPS y HTTP, con mín/prom/máx | `F3-E03-mediciones-rendimiento.txt` | Listo |
| F3-E04 | Inspección de caché (Cache-Control, ETag, Last-Modified, 304) | `F3-E04-inspeccion-cache.txt` | Listo |
| F3-E05 | Comparación acceso directo (frontend:3000) vs. proxy (Nginx 80/443) | `F3-E05-directo-vs-proxy.txt` | Listo |
| F3-E06 | Captura de tráfico con tcpdump (comparación HTTP texto plano vs. HTTPS cifrado) | `F3-E06-captura-trafico.txt` | Listo |

## Notas

- El nombre local `jeroky.local` sigue resolviéndose vía `/etc/hosts` del
  anfitrión (Mac), como se configuró en el Hito 2 (F2-E06). El
  certificado TLS incluye ese nombre en su SAN, por lo que la
  resolución existente ya es compatible con HTTPS; no fue necesario
  levantar un servidor DNS adicional para este TP.
- El certificado es autofirmado (sin CA reconocida), por lo que el
  navegador y `curl` sin `-k` reportan advertencia/error de confianza;
  esto es una limitación esperada de un entorno de laboratorio y se
  documenta como tal, no como falla.
- Las mediciones de rendimiento se realizaron en red local, por lo que
  los tiempos de DNS y conexión TCP son mínimos; el costo dominante es
  el TTFB (procesamiento del servidor en modo desarrollo). Ver
  interpretación completa en `F3-E03-mediciones-rendimiento.txt`.
- La limitación de `allowedDevOrigins` documentada en ADR-004 (Hito 2)
  sigue vigente: cada recreación completa de contenedores
  (`docker compose down && up`) requiere reaplicar el ajuste dentro del
  contenedor del frontend para que `jeroky.local` funcione en el
  navegador.
