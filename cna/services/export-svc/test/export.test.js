const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createStore } = require('../storage');
const { startApi } = require('../index');
const { createProcessor } = require('../worker');
async function fixture(t) {
  const store = createStore(':memory:'); const logs = [];
  const server = startApi(store,{port:0,host:'127.0.0.1',output:x=>logs.push(JSON.parse(x))});
  await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));try{store.db.close();}catch{}});
  return {...store,logs,get:(path,init)=>fetch(`http://127.0.0.1:${server.address().port}`+path,init)};
}
const post = body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('ciclo HTTP 202, pendiente 409, procesamiento y descarga Markdown',async t=>{
  const f=await fixture(t);
  const r=await f.get('/v2/exports',post({report:'students',format:'markdown'}));
  assert.equal(r.status,202);const j=await r.json();assert.equal(j.status,'queued');
  const path=r.headers.get('location');assert.equal((await f.get(path+'/download')).status,409);
  await createProcessor(f.db,async()=>'# Reporte de prueba\n',{output:()=>{}}).processNext();
  assert.equal((await (await f.get(path)).json()).status,'completed');
  const download=await f.get(path+'/download');assert.equal(download.status,200);
  assert.match(download.headers.get('content-type'),/text\/markdown/);assert.equal(await download.text(),'# Reporte de prueba\n');
});
test('JSON inválido, formato y tipo HTTP se rechazan',async t=>{
  const f=await fixture(t);
  assert.equal((await f.get('/v2/exports',post({report:'students',format:'pdf'}))).status,400);
  assert.equal((await f.get('/v2/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await f.get('/v2/exports',{method:'POST',body:'x'})).status,415);
  assert.equal((await f.get('/v2/exports')).status,405);
  assert.equal((await f.get('/v2/exports/00000000-0000-0000-0000-000000000000')).status,404);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM jobs').get().n,0);
});
test('healthz independiente y readyz reversible detecta falta de escritura',async t=>{
 const f=await fixture(t);assert.equal((await f.get('/readyz')).status,200);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM jobs').get().n,0);
 f.db.exec('PRAGMA query_only=ON');assert.equal((await f.get('/readyz')).status,503);
 assert.equal((await f.get('/healthz')).status,200);
});
test('métricas acotan IDs y logs conservan request_id',async t=>{
 const f=await fixture(t);const j=f.createJob('students','markdown');
 const r=await f.get('/v2/exports/'+j.job_id,{headers:{'X-Request-ID':'export-test-001'}});await r.text();
 assert.equal(r.headers.get('x-request-id'),'export-test-001');
 const m=await (await f.get('/metrics')).text();
 assert.ok(m.includes('export_http_requests_total{method="GET",route="/v2/exports/:id",status="200"} 1'));
 assert.ok(m.includes('export_http_request_duration_seconds_bucket'));assert.ok(!m.includes(j.job_id));
 assert.ok(f.logs.some(x=>x.message==='http_request'&&x.request_id==='export-test-001'));
});
test('fallo al generar deja trabajo failed sin exponer detalles internos',async t=>{
 const f=await fixture(t);const j=f.createJob('students','markdown');
 await createProcessor(f.db,async()=>{throw Error('secreto');},{output:()=>{}}).processNext();
 const result=f.findJob.get(j.job_id);assert.equal(result.status,'failed');assert.ok(!result.error.includes('secreto'));
});
test('lease vigente impide doble procesamiento, vencido permite recuperar',async t=>{
 const f=await fixture(t);const j=f.createJob('students','markdown');let calls=0;
 const p=createProcessor(f.db,async()=>{calls++;return 'ok';},{now:()=>1000,output:()=>{}});
 f.db.prepare("UPDATE jobs SET status='running',lease_token='anterior',lease_until=2000 WHERE job_id=?").run(j.job_id);
 await p.processNext();assert.equal(calls,0);
 await createProcessor(f.db,async()=>{calls++;return 'recuperado';},{now:()=>2001,output:()=>{}}).processNext();
 assert.equal(calls,1);assert.equal(f.findJob.get(j.job_id).status,'completed');
});
test('worker antiguo no sobrescribe resultado tras perder lease',async t=>{
 const f=await fixture(t);const j=f.createJob('students','markdown');let release;
 const old=createProcessor(f.db,()=>new Promise(r=>{release=r;}),{now:()=>1000,output:()=>{}});
 const pending=old.processNext();
 await createProcessor(f.db,async()=>'nuevo',{now:()=>121001,output:()=>{}}).processNext();
 release('viejo');await pending;
 assert.equal(f.db.prepare('SELECT result FROM jobs WHERE job_id=?').get(j.job_id).result,'nuevo');
});
