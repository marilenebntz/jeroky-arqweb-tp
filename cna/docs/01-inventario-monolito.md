# Inventario de Jeroky y selección de servicios

Estado reconstruido a partir del código y la base el 16 de noviembre de 2026. Documentamos después de implementar la primera versión; no presentamos este análisis como una actividad previa que ya habíamos realizado.

## Tablas reales

La consulta a information_schema de jeroky_arqui devolvió 12 tablas y 12 claves foráneas. [Resultado y consultas](../evidencias/F5-E1-esquema-postgresql.txt). Falta la captura formal con usuario y hostname.

| Entidad | Tabla | Fuente dentro de src |
|---|---|---|
| AcademicPeriod | academic_periods | `academic-periods/entities/academic-period.entity.ts` |
| Attendance | attendances | `attendance/entities/attendance.entity.ts` |
| AuditLog | audit_logs | `audit/entities/audit-log.entity.ts` |
| Communication | communications | `communications/entities/communication.entity.ts` |
| CommunicationLog | communication_logs | `communications/entities/communication-log.entity.ts` |
| Course | courses | `courses/entities/course.entity.ts` |
| CourseSchedule | course_schedules | `courses/entities/course-schedule.entity.ts` |
| Enrollment | enrollments | `students/entities/enrollment.entity.ts` |
| Grade | grades | `grades/entities/grade.entity.ts` |
| Student | students | `students/entities/student.entity.ts` |
| Tutor | tutors | `students/entities/tutor.entity.ts` |
| User | users | `users/entities/user.entity.ts` |

## Responsabilidades

- Usuarios y autenticación conservan las cuentas, roles e inicio de sesión. AuthService consulta UsersService; esa dependencia indirecta no aparece como una inyección directa de repositorio en la matriz.
- Alumnos mantiene alumnos, tutores y matrículas y consulta cursos. También depende de FacesService.
- Cursos administra cursos y horarios; sus relaciones enlazan docentes con usuarios.
- Calificaciones consulta alumnos y cursos. Períodos académicos también consulta calificaciones y cursos.
- Asistencia utiliza alumnos, matrículas y cursos para registrar asistencia.
- Comunicaciones administra comunicados y registros de envío. RecipientResolverService consulta usuarios, tutores, alumnos y matrículas.
- Auditoría interna conserva audit_logs. SystemService usa AuditService para registrar operaciones; no es una auditoría completa de cada cambio de alumno.
- SystemService consulta alumnos, cursos, matrículas y calificaciones para sus operaciones administrativas.
- Faces y Mail son integraciones transversales sin repositorios TypeORM propios detectados en esta revisión. El laboratorio no prueba AWS real ni envíos reales de correo.

## Funcionalidades seleccionadas

| Servicio nuevo | Datos propios | Integración actual | Límite de la adaptación |
|---|---|---|---|
| search-svc | SQLite con documents y processed_events | Consume cambios de alumnos desde RabbitMQ | Copia de lectura; no reemplaza todas las búsquedas de la interfaz ni implementa aún FTS, resaltado y enlaces |
| audit-svc | SQLite con events | Consume cambios observados por el bridge | Convive con audit_logs; el evento no identifica todavía al usuario que editó |
| export-svc | SQLite con jobs y resultado Markdown | API y worker que consulta REST de Jeroky | Falta MinIO, URL prefirmada y eventos de trabajos |
| event-bridge | SQLite con snapshots y outbox | Consulta alumnos por REST y publica en RabbitMQ | Componente de plataforma; no cuenta como cuarto servicio extraído |

Los microservicios no comparten las tablas del monolito. Son funcionalidades complementarias en una migración progresiva; todavía no se sustituyeron todas sus equivalentes en la interfaz original.

## Fuente y alcance

Se revisó la copia de fuentes en cna/infra/aislado/.runtime/backend/src. Esa carpeta está ignorada por Git. La preparación de fuentes se documenta en [el entorno aislado](../infra/aislado/README.md). Las relaciones SQL se comprobaron en la base local del laboratorio; las responsabilidades se deducen del código, no de una traza de consultas ejecutadas.
