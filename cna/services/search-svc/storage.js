const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

fs.mkdirSync("/data", { recursive: true });

const db = new DatabaseSync("/data/search.sqlite");
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;

  CREATE TABLE IF NOT EXISTS documents (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
  );

  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY
  );
`);

const recordEvent = db.prepare(`
  INSERT INTO processed_events (event_id) VALUES (?)
  ON CONFLICT(event_id) DO NOTHING
`);

const updateDocument = db.prepare(`
  INSERT INTO documents (entity_type, entity_id, payload_json)
  VALUES (?, ?, ?)
  ON CONFLICT(entity_type, entity_id)
  DO UPDATE SET payload_json = excluded.payload_json
`);

const deleteDocument = db.prepare(`
  DELETE FROM documents WHERE entity_type = ? AND entity_id = ?
`);

function applyEvent(event) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = recordEvent.run(event.event_id);

    if (result.changes) {
      const { entity_type, entity_id } = event.payload;

      if (event.type === "jeroky.entity.deleted") {
        deleteDocument.run(entity_type, entity_id);
      } else {
        updateDocument.run(
          entity_type,
          entity_id,
          JSON.stringify(event.payload)
        );
      }
    }

    db.exec("COMMIT");
    return result.changes ? "indexed" : "duplicate";
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

module.exports = { db, applyEvent };
