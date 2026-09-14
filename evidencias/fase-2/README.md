# Evidencias - Fase 2 (Hito 2: Instalación y publicación HTTP)

Espacio reservado para instalación reproducible, servicios, proxy HTTP,
registros y demostración funcional.

Estado: **completo** (2026-09-14); pendiente redactar el procedimiento
reproducible en el informe final (LaTeX).

| Evidencia | Descripción | Archivo(s) | Estado |
|---|---|---|---|
| F2-E01 | Aplicación funcional vía HTTP en `release/1`, accedida por el proxy en el puerto 80 (sin `:3000`); módulo Alumnos operativo y resto de módulos "en construcción" como corresponde a esta rama | `F2-E01-jeroky-funcionando-proxy-puerto80.png` | Listo |
| F2-E02 | Configuración de Nginx como proxy inverso (creación del sitio, `nginx -t`, reload) | `F2-E02-configuracion-nginx.png`, `config/nginx-jeroky.conf` | Listo |
| F2-E03 | Logs del backend (`docker compose logs backend`) sin errores tras el arranque | Ver bitácora de la sesión / `docs/adr/ADR-003-seed-y-rama-despliegue.md` | Listo |
| F2-E04 | Verificación de métodos/códigos/cabeceras con `curl` (raíz, módulo Alumnos, ruta inexistente, OPTIONS, `curl -v`) | `F2-E04-curl-verificacion.txt` | Listo |
| F2-E05 | Persistencia de una función esencial con datos ficticios: alta de "Alumno de prueba Persistencia" (CI 987654), luego `docker compose down && docker compose up -d` (recreación completa de los 3 contenedores) y verificación de que el registro sigue presente | `F2-E05-alta-alumno-prueba.png`, `F2-E05-persistencia-tras-reinicio.png` | Listo |
| F2-E06 | Configuración de nombre local `jeroky.local` (Nginx `server_name`, `/etc/hosts` del anfitrión, `ping`/`curl` por nombre) | `F2-E06-acceso-por-nombre-local.png` | Listo |
| F2-E07 | Resolución del bloqueo de recursos de desarrollo de Next.js (`allowedDevOrigins`) al acceder por `jeroky.local`; app funcional por nombre en el navegador | Ver `docs/adr/ADR-004-allowedDevOrigins-nombre-local.md` | Listo |

## Notas

- El seed de la base de datos (`npm run db:seed`) es un paso obligatorio de la
  instalación reproducible; sin él, la tabla `users` queda vacía y el login
  falla. Documentado en `docs/adr/ADR-003-seed-y-rama-despliegue.md`.
- El nombre local `jeroky.local` se configuró en Nginx (`server_name`) y en el
  `/etc/hosts` del anfitrión (Mac). Es una resolución estática básica para
  esta fase; la formalización de DNS local (y su uso para el certificado TLS)
  corresponde al Hito 3, según lo indicado en `matriz/matriz-pruebas.csv`
  (P04).
- Acceder por `jeroky.local` requirió además agregar ese nombre a
  `allowedDevOrigins` en `next.config.ts` del frontend (Next.js bloquea por
  defecto recursos de desarrollo — HMR/RSC — desde orígenes no declarados).
  Se detectó que el contenedor del frontend no usa bind mount con el host;
  el cambio se aplicó directamente dentro del contenedor. Ver
  `docs/adr/ADR-004-allowedDevOrigins-nombre-local.md`.
- **Limitación conocida**: como el ajuste de `allowedDevOrigins` vive solo en
  la capa escribible del contenedor (no en la imagen ni en el host), se
  pierde cada vez que se ejecuta `docker compose down` (que elimina y
  recrea los contenedores). Tras la prueba de persistencia (F2-E05) el
  acceso por `jeroky.local` volvió a quedar bloqueado y debió reaplicarse.
  Queda pendiente para Hito 3/4 decidir si se reconstruye la imagen del
  frontend con el valor ya incluido, o se documenta como paso manual del
  procedimiento de arranque.
- El método `OPTIONS` sobre una ruta de página devuelve `400 Bad Request`
  (Next.js no implementa un manejador explícito); se deja como observación
  para revisar manejo de CORS en las rutas de API del backend en Hito 4.
- Pendiente: demostración de alta de un alumno de prueba para evidenciar
  persistencia (F2-E05).
