# Mapa de contextos

Mapa de responsabilidades actual. Los límites internos del monolito son contextos de análisis; no son servicios desplegados independientes. Las flechas explican dependencias, no acceso SQL de los microservicios.

```mermaid
flowchart LR
 subgraph M[Monolito Jeroky]
  I[Identidad y permisos]
  A[Alumnos y matrículas]
  C[Oferta académica]
  G[Evaluación y períodos]
  T[Asistencia]
  N[Comunicaciones]
  AU[Auditoría interna]
  SYS[Operación administrativa]
  A -->|referencia cuentas| I
  A -->|matricula en cursos| C
  G -->|consulta| A
  G -->|consulta| C
  T -->|consulta| A
  T -->|consulta| C
  N -->|resuelve destinatarios| A
  N -->|consulta cuentas| I
  SYS -->|registra acciones| AU
 end
 B[Bridge como capa anticorrupción]
 Q[RabbitMQ]
 S[Búsqueda]
 U[Auditoría de cambios observados]
 E[Exportación]
 B -->|cliente REST de alumnos| A
 B -->|traduce a eventos comunes| Q
 Q -->|proveedor de eventos| S
 Q -->|proveedor de eventos| U
 E -->|cliente REST para reportes| A
```

Jeroky es proveedor de datos académicos; bridge y exportación son clientes. El bridge funciona como capa anticorrupción al transformar firstName y lastName en name y limitar los campos publicados. Búsqueda y auditoría reciben un contrato publicado independiente del esquema PostgreSQL.

No hay escritura inversa desde las copias hacia Jeroky. No hay transacción distribuida entre monolito, RabbitMQ y consumidores. La outbox del bridge es local al observador y no asegura capturar cada transacción del monolito.
