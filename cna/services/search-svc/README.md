> Para continuar el TP usamos el entorno separado de `cna/infra/aislado`. Arranque desde la raíz del repositorio: `bash cna/infra/aislado/levantar.sh`. Jeroky de Arquitectura está en http://localhost:3100. Los pasos anteriores de esta página describen el montaje previo.

# Servicio de búsqueda

Este servicio recibe eventos de Jeroky y guarda una copia de los datos
en una base SQLite propia para poder consultarlos.

Cuando recibe `jeroky.entity.updated`, agrega o actualiza el documento.
Cuando recibe `jeroky.entity.deleted`, lo elimina del índice.

Guardamos los identificadores de los eventos procesados para evitar
aplicar dos veces el mismo evento. El cambio del documento y el registro
del evento se guardan juntos en una transacción.

## Cómo levantarlo

Ejecutamos los comandos desde la carpeta principal del repositorio.
Primero configuramos las credenciales locales de RabbitMQ siguiendo
las instrucciones de `cna/infra/rabbitmq/README.md`.

Levantamos RabbitMQ y cargamos las colas:

```bash
bash cna/infra/rabbitmq/levantar.sh
```

Después levantamos búsqueda:

```bash
docker compose \
  --env-file cna/infra/rabbitmq/.env.local \
  -f cna/services/search-svc/docker-compose.yml \
  up -d --build
```

El servicio usa la red `rabbitmq_default`, corre con el usuario `node`
y guarda sus datos en el volumen `search_data` de Compose.

## Cómo consultar

La API está disponible localmente en el puerto 3003:

```bash
curl -i 'http://127.0.0.1:3003/v2/search?q=Alumno&type=student&page=1&limit=10'
```

- `q` busca coincidencias parciales en los valores de texto del documento.
- `type` filtra por tipo de entidad.
- `page` indica la página y empieza en 1.
- `limit` indica cuántos resultados devolver. Por defecto son 20 y el máximo es 100.

Si omitimos `q` o lo dejamos vacío, se listan los documentos.
La respuesta incluye `page`, `limit`, `total` e `items`.

## Pruebas realizadas

Comprobamos que el servicio:

- Guarda un documento al recibir el evento de actualización.
- Detecta el mismo evento como duplicado y conserva un solo registro.
- Devuelve HTTP 200 cuando encuentra resultados y cuando la lista está vacía.
- Devuelve HTTP 400 si enviamos `page=0`.
- Actualiza el nombre del documento y deja de encontrar el nombre anterior.
- Elimina el documento al recibir el evento de eliminación.

Guardamos las capturas de
[actualización](../../evidencias/search-actualizacion-indice.png) y
[eliminación](../../evidencias/search-eliminacion-indice.png).

El consumidor también tiene configurados hasta tres reintentos de
almacenamiento, separados por 10 segundos. Si se agotan, envía el evento
a `jeroky.search.dlq`. Falta probar ese recorrido en búsqueda.

## Consultar los registros

```bash
docker compose \
  --env-file cna/infra/rabbitmq/.env.local \
  -f cna/services/search-svc/docker-compose.yml \
  logs --tail=20 search
```

## Detener el servicio

```bash
docker compose \
  --env-file cna/infra/rabbitmq/.env.local \
  -f cna/services/search-svc/docker-compose.yml \
  down
```

Compose conserva el volumen de datos al ejecutar este comando.

## Pendientes

Faltan la autenticación y la prueba de despliegue en un entorno nuevo.
El gateway aislado ya enruta las consultas /v2/search.

Por ahora, los eventos se aplican en el orden en que llegan.
También falta mejorar las búsquedas con mayúsculas y minúsculas
fuera del alfabeto ASCII. SQLite usa la API experimental de Node.js 22.

## Salud del servicio

Podemos consultar el estado con:

```bash
curl -i http://127.0.0.1:3003/health
```

La respuesta fue HTTP 200 con `{"status":"ok","database":"ok"}`.
También agregamos esta consulta al health check de Compose y
comprobamos que el contenedor aparece como `Healthy`.

Esta prueba comprueba que la API responde y SQLite ejecuta `SELECT 1`.
Todavía falta comprobar RabbitMQ, las tablas y la capacidad de escritura
dentro del estado de salud.

[Captura de la prueba](../../evidencias/search-health-200.png).

## Contratos

Guardamos los contratos en la carpeta `cna/contracts`:

- [OpenAPI](../../contracts/search.openapi.json) describe las consultas de búsqueda y la ruta `/health`.
- [AsyncAPI](../../contracts/search.asyncapi.json) describe los eventos que recibe el servicio, los reintentos y el envío a la DLQ.

Validamos los dos con Redocly y pasaron sin errores.

## Recuperación del servicio

Detuvimos búsqueda y publicamos un evento de actualización.
RabbitMQ dejó el mensaje pendiente mientras el servicio tenía
cero consumidores.

Después levantamos búsqueda otra vez. El servicio procesó el mensaje
y pudimos encontrar el documento desde la API. La cola quedó con
cero mensajes pendientes, cero sin confirmar y un consumidor.

Esta prueba comprueba la recuperación después de detener el consumidor.
La recuperación ante una caída del broker queda pendiente.

- [Evento pendiente](../../evidencias/search-detenido-evento-pendiente.png).
- [Evento procesado al volver](../../evidencias/search-recuperacion-evento-procesad.png).


## Salud preparación métricas y pruebas actuales

Actualización del 16 de noviembre de 2026 para el entorno aislado.

- GET /healthz devuelve 200 si el proceso HTTP responde, sin consultar SQLite ni RabbitMQ.
- GET /readyz comprueba las columnas de documents, intenta una escritura reversible en processed_events y revisa el estado local de la conexión y del consumidor AMQP. Devuelve 200 cuando está preparado y 503 si no lo está. La escritura de prueba se revierte y no deja eventos guardados.
- GET /metrics expone search_http_requests_total y el histograma search_http_request_duration_seconds en formato Prometheus. Las etiquetas son método, ruta reconocida y código HTTP. No incluyen el texto buscado, identificadores de alumnos ni request_id.
- /health se conserva como comprobación básica anterior. El healthcheck de search en el Compose aislado usa ahora /readyz.

La preparación AMQP se marca al completar la suscripción y se invalida al detectar el cierre. No se hace un ping al broker en cada solicitud; una partición de red puede detectarse después mediante heartbeat. No se probó todavía ese escenario con las rutas nuevas.

Los logs de aplicación HTTP y del consumidor usan JSON con timestamp, level, service, request_id y message. Un request_id recibido y válido se conserva en la respuesta y el log. Para errores o arranque sin solicitud el campo queda null. Las advertencias propias de Node.js pueden seguir apareciendo como texto en stderr.

Los eventos de polling conservan su propio request_id; no se afirma que sea el de la edición original. Estas métricas todavía no están conectadas a Prometheus ni Grafana.

Las rutas operativas se consultan directamente por localhost:3103 o desde la red interna. El /health del gateway comprueba Nginx, no este servicio; /metrics del gateway no está configurado para búsqueda.

### Pruebas automatizadas

Desde la raíz del repositorio:

```bash
docker run --rm -v "$PWD/cna/services/search-svc:/app:ro" -w /app node:22-alpine npm test
```

Usan node:test, servidores en puertos temporales y SQLite en memoria. No necesitan RabbitMQ ni modifican los datos del laboratorio. Se verifican búsqueda, parámetros, protección frente a inyección, liveness independiente de dependencias, readiness con fallos de tablas y escritura, propagación de request_id y contador e histograma. Las pruebas del broker real y del consumidor extremo a extremo siguen siendo pruebas separadas.
