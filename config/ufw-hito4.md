# Firewall UFW — Hito 4

La política aplicada en la VM permite solamente SSH, HTTP y HTTPS desde la red
y mantiene los servicios internos accesibles únicamente desde localhost o la red
de Docker.

> Antes de habilitar UFW en una sesión remota se debe permitir OpenSSH para no
> perder el acceso a la VM.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

Resultado esperado:

- 22/tcp (OpenSSH): permitido.
- 80 y 443/tcp (Nginx Full): permitidos.
- 3000 y 3001: enlazados a `127.0.0.1`, no accesibles desde la LAN.
- 5432: sin publicación en el anfitrión; disponible solo para los contenedores.
