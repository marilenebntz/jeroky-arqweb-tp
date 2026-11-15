# Checklist de evidencias del TP2

## Reglas para todas las capturas

- Capturar solamente cuando la prueba haya terminado correctamente.
- Las capturas de terminal deben mostrar el usuario y hostname cuando la guía lo exige.
- No mostrar contraseñas, tokens, claves privadas, archivos `.env` ni datos personales.
- Guardar cada evidencia con un nombre relacionado con su identificador.
- Una captura puede complementar otra evidencia, pero no debe reemplazar el resultado solicitado.

## Estado actual

- RabbitMQ levantado y saludable: **verificado en la interfaz**, captura auxiliar pendiente de copiar al repositorio.
- F6-E12 todavía está pendiente: debe mostrar un evento publicado y recibido por una cola.
- No guardar capturas con credenciales visibles.

## Fase 5 — Diseño

- [ ] F5-E1 — Inventario de tablas o módulos.
- [ ] F5-E2 — Matriz de acoplamiento.
- [ ] F5-E3 — Mapa de contextos DDD.
- [ ] F5-E4 — Contratos OpenAPI y AsyncAPI validados.
- [ ] F5-E5 — Diagrama C4 de contexto.
- [ ] F5-E6 — Diagrama C4 de contenedores.
- [ ] F5-E7 — Diagramas de secuencia con caminos de error.

## Fase 6 — Implementación y despliegue

- [ ] F6-E1 — Nodos o contenedores desplegados.
- [ ] F6-E2 — Firewall por nodo.
- [ ] F6-E3 — Certificado X.509 y SAN.
- [ ] F6-E4 — Búsqueda antes y después de actualizar información.
- [ ] F6-E5 — Idempotencia ante evento duplicado.
- [ ] F6-E6 — Ciclo completo de exportación.
- [ ] F6-E7 — Objeto almacenado en MinIO, si se utiliza.
- [ ] F6-E8 — Carga de archivos o media, si se implementa.
- [ ] F6-E9 — Etiquetas y tamaños de imágenes.
- [ ] F6-E10 — Usuario, límites y healthcheck de contenedores.
- [ ] F6-E11 — Webhook o mecanismo equivalente de integración.
- [ ] F6-E12 — Evento publicado, consumido y procesado por RabbitMQ.
- [ ] F6-E13 — Mensaje enviado a la DLQ.
- [ ] F6-E14 — Configuración Nginx validada con `nginx -t`.
- [ ] F6-E15 — Rate limiting demostrando HTTP 429.
- [ ] F6-E16 — Despliegue desde repositorio limpio y servicios saludables.

## Fase 7 — Resiliencia y operación

- [ ] F7-E1 — Caída de search-svc y tiempo de recuperación.
- [ ] F7-E2 — Consumidor detenido y cero pérdida de eventos.
- [ ] F7-E3 — Worker de exportación detenido y reintento.
- [ ] F7-E4 — Caída de nodo y convergencia.
- [ ] F7-E5 — Latencia, timeout, backoff o circuit breaker.
- [ ] F7-E6 — Comparación de carga entre monolito y search-svc.
- [ ] F7-E7 — Escalado del worker de exportación.
- [ ] F7-E8 — Recursos de los nodos y contenedores.
- [ ] F7-E9 — Dashboard RED en Grafana.
- [ ] F7-E10 — Logs correlacionados por `request_id`.
- [ ] F7-E11 — Traza distribuida en Jaeger.
- [ ] F7-E12 — Alerta funcionando.
- [ ] F7-E13 — Escaneo Trivy y SBOM.
- [ ] F7-E14 — Rotación del token sin reconstruir imágenes.

## Momento de captura

Te avisaré antes de cada prueba con el texto:

> **Momento de evidencia: capturá ahora.**

La captura actual de RabbitMQ se considera una evidencia auxiliar de infraestructura. La evidencia formal se tomará cuando estén creados el exchange, las colas y el flujo completo del evento.
