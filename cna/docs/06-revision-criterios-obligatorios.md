# Revisión de criterios obligatorios y prioridades de entrega

Revisión: 17 de noviembre de 2026. Referencia: guía oficial
`TP_Integrador_II_BookStack_Cloud_Native.pdf`, tabla 2 (página 4), sección 7.1 y
entregables/reglas (página 16). Se revisaron código, configuración y evidencias
versionadas; esta revisión no es una nueva ejecución de todos los experimentos.

La guía usa BookStack. Aquí se utiliza Jeroky y se documentan las diferencias;
no se presentan como excepciones autorizadas. La evaluación de su equivalencia
corresponde al docente. La sección 7.1 limita el puntaje a 50 si falta algún
CA-1 a CA-7, independientemente de los puntos acumulados. No se puede asegurar
la aprobación ni estimar una nota contando capturas o commits.

## Siete criterios mínimos

| Criterio de la guía | Estado técnico de Jeroky | Evidencia y brecha concreta |
| --- | --- | --- |
| CA-1: al menos tres servicios con contenedor y datos propios | Comprobado en laboratorio, sujeto a equivalencia funcional | Search, audit y export tienen contenedores, volúmenes SQLite separados y pruebas funcionales. Export API y worker comparten su almacén de trabajos, no el de los otros servicios. Esto no acredita todos los requisitos específicos de B2. |
| CA-2: login, creación y edición del monolito siguen funcionando | Parcial | La prueba de 20 alumnos usa login y POST/PATCH reales del backend aislado; hay capturas anteriores de la interfaz. Falta una prueba consolidada actual por el gateway que muestre login y creación/edición en la interfaz y su correspondencia con el TP I. No confundir respuesta 307 del frontend con página final 200. |
| CA-3: editar actualiza búsqueda en menos de cinco segundos | Umbral observado en diez muestras locales | Bridge con pausa configurable de 1000 ms. Diez PATCH secuenciales por gateway HTTPS, cada uno seguido hasta observar el nombre nuevo del mismo alumno en búsqueda. Máximo 1250,05 ms desde antes del PATCH. [Medición real](../evidencias/CA3-latencia-edicion-busqueda.json). No garantiza latencia bajo carga ni captura de estados intermedios; polling sigue siendo integración parcial B4. |
| CA-4: entrada externa única por 443, TLS 1.3 | Comprobado en la VM desde la Mac, con alcance de puertos ensayados | Sitio arqui.local en Nginx del host: búsqueda HTTPS 443 respondió 200 desde Mac con certificado verificado; HTTP 80 redirigió 301; OpenSSL dentro de Ubuntu negoció TLS 1.3 y verificó arqui.local. UFW activo permite 22/80/443 y servicios Docker publicados solo en loopback. Los siete puertos de diagnóstico ensayados no aceptaron conexión desde Mac. [Resumen y capturas](../evidencias/CA4-vm-verificacion.md). No es un escaneo exhaustivo ni una prueba IPv6. Falta demostrar el acceso desde la red del docente y comprobar por HTTP el sitio TP1 después de instalar arqui. |
| CA-5: monolito devuelve 200 con cualquier microservicio caído | Comprobado en tres caídas individuales locales | Search, audit y export detenidos por separado: su ruta devolvió 503 JSON, frontend final 200 después de redirección, login y consulta autenticada de alumnos operativos por gateway HTTPS. Cada servicio recuperado con readiness y ruta funcional. [Resultados](../evidencias/CA5-degradacion-monolito.json). No acredita caídas simultáneas, de nodo ni autorrecuperación tras kill. |
| CA-6: reiniciar consumidor sin perder eventos de la caída | Comprobado en el alcance ensayado | Auditoría detenida 120 s; 20 PATCH en 20 alumnos ficticios; 20 event_id del bridge correlacionados con 20 eventos almacenados una vez. Otra prueba confirma idempotencia ante un duplicado. No acredita caída del broker ni cambios intermedios rápidos de una misma entidad. |
| CA-7: repositorio limpio y arranque completo en un comando | Candidato verificado en clon local limpio | `levantar.sh` obtiene commits fijados de GitHub, genera secretos/certificado, prepara colas y arranca gateway y observabilidad. [Prueba de 12 componentes](../evidencias/F6-E16-arranque-limpio.json): clon sin fuentes/secretos previos con los cuatro archivos candidatos del bootstrap, proyecto/red/volúmenes nuevos y override sin puertos para no colisionar. Login, seed, búsqueda HTTPS y frontend final 200 comprobados. Cachés Docker compartidas; falta repetir desde el commit publicado en otra computadora/VM con los puertos normales. |

