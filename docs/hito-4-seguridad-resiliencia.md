# Hito 4 — Seguridad, resiliencia y prueba de carga

## Alcance

El Hito 4 cerró los hallazgos de los hitos anteriores y verificó el comportamiento
del sistema ante errores, caída del backend y carga concurrente. Las pruebas se
realizaron sobre Ubuntu Server 24.04.5 LTS ARM64 en UTM.

## Endurecimiento aplicado

1. La VM utiliza el modo de red compartida de UTM. En la ejecución documentada
   recibió `192.168.64.2` y el gateway fue `192.168.64.1`.
2. UFW aplica `deny incoming` y permite únicamente OpenSSH y Nginx Full.
3. El frontend y el backend publican sus puertos solo en `127.0.0.1`.
4. PostgreSQL no publica el puerto 5432 en la VM.
5. Nginx oculta su versión y la cabecera `X-Powered-By`, fuerza HTTPS y agrega
   HSTS, `nosniff`, `SAMEORIGIN` y una política de referer.
6. Los archivos `.env` y `.env.local` están ignorados por Git y no aparecen
   entre los archivos versionados.

## Comprobaciones funcionales y de error

- `GET /ruta-inexistente` devolvió HTTP 404.
- `TRACE /` devolvió HTTP 405.
- `GET /api/` devolvió HTTP 200 con el backend operativo.
- Al detener el backend, Nginx devolvió HTTP 502 y registró
  `connect() failed (111: Connection refused)`.

## Recuperación

Después de ejecutar `docker compose start backend`, la API pasó de HTTP 502 a
HTTP 200 en aproximadamente siete segundos. La base de datos permaneció saludable
y no se observaron pérdidas de datos.

## Prueba de carga

La prueba se ejecutó desde el Mac anfitrión:

```bash
ab -t 30 -c 10 -k https://jeroky.local/alumnos
```

Resultados registrados:

| Métrica | Resultado |
|---|---:|
| Solicitudes completas | 1128 |
| Solicitudes fallidas | 0 |
| Solicitudes por segundo | 37.53 |
| Tiempo medio por solicitud | 266.436 ms |
| Mediana | 238 ms |
| Percentil 95 | 356 ms |
| Máximo | 1093 ms |

El frontend pasó de 840.8 MiB a aproximadamente 2.13 GiB durante la observación.
El backend se mantuvo alrededor de 403 MiB y PostgreSQL alrededor de 50 MiB.
Al finalizar, tanto `/alumnos` como `/api/` respondieron HTTP 200.

## Riesgo residual

El token de autenticación se almacena en `localStorage`. Esto evita el envío
automático como cookie, pero lo deja accesible a JavaScript y por tanto expuesto
si existiera una vulnerabilidad XSS. Una mejora futura sería usar cookies
`HttpOnly`, `Secure` y `SameSite`, junto con protección CSRF cuando
corresponda.

## Reproducción

Los scripts de `scripts/` automatizan las pruebas no destructivas, la simulación
controlada de caída y la carga. Las salidas originales se conservan en
`evidencias/fase-4/`.
