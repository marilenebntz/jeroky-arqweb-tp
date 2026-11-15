const { randomUUID } = require("node:crypto");
const { db } = require("./storage");
const { generateReport } = require("./jeroky");

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
  const now = Date.now();
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

    const result = await generateReport();
    const saved = complete.run(
      result,
      new Date().toISOString(),
      job.job_id,
      token
    );

    if (saved.changes) {
      console.log(JSON.stringify({
        action: "export_completed",
        job_id: job.job_id,
        bytes: Buffer.byteLength(result, "utf8"),
      }));
    }
  } catch {
    fail.run(
      "No se pudo generar el reporte. Revisar la conexion y el acceso a Jeroky.",
      new Date().toISOString(),
      job.job_id,
      token
    );
    console.error(JSON.stringify({
      action: "export_failed",
      job_id: job.job_id,
    }));
  }
}

async function run() {
  console.log("Worker de exportacion esperando trabajos");

  while (true) {
    await processNext();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

run().catch(() => {
  console.error("El worker de exportacion se detuvo por un error");
  process.exit(1);
});
