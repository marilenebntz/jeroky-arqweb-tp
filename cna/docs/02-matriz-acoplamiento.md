# Matriz de acoplamiento

**D** indica repositorio inyectado directamente en el módulo. **R** indica relación declarada hacia una tabla que el módulo no inyecta directamente. **—** indica que no se identificó una de esas dependencias. Una inyección no demuestra por sí sola lectura o escritura de todas las tablas en cada operación.

| Módulo | academic_periods | attendances | audit_logs | communication_logs | communications | course_schedules | courses | enrollments | grades | students | tutors | users |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| academic-periods | D | — | — | — | — | — | D | — | D | — | — | — |
| attendance | — | D | — | — | — | — | D | D | — | D | — | — |
| audit | — | — | D | — | — | — | — | — | — | — | — | — |
| communications | — | — | — | D | D | — | — | D | — | D | D | D |
| courses | — | — | — | — | — | D | D | — | — | — | — | R |
| grades | — | — | — | — | — | — | D | — | D | D | — | — |
| students | — | — | — | — | — | — | D | D | — | D | D | R |
| system | — | — | — | — | — | — | D | D | D | D | — | — |
| users | — | — | — | — | — | — | — | — | — | — | — | D |

## Qué acoplamientos encontramos

Students, Grades, Attendance, Communications y System comparten dependencias con students. Courses aparece en alumnos, calificaciones, asistencia, períodos y sistema. Extraer estos módulos moviendo tablas afectaría reglas y claves foráneas compartidas.

Por eso mantuvimos la escritura académica en Jeroky y agregamos copias propias para búsqueda y auditoría mediante contratos. Exportación consulta REST. El precio es la consistencia eventual y una segunda representación de datos que puede quedar atrasada.

Las dependencias indirectas también importan: Auth usa UsersService, System usa AuditService, Students usa FacesService y Communications usa su resolvedor de destinatarios y correo. La tabla no reemplaza el mapa de contextos.

## Trazabilidad de la revisión

Inyecciones encontradas en archivos de producción dentro de src:

```text
academic-periods/academic-periods.service.ts -> AcademicPeriod -> academic_periods
academic-periods/academic-periods.service.ts -> Grade -> grades
academic-periods/academic-periods.service.ts -> Course -> courses
attendance/attendance.service.ts -> Attendance -> attendances
attendance/attendance.service.ts -> Student -> students
attendance/attendance.service.ts -> Enrollment -> enrollments
attendance/attendance.service.ts -> Course -> courses
audit/audit.service.ts -> AuditLog -> audit_logs
communications/communications.service.ts -> Communication -> communications
communications/communications.service.ts -> CommunicationLog -> communication_logs
communications/domain/recipient-resolver.service.ts -> User -> users
communications/domain/recipient-resolver.service.ts -> Tutor -> tutors
communications/domain/recipient-resolver.service.ts -> Student -> students
communications/domain/recipient-resolver.service.ts -> Enrollment -> enrollments
courses/courses.service.ts -> Course -> courses
courses/courses.service.ts -> CourseSchedule -> course_schedules
grades/grades.service.ts -> Grade -> grades
grades/grades.service.ts -> Student -> students
grades/grades.service.ts -> Course -> courses
students/students.service.ts -> Student -> students
students/students.service.ts -> Tutor -> tutors
students/students.service.ts -> Enrollment -> enrollments
students/students.service.ts -> Course -> courses
system/system.service.ts -> Student -> students
system/system.service.ts -> Course -> courses
system/system.service.ts -> Enrollment -> enrollments
system/system.service.ts -> Grade -> grades
users/users.service.ts -> User -> users
```

[Inventario y evidencia de la base](01-inventario-monolito.md).
