# ADR-006 Migración e integración

Estado: adoptado para el prototipo con brechas abiertas. Fecha de registro: 2026-11-16. No implica aprobación del docente.

## Contexto

La guía plantea Strangler Fig y BookStack por REST y webhooks. Usamos Jeroky y preservamos su código; todavía no se comprobó aceptación de esa aplicación alternativa.

## Decisión

Mantener el monolito y construir copias de lectura y reportes como servicios. El laboratorio tiene datos y red propios. Bridge y worker consultan la API, no PostgreSQL. El bridge actual usa polling cada 10 s y una outbox propia.

## Alternativas

Webhook emitido al confirmar cada cambio: preferido para capturar operaciones, pero no está disponible en el recorrido de alumnos inspeccionado sin adaptación adicional. CDC u outbox del monolito: más cobertura, pero aumenta complejidad o requiere cambios no autorizados. Leer tablas directamente: descartado porque rompe el límite de integración.

## Consecuencias

Se puede probar sin modificar el código habitual. A cambio, polling omite cambios intermedios, no propaga el actor ni el request_id de origen y no garantiza menos de 5 s. La guía califica polling como parcial. La migración todavía no reemplaza todas las funciones del monolito y no se considera terminada.
