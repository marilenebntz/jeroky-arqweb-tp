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

Faltan los contratos de búsqueda, la autenticación,
la integración con el gateway y las pruebas de recuperación
y despliegue en un entorno nuevo.

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
