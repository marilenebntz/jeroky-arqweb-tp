> Para continuar el TP usamos el entorno separado de `cna/infra/aislado`. Arranque desde la raíz del repositorio: `bash cna/infra/aislado/levantar.sh`. Jeroky de Arquitectura está en http://localhost:3100. Los pasos anteriores de esta página describen el montaje previo.

# TP2 Cloud Native - Jeroky Soft

Esta carpeta contiene la adaptación del Trabajo Práctico Integrador II sobre la aplicación Jeroky Soft.

## Objetivo

Mantener la aplicación monolítica existente funcionando y extraer progresivamente funcionalidades hacia microservicios independientes, con comunicación REST y eventos asíncronos.

## Alcance inicial

- search-svc: búsqueda de información académica.
- audit-svc: registro de acciones relevantes del sistema.
- export-svc: generación asíncrona de reportes académicos.
- event-bridge: recepción, normalización y publicación de eventos.
- gateway: entrada única para los servicios Cloud Native.
- observability: métricas, logs y trazas.

## Estructura

- `contracts/`: contratos OpenAPI y AsyncAPI.
- `services/`: código de los microservicios.
- `infra/`: broker, bases de datos y dependencias.
- `deploy/`: Docker Compose y configuración de despliegue.
- `observability/`: Prometheus, Grafana, logs y trazas.
- `pruebas/`: pruebas funcionales, resiliencia y eventos.
- `evidencias/`: capturas y resultados del TP.

## Decisión de adaptación

La guía utiliza BookStack como referencia. El equipo utilizará Jeroky Soft como monolito base porque cuenta con una implementación funcional y una línea base de seguridad, despliegue y resiliencia. La equivalencia funcional y la justificación de esta adaptación se documentarán en el informe.

## Reglas

- No versionar secretos, tokens, claves ni datos personales.
- No romper el funcionamiento del monolito existente.
- Evitar que los microservicios accedan directamente a la base de datos del monolito.
- Registrar cada prueba y su evidencia.
