# Checklist de evidencias del TP2

## Reglas para todas las capturas

- Capturar solamente cuando la prueba haya terminado correctamente.
- Las capturas de terminal deben mostrar el usuario y hostname cuando la guía lo exige.
- No mostrar contraseñas, tokens, claves privadas, archivos `.env` ni datos personales.
- Guardar cada evidencia con un nombre relacionado con su identificador.
- Una captura puede complementar otra evidencia, pero no debe reemplazar el resultado solicitado.

## Estado actual

Actualizado el 16 de noviembre de 2026

Ya funcionan auditoría, búsqueda, exportación, RabbitMQ y el puente de eventos.
También tenemos un entorno separado de Jeroky y un gateway con HTTPS, TLS 1.3
y límite de solicitudes. El TP todavía no está completo.

- [x] significa que comprobamos el recorrido indicado, con el alcance explicado abajo.
- [ ] con **Parcial** significa que hay avances, pero falta completar el requisito.
- [ ] sin esa aclaración significa que sigue pendiente o no tiene evidencia suficiente.
- Las pruebas del montaje anterior se conservan como antecedentes. No demuestran por sí solas el comportamiento del entorno aislado actual.
- Los textos guardados complementan las capturas. Falta contrastar el formato de cada evidencia con la guía adaptada y revisar los requisitos de usuario y hostname.
- Este checklist registra resultados de pruebas anteriores, no el estado de los contenedores en este momento.

## Fase 5 — Diseño

- [ ] F5-E1 — Inventario de tablas o módulos.
- [ ] F5-E2 — Matriz de acoplamiento.
- [ ] F5-E3 — Mapa de contextos DDD.
- [ ] F5-E4 — Contratos OpenAPI y AsyncAPI validados. **Parcial**. Existen contratos OpenAPI de auditoría, búsqueda y exportación, AsyncAPI de auditoría y búsqueda y el esquema común en [contracts](../contracts/README.md). Los comandos de validación utilizados terminaron sin errores. Falta comprobar la validación específica de AsyncAPI y la correspondencia final con la implementación.
- [ ] F5-E5 — Diagrama C4 de contexto.
- [ ] F5-E6 — Diagrama C4 de contenedores.
- [ ] F5-E7 — Diagramas de secuencia con caminos de error.

## Fase 6 — Implementación y despliegue

- [ ] F6-E1 — Nodos o contenedores desplegados. **Parcial**. Despliegue local con Docker Compose comprobado en [separación de entornos](separacion-entornos.txt). Falta evidencia actual del conjunto con gateway y contrastar si la guía exige varios nodos.
- [ ] F6-E2 — Firewall por nodo.
- [ ] F6-E3 — Certificado X.509 y SAN. **Parcial**. Certificado local autofirmado y TLS 1.3 verificados en [resultado TLS](gateway-tls13-resultado.txt). Se verificó SAN localhost; la configuración también incluye 127.0.0.1. Falta adjuntar la inspección completa X.509 y SAN según la guía.
- [ ] F6-E4 — Búsqueda antes y después de actualizar información. **Parcial**. [Antes y después en el montaje anterior](search-actualizacion-indice.png). En el aislado comprobamos el nombre actualizado en [búsqueda](aislado-search-actualizacion.png) y [auditoría](aislado-audit-actualizacion.png). Falta una comparación antes y después completa en el entorno actual.
- [ ] F6-E5 — Idempotencia ante evento duplicado. **Parcial**. [Duplicado detectado y un solo registro](audit-evento-duplicado.png), probado en el montaje anterior. Falta repetir en el aislado.
- [ ] F6-E6 — Ciclo completo de exportación. **Parcial**. En el aislado se observó POST 202, trabajo completed y descarga Markdown 200. Está guardada la [consulta y descarga](aislado-export-completado-descarga-200.png). Falta conservar la evidencia del POST 202 y del contenido actualizado para completar el ciclo documentado.
- [ ] F6-E7 — Objeto almacenado en MinIO, si se utiliza. No usamos MinIO actualmente; el reporte se guarda en SQLite. Confirmar con la guía si esta adaptación se acepta antes de marcar no aplicable.
- [ ] F6-E8 — Carga de archivos o media, si se implementa. No se implementó un servicio de carga de media. Confirmar si aplica a la adaptación.
- [ ] F6-E9 — Etiquetas y tamaños de imágenes.
- [ ] F6-E10 — Usuario, límites y healthcheck de contenedores. **Parcial**. Hay ejecución como usuario node y health checks. Ver [auditoría](audit-compose-usuario-y-datos.png), [salud auditoría](audit-health-200.png) y [salud búsqueda](search-health-200.png), del montaje anterior. Faltan límites y revisión conjunta del despliegue actual.
- [ ] F6-E11 — Webhook o mecanismo equivalente de integración. **Parcial**. El bridge consulta la API de alumnos cada 10 segundos, compara copias y publica cambios. [Evidencia del aislado](aislado-audit-actualizacion.png). Falta justificar la equivalencia con la guía. El polling puede omitir cambios intermedios y no equivale a un outbox transaccional del monolito.
- [ ] F6-E12 — Evento publicado, consumido y procesado por RabbitMQ. **Parcial**. Publicación y procesamiento comprobados en el [montaje anterior](rabbitmq-evento-enrutado.png) y cambios del aislado reflejados en búsqueda y auditoría. Falta reunir publicación y consumo del mismo event_id en evidencia completa del entorno actual.
- [ ] F6-E13 — Mensaje enviado a la DLQ. **Parcial**. [Evento inválido a DLQ](audit-evento-invalido-dlq.png) y [tres reintentos agotados](audit-reintentos-agotados-dlq.png), del montaje anterior. Falta repetir en el aislado.
- [ ] F6-E14 — Configuración Nginx validada con `nginx -t`. **Parcial**. nginx -t terminó correctamente antes de aplicar HTTPS y el límite. Falta guardar su salida como evidencia identificada de la configuración final.
- [x] F6-E15 — Rate limiting demostrando HTTP 429. Comprobado por HTTPS en el entorno aislado. [20 solicitudes con 6 respuestas 200 y 14 respuestas 429](gateway-rate-limit-429.txt). Falta captura si la guía la exige.
- [ ] F6-E16 — Despliegue desde repositorio limpio y servicios saludables.

