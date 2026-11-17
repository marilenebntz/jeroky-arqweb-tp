# Métricas de Arquitectura

Prometheus recoge `/metrics` de búsqueda, auditoría y exportación cada 10 segundos
por la red interna de `cna-arqui`. Grafana carga automáticamente la fuente de datos
y el dashboard **Jeroky Arquitectura - RED**.

## Acceso

- Grafana: http://localhost:3150/d/cna-red
- Prometheus: http://localhost:3190
- Targets: http://localhost:3190/targets

Grafana permite lectura local sin iniciar sesión, con rol Viewer. Los puertos
se publican únicamente en loopback. El formulario de login y el registro están
deshabilitados. La contraseña administrativa es aleatoria y se conserva en
`.local/grafana-admin-password`, ignorada por Git. La carpeta tiene permisos 700;
el archivo es legible para que el usuario del contenedor pueda leer el montaje.
No copiar esa carpeta a las evidencias. Esta configuración es para el laboratorio
local; no se debe publicar tal cual en Internet.

## Arranque reproducible

Con el entorno aislado y su `.env.local` ya preparados, ejecutar desde la raíz:

```bash
python3 cna/observability/preparar.py
docker compose --env-file cna/infra/aislado/.env.local -f cna/infra/aislado/compose.yml up -d --wait prometheus grafana
```

Para generar datos de demostración antes de capturar el panel:

```bash
python3 cna/observability/generar-trafico.py
```

Este comando hace consultas locales y crea dos reportes de prueba durante unos
40 segundos. Es una demostración de métricas, no una prueba de carga ni una
comparación de rendimiento. El script de arranque `infra/aislado/levantar.sh`
también prepara y levanta estos dos componentes.

La preparación no reemplaza una contraseña existente. Las imágenes están fijadas
a Prometheus v3.5.0 y Grafana 12.1.1. Sus datos se guardan en volúmenes propios.
Prometheus conserva siete días de métricas. No se modifica el proyecto original
Jeroky ni su base de datos.

## Lectura del panel

- Estado de recolección: `up=1` indica que Prometheus pudo leer las métricas;
  no equivale a `/readyz` ni garantiza conectividad con todas las dependencias.
- Solicitudes por segundo: suma de tasas de peticiones funcionales `/v2/`.
- Errores: respuestas 5xx emitidas por esas APIs por segundo. No incluye los 503
  que genera el gateway cuando no puede conectarse al servicio.
- Latencia p95: estimación por histograma del tiempo HTTP dentro del servicio.
  No es el tiempo completo del navegador ni del trabajo asíncrono del worker.
- Respuestas por código: incremento estimado de contadores durante cinco minutos.

Las sondas de salud y las lecturas de métricas se excluyen de RED para evitar
que el monitoreo infle el tráfico funcional. Las tasas usan una ventana de un
minuto: esperar varias recolecciones y generar consultas para ver datos.
La latencia sin solicitudes puede aparecer sin valor. Los contadores se reinician
cuando reinicia un servicio y `rate`/`increase` manejan esos reinicios.

## Alcance pendiente

Este montaje no agrega todavía alertas, métricas de colas RabbitMQ, métricas del
worker, recursos de contenedores, logs centralizados ni trazas distribuidas.
El dashboard se modifica en el JSON del repositorio; no se edita desde Grafana.

Referencias de configuración:
- https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- https://grafana.com/docs/grafana/latest/administration/provisioning/
