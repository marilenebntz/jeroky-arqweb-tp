"""Detiene auditoría del aislado 120 s; publica 20 eventos y un duplicado."""
import json,time,uuid,datetime,subprocess,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
run=str(uuid.uuid4()); events=[]; samples=[]
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def capture(action,details):samples.append({'time':stamp(),'action':action,'details':details});print(action,flush=True)
def docker(*args,stdin=None):
 p=subprocess.run(['docker',*args],input=stdin,capture_output=True,text=True,timeout=40)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout.strip()
helper=(ROOT/'cna/pruebas/publicar-audit.cjs').read_text()
def broker(events):return json.loads(docker('exec','-i','cna-arqui-bridge-1','node','-e',helper,stdin=json.dumps({'events':events})))
def rows():
 query=urllib.parse.urlencode({'entity_type':'prueba_resiliencia','entity_id':run,'limit':100})
 with urllib.request.urlopen('http://127.0.0.1:3102/v2/audit?'+query,timeout=10) as r:return json.load(r)
for i in range(20):events.append({'event_id':str(uuid.uuid4()),'type':'jeroky.entity.created','version':1,'occurred_at':stamp(),'producer':'prueba-consumidor','request_id':run,'payload':{'entity_type':'prueba_resiliencia','entity_id':run,'sequence':i+1}})
evidence={'scope':'20 eventos sintéticos AMQP más un duplicado; no son ediciones del monolito.','run_id':run,'events':events,'samples':samples}
try:
 capture('Cola antes de detener',broker([])['queue'])
 docker('stop','cna-arqui-audit-1');stopped=time.monotonic();capture('Consumidor detenido',{'container':'cna-arqui-audit-1'})
 result=broker(events+[events[0]]);capture('21 publicaciones confirmadas por broker',result)
 assert len(result['confirmed'])==21 and result['queue']['consumerCount']==0 and result['queue']['messageCount']>=21
 while time.monotonic()-stopped<120:time.sleep(min(5,120-(time.monotonic()-stopped)))
 capture('Cola tras dos minutos sin consumidor',broker([])['queue'])
 assert samples[-1]['details']['messageCount']>=21 and samples[-1]['details']['consumerCount']==0
 docker('start','cna-arqui-audit-1');capture('Consumidor reiniciado',{'stopped_seconds':time.monotonic()-stopped})
 deadline=time.monotonic()+70
 while time.monotonic()<deadline:
  try:
   data=rows()
   if data['total']==20:break
  except Exception:pass
  time.sleep(2)
 else:raise RuntimeError('No se recibieron los 20 eventos')
 wanted={x['event_id'] for x in events};got=[x['event']['event_id'] for x in data['items']]
 assert len(got)==len(set(got))==20 and set(got)==wanted
 capture('Comparación exacta de identificadores: cero pérdida ni duplicados almacenados',{'expected':sorted(wanted),'stored':sorted(got),'total':data['total']})
 # Esperar confirmación de ACK también del mensaje duplicado.
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  q=broker([])['queue']
  if q['messageCount']==0:break
  time.sleep(1)
 logs=docker('logs','--since','5m','cna-arqui-audit-1')
 entries=[json.loads(x) for x in logs.splitlines() if x.startswith('{') and run in x]
 assert any(x.get('action')=='duplicate' and x.get('event_id')==events[0]['event_id'] for x in entries)
 capture('Logs de procesamiento y duplicado',entries)
 capture('Cola final',q)
 evidence['result']='passed'
finally:
 docker('start','cna-arqui-audit-1');capture('Auditoría restaurada',{'running':docker('inspect','--format','{{.State.Running}}','cna-arqui-audit-1')})
 path=ROOT/'cna/evidencias/F7-E2-consumidor-detenido.json';path.write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n');print(path,flush=True)
