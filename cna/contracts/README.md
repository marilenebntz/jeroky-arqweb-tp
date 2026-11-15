# Contratos

En esta carpeta guardamos los contratos de comunicación del TP2. Usamos OpenAPI 3.1 para las consultas HTTP, AsyncAPI 3.0 para los eventos y `/v2` para las rutas de los servicios.

## Auditoría

- [audit.openapi.json](audit.openapi.json) describe las consultas de auditoría, los filtros, la paginación y la ruta `/health`.
- [audit.asyncapi.json](audit.asyncapi.json) describe cómo auditoría recibe los eventos, hace los reintentos y envía los mensajes a la DLQ.
- [event-envelope.schema.json](event-envelope.schema.json) define los campos que debe tener cada evento.

AsyncAPI tiene una copia del esquema común adaptada a su formato. Si cambiamos el esquema, también tenemos que actualizar esa copia.

Validamos los dos contratos con Redocly y ambos pasaron sin errores. Las pruebas del servicio están en el [README de auditoría](../services/audit-svc/README.md).

## Cómo validar los contratos

Desde la carpeta principal del repositorio ejecutamos:

```bash
docker run --rm \
  -v "$PWD/cna/contracts:/contracts:ro" \
  -w /contracts \
  node:22-alpine \
  npx --yes @redocly/cli@2 lint \
  audit.openapi.json audit.asyncapi.json --extends=spec
```
