> Para continuar el TP usamos el entorno separado de `cna/infra/aislado`. Arranque desde la raíz del repositorio: `bash cna/infra/aislado/levantar.sh`. Jeroky de Arquitectura está en http://localhost:3100. Los pasos anteriores de esta página describen el montaje previo.

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

## Salud, métricas y pruebas actuales

`GET /healthz` confirma que el proceso HTTP está vivo. `GET /readyz` verifica
lectura y escritura de la tabla de trabajos con una inserción que se revierte.
Devuelve 503 si SQLite no permite aceptar trabajos. Esta preparación no comprueba
Jeroky ni la disponibilidad o el avance del worker: la API puede aceptar y
conservar trabajos mientras el worker está detenido. `/health` sigue disponible.
Compose consulta `/readyz` para la API.

`GET /metrics` expone `export_http_requests_total` y el histograma
`export_http_request_duration_seconds`, etiquetados por método, ruta y código.
Los identificadores de trabajos se reemplazan por `:id` en las etiquetas para
limitar la cantidad de series. Los contadores se reinician con la API.
Estas rutas operativas están en el puerto local 3104 y la red interna; el gateway
solo publica las rutas funcionales de exportación. Falta conectar Prometheus y Grafana.

Los logs de aplicación son JSON con timestamp, level, service, request_id y
message. La API conserva o genera el request_id de cada consulta HTTP. Los logs
del worker incluyen job_id; su request_id queda null porque todavía no se guarda
el identificador HTTP original en el trabajo. Las advertencias de Node pueden
seguir saliendo como texto. No se registran cuerpos ni credenciales.

Para ejecutar las pruebas desde la raíz, sin modificar los datos existentes:

```bash
docker run --rm -v "$PWD/cna/services/export-svc:/app:ro" -w /app node:22-alpine npm test
```

Las 7 pruebas usan SQLite en memoria, HTTP local real y un generador de reportes
simulado. Comprueban aceptación 202, descarga pendiente 409, finalización y
Markdown, validaciones, salud y preparación, métricas y logs, fallo del generador,
recuperación tras vencer el lease y rechazo de un resultado de un worker que
perdió su lease. La interrupción de un contenedor durante un trabajo real y su recuperación
se documentan por separado al final de esta página. El lease continúa siendo de 120 segundos.

## Prueba de interrupción durante un trabajo real

Desde la raíz del repositorio, con el entorno aislado funcionando:

```bash
python3 cna/pruebas/worker-interrumpido.py
```

Este comando interrumpe temporalmente **solo** `cna-arqui-worker-1`. Desactiva su
reinicio automático durante la prueba, crea un reporte por HTTP, espera el estado
`running` y termina el proceso con SIGKILL. Verifica salida 137, persistencia del
mismo trabajo y descarga 409; después reinicia el worker y espera hasta 165 segundos
para que venza el lease de 120 segundos y se complete la recuperación.

No adelanta el reloj ni modifica los registros de SQLite. El reporte se genera
consultando Jeroky real del entorno aislado. En un bloque de limpieza restaura
`restart: unless-stopped` y arranca el worker aunque una comprobación falle.
No cerrar la terminal ni matar el script durante la prueba: un cierre forzado
puede impedir que esa limpieza se ejecute. Requiere Python 3 y Docker disponibles.

La evidencia se escribe en
[`F7-E3-worker-interrumpido.json`](../../evidencias/F7-E3-worker-interrumpido.json).
Comprobar `result: passed` antes de considerarla aprobada. La ventana entre
`running` y la finalización puede ser breve: si no logra interrumpirla a tiempo,
el script lo informa como fallo, en lugar de presentarlo como una recuperación.
Este ensayo valida un trabajo; no demuestra rendimiento ni escalado a tres workers.
