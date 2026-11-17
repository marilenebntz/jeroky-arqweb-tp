# Jeroky separado para Arquitectura

Este laboratorio tiene su propia copia de Jeroky, base de datos, red,
RabbitMQ y volumen para cada servicio. El proyecto de Compose se llama
`cna-arqui`. Las credenciales se generan en `.env.local`.

Usamos una copia local del código de backend y frontend. Las carpetas
originales se leen al preparar las copias. Los contenedores del laboratorio
trabajan sobre las imágenes construidas desde `.runtime`.

## Arranque desde un clon limpio

Requisitos: Git, Python 3, OpenSSL, Docker Desktop/Engine en marcha con Docker
Compose v2 y acceso a Internet (GitHub, registro de imágenes y npm). Este laboratorio
se ejecuta localmente; no configura una VM, su firewall ni el acceso externo 443.

Desde la raíz del repositorio:

```bash
bash cna/infra/aislado/levantar.sh
```

El comando obtiene backend y frontend de los repositorios y commits exactos de
`fuentes.lock.json`; no toma las ramas actuales ni depende de carpetas del usuario.
Se omiten `.git`, `.env*`, dependencias y compilados. Comprueba el SHA descargado
y registra hashes de los archivos preparados en `.runtime`. Se excluyen también
`.DS_Store` de macOS y `next-env.d.ts`, generado por Next.js al arrancar. En arranques posteriores
verifica esos hashes y no reemplaza fuentes que hayan cambiado localmente.

También crea credenciales aleatorias en `.env.local` (permisos 600), el certificado
local con SAN localhost/127.0.0.1 y la contraseña administrativa local de Grafana.
No imprime contraseñas ni reemplaza secretos o certificados existentes. Un
certificado incompleto o vencido detiene el arranque para revisión.

Después construye Jeroky, espera backend/DB/broker, prepara los datos ficticios,
importa las seis colas, levanta servicios, comprueba `nginx -t` y arranca gateway,
Prometheus y Grafana. Los servicios HTTP con healthcheck deben quedar saludables;
worker, bridge, frontend y gateway sin healthcheck propio solo se comprueban en
estado running mediante Compose. La primera ejecución descarga dependencias y
puede tardar varios minutos. No borrar volúmenes para volver a arrancar.

Los repositorios originales se consultan por Git y no se modifican. Si no están
accesibles desde otra computadora, el arranque falla: no hay un respaldo oculto
con fuentes locales. Para cambiar de versión hay que revisar y actualizar el
lock; una copia `.runtime` incompatible se conserva y provoca un error explícito.

El seed asegura la cuenta administrativa de laboratorio y dos alumnos ficticios;
actualiza el hash de esa cuenta con LAB_PASSWORD en cada arranque. Los alumnos
existentes con las CI del seed no se vuelven a crear. No usa la base original.

Para verificar variantes aisladas se admiten `CNA_PROJECT_NAME` y
`CNA_COMPOSE_OVERRIDE`. Son opciones de pruebas; el arranque normal no las requiere.
El nombre alternativo separa red y volúmenes. El archivo extra puede retirar los
puertos publicados para evitar conflictos con un laboratorio ya levantado.

## Accesos del laboratorio

| Componente | Dirección |
| --- | --- |
| Jeroky | http://localhost:3100 |
| Gateway HTTPS | https://localhost:3443 |
| Grafana RED | http://localhost:3150/d/cna-red |
| Prometheus | http://localhost:3190 |
| Backend | http://localhost:3101/api |
| Auditoría | http://localhost:3102/v2/audit |
| Búsqueda | http://localhost:3103/v2/search |
| Exportación | http://localhost:3104/v2/exports |
| Panel RabbitMQ | http://localhost:15682 |
| AMQP | 127.0.0.1:5682 |

La base PostgreSQL funciona dentro de la red del laboratorio.
`seed.cjs` crea una cuenta de administrador de Arquitectura y dos alumnos
ficticios. Las credenciales de acceso están en `LAB_EMAIL` y `LAB_PASSWORD`
del archivo `.env.local`. Los correos se simulan y la biometría queda sin
credenciales de AWS utilizables.

El bridge y exportación consultan `http://backend:3001` dentro de la nueva
red. Auditoría, búsqueda, exportación y el bridge empiezan con volúmenes
nuevos. Los volúmenes del laboratorio llevan el prefijo `cna-arqui_`.

## Detener

```bash
docker compose --env-file .env.local -f compose.yml down
```

Esto conserva los datos del laboratorio para la próxima ejecución.

## Separación realizada

Los servicios anteriores de Arquitectura quedaron detenidos. Sus volúmenes
conservan las copias y reportes generados durante las pruebas anteriores y
pueden revisarse antes de decidir su eliminación. Para las próximas pruebas
se usa exclusivamente este Compose y los puertos de esta página.

Las evidencias anteriores corresponden al entorno anterior. Las nuevas
evidencias deben mostrar los puertos 3100–3104 y datos ficticios.

La autenticación de las APIs de microservicios y el gateway siguen pendientes.

## Prueba de cambios y exportación

Cambiamos los nombres de los dos alumnos de prueba desde el Jeroky
de Arquitectura, disponible en http://localhost:3100.

Después comprobamos lo siguiente:

- Búsqueda encontró a Juana Lopez desde el puerto 3103.
- Auditoría registró los cambios de Juana Lopez y Luciana Velazquez.
- Los eventos llegaron mediante event-bridge.
- Exportación recibió el pedido con HTTP 202.
- El worker terminó el trabajo y quedó en estado completed.
- La descarga respondió HTTP 200 en formato Markdown.
- El reporte incluyó los dos alumnos con sus nombres actualizados.

Estas pruebas se hicieron en el entorno separado de Arquitectura.

Guardamos la evidencia de la consulta y descarga del trabajo:

- [Exportación completada y descarga](../../evidencias/aislado-export-completado-descarga-200.png).

## Verificación del arranque reproducible

Se ensayó un clon local sin `.runtime`, `.env.local` ni certificados, aplicando
los cuatro archivos candidatos del bootstrap y descargando los fuentes desde
GitHub. Se usó el proyecto `cna-ca7-check`, red y volúmenes propios, y un override
que retiró puertos publicados para evitar colisiones. El caché de imágenes del
host fue compartido. No se importaron datos del laboratorio habitual.

Los 12 componentes arrancaron, las sondas definidas quedaron saludables y se
comprobaron login, dos alumnos del seed, búsqueda por gateway TLS y frontend
final 200. Después se retiraron los contenedores de prueba conservando sus volúmenes.
[Resultados y salida real](../../evidencias/F6-E16-arranque-limpio.json).

Es una comprobación del candidato local, no de una VM nueva ni de acceso externo
443. Tras publicar el commit corresponde repetir el mismo comando desde ese
commit en otra computadora con los puertos normales.

## Actualización de la frecuencia del bridge

El Compose fija `POLL_INTERVAL_MS=1000`. Se midieron diez ediciones secuenciales
por gateway HTTPS y todas aparecieron en búsqueda en menos de cinco segundos
(máximo 1250,05 ms). [Resultados](../../evidencias/CA3-latencia-edicion-busqueda.json)
y [alcance de la medición](../../services/event-bridge/README.md). Es un resultado
local, no una garantía bajo carga; el mecanismo sigue siendo polling.
