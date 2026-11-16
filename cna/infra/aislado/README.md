# Jeroky separado para Arquitectura

Este laboratorio tiene su propia copia de Jeroky, base de datos, red,
RabbitMQ y volumen para cada servicio. El proyecto de Compose se llama
`cna-arqui`. Las credenciales se generan en `.env.local`.

Usamos una copia local del código de backend y frontend. Las carpetas
originales se leen al preparar las copias. Los contenedores del laboratorio
trabajan sobre las imágenes construidas desde `.runtime`.

## Preparar en otra computadora

Desde esta carpeta, indicando las rutas de las copias de Jeroky:

```bash
python3 preparar_fuentes.py /ruta/jerokybackend /ruta/jerokyfrontend
bash levantar.sh
```

La copia excluye `.git`, `.env*`, dependencias y archivos de compilación.
Usa el estado local del código. Conviene preparar las copias desde las
versiones registradas para el TP. `.runtime` y `.env.local` están excluidos
de Git. No se importa la base del proyecto.

## Accesos del laboratorio

| Componente | Dirección |
| --- | --- |
| Jeroky | http://localhost:3100 |
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
