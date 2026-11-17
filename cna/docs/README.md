# Diseño de Arquitectura

Documentación revisada contra la guía oficial el 16 de noviembre de 2026.
Describe lo construido y distingue propuestas y pruebas pendientes. La elección de Jeroky no se presenta como excepción autorizada.

- [Inventario y tablas verificadas](01-inventario-monolito.md) — A1 y F5-E1.
- [Matriz de acoplamiento](02-matriz-acoplamiento.md) — A1 y F5-E2.
- [Mapa de contextos](03-contextos-ddd.md) — A1 y F5-E3.
- [Contratos](../contracts/README.md) — A3; validación específica y revisión final pendientes.
- [C4 y tres secuencias](04-c4-y-secuencias.md) — A4 y F5-E5 a F5-E7.
- [Migración, reversión y riesgos](05-migracion-y-riesgos.md) — A5.
- [ADR-006 integración](adr/ADR-006-migracion-e-integracion.md).
- [ADR-007 broker](adr/ADR-007-seleccion-broker-rabbitmq.md).
- [ADR-008 orquestación](adr/ADR-008-orquestacion.md).
- [ADR-009 datos](adr/ADR-009-datos-por-servicio.md).
- [ADR-010 consistencia](adr/ADR-010-consistencia-e-idempotencia.md).

El archivo 00-linea-base-y-brecha-tp2.md conserva el diagnóstico inicial y no representa el estado final. La numeración del ADR del broker se corrigió según la guía. Los documentos de diseño se prepararon retrospectivamente y no prueban que todo se hubiera diseñado antes de implementar.
