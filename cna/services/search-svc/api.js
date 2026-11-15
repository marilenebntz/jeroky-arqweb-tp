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

      if (url.pathname !== "/v2/search") {
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

      const query = (url.searchParams.get("q") ?? "").trim();
      if (query.length > 500) {
        send(400, { error: "q admite hasta 500 caracteres" });
        return;
      }

      if (query) {
        conditions.push(`EXISTS (
          SELECT 1 FROM json_tree(documents.payload_json) AS field
          WHERE field.type = 'text'
            AND instr(lower(field.value), lower(?)) > 0
        )`);
        values.push(query);
      }

      for (const field of ["type"]) {
        const value = url.searchParams.get(field);
        if (value !== null) {
          conditions.push(
            "entity_type = ?"
          );
          values.push(value);
        }
      }

      const where = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const { total } = db.prepare(
        `SELECT COUNT(*) AS total FROM documents ${where}`
      ).get(...values);

      const rows = db.prepare(`
        SELECT entity_type, entity_id, payload_json
        FROM documents ${where}
        ORDER BY entity_type ASC, entity_id ASC
        LIMIT ? OFFSET ?
      `).all(...values, limit, offset);

      send(200, {
        page,
        limit,
        total,
        items: rows.map((row) => ({
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          payload: JSON.parse(row.payload_json),
        })),
      });
    } catch {
      console.error("Error al consultar busqueda");
      send(500, { error: "No se pudo consultar busqueda" });
    }
  });

  server.on("error", () => {
    console.error("No se pudo iniciar la API de busqueda");
    process.exit(1);
  });

  server.listen(3000, "0.0.0.0", () => {
    console.log("API de busqueda escuchando en puerto 3000");
  });
}

module.exports = { startApi };
