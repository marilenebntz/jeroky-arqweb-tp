const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const ajv = new Ajv2020();
addFormats(ajv);
const validate = ajv.compile(JSON.parse(
  fs.readFileSync("/contracts/event-envelope.schema.json", "utf8")
));

fs.mkdirSync("/data", { recursive: true });
const db = new DatabaseSync("/data/bridge.sqlite");
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  CREATE TABLE IF NOT EXISTS snapshots (
    entity_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS outbox (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    event_json TEXT NOT NULL
  );
`);

const saveSnapshot = db.prepare(`
  INSERT INTO snapshots (entity_id, payload_json) VALUES (?, ?)
  ON CONFLICT(entity_id)
  DO UPDATE SET payload_json = excluded.payload_json
`);
const deleteSnapshot = db.prepare(
  "DELETE FROM snapshots WHERE entity_id = ?"
);
const saveEvent = db.prepare(
  "INSERT INTO outbox (event_id, event_json) VALUES (?, ?)"
);

function recordSnapshot(students) {
  if (!Array.isArray(students)) {
    throw new Error("La lista de alumnos no es valida");
  }

  const current = new Map();
  for (const student of students) {
    if (
      !student ||
      typeof student.entity_id !== "string" ||
      !student.entity_id.trim() ||
      student.entity_type !== "student" ||
      typeof student.name !== "string" ||
      !["active", "inactive"].includes(student.status) ||
      current.has(student.entity_id)
    ) {
      throw new Error("Los datos de alumnos no son validos");
    }
    current.set(student.entity_id, JSON.stringify({
      entity_type: "student",
      entity_id: student.entity_id,
      name: student.name,
      status: student.status,
    }));
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const previous = new Map(
      db.prepare("SELECT entity_id, payload_json FROM snapshots")
        .all().map(row => [row.entity_id, row.payload_json])
    );
    let count = 0;
    const observedAt = new Date().toISOString();
    const requestId = randomUUID();

    function enqueue(type, payload) {
      const event = {
        event_id: randomUUID(),
        type,
        version: 1,
        occurred_at: observedAt,
        producer: "event-bridge",
        request_id: requestId,
        payload: {
          ...payload,
          observation: "polling",
        },
      };
      if (!validate(event)) {
        throw new Error("El evento no cumple el contrato");
      }
      saveEvent.run(event.event_id, JSON.stringify(event));
      count++;
    }

    for (const [id, json] of current) {
      if (previous.get(id) !== json) {
        const payload = JSON.parse(json);
        enqueue(
          payload.status === "inactive"
            ? "jeroky.entity.deleted"
            : "jeroky.entity.updated",
          payload
        );
        saveSnapshot.run(id, json);
      }
    }

    for (const id of previous.keys()) {
      if (!current.has(id)) {
        enqueue("jeroky.entity.deleted", {
          entity_type: "student",
          entity_id: id,
        });
        deleteSnapshot.run(id);
      }
    }

    db.exec("COMMIT");
    return count;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

module.exports = { db, recordSnapshot };
