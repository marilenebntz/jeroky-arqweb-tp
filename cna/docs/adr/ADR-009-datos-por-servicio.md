# ADR-009 Datos propios por servicio

Estado: implementado como prototipo SQLite; equivalencia con la guía pendiente. Fecha: 2026-11-16.

## Contexto

El monolito tiene tablas compartidas y relaciones académicas. Los servicios necesitan almacenar copias sin depender de ese esquema.

## Decisión

PostgreSQL queda en Jeroky. Search, audit y bridge usan cada uno su archivo SQLite y volumen. Export API y worker comparten solo el volumen de su propio servicio. API REST y eventos son el límite de integración.

## Alternativas

PostgreSQL por servicio permite conexiones concurrentes y facilita réplicas distribuidas, con mayor configuración. Meilisearch o PostgreSQL FTS cumplen mejor las funciones de búsqueda de la guía. Redis para jobs y MinIO para reportes resuelven capacidades que todavía faltan. Compartir la base del monolito se descarta por acoplamiento.

## Consecuencias

Los volúmenes permiten recrear un contenedor sin borrar su archivo. Hay bloqueos y límites de concurrencia de SQLite; compartir archivos locales no equivale a una base distribuida. No se debe afirmar escalado multinodo del worker. El reporte en SQLite no cumple por sí solo MinIO y URL prefirmada. No se probó aún destrucción y recreación completa en checkout limpio.
