const http = require("node:http");

function startApi(db) {
  const server = http.createServer((request, response) => {
    const send = (status, body) => {
      response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(body));
    };

    try {
      const url = new URL(request.url, "http://localhost");

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
      console.error("Error al consultar auditoria");
      send(500, { error: "No se pudo consultar auditoria" });
    }
  });

  server.on("error", () => {
    console.error("No se pudo iniciar la API de auditoria");
    process.exit(1);
  });

  server.listen(3000, "0.0.0.0", () => {
    console.log("API de auditoria escuchando en puerto 3000");
  });
}

module.exports = { startApi };
