# Gateway

Usamos Nginx como entrada del entorno de Arquitectura.

## Direcciones

- HTTP: http://localhost:3180
- HTTPS: https://localhost:3443

HTTP redirige a HTTPS. Configuramos TLS 1.3 y un certificado local
para localhost y 127.0.0.1. El certificado es autofirmado, por eso
las pruebas usan --cacert para verificarlo.

## Rutas

- / apunta al frontend de Arquitectura.
- /api/ apunta al backend de Arquitectura.
- /v2/search apunta a búsqueda.
- /v2/audit apunta a auditoría.
- /v2/exports y sus subrutas apuntan a exportación.
- /health comprueba que Nginx responde.

## Identificador de solicitudes

El gateway genera un X-Request-ID cuando no recibe uno válido.
Lo devuelve en la respuesta, lo envía al servicio y lo registra
en los logs. Todavía falta verificar su uso en los logs de cada servicio.

## Límite de solicitudes

Las rutas de búsqueda, auditoría y exportación comparten un límite
de 5 solicitudes por segundo por IP, con una ráfaga adicional de 5.

Cuando se supera, devuelve HTTP 429 con un mensaje JSON y
Retry-After: 1. La ruta /health queda fuera del límite.

En la prueba de 20 consultas seguidas recibimos 6 respuestas HTTP 200
y 14 respuestas HTTP 429.

[Resultado de la prueba](../../evidencias/gateway-rate-limit-429.txt).

## Errores de los servicios

Si un servicio devuelve 502, 503 o 504, el gateway responde HTTP 503
con un mensaje JSON y el identificador de la solicitud.

## Certificado local

La configuración del certificado está en localhost.cnf.
La carpeta certs/ está ignorada por Git.

Para generar un certificado en una instalación nueva, ejecutar desde
la raíz del repositorio, solamente si todavía no existen estos archivos:

```bash
mkdir -p cna/deploy/gateway/certs
openssl req -x509 -newkey rsa:2048 -nodes -days 90 \
  -config cna/deploy/gateway/localhost.cnf \
  -keyout cna/deploy/gateway/certs/localhost.key \
  -out cna/deploy/gateway/certs/localhost.crt
chmod 600 cna/deploy/gateway/certs/localhost.key
```

## Validar y aplicar cambios

Desde la raíz del repositorio:

```bash
docker compose --env-file cna/infra/aislado/.env.local   -f cna/infra/aislado/compose.yml exec -T gateway nginx -t
```

Si la validación termina correctamente:

```bash
docker compose --env-file cna/infra/aislado/.env.local   -f cna/infra/aislado/compose.yml exec -T gateway nginx -s reload
```

## Pendientes

Falta integrar la autenticación de las APIs y completar las pruebas
de caída y recuperación a través del gateway.

Los puertos directos de los servicios siguen disponibles en localhost
para las pruebas del laboratorio.
