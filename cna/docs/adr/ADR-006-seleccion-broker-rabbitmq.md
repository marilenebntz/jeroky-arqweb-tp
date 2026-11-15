# ADR-006 — Selección del broker de eventos

- **Estado:** Aceptado
- **Fecha:** 2026-11-15
- **Decisión:** RabbitMQ
- **Alcance:** Arquitectura Cloud Native de Jeroky Soft

## Contexto

Los microservicios deben comunicarse mediante eventos asíncronos. El broker debe soportar mensajes durables, confirmación de procesamiento, reintentos y una cola de mensajes no procesables.

Estas capacidades son necesarias para demostrar:

- Recuperación de consumidores.
- Cero pérdida de eventos.
- Procesamiento idempotente.
- Dead Letter Queue.
- Evidencias reproducibles en Docker Compose.

## Alternativas consideradas

### RabbitMQ

Permite utilizar exchanges, colas durables, acknowledgements, reintentos y Dead Letter Exchanges. También dispone de una interfaz de administración útil para las evidencias del TP.

### NATS JetStream

Es una alternativa válida y liviana, con streams persistentes y consumidores durables. Requiere documentar con mayor detalle la configuración de streams y políticas de retención.

### Redis Pub/Sub

Fue descartado como broker principal porque Pub/Sub no garantiza la persistencia de mensajes publicados mientras un consumidor está desconectado. Redis Streams podría resolver parte de este problema, pero no es la alternativa prioritaria para este trabajo.

## Decisión

Se utilizará RabbitMQ como broker de eventos del TP2.

Los eventos serán publicados mediante exchanges y consumidos por colas durables independientes:

- `search-svc.events`
- `audit-svc.events`
- `export-svc.events`

Los consumidores deberán confirmar los mensajes únicamente después de completar el procesamiento. Los mensajes que fallen repetidamente serán enviados a una Dead Letter Queue.

## Flujo esperado

```text
Monolito Jeroky
      ↓
event-bridge
      ↓
RabbitMQ exchange
      ├── search-svc.events
      ├── audit-svc.events
      └── export-svc.events
```

## Consecuencias positivas

- Permite demostrar durabilidad y recuperación de eventos.
- Facilita la prueba de consumidores detenidos.
- Permite configurar reintentos y DLQ.
- Cuenta con una interfaz visual para obtener evidencias.
- Se integra fácilmente mediante Docker Compose.

## Consecuencias y cuidados

- Se agrega un componente de infraestructura que debe monitorearse.
- Las credenciales deben configurarse mediante variables de entorno.
- El puerto de administración no debe exponerse públicamente.
- Las colas y exchanges deben declararse de forma reproducible.
- Se debe documentar la política de reintentos y retención.

## Relación con los criterios de aceptación

- **CA-3:** permite entregar eventos de actualización al buscador.
- **CA-5:** permite que el monolito continúe funcionando si un consumidor se detiene.
- **CA-6:** permite demostrar recuperación sin pérdida de eventos.
- **CA-7:** se incluirá en el despliegue reproducible del TP2.

## Evidencias previstas

- RabbitMQ levantado y saludable.
- Exchange y colas creadas.
- Evento publicado correctamente.
- Consumidor detenido con mensajes pendientes.
- Consumidor reiniciado y mensajes procesados.
- Mensaje duplicado procesado de forma idempotente.
- Mensaje fallido enviado a la DLQ.