## Fase 7 — Resiliencia y operación

- [ ] F7-E1 — Caída de search-svc y tiempo de recuperación. **Parcial**. [Búsqueda recuperada y consulta 200](gateway-search-recuperacion-200.txt). La caída devolvió 503 en JSON. Falta medir el tiempo total de recuperación; los 5,6 s de Compose no miden toda la interrupción.
- [ ] F7-E2 — Consumidor detenido y cero pérdida de eventos. **Parcial**. [Consumidor detenido](search-detenido-evento-pendiente.png) y [evento procesado al volver](search-recuperacion-evento-procesad.png), del montaje anterior. Falta repetir en el aislado y comparar identificadores y cantidades para demostrar ausencia de pérdida y duplicados.
- [ ] F7-E3 — Worker de exportación detenido y reintento. **Parcial**. [Worker recuperado](export-recuperacion-worker-200.png) procesó un trabajo creado mientras estaba detenido, en el montaje anterior. Falta repetir en el aislado y probar interrupción durante el procesamiento.
- [ ] F7-E4 — Caída de nodo y convergencia.
- [ ] F7-E5 — Latencia, timeout, backoff o circuit breaker. **Parcial**. Hay timeouts en Nginx y reintentos de almacenamiento mediante RabbitMQ. Falta una prueba específica con mediciones y el mecanismo que exija la guía.
- [ ] F7-E6 — Comparación de carga entre monolito y search-svc.
- [ ] F7-E7 — Escalado del worker de exportación.
- [ ] F7-E8 — Recursos de los nodos y contenedores.
- [x] F7-E9 — Dashboard RED en Grafana. Tres servicios con recolección activa y consultas de solicitudes, errores 5xx y latencia p95 verificadas. [Captura](F7-E9-grafana-red.jpg) y [resultados reales](F7-E9-prometheus-grafana.json). Es una demostración local; no acredita pruebas de carga, alertas ni métricas de colas.
- [ ] F7-E10 — Logs correlacionados por `request_id`. **Parcial**. [X-Request-ID conservado en HTTPS](gateway-tls13-resultado.txt) y registros de Nginx. Los eventos también llevan request_id. Falta correlacionar una misma operación entre gateway, servicios y eventos; los IDs de consultas HTTP y eventos previos no son automáticamente el mismo.
- [ ] F7-E11 — Traza distribuida en Jaeger.
- [x] F7-E12 — Alerta local funcionando en Prometheus. Se detuvo búsqueda y se observaron los estados inactive, pending y firing; después se restauró el servicio, la alerta volvió a inactive y `/readyz` confirmó SQLite y RabbitMQ. [Estados y tiempos reales](F7-E12-alerta-servicio.json). No se configuraron Alertmanager ni notificaciones externas; pendiente si la guía exige entrega de una notificación.
- [ ] F7-E13 — Escaneo Trivy y SBOM.
- [ ] F7-E14 — Rotación del token sin reconstruir imágenes.

## Pruebas adicionales del gateway

- HTTPS con TLS 1.3 y verificación del certificado: [resultado](gateway-tls13-resultado.txt).
- Límite de solicitudes: [resultado HTTP 429](gateway-rate-limit-429.txt).
- Recuperación de búsqueda a HTTP 200: [resultado](gateway-search-recuperacion-200.txt).
- Caída de búsqueda: HTTP 503 JSON comprobado. El archivo gateway-search-caida-503.txt está local y todavía no está versionado al actualizar este checklist.
- Con búsqueda detenida, auditoría respondió 200 y el frontend 307. Falta guardar esa salida y seguir la redirección para comprobar la página final.
- Autenticación de las APIs nuevas: pendiente. TLS y rate limiting no reemplazan autenticación.

## Próximos pasos

1. Terminar y guardar las evidencias de caída y recuperación, dejando búsqueda nuevamente levantada.
2. Contrastar la guía adaptada completa y acordar el alcance del polling, nodos y almacenamiento.
3. Completar diseño, autenticación, observabilidad y despliegue reproducible.
4. Repetir las pruebas históricas necesarias en el entorno aislado y reunir las evidencias formales.

## Momento de captura

Tomamos la captura cuando termina la prueba y muestra el resultado esperado.
Un 503 esperado durante una prueba de caída también sirve como evidencia.
No modificamos ni reconstruimos salidas para aparentar pruebas que no hicimos.
