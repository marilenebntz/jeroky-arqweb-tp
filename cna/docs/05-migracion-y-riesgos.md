# Plan de migración y riesgos

## Situación y criterio de avance

Este plan se registra después del prototipo funcional. La selección de Jeroky y las equivalencias requieren aceptación del docente; no se registra una autorización no comprobada. Las reglas del PDF siguen siendo la referencia.

| Paso | Orden y motivo | Criterio de hecho | Situación |
|---|---|---|---|
| Aislar laboratorio | Evitar afectar datos habituales | Bases y redes independientes y datos ficticios | Comprobado localmente |
| Copia de lectura para búsqueda | Bajo riesgo sobre escrituras académicas | Alta, actualización y baja por evento, consulta por gateway | Prototipo; falta FTS, enlaces y latencia menor a 5 s |
| Auditoría de eventos | Reutiliza contratos y broker | Duplicados sin doble registro y recuperación de 20 eventos | Prototipo; falta actor, fechas y prueba exacta X2 |
| Reportes asíncronos | Separar generación del pedido HTTP | Trabajo, worker, MinIO y URL temporal; recuperación X3 | Job y Markdown funcionan; almacenamiento final pendiente |
| Gateway como entrada | Centralizar política de acceso | 443, TLS 1.3, cabeceras, límites y errores uniformes | TLS y límites probados en 3443; acceso final pendiente |
| Operación y entrega | Medir y reproducir | Métricas, trazas, pruebas y arranque limpio | Pendiente |

## Reversión propuesta

Búsqueda, auditoría y exportación nuevas todavía no reemplazan todas las pantallas del monolito. Ante falla se puede desactivar temporalmente una ruta /v2/ con un 503 explícito y mantener / y /api/ del monolito. Eso no equivale a implementar automáticamente la función equivalente en Jeroky.

Para una reversión funcional se debe identificar y probar primero el endpoint o pantalla equivalente de Jeroky. Después guardar la configuración previa de Nginx, cambiar la ruta, ejecutar nginx -t y recargar solo si la validación pasa. Medir desde el inicio del cambio hasta la comprobación final y demostrar menos de un minuto. Esta medición y el fallback funcional todavía no se realizaron.

Conservar los volúmenes nuevos y los mensajes pendientes al revertir. No usar down -v. La base habitual no participa en estas operaciones.

## Matriz de riesgos

Escala de probabilidad e impacto de 1 bajo a 3 alto. El producto sirve para priorizar, no es una medición estadística.

| Riesgo | P | I | Total | Mitigación y estado |
|---|---|---|---|---|
| Cambios intermedios omitidos por polling | 3 | 3 | 9 | Integración por eventos de origen; pendiente. No afirmar captura completa |
| Datos atrasados visibles al usuario | 3 | 2 | 6 | Medir latencia y definir SLO; intervalo actual 10 s no cumple CA-3 |
| Consumo de RAM | 3 | 3 | 9 | Límites por servicio y docker stats; falta presupuesto y medición |
| Latencia de red entre VM | 2 | 2 | 4 | Prueba de latencia, timeout y backoff; no evaluado en varias VM |
| Credenciales compartidas o con permisos excesivos | 2 | 3 | 6 | Usuarios de lectura por servicio y rotación; actualmente bridge y worker comparten acceso de laboratorio |
| Gateway como punto único de falla | 2 | 3 | 6 | Configuración versionada y recuperación probada; falta prueba de caída del gateway |
| Corte del broker al arrancar | 3 | 2 | 6 | Readiness y reintentos de conexión. Ya se observaron reinicios tras reiniciar Docker |
| SQLite limita réplicas entre nodos | 3 | 3 | 9 | Almacén externo compartido por cada servicio escalable; alternativa a SQLite pendiente |
| Worker muere con trabajo running | 2 | 3 | 6 | Lease de 120 s implementado; falta probar toma por otro worker |
| Volver a ejecutar configuración antigua | 2 | 3 | 6 | Avisos en README; usar solo aislado. Montaje antiguo conserva volúmenes |
| Adaptación no aceptada | 2 | 3 | 6 | Consultar al docente y documentar brechas; no suponer excepciones |

## Brechas que impiden declarar terminado el TP

Faltan la prueba CA-2 equivalente, meta CA-3, acceso CA-4, experimento completo CA-5, auditoría con 20 eventos CA-6 y despliegue limpio CA-7. El prototipo no demuestra por sí solo esos criterios. También faltan healthz/readyz/metrics, pruebas automatizadas, observabilidad y endurecimiento de imágenes.
