# CA-4: entrada HTTPS de la VM Ubuntu

Pruebas ejecutadas por la usuaria el 20 de noviembre de 2026 y conservadas mediante
sus capturas originales. No se reconstruyeron salidas. Cliente: Mac. Servidor:
`arqweb@jeroky-arqweb-vm`, IP de esa sesión `192.168.67.225`, red puenteada Wi-Fi.
La IP es dinámica; no asumir que se conserve en otra red.

## Resultados observados

| Comprobación | Resultado y evidencia |
| --- | --- |
| Búsqueda desde Mac por HTTPS 443 | HTTP 200, dos alumnos ficticios. Se usaron `--resolve` y `--cacert`, sin `-k`. [Captura](CA4-vm-https443-search-200.png). |
| Nginx efectivo | `nginx -t` con sintaxis correcta y validación exitosa en Ubuntu. [Captura](CA4-vm-firewall-puertos.png). |
| Firewall de la VM | UFW activo; default deny incoming, allow outgoing; OpenSSH 22 y Nginx Full 80/443 permitidos en IPv4 e IPv6. [Captura](CA4-vm-firewall-puertos.png). |
| Publicaciones Docker | Servicios del TP2 y del TP1 publicados sobre 127.0.0.1; DB y otros puertos mostrados sin flecha son puertos del contenedor, no publicaciones en el host. [Captura](CA4-vm-firewall-puertos.png). |
| Puertos 3100, 3101, 3102 desde Mac | Intentos TCP finalizaron con timeout. [Primera parte](CA4-vm-puertos-internos-parte1.png). |
| Puertos 3103, 3104, 5682, 15682 desde Mac | Los cuatro intentos finalizaron con timeout. [Segunda parte](CA4-vm-puertos-internos-parte2.png). |
| TLS 1.3 y certificado | OpenSSL desde Ubuntu a 127.0.0.1:443 con SNI arqui.local y CAfile público: TLSv1.3, TLS_AES_256_GCM_SHA384, Verification OK, verified peername arqui.local. [Captura](CA4-vm-tls13-verificado.png). |
| HTTP 80 desde Mac | 301 con Location https://arqui.local/. [Captura](CA4-vm-http-redireccion-301.png). |

La primera prueba de puertos fue interrumpida con Ctrl+C después de obtener
resultados para 3100, 3101 y 3102, antes de terminar 3103. La segunda prueba cubrió
3103 y los restantes. No se presenta la primera como una ejecución completa.

## Interpretación y límites

En este ensayo se comprobó acceso al sitio Arquitectura a través de Nginx por 443,
con HTTP dedicado a redirección. Los siete puertos internos ensayados no aceptaron
conexión desde la Mac. Los timeouts por sí solos no identifican qué capa filtra:
se interpretan junto a UFW y a las publicaciones en loopback. No se hizo un escaneo
exhaustivo, prueba IPv6 ni comprobación de todos los puertos declarados de RabbitMQ.

TLS 1.3 se forzó y verificó desde la VM; la captura de curl en la Mac verifica
HTTPS y el certificado, pero no muestra por sí sola la versión TLS negociada.
La [inspección explícita de X.509](CA4-vm-certificado-san-y-tp1-200.png) muestra
subject e issuer arqui.local, SAN DNS:arqui.local y vigencia del 20/11/2026
18:07:00 GMT al 18/02/2027 18:07:00 GMT.
El certificado es autofirmado y su copia pública se eligió como CA de la prueba.

Se comprobó también [jeroky.local del TP1](CA4-vm-certificado-san-y-tp1-200.png)
desde Ubuntu a 127.0.0.1:443, con su certificado como CA, sin -k y siguiendo
redirecciones: respuesta final HTTP 200 después de instalar arqui.local. Esto
prueba la página final, no todas las operaciones de negocio o un login del TP1. Las APIs nuevas siguen sin autenticación: TLS y rate limit
no reemplazan controles de acceso. No publicar este laboratorio en Internet.

Falta repetir la demostración desde la red donde acceda el docente. El resultado
local no garantiza acceso desde cualquier red. Algunas capturas de Mac no muestran
usuario/hostname completos: complementar identificación según la guía sin editar
las imágenes para aparentar un prompt que no estaba presente.
