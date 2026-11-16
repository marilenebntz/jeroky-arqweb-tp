> Para continuar el TP usamos el entorno separado de `cna/infra/aislado`. Arranque desde la raíz del repositorio: `bash cna/infra/aislado/levantar.sh`. Jeroky de Arquitectura está en http://localhost:3100. Los pasos anteriores de esta página describen el montaje previo.

# RabbitMQ

Configuración inicial del broker de eventos para el TP2.

## Puertos locales

- `5672`: protocolo AMQP.
- `15672`: interfaz de administración.

Ambos puertos están enlazados a `127.0.0.1` para no exponer el broker a la red externa. En el despliegue final, los microservicios accederán por la red interna de Docker y la interfaz de administración no se publicará hacia Internet.

## Preparar variables locales

Desde esta carpeta:

```bash
cp .env.example .env.local
```

Editar `.env.local` y reemplazar la clave de ejemplo. El archivo `.env.local` no debe versionarse.

## Levantar el broker

```bash
docker compose --env-file .env.local up -d
```

## Verificar el estado

```bash
docker compose ps
docker compose logs --tail=50 rabbitmq
```

La interfaz de administración estará disponible únicamente desde la máquina local en:

```text
http://localhost:15672
```

## Detenerlo

```bash
docker compose down
```

El volumen `rabbitmq_data` conserva las colas y mensajes durables entre reinicios. No utilizar `docker compose down -v` durante las pruebas de persistencia.

## Próximo paso

Agregar la declaración reproducible de exchanges, colas, reintentos y Dead Letter Queue desde la configuración del servicio `event-bridge`.