Evidencias principales: [20 ediciones reales](../evidencias/F7-E2-ediciones-jeroky.json),
[entrega y duplicado](../evidencias/F7-E2-consumidor-detenido.json),
[worker interrumpido](../evidencias/F7-E3-worker-interrumpido.json),
[panel RED](../evidencias/F7-E9-prometheus-grafana.json),
[alerta](../evidencias/F7-E12-alerta-servicio.json),
[TLS](../evidencias/gateway-tls13-resultado.txt),
[caída de búsqueda](../evidencias/gateway-search-caida-503.txt) y
[recuperación](../evidencias/gateway-search-recuperacion-200.txt).

## Orden propuesto para el trabajo restante

1. **Reproducibilidad CA-7 (candidato verificado).** Fuentes fijados, secretos,
   certificado, colas, gateway y observabilidad ya se preparan en un comando.
   Se probó en un clon limpio local con los archivos candidatos del bootstrap,
   sin importar datos del laboratorio. Después de publicar, repetir desde ese
   commit en otra computadora/VM con puertos normales y registrar el resultado.
   No borrar el laboratorio existente ni versionar los secretos generados.
2. **Latencia CA-3 (umbral observado).** Se cambió la pausa del bridge de 10 s
   a 1 s y se midieron diez ediciones reales por gateway HTTPS: máximo 1250,05 ms.
   Repetir en el entorno final y bajo carga. Mantener documentado que polling no
   equivale a webhook, no conserva necesariamente estados intermedios y no propaga
   el request_id original de la edición al evento.
3. **Despliegue CA-4 (comprobado desde la Mac).** La VM Ubuntu ya atiende
   arqui.local por 443 y redirige HTTP 301. Se guardaron verificaciones de certificado,
   TLS 1.3, UFW y siete puertos internos inaccesibles por la LAN. Falta repetir en
   la red de demostración y comprobar que el sitio TP1 sigue respondiendo por HTTPS.
4. **Pruebas CA-2 y CA-5 (degradación comprobada).** Ya se probaron las caídas
   individuales de search, audit y export, con frontend final 200, login y alumnos
   operativos por gateway HTTPS. Mantener como pendiente la demostración actual
   de login/crear/editar en la interfaz para consolidar CA-2 y repetir en la VM final.
5. **Entrega documental.** Consolidar matriz P26–P62 con enlaces, resultados y
   limitaciones; preparar informe PDF con la plantilla del TP I. Crear la etiqueta
   v2.0.0 solo sobre el commit final revisado y acordado; no sobre un avance.

Este orden prioriza los mínimos de aceptación. No implica que lo demás sea opcional.
La decisión de la equivalencia de Jeroky sigue siendo externa a esta revisión.

## Requisitos adicionales que siguen abiertos

- B2 búsqueda: se usa búsqueda de subcadenas en JSON/SQLite, no un motor FTS
  equivalente demostrado con resaltado y enlaces al monolito.
- B2 auditoría: no se registra automáticamente el actor de cada edición; faltan
  filtros por rango de fechas. El evento de polling no es un registro de acción
  de usuario completo.
- B2 exportación: hay Markdown, trabajos y worker, pero los reportes se guardan
  en SQLite; no hay MinIO ni URL prefirmada con expiración. El lease SQLite no
  equivale sin justificación al diseño Redis jobs + MinIO de la guía.
- S4 medios no implementado; la guía lo requiere para el máximo de B2.
- B3: faltan revisión de multi-stage, tags explícitos con versión/hash en los
  servicios construidos, límites CPU/RAM y read_only donde corresponda.
- B4: polling figura como logro parcial en la rúbrica; faltan webhook autenticado
  y credencial por servicio con permisos mínimos. Actualmente se usa el acceso
  administrativo del laboratorio para las consultas de bridge/worker.
- APIs nuevas sin autenticación. TLS y rate limiting no reemplazan control de acceso.
- Observabilidad: RED y alerta local sí existen. Faltan logs centralizados, traza
  distribuida y correlación de la misma edición desde HTTP a evento/worker;
  los request_id de polling son nuevos. No hay notificación externa de alerta.
- Operación: faltan comparación de carga monolito/servicio con dos concurrencias,
  escalado de workers 1 a 3, recursos, caída de nodo y ensayo de latencia/backoff/
  circuit breaker. Los ensayos ya realizados no reemplazan estos experimentos.
- Seguridad: faltan Trivy, SBOM, tratamiento de hallazgos y rotación comprobada de
  credenciales sin reconstrucción de imágenes.
- Evidencias: la guía pide prompt con usuario y hostname. Los JSON y textos
  conservan resultados reales, pero no sustituyen automáticamente las capturas
  formales. También falta revisar AsyncAPI con el validador específico.

## Qué no demuestra este documento

No es una certificación de cumplimiento ni una nota prevista. No marca como
resueltos problemas por estar descritos. La documentación de diseño es retrospectiva
 y el diagnóstico inicial `00-linea-base-y-brecha-tp2.md` se conserva como histórico.
