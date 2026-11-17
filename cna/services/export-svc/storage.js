const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

function createStore(filename = "/data/exports.sqlite") {
if (filename !== ":memory:") fs.mkdirSync(require("node:path").dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;

  CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    report TEXT NOT NULL,
    format TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued'
      CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    result TEXT,
    error TEXT
  );
`);

const insertJob = db.prepare(`
  INSERT INTO jobs (
    job_id, report, format, status, created_at, updated_at
  ) VALUES (?, ?, ?, 'queued', ?, ?)
`);

const findJob = db.prepare(`
  SELECT job_id, report, format, status,
         created_at, updated_at, error
  FROM jobs WHERE job_id = ?
`);

function createJob(report, format) {
  const jobId = randomUUID();
  const now = new Date().toISOString();
  insertJob.run(jobId, report, format, now, now);
  return findJob.get(jobId);
}

return { db, createJob, findJob };
}
module.exports = { createStore };
