const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { DatabaseSync } = require('node:sqlite');
const { startApi } = require('../api');

async function fixture(t, options = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE events(event_id TEXT PRIMARY KEY, event_json TEXT NOT NULL, stored_at TEXT NOT NULL)');
  const insert = db.prepare('INSERT INTO events VALUES (?, ?, ?)');
  insert.run('one', JSON.stringify({payload:{entity_type:'student',entity_id:'one'}}), '2026-11-16T00:00:00Z');
  insert.run('two', JSON.stringify({payload:{entity_type:'course',entity_id:'two'}}), '2026-11-16T01:00:00Z');
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

test('auditoría filtra entidad y pagina en orden descendente', async t => {
  const f = await fixture(t);
  const r = await f.get('/v2/audit?entity_type=student&entity_id=one&limit=1');
  const b = await r.json(); assert.equal(r.status,200); assert.equal(b.total,1);
  assert.equal(b.items[0].event.payload.entity_id,'one');
  const all = await (await f.get('/v2/audit?limit=1')).json();
  assert.equal(all.total,2); assert.equal(all.items[0].event.payload.entity_id,'two');
});
test('filtros sin coincidencias devuelven lista vacía', async t => {
  const f = await fixture(t);
  const b = await (await f.get('/v2/audit?entity_id=missing')).json(); assert.equal(b.total,0);
});
test('paginación e inyección se validan sin alterar registros', async t => {
  const f = await fixture(t);
  for (const q of ['page=0','limit=101','page=1.5']) assert.equal((await f.get('/v2/audit?'+q)).status,400);
  const b = await (await f.get('/v2/audit?entity_id='+encodeURIComponent("' OR 1=1 --"))).json();
  assert.equal(b.total,0); assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM events').get().n,2);
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
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 2);
});

test('readyz devuelve 503 si consumidor no está listo', async t => {
  const f = await fixture(t); f.state.ready = false;
  const r = await f.get('/readyz'); assert.equal(r.status, 503);
  const b = await r.json(); assert.equal(b.database, 'ok'); assert.equal(b.rabbitmq, 'unavailable');
});

test('readyz detecta tablas faltantes y revierte la escritura de prueba', async t => {
  const f = await fixture(t); f.db.exec('ALTER TABLE events RENAME COLUMN event_json TO broken');
  const r = await f.get('/readyz'); assert.equal(r.status, 503);
  assert.equal((await r.json()).database, 'unavailable');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 2);
});

test('readyz rechaza una base sin permiso de escritura', async t => {
  const f = await fixture(t); f.db.exec('PRAGMA query_only=ON');
  assert.equal((await f.get('/readyz')).status, 503);
  assert.equal((await f.get('/healthz')).status, 200);
});

test('request id se propaga en respuesta y log sin incluir consulta sensible', async t => {
  const f = await fixture(t);
  const r = await f.get('/v2/audit?entity_id=texto-privado', {headers: {'X-Request-ID':'prueba-unitaria-001'}});
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
  await (await f.get('/v2/audit')).text();
  await (await f.get('/v2/audit?page=0')).text();
  await (await f.get('/ruta-unica-123?q=secreto')).text();
  const r = await f.get('/metrics'); const metrics = await r.text();
  assert.equal(r.status,200); assert.match(r.headers.get('content-type'), /text\/plain/);
  assert.ok(metrics.includes('audit_http_requests_total{method="GET",route="/v2/audit",status="200"} 1'));
  assert.ok(metrics.includes('audit_http_requests_total{method="GET",route="/v2/audit",status="400"} 1'));
  assert.ok(metrics.includes('route="unmatched"'));
  assert.ok(!metrics.includes('ruta-unica-123')); assert.ok(!metrics.includes('secreto'));
  assert.ok(metrics.includes('audit_http_request_duration_seconds_bucket{method="GET",route="/v2/audit",status="200",le="+Inf"} 1'));
  assert.ok(metrics.includes('audit_http_request_duration_seconds_sum'));
  const samples = metrics.split('\n').filter(x => x.includes('_bucket{') && x.includes('route="/v2/audit",status="200"'));
  const values = samples.map(x => Number(x.split(' ').at(-1)));
  assert.ok(values.every((x,i) => i===0 || x>=values[i-1]));
});

test('health anterior y respuestas 404 y 405 siguen disponibles', async t => {
  const f = await fixture(t);
  assert.equal((await f.get('/health')).status,200);
  assert.equal((await f.get('/nada')).status,404);
  assert.equal((await f.get('/v2/audit',{method:'POST'})).status,405);
});
