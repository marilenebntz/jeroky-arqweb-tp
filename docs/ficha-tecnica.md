# Ficha técnica inicial - Jeroky Soft

## Identificación

- Aplicación: Jeroky Soft.
- Propósito: sistema de gestión integral para una academia de danza.
- Modalidad: aplicación web con frontend, API backend y persistencia relacional.
- Licencia: MIT en la rama `release/1`.
- Sistema objetivo del TP: máquina virtual con Ubuntu Server 24.04 LTS o equivalente.

## Componentes

| Componente | Tecnología principal | Versión observada | Puerto previsto |
|---|---|---:|---:|
| Frontend | Next.js / React / TypeScript | Next.js 16.2.6; React 19.2.4 | 3000 |
| Backend | NestJS / TypeScript / Node.js | NestJS 11; Node.js 22 en Docker | 3001 |
| Base de datos | PostgreSQL | Por confirmar durante la instalación | 5432 |
| Proxy inverso | Nginx | Por instalar en la VM | 80 y 443 |

## Dependencias relevantes

- Backend: TypeORM, PostgreSQL driver, JWT, Passport, bcrypt, Swagger y AWS SDK para Rekognition.
- Frontend: React, React Hook Form, Zod, TanStack Table, MediaPipe y Recharts.
- Servicios externos previstos: Amazon Rekognition y Brevo. Su uso se realizará únicamente con secretos locales no versionados.

## Repositorios y versión inicial

- Backend: <https://github.com/marilenebntz/jerokybackend>, rama `release/1`.
- Frontend: <https://github.com/marilenebntz/jerokyfrontend>, rama `release/1`.
- Los hashes deben actualizarse nuevamente al congelar la versión que se instalará en la VM.

## Observaciones y riesgos iniciales

1. El archivo `.env.example` del backend declara `PORT=3000`, mientras que el código, README y Dockerfile utilizan el puerto 3001. Debe corregirse antes del despliegue.
2. El archivo `docker-compose.yml` utilizado localmente todavía debe incorporarse a este repositorio sin secretos.
3. La documentación del frontend conserva contenido genérico de Next.js y deberá ampliarse para explicar Jeroky.
4. Docker será un componente auxiliar; el equipo documentará redes, puertos, volúmenes, procesos y recorrido de solicitudes.
