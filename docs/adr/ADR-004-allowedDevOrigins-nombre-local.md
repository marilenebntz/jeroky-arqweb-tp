# ADR-004: Habilitar `jeroky.local` en `allowedDevOrigins` del frontend

## Contexto

Al configurar el nombre local `jeroky.local` y actualizar `server_name` en Nginx y `/etc/hosts` del anfitrión, la aplicación quedaba indefinidamente en "Cargando panel institucional..." al acceder mediante el nombre local, mientras que el acceso directo por IP funcionaba.

## Diagnóstico

La consola del navegador mostró errores relacionados con el WebSocket utilizado por Next.js:

```text
WebSocket connection to 'ws://jeroky.local/_next/webpack-hmr?id=...' failed.
```
Los logs del contenedor jeroky-frontend indicaron:

```text
Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "jeroky.local".
Cross-origin access to Next.js dev resources is blocked by default for safety.
```
Next.js protege los recursos internos de desarrollo, como HMR y Turbopack, frente a solicitudes provenientes de orígenes no autorizados.

Inicialmente se modificó next.config.ts directamente dentro del contenedor. Esta solución permitió verificar el diagnóstico, pero era temporal porque el contenedor no utiliza un bind mount para el código fuente. Al recrear el contenedor, el cambio se perdía.

Decisión

Persistir la configuración en el repositorio oficial del frontend, dentro de la rama release/1, agregando jeroky.local a allowedDevOrigins:
```text
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["jeroky.local", "192.168.0.17"],
};

export default nextConfig;
```
La modificación fue registrada en el repositorio jerokyfrontend mediante el commit:
```text
7132dd8 - fix: permitir origen local en entorno de desarrollo
```
Luego se actualizó la copia de la VM y se reconstruyó la imagen:
```text
cd ~/jeroky/frontend
git pull --ff-only
cd ~/jeroky
docker compose up -d --build frontend
```
Finalmente, se verificó el acceso mediante https://jeroky.local, el inicio de sesión y la consulta del listado de alumnos.

Consecuencias
jeroky.local queda autorizado de forma permanente en el código fuente del frontend.
El ajuste ya no se pierde al recrear los contenedores.
No es necesario editar manualmente next.config.ts dentro del contenedor.
Los cambios futuros del código fuente requieren reconstruir la imagen con docker compose up -d --build frontend.
Como la VM recibe su IP mediante DHCP, si la dirección cambia debe actualizarse la entrada de jeroky.local en /etc/hosts del anfitrión.
allowedDevOrigins corresponde al servidor de desarrollo de Next.js. En un despliegue productivo deberá utilizarse una compilación de producción.
