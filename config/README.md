# Configuraciones

Configuraciones reproducibles y ejemplos sin secretos:

- `docker-compose.yml`: servicios internos con exposición mínima de puertos.
- `nginx-jeroky.conf`: HTTPS, proxy inverso y cabeceras de seguridad.
- `ufw-hito4.md`: política y comandos del firewall de la VM.
- `backend.env.example`: variables ficticias de referencia.
- `Dockerfile.dev.*`: imágenes de desarrollo utilizadas en el despliegue.

La configuración del Hito 4 deja frontend y backend en `127.0.0.1`, y no
publica PostgreSQL en el anfitrión. El acceso externo se realiza por Nginx en
80/443.

Nunca guardar archivos `.env`, claves privadas, tokens ni credenciales reales.
