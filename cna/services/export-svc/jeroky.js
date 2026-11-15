async function getStudents() {
  const base = process.env.JEROKY_BASE_URL?.replace(/\/+$/, "");
  const email = process.env.JEROKY_EMAIL;
  const password = process.env.JEROKY_PASSWORD;

  if (!base || !email || !password) {
    throw new Error("Falta configurar el acceso a Jeroky");
  }

  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });

  if (!login.ok) {
    throw new Error("No se pudo iniciar sesion en Jeroky");
  }

  const auth = await login.json();
  if (typeof auth.access_token !== "string" || !auth.access_token) {
    throw new Error("Jeroky no devolvio un token valido");
  }

  const response = await fetch(base + "/api/students", {
    headers: { Authorization: "Bearer " + auth.access_token },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar la lista de alumnos");
  }

  const students = await response.json();
  if (!Array.isArray(students)) {
    throw new Error("La lista de alumnos tiene un formato inesperado");
  }

  return students.map(student => {
    if (
      !student ||
      !["string", "number"].includes(typeof student.id) ||
      typeof student.firstName !== "string" ||
      typeof student.lastName !== "string" ||
      typeof student.status !== "string"
    ) {
      throw new Error("Un alumno tiene un formato inesperado");
    }

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      status: student.status,
    };
  });
}

function cell(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ");
}

async function generateReport() {
  const students = await getStudents();
  const lines = [
    "# Reporte de alumnos",
    "",
    `Fecha de generacion: ${new Date().toISOString()}`,
    `Cantidad de alumnos: ${students.length}`,
    "",
    "| ID | Nombre | Apellido | Estado |",
    "| --- | --- | --- | --- |",
  ];

  for (const student of students) {
    lines.push(
      `| ${cell(student.id)} | ${cell(student.firstName)} | ` +
      `${cell(student.lastName)} | ${cell(student.status)} |`
    );
  }

  return lines.join("\n") + "\n";
}

module.exports = { generateReport };
