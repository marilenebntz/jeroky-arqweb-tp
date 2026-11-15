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

Quedan pendientes la API de consulta, los health checks y la prueba
completa en un entorno nuevo.

SQLite utiliza la API experimental de Node.js 22.
