const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  if (process.env.DATABASE_HOST !== 'db' || process.env.DATABASE_NAME !== 'jeroky_arqui') {
    throw new Error('Este script solo funciona en la base aislada de Arquitectura');
  }
  const client = new Client({
    host: 'db', user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD, database: 'jeroky_arqui',
  });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT current_database() AS name');
    if (rows[0].name !== 'jeroky_arqui') throw new Error('Base incorrecta');
    const hash = await bcrypt.hash(process.env.LAB_PASSWORD, 12);
    await client.query(`INSERT INTO users
      (email, "passwordHash", role, "isActive", "firstName", "lastName")
      VALUES ($1, $2, 'Administrator', true, 'Admin', 'Arquitectura')
      ON CONFLICT(email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash"`,
      [process.env.LAB_EMAIL, hash]);
  } finally { await client.end(); }
  const base = 'http://127.0.0.1:3001/api';
  const login = await fetch(base + '/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: process.env.LAB_EMAIL, password: process.env.LAB_PASSWORD}),
  });
  if (!login.ok) throw new Error('No se pudo iniciar la cuenta de laboratorio');
  const { access_token } = await login.json();
  const headers = {'Content-Type': 'application/json', Authorization: 'Bearer ' + access_token};
  const existingResponse = await fetch(base + '/students', {headers});
  if (!existingResponse.ok) throw new Error('No se pudo consultar la base aislada');
  const existing = await existingResponse.json();
  for (const student of [
    {firstName: 'Alumno', lastName: 'Laboratorio Uno', ci: '990000001', birthDate: '2000-01-01'},
    {firstName: 'Alumno', lastName: 'Laboratorio Dos', ci: '990000002', birthDate: '2000-02-02'},
  ]) {
    if (existing.some(item => item.ci === student.ci)) continue;
    const response = await fetch(base + '/students', {
      method: 'POST', headers, body: JSON.stringify(student),
    });
    if (!response.ok) throw new Error('No se pudo crear alumno ficticio: HTTP ' + response.status);
  }
  console.log('Cuenta de Arquitectura y dos alumnos ficticios preparados');
}
main().catch(error => { console.error(error.message); process.exit(1); });
