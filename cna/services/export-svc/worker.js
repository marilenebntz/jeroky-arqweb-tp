const { randomUUID } = require("node:crypto");
const { log } = require("./operational");
const { generateReport } = require("./jeroky");

function createProcessor(db, generate = generateReport, options = {}) {
const nowMs = options.now || Date.now;
const columns = db.prepare("PRAGMA table_info(jobs)").all();
if (!columns.some(column => column.name === "lease_token")) {
  db.exec("ALTER TABLE jobs ADD COLUMN lease_token TEXT");
}
if (!columns.some(column => column.name === "lease_until")) {
  db.exec("ALTER TABLE jobs ADD COLUMN lease_until INTEGER");
}

const claim = db.prepare(`
  UPDATE jobs
  SET status = 'running',
      lease_token = ?,
      lease_until = ?,
      updated_at = ?
  WHERE job_id = (
    SELECT job_id FROM jobs
    WHERE status = 'queued'
       OR (status = 'running' AND COALESCE(lease_until, 0) <= ?)
    ORDER BY created_at, job_id
    LIMIT 1
  )
  RETURNING job_id, report, format
`);

const complete = db.prepare(`
  UPDATE jobs
  SET status = 'completed', result = ?, error = NULL,
      lease_token = NULL, lease_until = NULL, updated_at = ?
  WHERE job_id = ? AND lease_token = ? AND status = 'running'
`);

const fail = db.prepare(`
  UPDATE jobs
  SET status = 'failed', error = ?,
      lease_token = NULL, lease_until = NULL, updated_at = ?
  WHERE job_id = ? AND lease_token = ? AND status = 'running'
`);

async function processNext() {
  const token = randomUUID();
  const now = nowMs();
  const job = claim.get(
    token,
    now + 120000,
    new Date(now).toISOString(),
    now
  );

  if (!job) return;

  try {
    if (job.report !== "students" || job.format !== "markdown") {
      throw new Error("Tipo de reporte no soportado");
    }

    const result = await generate();
    const saved = complete.run(
      result,
      new Date().toISOString(),
      job.job_id,
      token
    );

    if (saved.changes) {
      log("info", "export_completed", {
        action: "export_completed",
        job_id: job.job_id,
        bytes: Buffer.byteLength(result, "utf8"),
      }, options.output);
    }
  } catch {
    fail.run(
      "No se pudo generar el reporte. Revisar la conexion y el acceso a Jeroky.",
      new Date().toISOString(),
      job.job_id,
      token
    );
    log("error", "export_failed", {
      action: "export_failed",
      job_id: job.job_id,
    }, options.output);
  }
}

return { processNext };
}
async function run() {
  const { db } = require("./storage").createStore();
  const { processNext } = createProcessor(db);
  log("info", "worker_started");
  while (true) {
    await processNext();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
if (require.main === module) run().catch(() => {
  log("error", "worker_stopped"); process.exit(1);
});
module.exports = { createProcessor };
