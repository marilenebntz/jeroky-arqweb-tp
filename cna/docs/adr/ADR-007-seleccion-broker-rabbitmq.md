# ADR-007 Selección del broker

Estado: adoptado en el prototipo. Fecha de actualización: 2026-11-16.

## Contexto

Necesitamos consumidores independientes, confirmación manual, persistencia y DLQ. La decisión se documentó inicialmente como ADR-006; se renumera a ADR-007 para coincidir con la guía. El historial Git conserva el documento anterior.

## Decisión

Usamos RabbitMQ. El exchange jeroky.events distribuye a jeroky.search y jeroky.audit. jeroky.retry y jeroky.dlx atienden reintentos y DLQ. Las definiciones reales están en ../../infra/rabbitmq/definitions.json. Exportación usa trabajos SQLite y no tiene una cola RabbitMQ propia en esta versión.

## Alternativas

NATS JetStream ofrece streams persistentes y consumidores durables; se descartó para este prototipo por el aprendizaje adicional necesario. Redis Streams permite grupos y pendientes, pero requiere diseñar recuperación y DLQ. Redis Pub/Sub no conserva por sí solo lo publicado durante una desconexión.

## Consecuencias

La interfaz de administración ayuda a verificar el recorrido. Se agregan memoria, credenciales, monitoreo y una dependencia de arranque. Un ACK debe seguir al almacenamiento, y la republicación debe confirmarse antes del ACK original. Aun así, con colas classic, una caída durante dead lettering requiere análisis adicional; las pruebas actuales no garantizan cero pérdida bajo toda falla del broker.
