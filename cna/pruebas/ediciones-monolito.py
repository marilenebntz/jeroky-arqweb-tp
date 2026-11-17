"""Crea 20 alumnos ficticios y edita cada uno mientras auditoría está detenida."""
from pathlib import Path
import json,subprocess,time,uuid,datetime,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parents[2]; samples=[];students=[]
marker='Ensayo '+''.join(chr(65+int(c,16)) for c in uuid.uuid4().hex[:8]);evidence={'marker':marker,'samples':samples,'scope':'20 PATCH reales a alumnos ficticios distintos; bridge por polling, no webhook. Los registros de prueba se conservan.'}
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def capture(action,details):samples.append({'time':stamp(),'action':action,'details':details});print(action,flush=True)
def docker(*args,stdin=None):
 r=subprocess.run(['docker',*args],input=stdin,text=True,capture_output=True,timeout=90)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
helper=(ROOT/'cna/pruebas/editar-alumnos.cjs').read_text()
def edit(action):return json.loads(docker('exec','-i','cna-arqui-backend-1','node','-e',helper,stdin=json.dumps({'action':action,'marker':marker,'students':students})))
def snapshots():
 code="const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/data/bridge.sqlite',{readOnly:true});console.log(JSON.stringify(d.prepare('SELECT entity_id,payload_json FROM snapshots').all()));d.close()"
 return {r['entity_id']:json.loads(r['payload_json']) for r in json.loads(docker('exec','cna-arqui-bridge-1','node','-e',code))}
def wait_snapshot(lastName):
 deadline=time.monotonic()+45
 while time.monotonic()<deadline:
  state=snapshots()
  if all(state.get(s['id'],{}).get('name')==s['firstName']+' '+lastName for s in students):return
  time.sleep(2)
 raise RuntimeError('El bridge no observó todas las modificaciones')
def query_audit():
 query=urllib.parse.urlencode({'entity_type':'student','limit':100})
 # Leer páginas para no depender del total de eventos anteriores.
 rows=[];page=1
 while True:
  with urllib.request.urlopen('http://127.0.0.1:3102/v2/audit?'+query+'&page='+str(page),timeout=15) as r:data=json.load(r)
  rows+=data['items']
  if len(rows)>=data['total']:break
  page+=1
 ids={s['id'] for s in students}
 return [r['event'] for r in rows if r['event']['payload'].get('entity_id') in ids and r['event']['payload'].get('name','').endswith(' Actualizado')]
broker_helper=(ROOT/'cna/pruebas/publicar-audit.cjs').read_text()
def queue():return json.loads(docker('exec','-i','cna-arqui-bridge-1','node','-e',broker_helper,stdin='{}'))['queue']
try:
 students=edit('create');assert len(students)==20 and len({x['id'] for x in students})==20;capture('20 alumnos ficticios creados mediante API de Jeroky',students)
 wait_snapshot('Inicial');capture('Bridge observó el estado inicial de los 20 alumnos',{'count':20})
 docker('stop','cna-arqui-audit-1');stopped=time.monotonic();since=stamp();capture('Auditoría detenida antes de editar',{'queue':queue()})
 edited=edit('edit');assert len(edited)==20;capture('20 ediciones PATCH aceptadas por Jeroky',edited)
 wait_snapshot('Actualizado');capture('Bridge observó los 20 nombres editados',{'queue':queue()})
 while time.monotonic()-stopped<120:time.sleep(min(5,120-(time.monotonic()-stopped)))
 q=queue();capture('Cola tras 120 segundos sin auditoría',q);assert q['consumerCount']==0 and q['messageCount']>=20
 published=[]
 for line in docker('logs','--timestamps','--tail','1000','cna-arqui-bridge-1').splitlines():
  timestamp, _, content=line.partition(' ')
  if content.startswith('{') and 'event_published' in content and datetime.datetime.fromisoformat(timestamp.replace('Z','+00:00')) >= datetime.datetime.fromisoformat(since):
   published.append({**json.loads(content),'docker_timestamp':timestamp})
 capture('Eventos publicados por el bridge durante la detención',published)
 docker('start','cna-arqui-audit-1');capture('Auditoría reiniciada',{'stopped_seconds':time.monotonic()-stopped})
 deadline=time.monotonic()+60
 while time.monotonic()<deadline:
  try:
   events=query_audit()
   if len(events)==20:break
  except Exception:pass
  time.sleep(2)
 else:raise RuntimeError('No se recuperaron las 20 ediciones')
 expected={s['id'] for s in students};got=[e['payload']['entity_id'] for e in events];event_ids=[e['event_id'] for e in events]
 assert len(set(got))==20 and set(got)==expected and len(set(event_ids))==20
 assert all(e['producer']=='event-bridge' and e['payload']['observation']=='polling' for e in events)
 assert set(event_ids).issubset({p['event_id'] for p in published})
 capture('20 ediciones recibidas una vez y correlacionadas con publicaciones del bridge',events)
 capture('Cola final',queue());evidence['result']='passed'
finally:
 docker('start','cna-arqui-audit-1');capture('Auditoría restaurada',{'running':docker('inspect','--format','{{.State.Running}}','cna-arqui-audit-1')})
 target=ROOT/'cna/evidencias/F7-E2-ediciones-jeroky.json';target.write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n');print(target,flush=True)
