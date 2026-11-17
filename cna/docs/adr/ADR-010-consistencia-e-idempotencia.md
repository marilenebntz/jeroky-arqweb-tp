# ADR-010 Consistencia eventual e idempotencia

Estado: implementado parcialmente y pendiente de pruebas completas. Fecha: 2026-11-16.

## Contexto

La publicación y el ACK pueden repetirse si un proceso falla. Las copias también pueden recibir cambios más tarde que el monolito.

## Decisión

Usar event_id único antes de publicar y conservación de ese ID al reintentar. Audit inserta con clave única. Search registra event_id y aplica el documento en una transacción. ACK después de completar el procesamiento. Mensajes inválidos van a DLQ; errores de almacenamiento tienen hasta tres reintentos mediante cola TTL de 10 s y luego DLQ. El bridge conserva cambios observados y publicación pendiente en una transacción propia.

## Alternativas

Procesar sin deduplicar puede duplicar auditorías. Prometer exactly-once extremo a extremo se descarta porque no hay una transacción común entre todos los componentes. Reintentar sin límite puede bloquear el sistema y ocultar errores permanentes.

## Consecuencias

La entrega puede repetirse y el efecto se deduplica por ID. Un mismo ID con contenido distinto se considera duplicado; todavía falta política de conflictos. No hay control de versión por entidad para eventos fuera de orden. La outbox del observador no cubre cambios no observados en Jeroky. Faltan X2 con 20 eventos, caída del broker y métricas de retraso. La rotación y limpieza de IDs procesados requieren una política futura.
