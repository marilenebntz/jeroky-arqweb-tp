# Bridge de eventos

Consulta alumnos mediante la API REST autenticada de Jeroky, compara snapshots
persistidos en su SQLite y publica cambios a RabbitMQ mediante un outbox propio.
No consulta PostgreSQL ni modifica el código fuente del monolito.

## Frecuencia de consulta

`POLL_INTERVAL_MS` configura la pausa entre ciclos, por defecto 1000 ms, con rango
admitido de 250 a 60000 ms. El Compose aislado fija 1000 ms. El arranque registra
`bridge_started` y el valor efectivo. No se ejecutan ciclos concurrentes: el tiempo
entre observaciones incluye consultas HTTP, login y publicaciones, además de la pausa.

La configuración anterior era una pausa fija de 10000 ms. Las evidencias anteriores
se conservan como históricas. El intervalo de un segundo aumenta las consultas y
los logins al backend; no es un webhook ni garantiza una latencia máxima.

## Medición edit-to-search

Con el laboratorio funcionando, ejecutar desde la raíz:

```bash
python3 cna/pruebas/medir-latencia-busqueda.py
```

El helper se ejecuta dentro del backend aislado para usar sus credenciales sin
imprimirlas. Realiza login, crea un alumno ficticio nuevo y espera su indexación
inicial. Hace diez PATCH secuenciales, cada uno seguido de consultas por el gateway
HTTPS hasta encontrar el nuevo nombre del mismo entity_id. Valida el certificado
local sin desactivar TLS. Se conserva el alumno ficticio al terminar.

Las duraciones usan reloj monotónico, desde antes de enviar cada PATCH hasta
recibir la búsqueda actualizada. También se registra el tiempo desde la respuesta
del PATCH. Las consultas se espacian 300 ms y se registran posibles 429. Cada
cambio debe aparecer antes de 5000 ms para aprobar la medición. La evidencia se
conserva aunque alguna muestra falle; no descartar resultados lentos.

[Resultados reales](../../evidencias/CA3-latencia-edicion-busqueda.json).
La medición local no es una prueba de carga ni una garantía universal. Los cambios
se hacen de uno en uno y se espera su observación antes de editar de nuevo. El
polling puede omitir estados intermedios de cambios rápidos sobre una misma
entidad. La rúbrica de integración con webhook sigue siendo parcial. Los IDs de
solicitudes PATCH no se propagan al evento: el bridge genera su propio request_id.
