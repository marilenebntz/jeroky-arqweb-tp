# ADR-004: Habilitar `jeroky.local` en `allowedDevOrigins` del frontend

- Fecha: 2026-09-14
- Estado: Aceptada

## Contexto

Al configurar el nombre local `jeroky.local` (punto 5 del Hito 2) y actualizar
`server_name` en Nginx y `/etc/hosts` del anfitrión, la aplicación quedaba
indefinidamente en "Cargando panel institucional..." al acceder por
`http://jeroky.local/alumnos`, mientras que por `http://192.168.0.17/alumnos`
cargaba con normalidad.

## Diagnóstico

La consola del navegador (DevTools) mostró errores repetidos:

```
WebSocket connection to 'ws://jeroky.local/_next/webpack-hmr?id=...' failed.
```

Y en los logs del contenedor `jeroky-frontend`:

```
⚠ Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "jeroky.local".
Cross-origin access to Next.js dev resources is blocked by default for safety.
```

El servidor de desarrollo de Next.js (Turbopack) protege por defecto sus
recursos internos (HMR, Server Actions/RSC) contra solicitudes de orígenes no
declarados explícitamente. `next.config.ts` solo declaraba
`allowedDevOrigins: ["192.168.0.17"]` (agregado en ADR-003 para permitir el
acceso por IP), por lo que el nuevo origen `jeroky.local` quedaba bloqueado.

Adicionalmente se detectó que el contenedor `jeroky-frontend` no comparte el
código fuente en vivo con el host (no hay bind mount de `next.config.ts`): al
editar el archivo en `~/jeroky/frontend/next.config.ts` en la VM, el cambio no
se reflejaba dentro del contenedor (`docker compose exec frontend cat
next.config.ts` seguía mostrando solo la IP).

## Decisión

1. Editar el archivo directamente dentro del contenedor en ejecución:
   ```
   docker compose exec frontend sed -i \
     's/allowedDevOrigins: \["192.168.0.17"\]/allowedDevOrigins: ["192.168.0.17", "jeroky.local"]/' \
     next.config.ts
   ```
2. Reiniciar el proceso del frontend (`docker compose restart frontend`), lo
   cual reutiliza el mismo contenedor (no lo recrea desde la imagen), por lo
   que el cambio hecho en el paso 1 persiste. El propio Next.js detectó el
   cambio: `Found a change in next.config.ts. Restarting the server to apply
   the changes...`.
3. Verificar en el navegador: la consola pasó de mostrar errores de WebSocket
   bloqueado a `[HMR] connected`, y la aplicación cargó con normalidad por
   `jeroky.local`.

## Consecuencias

- El acceso por nombre local (`jeroky.local`) queda operativo para HTTP,
  cerrando el punto 5 del Hito 2 y actualizando P04 de la matriz de pruebas.
- Queda documentado que el contenedor del frontend **no** usa bind mount en
  este entorno: cualquier cambio de código fuente futuro (no solo de config)
  requiere reconstrucción de la imagen (`docker compose up -d --build
  frontend`) o edición directa dentro del contenedor si es un ajuste puntual
  y temporal. Se recomienda evaluar en el informe si esto es aceptable para
  un entorno de "producción" simulada o si debería migrarse a una imagen
  `output: standalone` sin modo desarrollo para Hito 3/4.
- Si se reconstruye la imagen del frontend en el futuro (por ejemplo al
  aplicar HTTPS en Hito 3), este cambio debe re-aplicarse en el
  `next.config.ts` versionado en el repositorio de la aplicación (fuera de
  este repositorio de TP) o repetirse manualmente tras el rebuild.
