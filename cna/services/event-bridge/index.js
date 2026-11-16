const amqp = require("amqplib");
const { db, recordSnapshot } = require("./storage");
const { getStudents } = require("./jeroky");

const nextEvent = db.prepare(
  "SELECT sequence, event_id, event_json FROM outbox ORDER BY sequence LIMIT 1"
);
const removeEvent = db.prepare(
  "DELETE FROM outbox WHERE sequence = ?"
);

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

  const channel = await connection.createConfirmChannel();

  channel.on("error", () => {
    console.error("Error en el canal de publicacion");
    process.exit(1);
  });
  channel.on("close", () => process.exit(1));
  channel.on("return", () => {
    console.error("Evento sin ruta: queda pendiente en SQLite");
    process.exit(1);
  });

  await channel.checkExchange("jeroky.events");
  await channel.checkQueue("jeroky.search");
  await channel.checkQueue("jeroky.audit");

  async function publishPending() {
    let row;
    while ((row = nextEvent.get())) {
      const event = JSON.parse(row.event_json);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("RabbitMQ no confirmo a tiempo"));
        }, 15000);

        try {
          channel.publish(
            "jeroky.events",
            event.type,
            Buffer.from(row.event_json),
            {
              persistent: true,
              mandatory: true,
              contentType: "application/json",
              messageId: event.event_id,
              correlationId: event.request_id,
            },
            error => {
              clearTimeout(timer);
              if (error) reject(error);
              else resolve();
            }
          );
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });

      removeEvent.run(row.sequence);
      console.log(JSON.stringify({
        action: "event_published",
        event_id: event.event_id,
        type: event.type,
        request_id: event.request_id,
      }));
    }
  }

  console.log("Bridge conectado. Consultando alumnos cada 10 segundos");

  while (true) {
    await publishPending();

    try {
      const students = await getStudents();
      const count = recordSnapshot(students);
      console.log(JSON.stringify({
        action: "snapshot_checked",
        students: students.length,
        new_events: count,
      }));
    } catch {
      console.error("No se pudo actualizar la copia de alumnos");
    }

    await publishPending();
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

main().catch(() => {
  console.error("Bridge detenido por un error. Revisar conexion y configuracion");
  process.exit(1);
});
