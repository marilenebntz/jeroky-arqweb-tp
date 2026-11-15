# Servicio de auditoría

Consume eventos de `jeroky.audit`, los valida con el contrato común
y los guarda en una base SQLite propia.

Cada evento se identifica por `event_id`. Los duplicados se confirman
sin crear otro registro. Los eventos inválidos se rechazan y pasan
a `jeroky.audit.dlq`.

## Preparación

Ejecutar los comandos desde la raíz del repositorio.

Configurar primero `cna/infra/rabbitmq/.env.local` siguiendo el README
de RabbitMQ. Ese archivo contiene las credenciales locales.

Levantar RabbitMQ e importar las colas:

```bash
bash cna/infra/rabbitmq/levantar.sh
```

Preparar el volumen de auditoría y sus permisos, con auditoría detenida:

```bash
docker volume create jeroky_audit_data

docker run --rm --user root \
  -v jeroky_audit_data:/data \
  node:22-alpine chown -R node:node /data
```

## Arranque

```bash
docker compose \
  --env-file cna/infra/rabbitmq/.env.local \
  -f cna/services/audit-svc/docker-compose.yml \
  up -d --build
```

El servicio utiliza la red `rabbitmq_default`, creada por el Compose
de RabbitMQ, y se ejecuta como usuario `node`.

## Consultar registros

```bash
docker compose \
  --env-file cna/infra/rabbitmq/.env.local \
  -f cna/services/audit-svc/docker-compose.yml \
  logs --tail=20 audit
```

## Detener

```bash
docker compose \
  --env-file cna/infra/rabbitmq/.env.local \
  -f cna/services/audit-svc/docker-compose.yml \
  down
```

Los eventos se conservan en el volumen externo `jeroky_audit_data`.

## Estado actual

Se verificaron el almacenamiento, la detección de duplicados,
el envío de eventos inválidos a DLQ y la conservación del registro
al pasar el consumidor a Compose.

Ante un fallo de almacenamiento, el servicio programa hasta tres
reintentos, separados por 10 segundos mediante la cola
`jeroky.audit.retry`. Si el fallo continúa, publica el evento en
`jeroky.audit.dlq`.

El mensaje original se confirma después de recibir la confirmación
de RabbitMQ para la publicación del reintento o del envío a DLQ.

La prueba con una transacción SQLite bloqueada mostró tres registros
`retry_scheduled` y uno `retry_exhausted_dlq`. Al terminar, se detuvo
y eliminó el contenedor de bloqueo.

Evidencia: `../../evidencias/audit-reintentos-agotados-dlq.png`.

Quedan pendientes la autenticación e integración con el gateway,
la comprobación de RabbitMQ en el estado de salud y la prueba completa
en un entorno nuevo.

SQLite utiliza la API experimental de Node.js 22.

## API de consulta

Disponible localmente en `http://127.0.0.1:3002/v2/audit`.

Permite filtrar por `entity_type` y `entity_id`.
La paginación utiliza `page` (por defecto 1) y `limit`
(por defecto 20, máximo 100).

```bash
curl -i 'http://127.0.0.1:3002/v2/audit?entity_type=student&entity_id=demo-001&page=1&limit=10'
```

La respuesta incluye `page`, `limit`, `total` e `items`.

Pruebas realizadas con el evento de demostración:

- Filtros coincidentes: HTTP 200 y un evento.
- Identificador inexistente: HTTP 200 y lista vacía.
- `page=0`: HTTP 400.
- Consulta general: HTTP 200 y el evento almacenado.

La consulta HTTP 200 está documentada en
[la captura de evidencia](../../evidencias/audit-api-consulta-200.png).

La API todavía requiere autenticación e integración con el gateway.

## Salud del servicio

```bash
curl -i http://127.0.0.1:3002/health
```

Devuelve HTTP 200 con `{"status":"ok","database":"ok"}` cuando
la API responde y SQLite puede ejecutar `SELECT 1`.
Docker utiliza esta ruta para comprobar la salud del contenedor.

Esta consulta verifica la conexión con SQLite. La disponibilidad
de las tablas, la capacidad de escritura y la conexión con RabbitMQ
requieren comprobaciones adicionales.

[Evidencia de la consulta de salud](../../evidencias/audit-health-200.png).

## Persistencia tras reinicio

Se reinició el servicio de auditoría mediante Docker Compose.
Después del reinicio, `/health` y `/v2/audit` respondieron HTTP 200.
La consulta conservó el mismo evento y devolvió `total: 1`.

- [Primera captura](../../evidencias/audit-persistencia-reinicio_1.png).
- [Segunda captura](../../evidencias/audit-persistencia-reinicio_2.png).
