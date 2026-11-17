const http = require("node:http");
const { createObservability, probeDatabase, log } = require("./operational");

function startApi(db, options = {}) {
  const observability = createObservability(options.output);
  const isBrokerReady = options.isBrokerReady || (() => false);
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = new URL(request.url, "http://localhost").pathname; }
    catch { pathname = "unmatched"; }
    const requestId = observability.observe(request, response, pathname);
    const send = (status, body) => {
      response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(body));
    };

    try {
      const url = new URL(request.url, "http://localhost");

      if (url.pathname === "/healthz" && request.method === "GET") {
        send(200, { status: "alive", service: "audit-svc" });
        return;
      }

      if (url.pathname === "/readyz" && request.method === "GET") {
        let database = false;
        let broker = false;
        try { probeDatabase(db); database = true; } catch {}
        try { broker = isBrokerReady() === true; } catch {}
        send(database && broker ? 200 : 503, {
          status: database && broker ? "ready" : "not_ready",
          database: database ? "ok" : "unavailable",
          rabbitmq: broker ? "connected" : "unavailable",
        });
        return;
      }

      if (url.pathname === "/metrics" && request.method === "GET") {
        response.writeHead(200, {
          "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(observability.render());
        return;
      }

      if (url.pathname === "/health" && request.method === "GET") {
        db.prepare("SELECT 1").get();
        send(200, { status: "ok", database: "ok" });
        return;
      }

      if (url.pathname !== "/v2/audit") {
        send(404, { error: "Ruta inexistente" });
        return;
      }

      if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        send(405, { error: "Metodo no permitido" });
        return;
      }

      const pageText = url.searchParams.get("page") ?? "1";
      const limitText = url.searchParams.get("limit") ?? "20";
      const page = Number(pageText);
      const limit = Number(limitText);
      const offset = (page - 1) * limit;

      if (
        !/^[1-9][0-9]*$/.test(pageText) ||
        !/^[1-9][0-9]*$/.test(limitText) ||
        !Number.isSafeInteger(page) ||
        !Number.isSafeInteger(limit) ||
        limit > 100 ||
        !Number.isSafeInteger(offset)
      ) {
        send(400, {
          error: "page debe ser entero positivo y limit entre 1 y 100",
        });
        return;
      }

      const conditions = [];
      const values = [];

      for (const field of ["entity_type", "entity_id"]) {
        const value = url.searchParams.get(field);
        if (value !== null) {
          conditions.push(
            `json_extract(event_json, '$.payload.${field}') = ?`
          );
          values.push(value);
        }
      }

      const where = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const { total } = db.prepare(
        `SELECT COUNT(*) AS total FROM events ${where}`
      ).get(...values);

      const rows = db.prepare(`
        SELECT event_json, stored_at
        FROM events ${where}
        ORDER BY stored_at DESC, event_id DESC
        LIMIT ? OFFSET ?
      `).all(...values, limit, offset);

      send(200, {
        page,
        limit,
        total,
        items: rows.map((row) => ({
          event: JSON.parse(row.event_json),
          stored_at: row.stored_at,
        })),
      });
    } catch {
      log("error", "audit_query_failed", { request_id: requestId }, options.output);
      send(500, { error: "No se pudo consultar busqueda" });
    }
  });

  server.on("error", () => {
    log("error", "http_server_error", {}, options.output);
  });

  server.listen(options.port ?? Number(process.env.PORT || 3000), options.host || "0.0.0.0", () => {
    log("info", "http_server_listening", {}, options.output);
  });
  return server;
}

module.exports = { startApi };
