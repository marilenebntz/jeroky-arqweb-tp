const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { DatabaseSync } = require('node:sqlite');
const { startApi } = require('../api');

async function fixture(t, options = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE documents(entity_type TEXT, entity_id TEXT, payload_json TEXT);
    CREATE TABLE processed_events(event_id TEXT PRIMARY KEY);`);
  const insert = db.prepare('INSERT INTO documents VALUES (?, ?, ?)');
  insert.run('student', 'one', JSON.stringify({name: 'Juana Lopez'}));
  insert.run('student', 'two', JSON.stringify({name: 'Luciana Velazquez'}));
  insert.run('course', 'three', JSON.stringify({name: 'Danza'}));
  const logs = [];
  const state = { ready: true };
  const server = startApi(db, {
    port: 0, host: '127.0.0.1', isBrokerReady: () => state.ready,
    output: line => logs.push(JSON.parse(line)), ...options,
  });
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    try { db.close(); } catch {}
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {db, logs, state, get: (path, init) => fetch(base + path, init)};
}

test('búsqueda filtra por texto y tipo, con paginación', async t => {
  const f = await fixture(t);
  const r = await f.get('/v2/search?q=Juana&type=student&page=1&limit=1');
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(b.total, 1); assert.equal(b.items[0].payload.name, 'Juana Lopez');
  assert.equal(b.limit, 1);
});

test('búsqueda sin coincidencias devuelve lista vacía', async t => {
  const f = await fixture(t); const r = await f.get('/v2/search?q=inexistente');
  assert.equal(r.status, 200); assert.equal((await r.json()).total, 0);
});

test('paginación inválida e intento de inyección no alteran datos', async t => {
  const f = await fixture(t);
  assert.equal((await f.get('/v2/search?page=0')).status, 400);
  const r = await f.get('/v2/search?q=' + encodeURIComponent("' OR 1=1 --"));
  assert.equal(r.status, 200); assert.equal((await r.json()).total, 0);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM documents').get().n, 3);
});

test('healthz permanece vivo si falla SQLite o el broker', async t => {
  const f = await fixture(t); f.state.ready = false; f.db.close();
  const r = await f.get('/healthz');
  assert.equal(r.status, 200); assert.equal((await r.json()).status, 'alive');
  assert.equal((await f.get('/readyz')).status, 503);
});

test('readyz comprueba escritura sin dejar registros de prueba', async t => {
  const f = await fixture(t); const r = await f.get('/readyz');
  assert.equal(r.status, 200); assert.equal((await r.json()).rabbitmq, 'connected');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM processed_events').get().n, 0);
});

test('readyz devuelve 503 si consumidor no está listo', async t => {
  const f = await fixture(t); f.state.ready = false;
  const r = await f.get('/readyz'); assert.equal(r.status, 503);
  const b = await r.json(); assert.equal(b.database, 'ok'); assert.equal(b.rabbitmq, 'unavailable');
});

test('readyz detecta tablas faltantes y revierte la escritura de prueba', async t => {
  const f = await fixture(t); f.db.exec('DROP TABLE documents');
  const r = await f.get('/readyz'); assert.equal(r.status, 503);
  assert.equal((await r.json()).database, 'unavailable');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM processed_events').get().n, 0);
});

test('readyz rechaza una base sin permiso de escritura', async t => {
  const f = await fixture(t); f.db.exec('PRAGMA query_only=ON');
  assert.equal((await f.get('/readyz')).status, 503);
  assert.equal((await f.get('/healthz')).status, 200);
});

test('request id se propaga en respuesta y log sin incluir consulta sensible', async t => {
  const f = await fixture(t);
  const r = await f.get('/v2/search?q=texto-privado', {headers: {'X-Request-ID':'prueba-unitaria-001'}});
  await r.text();
  assert.equal(r.headers.get('x-request-id'), 'prueba-unitaria-001');
  const entry = f.logs.find(x => x.message === 'http_request');
  for (const k of ['timestamp','level','service','request_id','message']) assert.ok(entry[k]);
  assert.equal(entry.request_id, 'prueba-unitaria-001');
  assert.ok(!JSON.stringify(f.logs).includes('texto-privado'));
  const invalid = await f.get('/healthz', {headers:{'X-Request-ID':'bad id'}});
  assert.match(invalid.headers.get('x-request-id'), /^[a-f0-9-]{36}$/);
});

test('métricas cuentan códigos e histograma con etiquetas acotadas', async t => {
  const f = await fixture(t);
  await (await f.get('/v2/search')).text();
  await (await f.get('/v2/search?page=0')).text();
  await (await f.get('/ruta-unica-123?q=secreto')).text();
  const r = await f.get('/metrics'); const metrics = await r.text();
  assert.equal(r.status,200); assert.match(r.headers.get('content-type'), /text\/plain/);
  assert.ok(metrics.includes('search_http_requests_total{method="GET",route="/v2/search",status="200"} 1'));
  assert.ok(metrics.includes('search_http_requests_total{method="GET",route="/v2/search",status="400"} 1'));
  assert.ok(metrics.includes('route="unmatched"'));
  assert.ok(!metrics.includes('ruta-unica-123')); assert.ok(!metrics.includes('secreto'));
  assert.ok(metrics.includes('search_http_request_duration_seconds_bucket{method="GET",route="/v2/search",status="200",le="+Inf"} 1'));
  assert.ok(metrics.includes('search_http_request_duration_seconds_sum'));
  const samples = metrics.split('\n').filter(x => x.includes('_bucket{') && x.includes('route="/v2/search",status="200"'));
  const values = samples.map(x => Number(x.split(' ').at(-1)));
  assert.ok(values.every((x,i) => i===0 || x>=values[i-1]));
});

test('health anterior y respuestas 404 y 405 siguen disponibles', async t => {
  const f = await fixture(t);
  assert.equal((await f.get('/health')).status,200);
  assert.equal((await f.get('/nada')).status,404);
  assert.equal((await f.get('/v2/search',{method:'POST'})).status,405);
});
