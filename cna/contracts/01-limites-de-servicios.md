# Límites iniciales de los servicios

## Principio de integración

Jeroky continuará funcionando como monolito. Los microservicios no accederán directamente a las tablas de PostgreSQL del monolito. La integración se realizará mediante:

- REST para consultas o solicitudes sincrónicas.
- Eventos asíncronos para cambios y procesamiento en segundo plano.
- Un gateway único para el tráfico externo de los servicios `/v2/`.

## search-svc

### Responsabilidad

Realizar búsquedas sobre información académica publicada por Jeroky, sin convertirse en dueño de los datos originales.

### API inicial

```text
GET /v2/search?q=&type=&page=&limit=
```

### Eventos consumidos

- `jeroky.entity.updated`
- `jeroky.entity.deleted`

### Persistencia propia

Índice de búsqueda independiente. El servicio debe poder reconstruir o actualizar su índice sin consultar directamente la base de datos del monolito.

## audit-svc

### Responsabilidad

Registrar acciones relevantes sobre usuarios, alumnos, cursos, matrículas, calificaciones y comunicaciones.

### API inicial

```text
GET /v2/audit?entity_type=&entity_id=&page=&limit=
```

### Eventos consumidos

- `jeroky.entity.created`
- `jeroky.entity.updated`
- `jeroky.entity.deleted`

### Persistencia propia

Base o almacenamiento independiente para los registros de auditoría.

## export-svc

### Responsabilidad

Gestionar la generación asíncrona de reportes académicos.

### API inicial

```text
POST /v2/exports
GET /v2/exports/{job_id}
```

La creación de un reporte debe responder `202 Accepted` y devolver un identificador de trabajo.

### Integración

El worker solicitará los datos mediante la API del monolito, generará el archivo y actualizará el estado del trabajo.

### Persistencia propia

Almacenamiento de trabajos y, posteriormente, almacenamiento de objetos para los archivos generados.

## event-bridge

### Responsabilidad

Recibir cambios provenientes del monolito, construir el sobre de evento común y publicarlo en el broker.

### Regla de confiabilidad

El evento debe recibir un `event_id` único antes de publicarse. Los consumidores deben guardar ese identificador para procesar cada evento de forma idempotente.

## Decisiones pendientes

Antes de implementar se debe confirmar:

1. Broker: RabbitMQ o NATS JetStream.
2. Motor del índice de búsqueda.
3. Base de auditoría.
4. Almacenamiento de exportaciones.
5. Mecanismo de emisión desde el monolito: webhook adaptado, outbox o endpoint interno protegido.
