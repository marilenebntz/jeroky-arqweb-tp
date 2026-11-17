const fs = require("node:fs");
const { log } = require("./operational");
const readiness = { broker: false };
const amqp = require("amqplib");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

const schema = JSON.parse(
  fs.readFileSync("/contracts/event-envelope.schema.json", "utf8")
);
const validate = ajv.compile(schema);

const { db, applyEvent } = require("./storage");

async function main() {
  const server = require("./api").startApi(db, {
    isBrokerReady: () => readiness.broker,
  });
  server.on("error", () => process.exit(1));
  const connection = await amqp.connect({
    hostname: process.env.RABBITMQ_HOST || "rabbitmq",
    username: process.env.RABBITMQ_DEFAULT_USER,
    password: process.env.RABBITMQ_DEFAULT_PASS,
    vhost: "/",
    heartbeat: 30,
  });

  connection.on("error", () => {
    log("error", "Error de conexion con RabbitMQ");
    process.exit(1);
  });
  connection.on("close", () => { readiness.broker = false; process.exit(1); });

  const publisher = await connection.createConfirmChannel();

  publisher.on("error", () => {
    log("error", "Error al publicar: mensaje original sin confirmar");
    process.exit(1);
  });
  publisher.on("close", () => { readiness.broker = false; process.exit(1); });
  publisher.on("return", () => {
    log("error", "Mensaje sin ruta: original sin confirmar");
    process.exit(1);
  });

  await publisher.checkExchange("jeroky.retry");
  await publisher.checkExchange("jeroky.dlx");
  await publisher.checkQueue("jeroky.search.retry");
  await publisher.checkQueue("jeroky.search.dlq");

  const channel = await connection.createChannel();
  channel.on("error", () => {
    log("error", "Error en el canal AMQP");
    process.exit(1);
  });

  channel.on("close", () => { readiness.broker = false; process.exit(1); });
  await channel.checkQueue("jeroky.search");
  await channel.prefetch(1);

  await channel.consume("jeroky.search", (message) => {
    if (!message) {
      log("error", "Consumo cancelado por RabbitMQ");
      process.exit(1);
    }

    let event;
    try {
      event = JSON.parse(message.content.toString("utf8"));
      if (
      !validate(event) ||
      !["jeroky.entity.updated", "jeroky.entity.deleted"].includes(event.type) ||
      typeof event.payload.entity_type !== "string" ||
      !event.payload.entity_type.trim() ||
      typeof event.payload.entity_id !== "string" ||
      !event.payload.entity_id.trim()
    ) {
        throw new Error("Evento fuera de contrato");
      }
    } catch {
      log("error", "Evento invalido: enviado a DLQ");
      channel.nack(message, false, false);
      return;
    }

    try {
      const action = applyEvent(event);
      log("info", "event_processed", {
        action,
        event_id: event.event_id,
        request_id: event.request_id,
      });
    } catch {
      const previous = message.properties.headers?.["x-search-retries"] ?? 0;
      const retries = Number.isSafeInteger(previous) && previous >= 0
        ? previous
        : 3;
      const exhausted = retries >= 3;
      const nextRetries = exhausted ? retries : retries + 1;
      const exchange = exhausted ? "jeroky.dlx" : "jeroky.retry";

      try {
        publisher.publish(exchange, "jeroky.search", message.content, {
          persistent: true,
          mandatory: true,
          contentType: "application/json",
          messageId: event.event_id,
          correlationId: event.request_id,
          headers: {
            ...message.properties.headers,
            "x-search-retries": nextRetries,
          },
        }, (error) => {
          if (error) {
            log("error", "Publicacion fallida: original sin confirmar");
            process.exit(1);
          }

          log("warn", "event_retry", {
            action: exhausted ? "retry_exhausted_dlq" : "retry_scheduled",
            event_id: event.event_id,
            request_id: event.request_id,
            retry: nextRetries,
          });
          channel.ack(message);
        });
      } catch {
        log("error", "Publicacion fallida: original sin confirmar");
        process.exit(1);
      }
      return;
    }

    channel.ack(message);
  }, { noAck: false });

  readiness.broker = true;
  log("info", "consumer_ready");
}

main().catch(() => {
  log("error", "No se pudo iniciar search-svc");
  process.exit(1);
});
