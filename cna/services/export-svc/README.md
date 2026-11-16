# Servicio de exportación

Este servicio recibe pedidos para generar reportes de alumnos en Markdown.
La API guarda el trabajo en SQLite y responde con su identificador.
Después, el worker consulta la API de Jeroky y genera el reporte.

El reporte incluye identificador, nombre, apellido y estado del alumno.

## Configuración

Ejecutamos los comandos desde la carpeta principal del repositorio.

Creamos el archivo de configuración local:

```bash
cp -n cna/services/export-svc/.env.example \
  cna/services/export-svc/.env.local
```

En `.env.local` ponemos la URL del backend y los datos de una cuenta
de prueba de Jeroky que tenga acceso a la lista de alumnos.
Este archivo está excluido de Git.

En nuestro entorno, el backend está en la red `jeroky1_default`.
Si usamos otra máquina, tenemos que revisar ese nombre en el Compose
y la URL del backend en `.env.local`.

## Cómo levantarlo

Primero debe estar funcionando el backend de Jeroky.

```bash
docker compose \
  -f cna/services/export-svc/docker-compose.yml \
  up -d --build --wait
```

La API queda disponible en `http://127.0.0.1:3004`.
La API y el worker corren como usuario `node` y comparten
el volumen `export_data` para guardar los trabajos y reportes.

## Crear un trabajo

```bash
curl -i -X POST http://127.0.0.1:3004/v2/exports \
  -H 'Content-Type: application/json' \
  -d '{"report":"students","format":"markdown"}'
```

Responde HTTP 202 con el `job_id` y la ruta para consultar el trabajo.
Los estados son `queued`, `running`, `completed` y `failed`.

## Consultar y descargar

Reemplazamos JOB_ID por el identificador recibido:

```bash
curl -i http://127.0.0.1:3004/v2/exports/JOB_ID
```

Cuando el estado es `completed`, podemos descargar el archivo:

```bash
curl --fail --show-error \
  -o reporte-alumnos.md \
  http://127.0.0.1:3004/v2/exports/JOB_ID/download
```

El archivo se guarda en la carpeta actual. Para las pruebas usamos
alumnos ficticios y evitamos subir reportes con datos personales al repositorio.

Si el trabajo sigue pendiente, la descarga responde HTTP 409.
Si el identificador no existe, responde HTTP 404.

## Cómo trabaja el worker

El worker revisa los trabajos pendientes cada segundo.
Reserva un trabajo durante dos minutos y consulta Jeroky.
Si termina bien, guarda el Markdown y marca el trabajo como `completed`.
Si falla la consulta o la generación, lo marca como `failed`.

Si el worker se interrumpe con un trabajo en proceso, ese trabajo puede
retomarse cuando venza la reserva. Todavía falta probar ese caso.

## Pruebas realizadas

- Creamos un trabajo y recibimos HTTP 202.
- Consultamos el trabajo y recibimos HTTP 200.
- El worker consultó Jeroky y completó el reporte.
- La descarga respondió HTTP 200 con formato Markdown.
- Un pedido en formato PDF respondió HTTP 400.
- Un trabajo inexistente respondió HTTP 404.
- Con el worker detenido, el trabajo quedó pendiente y la descarga respondió HTTP 409.
- Al volver el worker, completó el trabajo y la descarga respondió HTTP 200.

Guardamos estas capturas:

- [Consulta del trabajo](../../evidencias/export-consulta-trabajo-200.png).
- [Trabajo completado](../../evidencias/export-trabajo-completado.png).
- [Descarga Markdown](../../evidencias/export-descarga-markdown-200.png).
- [Recuperación del worker](../../evidencias/export-recuperacion-worker-200.png).

## Consultar los registros

```bash
docker compose \
  -f cna/services/export-svc/docker-compose.yml \
  logs --tail=20 worker
```

## Detener el servicio

```bash
docker compose \
  -f cna/services/export-svc/docker-compose.yml \
  down
```

Los trabajos y reportes quedan guardados en el volumen de datos.

## Pendientes

Faltan el contrato OpenAPI, la autenticación de la API, la integración
con el gateway y la prueba completa en un entorno nuevo.

También falta probar la interrupción de un trabajo en proceso.
El health check actual comprueba HTTP y una consulta básica a SQLite.
La conexión con Jeroky y el avance del worker necesitan comprobaciones
adicionales.

SQLite usa la API experimental de Node.js 22.
