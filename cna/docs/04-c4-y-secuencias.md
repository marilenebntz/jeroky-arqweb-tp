# Arquitectura y secuencias actuales

Estos diagramas describen lo implementado al 16 de noviembre de 2026. No incluyen MinIO, observabilidad o webhooks como si estuvieran desplegados. Los diagramas son fuentes Mermaid para F5-E5, F5-E6 y F5-E7; falta exportar las figuras finales del informe.

## C4 nivel 1 contexto

```mermaid
flowchart LR
 P[Personal académico]
 J[Jeroky del laboratorio]
 CN[Servicios de Arquitectura]
 P -->|gestión de alumnos| J
 P -->|búsqueda auditoría y reportes por HTTPS| CN
 CN -->|lectura REST autenticada| J
 O[Jeroky habitual]
 P -.->|uso separado fuera del TP| O
```

Jeroky habitual y laboratorio tienen bases y redes separadas. El conjunto del laboratorio se ejecuta en Docker Desktop en un solo equipo; no presentamos esto como un clúster de varias VM.

## C4 nivel 2 contenedores

```mermaid
flowchart TB
 U[Cliente de laboratorio]
 subgraph LAB[Equipo local con Docker Desktop y red cna-arqui_default]
  GW[Nginx gateway HTTPS interno 8443]
  F[Frontend Next.js puerto 3000]
  API[Backend NestJS puerto 3001]
  PG[(PostgreSQL jeroky_arqui puerto 5432)]
  B[Event bridge consulta cada 10 s]
  BO[(SQLite snapshots y outbox)]
  MQ[RabbitMQ AMQP 5672]
  S[Search API y consumidor puerto 3000]
  SD[(SQLite documentos y eventos)]
  A[Audit API y consumidor puerto 3000]
  AD[(SQLite eventos)]
  E[Export API puerto 3000]
  W[Export worker]
  ED[(SQLite trabajos y reportes)]
  GW -->|HTTP /| F
  GW -->|HTTP /api| API
  F -->|HTTP /api mediante rewrite| API
  API -->|SQL| PG
  B -->|HTTP autenticado /api/students| API
  B --> BO
  B -->|AMQP con confirmación| MQ
  MQ -->|AMQP manual ack| S
  MQ -->|AMQP manual ack| A
  S --> SD
  A --> AD
  GW -->|HTTP /v2/search| S
  GW -->|HTTP /v2/audit| A
  GW -->|HTTP /v2/exports| E
  E --> ED
  W -->|reserva y actualiza trabajos| ED
  W -->|HTTP autenticado| API
 end
 U -->|HTTPS localhost 3443| GW
```

El puerto HTTP 3180 redirige a 3443. Todavía hay puertos loopback de diagnóstico: frontend 3100, backend 3101, audit 3102, search 3103, export 3104, AMQP 5682 y panel 15682. PostgreSQL no publica puerto. Falta el ajuste de entrega a 443 y la revisión de acceso único exigida por CA-4.

## Secuencia edición e indexación

```mermaid
sequenceDiagram
 actor U as Usuario
 participant J as Jeroky laboratorio
 participant B as Bridge
 participant O as SQLite bridge
 participant Q as RabbitMQ
 participant S as Search
 participant A as Audit
 U->>J: Editar alumno autenticado
 J-->>U: Resultado del cambio
 loop Cada 10 segundos
  B->>J: Login y GET alumnos
  alt Lectura válida
   J-->>B: Lista actual
   B->>O: Transacción snapshots y outbox
   B->>Q: Publicar evento persistente
   alt Broker confirma y no devuelve mensaje sin ruta
    Q-->>B: Confirmación
    B->>O: Borrar pendiente
    Q->>S: Evento updated o deleted
    S->>S: Transacción documento y event_id
    S-->>Q: ACK tras guardar o detectar duplicado
    Q->>A: Mismo evento
    A->>A: Guardar con event_id único
    A-->>Q: ACK tras guardar o detectar duplicado
   else Publicación falla
    B->>O: Mantener pendiente
    Note over B,Q: Proceso sale y política de reinicio intenta recuperarlo
   end
  else API falla o datos inválidos
   Note over B,O: Mantener snapshot anterior y registrar error
  end
 end
 Note over S,A: Evento inválido va a DLQ; fallo de almacenamiento usa reintentos acotados
```

El request_id de polling identifica el lote observado. Todavía no es el mismo identificador de la edición HTTP. No se garantiza la meta menor a 5 s ni captura de cambios intermedios.

## Secuencia búsqueda con error

```mermaid
sequenceDiagram
 actor U as Cliente
 participant G as Gateway
 participant S as Search
 participant D as SQLite search
 U->>G: GET /v2/search por HTTPS
 G->>G: X-Request-ID y rate limit
 alt Límite superado
  G-->>U: 429 JSON con Retry-After
 else Solicitud admitida
  G->>S: HTTP con X-Request-ID
  alt Servicio disponible
   S->>D: Consulta parametrizada y paginación
   D-->>S: Documentos
   S-->>G: 200 JSON
   G-->>U: 200 y X-Request-ID
  else Conexión rechazada o timeout de upstream
   G-->>U: 503 JSON y X-Request-ID
  end
 end
```

Un parámetro inválido devuelve 400; una falla interna SQL devuelve 500. Nginx transforma 502, 503 y 504 en su respuesta uniforme 503. El identificador se envía al servicio, pero sus consultas HTTP todavía no lo registran de punta a punta.

## Secuencia exportación con error

```mermaid
sequenceDiagram
 actor U as Cliente
 participant G as Gateway
 participant E as Export API
 participant D as SQLite jobs
 participant W as Worker
 participant J as Jeroky
 U->>G: POST /v2/exports
 G->>E: Pedido Markdown
 E->>D: Insertar queued
 E-->>U: 202 job_id mediante gateway
 W->>D: Reservar trabajo con lease de 120 s
 W->>J: Login y consulta alumnos
 alt Consulta y generación correctas
  J-->>W: Datos
  W->>D: Guardar Markdown y completed si conserva lease
 else Falla de consulta o generación
  W->>D: failed con error genérico
 end
 U->>G: GET estado
 G->>E: Consultar job
 E-->>U: 200 con estado mediante gateway
 U->>G: GET download
 G->>E: Descargar
 alt Estado completed
  E-->>U: 200 Markdown mediante gateway
 else Estado pendiente o fallido
  E-->>U: 409 mediante gateway
 end
 Note over W,D: Si el worker muere, otro puede reclamar al vencer lease; falta prueba de interrupción
```

Un job inexistente devuelve 404. Se usa completed en lugar de done y se descarga directamente. Todavía no hay MinIO, URL prefirmada ni eventos export.requested/export.completed.
