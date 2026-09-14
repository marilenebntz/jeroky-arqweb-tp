# Evidencias - Fase 2 (Hito 2: Instalación y publicación HTTP)

Espacio reservado para instalación reproducible, servicios, proxy HTTP,
registros y demostración funcional.

Estado: técnicamente completo (2026-09-14); pendiente redactar el
procedimiento reproducible en el informe.

| Evidencia | Descripción | Archivo(s) | Estado |
|---|---|---|---|
| F2-E01 | Aplicación funcional vía HTTP en `release/1`, accedida por el proxy en el puerto 80 (sin `:3000`); módulo Alumnos operativo y resto de módulos "en construcción" como corresponde a esta rama | `F2-E01-jeroky-funcionando-proxy-puerto80.png` | Listo |
| F2-E02 | Configuración de Nginx como proxy inverso (creación del sitio, `nginx -t`, reload) | `F2-E02-configuracion-nginx.png`, `config/nginx-jeroky.conf` | Listo |
| F2-E03 | Logs del backend (`docker compose logs backend`) sin errores tras el arranque | Ver bitácora de la sesión / `docs/adr/ADR-003-seed-y-rama-despliegue.md` | Listo |
| F2-E04 | Verificación de métodos/códigos/cabeceras con `curl` | Pendiente | Pendiente |
| F2-E05 | Persistencia de una función esencial con datos ficticios | Pendiente (usar módulo Alumnos: alta de un alumno de prueba) | Pendiente |

## Notas

- El seed de la base de datos (`npm run db:seed`) es un paso obligatorio de la
  instalación reproducible; sin él, la tabla `users` queda vacía y el login
  falla. Documentado en `docs/adr/ADR-003-seed-y-rama-despliegue.md`.
- Pendiente para próxima sesión: capturas de `curl -v` contra el sitio en el
  puerto 80 (métodos, códigos de estado, cabeceras) y una demostración de alta
  de un alumno de prueba para evidenciar persistencia (F2-E04 y F2-E05).
