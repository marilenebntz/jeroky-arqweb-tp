const { randomUUID } = require("node:crypto");
const { performance } = require("node:perf_hooks");

const routes = new Set(["/health", "/healthz", "/readyz", "/metrics", "/v2/exports", "/v2/exports/:id", "/v2/exports/:id/download"]);
const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const bounds = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function log(level, message, fields = {}, output = console.log) {
  output(JSON.stringify({
    ...fields,
    timestamp: new Date().toISOString(),
    level,
    service: "export-svc",
    request_id: fields.request_id || null,
    message,
  }));
}

function probeDatabase(db) {
  const id = "readiness-" + randomUUID();
  db.exec("SAVEPOINT readiness_probe");
  try {
    db.prepare("SELECT job_id, report, format, status, created_at, updated_at, result, error FROM jobs LIMIT 1").all();
    db.prepare("INSERT INTO jobs(job_id,report,format,status,created_at,updated_at) VALUES (?, 'students', 'markdown', 'queued', ?, ?)").run(id, new Date().toISOString(), new Date().toISOString());
  } finally {
    db.exec("ROLLBACK TO readiness_probe; RELEASE readiness_probe");
  }
}

function createObservability(output = console.log) {
  const series = new Map();
  function observe(request, response, pathname) {
    const incoming = request.headers["x-request-id"];
    const requestId = typeof incoming === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(incoming)
      ? incoming : randomUUID();
    response.setHeader("X-Request-ID", requestId);
    pathname = pathname.replace(/^\/v2\/exports\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\/download)?$/, (_, download) => "/v2/exports/:id" + (download || ""));
    const route = routes.has(pathname) ? pathname : "unmatched";
    const method = methods.has(request.method) ? request.method : "OTHER";
    const start = performance.now();
    response.once("finish", () => {
      const duration = (performance.now() - start) / 1000;
      const status = String(response.statusCode);
      const key = JSON.stringify([method, route, status]);
      if (!series.has(key)) series.set(key, { method, route, status, count: 0, sum: 0, buckets: bounds.map(() => 0) });
      const item = series.get(key);
      item.count++;
      item.sum += duration;
      bounds.forEach((bound, i) => { if (duration <= bound) item.buckets[i]++; });
      log(Number(status) >= 500 ? "error" : "info", "http_request", {
        request_id: requestId, method, route, status: response.statusCode,
        duration_ms: Number((duration * 1000).toFixed(3)),
      }, output);
    });
    return requestId;
  }
  function render() {
    const lines = [
      "# HELP export_http_requests_total Completed HTTP requests.",
      "# TYPE export_http_requests_total counter",
      "# HELP export_http_request_duration_seconds HTTP response duration in seconds.",
      "# TYPE export_http_request_duration_seconds histogram",
    ];
    for (const item of series.values()) {
      const labels = `method="${item.method}",route="${item.route}",status="${item.status}"`;
      lines.push(`export_http_requests_total{${labels}} ${item.count}`);
      bounds.forEach((bound, i) => lines.push(`export_http_request_duration_seconds_bucket{${labels},le="${bound}"} ${item.buckets[i]}`));
      lines.push(`export_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${item.count}`);
      lines.push(`export_http_request_duration_seconds_sum{${labels}} ${item.sum}`);
      lines.push(`export_http_request_duration_seconds_count{${labels}} ${item.count}`);
    }
    return lines.join("\n") + "\n";
  }
  return { observe, render };
}

module.exports = { createObservability, probeDatabase, log };
