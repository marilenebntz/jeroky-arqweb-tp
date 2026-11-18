# Arquitectura en la VM Ubuntu del TP1

Configuración preparada para conservar el sitio existente `jeroky.local` y agregar
`arqui.local` al Nginx del host en 80/443. No cambia el archivo del sitio jeroky ni
los contenedores/volúmenes del TP1. El proyecto nuevo sigue siendo `cna-arqui` y
usa la base `jeroky_arqui`, los puertos 3100–3104 y sus volúmenes separados.

## Estado de verificación

Compose combinado y sintaxis del script validados. El sitio pasó `nginx -t` en
un contenedor Nginx con certificado temporal. **Todavía falta ejecutarlo en la VM**,
validar compatibilidad con su configuración Nginx completa, recursos reales,
TLS 1.3 por 443, convivencia con el TP1 y acceso desde otro cliente de la LAN.
No se considera evidencia de CA-4 ni F6-E2 hasta completar esas verificaciones.

La VM observada usa Ubuntu 24.04.5 ARM64, 4 GB de RAM, unos 15 GB de disco libre,
y ya ejecuta Jeroky del TP1. La interfaz puenteada obtuvo 192.168.0.11; esa IP puede
cambiar con DHCP. No asumir que la misma IP estará disponible en la facultad.

## Arranque de servicios nuevos

Con el repositorio actualizado, ejecutar dentro de la VM:

```bash
cd ~/jeroky-arqweb-tp2
bash cna/deploy/vm/levantar-vm.sh
```

Obtiene los fuentes fijados y genera credenciales sin imprimirlas, construye las
imágenes secuencialmente y levanta datos, monolito aislado, broker y microservicios.
No levanta el gateway de Docker, porque 80/443 los atiende el Nginx existente.
Las publicaciones heredadas de Compose usan exclusivamente 127.0.0.1.

Los nueve contenedores principales tienen límites que suman 2336 MiB; esto no
incluye el consumo del TP1, del sistema, cachés ni los builds. Los límites no son
una reserva ni garantía de que toda compilación quepa. Revisar `free -h`, `docker
stats --no-stream` y logs si algo no arranca; no detener el TP1 para ocultar fallos.
Los contenedores backend/frontend conservan modo desarrollo en este perfil, con
límites de heap. Multi-stage y despliegue de producción siguen pendientes.

Prometheus/Grafana no se levantan por defecto en esta VM de 4 GB. El panel y las
alertas ya probados en la Mac no acreditan observabilidad de esta VM. Para probar
ambos aquí, solo después de comprobar recursos:

```bash
CNA_VM_OBSERVABILITY=1 bash cna/deploy/vm/levantar-vm.sh
```

Agregan límites por 448 MiB. Su acceso, si se usan, es local; desde Mac se puede
usar un túnel SSH sin publicar sus puertos a la red.

## Instalar sitio nuevo del Nginx del host

Cuando los servicios estén preparados:

```bash
sudo bash cna/deploy/vm/instalar-sitio.sh
```

Crea certificado autofirmado de 90 días con SAN `arqui.local` en
`/etc/nginx/certs/arqui/`, instala el archivo sites-available/arqui y su enlace en
sites-enabled. No imprime la clave privada ni la guarda en el repositorio.
Rechaza un sitio arqui existente diferente o un par de certificados incompleto.
Ejecuta `nginx -t` antes de recargar. Si la validación falla, retira únicamente los
archivos/enlace de sitio que acaba de crear; el certificado se conserva para revisión.
No toca `sites-available/jeroky`. No modifica UFW: se observaron reglas previas que
permiten solo OpenSSH y Nginx Full de entrada; verificar su vigencia antes de la demo.

El sitio arqui limita TLS a 1.3, redirige HTTP a HTTPS, conserva el request_id,
limita las APIs y devuelve 503 JSON ante fallo de upstream. Sus zonas y logs tienen
nombres propios para convivir con el sitio del TP1. Se oculta el X-Request-ID del
upstream para que el gateway responda un solo encabezado.

