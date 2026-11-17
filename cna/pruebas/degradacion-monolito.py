"""CA-5: caída individual de search, audit y export, con recuperación garantizada."""
from pathlib import Path
import json,subprocess,time,uuid,datetime,urllib.request
ROOT=Path(__file__).resolve().parents[2]
probe=(ROOT/'cna/pruebas/monolito-disponible.cjs').read_text()
cert=(ROOT/'cna/deploy/gateway/certs/localhost.crt').read_text()
evidence={'scope':'Tres caídas individuales por docker stop en el entorno aislado; no prueba caída simultánea, de nodo o del broker. HTTPS validado con certificado local.','cases':[]}
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def docker(*args,stdin=None):
 r=subprocess.run(['docker',*args],input=stdin,capture_output=True,text=True,timeout=90)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def ready(service):
 port={'search':3103,'audit':3102,'export':3104}[service]
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/readyz',timeout=5) as response:return response.status==200 and json.load(response)['status']=='ready'
def recovered(service):
 path={'search':'/v2/search?q=Alumno&type=student','audit':'/v2/audit?limit=1','export':'/v2/exports/00000000-0000-0000-0000-000000000000'}[service]
 result=docker('run','--rm','--network','cna-arqui_default','-v',str(ROOT/'cna/deploy/gateway/certs/localhost.crt')+':/certs/localhost.crt:ro','curlimages/curl:latest','--silent','--show-error','--connect-to','localhost:3443:gateway:8443','--cacert','/certs/localhost.crt','--max-time','10','--output','/dev/null','--write-out','%{http_code}','https://localhost:3443'+path)
 # En export, 404 de un ID inexistente prueba que vuelve la API, no que se haya generado un reporte.
 expected=404 if service=='export' else 200
 return {'route':path,'http':int(result),'expected':expected}
try:
 for service in ['search','audit','export']:
  if not ready(service):raise RuntimeError('Servicio no preparado antes de prueba: '+service)
  name='cna-arqui-'+service+'-1';case={'service':service,'started_at':stamp()};evidence['cases'].append(case)
  try:
   docker('stop',name);case['stopped_at']=stamp();print(service+': detenido',flush=True)
   result=json.loads(docker('exec','-i','cna-arqui-backend-1','node','-e',probe,stdin=json.dumps({'cert':cert,'service':service,'requestId':'ca5-'+str(uuid.uuid4())})))
   case['during_outage']=result;print(service+': 503 controlado; frontend 200; login y alumnos operativos',flush=True)
  finally:
   start=time.monotonic();docker('start',name);deadline=time.monotonic()+90
   while time.monotonic()<deadline:
    try:
     if ready(service):
      response=recovered(service)
      if response['http']==response['expected']:
       case['recovery']={'observed_at':stamp(),'seconds_from_start_request':round(time.monotonic()-start,3),'readyz':'ready','gateway':response};break
    except Exception:pass
    time.sleep(1)
   else:raise RuntimeError('No se recuperó '+service)
   print(service+': recuperado',flush=True)
 evidence['result']='passed'
finally:
 for service in ['search','audit','export']:docker('start','cna-arqui-'+service+'-1')
 evidence['finished_at']=stamp()
 path=ROOT/'cna/evidencias/CA5-degradacion-monolito.json';path.write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n');print(path,flush=True)
