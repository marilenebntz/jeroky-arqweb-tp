# Ficha técnica - Jeroky Soft

## Identificación

- Aplicación: Jeroky Soft.
- Propósito: sistema de gestión integral para una academia de danza.
- Modalidad: aplicación web con frontend, API backend y persistencia relacional.
- Licencia: MIT en la rama `release/1` (ver ADR-002).
- Sistema objetivo del TP: máquina virtual con Ubuntu Server 24.04.5 LTS (arm64) en UTM.

## Componentes

| Componente | Tecnología principal | Versión | Puerto en la VM |
|---|---|---:|---:|
| Frontend | Next.js / React / TypeScript | Next.js 16.2.6; React 19.2.4 | 3000 (interno y publicado) |
| Backend | NestJS / TypeScript / Node.js | NestJS 11; Node.js 22 (Alpine, Docker) | 3001 (publicado), 3000 (interno del contenedor) |
| Base de datos | PostgreSQL | postgres:16-alpine | 5432 |
| Proxy inverso | Nginx | 1.24.0 (paquete Ubuntu 24.04) | 80 (publicado, redirige a frontend :3000) |

## Dependencias relevantes

- Backend: TypeORM, driver `pg` (PostgreSQL), JWT + Passport, bcrypt, Swagger,
  class-validator/class-transformer, AWS SDK para Rekognition (biometría facial).
- Frontend: React, React Hook Form, Zod, TanStack Table, MediaPipe, Recharts.
- Servicios externos previstos: Amazon Rekognition y Brevo (email transaccional).
  Sus credenciales son placeholders de ejemplo en el repositorio (no reales) y se
  usarán con secretos locales no versionados cuando corresponda.

## Repositorios y versión desplegada

- Backend: <https://github.com/marilenebntz/jerokybackend>, rama `release/1`,
  commit `0b8a878e8e60de0dfb7869b402e7bde6c1566a56`.
- Frontend: <https://github.com/marilenebntz/jerokyfrontend>, rama `release/1`,
  commit `3b41d84db80d2101a826c5ff06cac6ff86f6216e`.
- Ambos commits corresponden al mensaje "chore: declare MIT license" (ver ADR-002).
- La rama `release/1` incluye únicamente el módulo de Alumnos con funcionalidad
  completa; el resto de los módulos (Calendario Académico, Oferta Académica,
  Matrículas, Control de Asistencia, Cargar Calificaciones, Mensajería, Usuarios
  y Permisos) se muestran como "En construcción", lo cual es el comportamiento
  esperado para esta rama y no un defecto de instalación.

## Configuración reproducible

- Orquestación: `docker-compose.yml` con 3 servicios (`db`, `backend`, `frontend`).
  Ver copia sin secretos en `config/docker-compose.yml`.
- Backend y frontend se construyen desde `Dockerfile.dev` (`npm run start:dev` /
  `npm run dev`), ya que Docker se usa como componente auxiliar de desarrollo;
  el equipo documenta explícitamente redes, puertos, volúmenes y procesos.
- El volumen `postgres_data` persiste los datos entre reinicios de contenedores.
- El frontend requiere la variable `allowedDevOrigins: ["192.168.0.17"]` en
  `next.config.ts` (cambio local respecto del repositorio original) para que
  Next.js acepte solicitudes dirigidas a la IP de la VM en modo desarrollo.
- La base de datos requiere ejecutar el seed inicial (`npm run db:seed` dentro
  del contenedor backend) para crear los usuarios de prueba; sin este paso la
  tabla `users` queda vacía y el login falla con "Credenciales inválidas"
  (hallazgo documentado en ADR-003).
- Nginx se instaló directamente en la VM (no en contenedor) como punto de
  entrada en el puerto 80, haciendo proxy_pass hacia el frontend en
  `localhost:3000`. Configuración en `config/nginx-jeroky.conf`.

## Puertos previstos vs. confirmados

| Puerto | Servicio | Alcance |
|---:|---|---|
| 22 | SSH (sshd) | Administración desde el anfitrión |
| 80 | Nginx (proxy inverso) | Punto de entrada público de la app |
| 3000 | Frontend Next.js | Publicado (0.0.0.0), consumido por Nginx |
| 3001 | Backend NestJS (API) | Publicado (0.0.0.0), consumido por el frontend |
| 5432 | PostgreSQL | Publicado (0.0.0.0) — pendiente de restringir en Hito 4 |

## Observaciones y riesgos

1. El puerto 5432 (PostgreSQL) está expuesto en todas las interfaces
   (`0.0.0.0:5432`), no solo en localhost/Docker. Se documentará y corregirá con
   firewall en el Hito 4 (Seguridad y resiliencia).
2. El archivo `.env.example` original del backend declaraba `PORT=3000`
   mientras que el resto de la configuración usa 3001; se mantiene 3001 como
   fuente de verdad (coincide con Dockerfile.dev y docker-compose.yml).
3. Los valores de `JWT_SECRET`, `AWS_ACCESS_KEY_ID/SECRET`, `BREVO_API_KEY` en
   el `.env` del backend son placeholders de ejemplo, no credenciales reales.
4. Documentación del frontend pendiente de ampliar para explicar Jeroky
   específicamente (hereda contenido genérico de Next.js).
