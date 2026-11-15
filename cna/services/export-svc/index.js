const http = require("node:http");
const { db, createJob, findJob } = require("./storage");

const server = http.createServer(async (request, response) => {
  const send = (status, body, headers = {}) => {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
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

    if (url.pathname === "/v2/exports") {
      if (request.method !== "POST") {
        send(405, { error: "Usar POST" }, { Allow: "POST" });
        return;
      }

      const contentType = request.headers["content-type"]
        ?.split(";")[0].trim().toLowerCase();

      if (contentType !== "application/json") {
        send(415, { error: "Enviar application/json" });
        return;
      }

      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8192) {
          send(413, { error: "El pedido es demasiado grande" });
          return;
        }
        chunks.push(chunk);
      }

      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        send(400, { error: "El JSON no es valido" });
        return;
      }

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        body.report !== "students" ||
        body.format !== "markdown" ||
        Object.keys(body).some(key => !["report", "format"].includes(key))
      ) {
        send(400, {
          error: "Enviar report students y format markdown",
        });
        return;
      }

      const job = createJob(body.report, body.format);
      send(202, job, {
        Location: `/v2/exports/${job.job_id}`,
      });
      return;
    }

    const match = url.pathname.match(
      /^\/v2\/exports\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/
    );

    if (match) {
      if (request.method !== "GET") {
        send(405, { error: "Usar GET" }, { Allow: "GET" });
        return;
      }

      const job = findJob.get(match[1]);
      if (!job) {
        send(404, { error: "No encontramos ese trabajo" });
        return;
      }

      send(200, job);
      return;
    }

    send(404, { error: "Ruta inexistente" });
  } catch {
    console.error("Error en la API de exportacion");
    if (!response.headersSent && !response.destroyed) {
      send(500, { error: "No se pudo completar el pedido" });
    }
  }
});

server.requestTimeout = 15000;
server.on("error", () => {
  console.error("No se pudo iniciar la API de exportacion");
  process.exit(1);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("API de exportacion escuchando en puerto 3000");
});