## Verificación pendiente desde la Mac

Copiar únicamente el certificado público (nunca la clave) desde la VM:

```bash
scp arqweb@192.168.0.11:/etc/nginx/certs/arqui/arqui.crt /tmp/arqui.crt
curl --cacert /tmp/arqui.crt --resolve arqui.local:443:192.168.0.11 \
  -i 'https://arqui.local/v2/search?q=Alumno&type=student'
```

Repetir con `/health` y seguir `/` hasta la página final. La versión de curl de la
Mac puede no permitir forzar TLS 1.3; usar un cliente compatible y comprobar la
negociación real. No usar `-k` como evidencia de verificación del certificado.
Para navegar con arqui.local, resolver ese nombre a la IP vigente en el cliente.
El certificado autofirmado requiere confianza explícita del usuario en el navegador.

También verificar `jeroky.local` como antes, inspeccionar que ningún contenedor
publique puertos sobre 0.0.0.0/::, comprobar desde otro cliente que solo estén
accesibles los puertos autorizados y conservar prompt con usuario/hostname.
Las APIs de microservicios siguen sin autenticación: TLS/rate limiting no la
reemplazan. No publicar este laboratorio en Internet.

## Reversión

Para retirar solo el sitio de Arquitectura, comprobar que el enlace corresponde a
/etc/nginx/sites-available/arqui, quitar ese enlace, validar `nginx -t` y recargar.
Conservar el sitio jeroky. Para detener solo los servicios nuevos sin borrar datos:

```bash
docker compose -p cna-arqui --env-file cna/infra/aislado/.env.local \
  -f cna/infra/aislado/compose.yml -f cna/deploy/vm/compose.vm.yml stop
```

No ejecutar `down -v`, borrar directorios del TP1 ni sustituir su certificado.

## Alternativa sin autenticar GitHub en la VM

Los fuentes backend/frontend son privados: un clon público del TP no concede su
acceso. Si la Mac ya tiene los fuentes fijados y verificados, puede preparar un
paquete y transferirlo por SSH. Esto es una precondición alternativa de despliegue;
no representa una descarga anónima ni elimina la protección de los repositorios.
No cambiar su visibilidad ni publicar el paquete privado en el repositorio del TP.

En la Mac, desde la raíz:

```bash
python3 cna/infra/aislado/empaquetar_fuentes.py /tmp/jeroky-fuentes-fijados.tar.gz
scp /tmp/jeroky-fuentes-fijados.tar.gz arqweb@192.168.0.11:/tmp/
```

Después de actualizar el repositorio público del TP en la VM:

```bash
cd ~/jeroky-arqweb-tp2
python3 cna/infra/aislado/importar_fuentes.py /tmp/jeroky-fuentes-fijados.tar.gz
bash cna/deploy/vm/levantar-vm.sh
```

El exportador comprueba los hashes de los archivos contra los manifests locales
que se generaron al verificar el commit. No exporta .env, historia Git, dependencias,
certificados o datos. No usa archivos nuevos fuera de esos manifests. Informa el
SHA256 del paquete para compararlo con `sha256sum` en la VM si fuera necesario.

El importador solo acepta archivos regulares, rechaza rutas fuera del directorio,
compara fuente/commit con `fuentes.lock.json` y comprueba todos los hashes antes
de incorporar las copias. Una copia previa distinta provoca un error sin ser
reemplazada. Después ejecuta el preparador para generar secretos nuevos de la VM,
o conservar los ya existentes. Con manifests válidos el preparador no necesita
consultar GitHub para estos fuentes. Docker y npm todavía requieren Internet.

El SHA256 comprueba integridad, no autoría. El paquete debe proceder de la Mac
confiable y transferirse a la VM propia por SSH. No enviarlo a terceros ni al chat.
El código privado queda únicamente en las carpetas ignoradas `.runtime` del destino.
La recuperación de la cuenta GitHub y su segundo factor se gestiona aparte.
