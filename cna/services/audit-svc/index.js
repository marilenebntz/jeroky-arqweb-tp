const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const amqp = require("amqplib");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

const schema = JSON.parse(
  fs.readFileSync("/contracts/event-envelope.schema.json", "utf8")
);
const validate = ajv.compile(schema);

fs.mkdirSync("/data", { recursive: true });
const db = new DatabaseSync("/data/audit.sqlite");
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    event_json TEXT NOT NULL,
    stored_at TEXT NOT NULL
  );
`);

const insertEvent = db.prepare(`
  INSERT INTO events (event_id, event_json, stored_at)
  VALUES (?, ?, ?)
  ON CONFLICT(event_id) DO NOTHING
`);

async function main() {
  const connection = await amqp.connect({
    hostname: process.env.RABBITMQ_HOST || "rabbitmq",
    username: process.env.RABBITMQ_DEFAULT_USER,
    password: process.env.RABBITMQ_DEFAULT_PASS,
    vhost: "/",
    heartbeat: 30,
  });

  connection.on("error", () => {
    console.error("Error de conexion con RabbitMQ");
    process.exit(1);
  });
  connection.on("close", () => process.exit(1));

  const publisher = await connection.createConfirmChannel();

  publisher.on("error", () => {
    console.error("Error al publicar: mensaje original sin confirmar");
    process.exit(1);
  });
  publisher.on("close", () => process.exit(1));
  publisher.on("return", () => {
    console.error("Mensaje sin ruta: original sin confirmar");
    process.exit(1);
  });

  await publisher.checkExchange("jeroky.retry");
  await publisher.checkExchange("jeroky.dlx");
  await publisher.checkQueue("jeroky.audit.retry");
  await publisher.checkQueue("jeroky.audit.dlq");

  const channel = await connection.createChannel();
  channel.on("error", () => {
    console.error("Error en el canal AMQP");
    process.exit(1);
  });

  await channel.checkQueue("jeroky.audit");
  await channel.prefetch(1);

  await channel.consume("jeroky.audit", (message) => {
    if (!message) {
      console.error("Consumo cancelado por RabbitMQ");
      process.exit(1);
    }

    let event;
    try {
      event = JSON.parse(message.content.toString("utf8"));
      if (!validate(event)) {
        throw new Error("Evento fuera de contrato");
      }
    } catch {
      console.error("Evento invalido: enviado a DLQ");
      channel.nack(message, false, false);
      return;
    }

    try {
      const result = insertEvent.run(
        event.event_id,
        JSON.stringify(event),
        new Date().toISOString()
      );
      console.log(JSON.stringify({
        action: result.changes ? "stored" : "duplicate",
        event_id: event.event_id,
        request_id: event.request_id,
      }));
    } catch {
      const previous = message.properties.headers?.["x-audit-retries"] ?? 0;
      const retries = Number.isSafeInteger(previous) && previous >= 0
        ? previous
        : 3;
      const exhausted = retries >= 3;
      const nextRetries = exhausted ? retries : retries + 1;
      const exchange = exhausted ? "jeroky.dlx" : "jeroky.retry";

      try {
        publisher.publish(exchange, "jeroky.audit", message.content, {
          persistent: true,
          mandatory: true,
          contentType: "application/json",
          messageId: event.event_id,
          correlationId: event.request_id,
          headers: {
            ...message.properties.headers,
            "x-audit-retries": nextRetries,
          },
        }, (error) => {
          if (error) {
            console.error("Publicacion fallida: original sin confirmar");
            process.exit(1);
          }

          console.log(JSON.stringify({
            action: exhausted ? "retry_exhausted_dlq" : "retry_scheduled",
            event_id: event.event_id,
            retry: nextRetries,
          }));
          channel.ack(message);
        });
      } catch {
        console.error("Publicacion fallida: original sin confirmar");
        process.exit(1);
      }
      return;
    }

    channel.ack(message);
  }, { noAck: false });

  console.log("audit-svc esperando eventos en jeroky.audit");
}

main().catch(() => {
  console.error("No se pudo iniciar audit-svc");
  process.exit(1);
});
