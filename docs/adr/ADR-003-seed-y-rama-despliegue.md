# ADR-003: Confirmación de rama de despliegue y seed de base de datos

- Fecha: 2026-09-14
- Estado: Aceptada

## Contexto

Durante la verificación de Hito 2 se instaló inicialmente la rama `master` de
ambos repositorios (con todos los módulos funcionales) para validar que el
stack (Docker, PostgreSQL, backend, frontend) funcionaba de punta a punta. Al
intentar iniciar sesión con las credenciales de ejemplo (`admin@jeroky.com` /
`admin123`) se recibió "Credenciales inválidas" pese a que el backend
arrancaba sin errores.

## Diagnóstico

Se verificaron las variables de entorno del backend (`docker compose exec
backend env`) para obtener las credenciales de PostgreSQL, y se consultó
directamente la tabla `users`:

```
docker compose exec -e PGPASSWORD=... db psql -U postgres -d jeroky_soft_db \
  -c "SELECT email, role FROM users;"
```

Resultado: `(0 rows)`. La tabla de usuarios estaba vacía porque nunca se había
ejecutado el script de siembra inicial del backend (`npm run db:seed`,
definido en `package.json` como `ts-node src/database/run-seed.ts`).

## Decisión

1. Ejecutar `docker compose exec backend npm run db:seed` para poblar la base
   de datos con los usuarios de prueba (admin, docentes, operador) y demás
   datos ficticios.
2. Cambiar ambos repositorios (backend y frontend) de `master` a la rama
   `release/1`, que es la versión oficial a entregar en el TP (solo módulo de
   Alumnos funcional; el resto en construcción, por diseño).
3. Reconstruir los contenedores (`docker compose down && docker compose up -d
   --build`) para asegurar que corren con el código de `release/1`.
4. Preservar el cambio local en `frontend/next.config.ts`
   (`allowedDevOrigins: ["192.168.0.17"]`) usando `git stash` / `git stash pop`
   al cambiar de rama, ya que es necesario para que Next.js acepte solicitudes
   dirigidas a la IP de la VM.

## Consecuencias

- El volumen `postgres_data` es persistente: los usuarios sembrados
  sobrevivieron al `docker compose down` y rebuild.
- Se documenta como paso obligatorio de instalación reproducible: **toda
  instalación nueva de Jeroky requiere correr el seed antes del primer login.**
  Esto se agrega a `docs/ficha-tecnica.md` y deberá incluirse en el
  procedimiento reproducible del informe final (sección 7 de la consigna).
- Los hashes de commit finales quedan registrados en `docs/ficha-tecnica.md`
  y en `evidencias/fase-1/F1-E02b-commits-release1.png`.
