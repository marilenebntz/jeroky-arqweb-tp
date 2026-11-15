# Línea base y brecha para el TP2 Cloud Native

## 1. Propósito

Este documento identifica qué elementos del Hito 4 de Jeroky Soft se reutilizan para el TP2 y qué componentes deben agregarse para evolucionar la aplicación monolítica hacia una arquitectura Cloud Native.

La aplicación existente se conserva como línea base funcional. Los nuevos componentes se desarrollarán dentro de `cna/`, sin modificar inicialmente la configuración estable del monolito.

## 2. Línea base existente

La arquitectura actual está compuesta por:

- Nginx como proxy inverso y punto de entrada.
- Frontend Next.js.
- Backend NestJS.
- PostgreSQL.
- Docker Compose para frontend, backend y base de datos.
- HTTPS y cabeceras de seguridad.
- Firewall UFW.
- Pruebas de humo, resiliencia y carga.

El flujo actual es:

```text
Cliente → Nginx → Frontend Next.js → Backend NestJS → PostgreSQL
```

El Hito 4 registró, entre otros resultados:

- 1128 solicitudes completas en una prueba de carga.
- 0 solicitudes fallidas.
- 37,53 solicitudes por segundo.
- Tiempo medio de 266,436 ms.
- Recuperación del backend desde HTTP 502 hasta HTTP 200 en aproximadamente 7 segundos.
- PostgreSQL saludable y sin pérdida de datos observada.

## 3. Componentes que se reutilizarán

### Gateway

Se reutilizará la configuración base de Nginx para:

- Redirección HTTP a HTTPS.
- Terminación TLS.
- Ocultamiento de versiones.
- Cabeceras de seguridad.
- Proxy hacia la aplicación monolítica.
- Incorporación posterior de las rutas `/v2/` para los microservicios.

### Seguridad y red

Se reutilizarán como línea base:

- UFW con tráfico entrante restringido.
- Frontend y backend enlazados a localhost.
- PostgreSQL sin exposición pública.
- Prohibición de versionar secretos.
- Certificado del entorno de laboratorio.

### Pruebas

Los scripts existentes servirán como punto de partida:

- `hito4-smoke.sh`: pruebas HTTP y cabeceras.
- `hito4-resiliencia.sh`: caída y recuperación del backend.
- `hito4-carga.sh`: prueba de carga con ApacheBench.
- `hito4-recursos.sh`: observación de recursos de los contenedores.

Estas pruebas corresponden a la línea base. Para el TP2 deberán agregarse pruebas de eventos, microservicios y degradación distribuida.

## 4. Brecha identificada respecto del TP2

La configuración actual todavía no cumple todos los criterios de aceptación del TP2.

### CA-1: tres microservicios

Actualmente solo existen los contenedores del monolito:

- `db`
- `backend`
- `frontend`

Deben agregarse al menos:

- `search-svc`
- `audit-svc`
- `export-svc`

Cada servicio deberá contar con una responsabilidad definida, configuración independiente y persistencia propia cuando corresponda.

### CA-3: interacción asíncrona

Actualmente no existe un broker ni un flujo de eventos. Se deberá agregar:

- `event-bridge`.
- Broker durable, por ejemplo RabbitMQ o NATS JetStream.
- Eventos versionados.
- Consumidores con acknowledgement.
- Reintentos y DLQ.
- Control de duplicados mediante `event_id`.

### CA-4: gateway

Nginx ya existe, pero la configuración actual permite TLS 1.2 y TLS 1.3. El TP2 requiere documentar y validar TLS 1.3.

También deben incorporarse:

- Ruteo de `/v2/`.
- Propagación de `X-Request-ID`.
- Rate limiting.
- Respuestas JSON de error para los servicios.
- Timeouts de upstream.

### CA-5: degradación controlada

La prueba actual verifica la caída del backend monolítico. El TP2 debe demostrar que:

- El monolito continúa respondiendo si cae un microservicio.
- El gateway devuelve una respuesta controlada.
- Las funcionalidades no relacionadas siguen disponibles.

### CA-6: cero pérdida de eventos

Todavía no existe una prueba de este tipo. Se deberá demostrar que:

1. Un consumidor se detiene.
2. Se publican eventos durante la interrupción.
3. El consumidor vuelve a iniciarse.
4. Los eventos pendientes se procesan.
5. No se duplican los registros procesados.

### CA-7: despliegue reproducible

El Compose histórico referencia las carpetas `backend` y `frontend`, que pertenecen a repositorios separados. Para cumplir el despliegue reproducible se deberá documentar o automatizar cómo se obtienen esas versiones.

No se deben incluir archivos `.env`, credenciales ni tokens reales.

## 5. Componentes nuevos requeridos

La carpeta `cna/` deberá incorporar progresivamente:

```text
cna/
├── contracts/
│   ├── openapi/
│   └── asyncapi/
├── services/
│   ├── search-svc/
│   ├── audit-svc/
│   └── export-svc/
├── infra/
│   ├── broker/
│   └── databases/
├── deploy/
├── observability/
├── pruebas/
└── evidencias/
```

## 6. Orden de implementación

1. Definir la equivalencia funcional entre la guía y Jeroky.
2. Definir el evento común y los contratos OpenAPI/AsyncAPI.
3. Implementar `search-svc`.
4. Incorporar el broker y el `event-bridge`.
5. Implementar `audit-svc`.
6. Implementar `export-svc`.
7. Agregar gateway, rate limiting y `X-Request-ID`.
8. Agregar health checks, métricas, logs y trazas.
9. Ejecutar pruebas de caída, recuperación, idempotencia y carga.
10. Completar las evidencias F5, F6 y F7.

## 7. Consideración de seguridad

No se deben incluir en el repositorio sesiones, tokens, claves privadas, datos biométricos ni información personal real. Las evidencias deben revisarse antes de incorporarse al TP2.

## 8. Estado

Este documento representa el diagnóstico inicial. El TP2 todavía no se considera completo hasta implementar y verificar los microservicios y los criterios de aceptación correspondientes.
