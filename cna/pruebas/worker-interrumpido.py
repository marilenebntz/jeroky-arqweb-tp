"""Prueba destructiva solo del worker cna-arqui-worker-1; lo restaura al terminar."""
from pathlib import Path
import datetime,json,subprocess,time,urllib.request
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[2]
NAME='cna-arqui-worker-1'
evidence={'scope':'Worker real interrumpido con SIGKILL; recuperación mediante lease de 120 s sin modificar SQLite.','samples':[]}
def docker(*args):
 p=subprocess.run(['docker',*args],capture_output=True,text=True,timeout=30)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout.strip()
def capture(action,details):
 evidence['samples'].append({'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'action':action,'details':details})
 print(action,flush=True)
def request(path,body=None):
 req=urllib.request.Request('http://127.0.0.1:3104'+path,data=json.dumps(body).encode() if body else None,headers={'Content-Type':'application/json','X-Request-ID':'prueba-worker-interrumpido'})
 try:
  with urllib.request.urlopen(req,timeout=10) as r:return r.status,r.read().decode()
 except HTTPError as r:return r.code,r.read().decode()
policy=json.loads(docker('inspect','--format','{{json .HostConfig.RestartPolicy}}',NAME))
assert policy['Name']=='unless-stopped','Revisar política de reinicio antes de probar.'
try:
 docker('update','--restart=no',NAME)
 docker('stop',NAME)
 status,text=request('/v2/exports',{'report':'students','format':'markdown'});assert status==202
 job=json.loads(text);path='/v2/exports/'+job['job_id'];capture('Trabajo creado HTTP 202',job)
 docker('start',NAME)
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  _,text=request(path);job=json.loads(text)
  if job['status']=='running':break
  if job['status'] in ['completed','failed']:raise RuntimeError('No se alcanzó a interrumpir durante running; repetir prueba.')
  time.sleep(.01)
 else:raise RuntimeError('No se observó running')
 capture('Estado running observado antes de SIGKILL',job)
 docker('kill','--signal=KILL',NAME)
 inspect=json.loads(docker('inspect','--format','{{json .State}}',NAME))
 capture('Worker terminado',{'running':inspect['Running'],'exit_code':inspect['ExitCode']})
 assert not inspect['Running'] and inspect['ExitCode']==137
 _,text=request(path);job=json.loads(text);capture('Trabajo persiste tras SIGKILL',job);assert job['status']=='running'
 status,text=request(path+'/download');capture('Descarga durante interrupción',{'http_status':status,'body':text});assert status==409
 docker('start',NAME);capture('Worker reiniciado',{'job_id':job['job_id']})
 deadline=time.monotonic()+165
 previous=None
 while time.monotonic()<deadline:
  _,text=request(path);job=json.loads(text)
  if job['status']!=previous:capture('Estado del trabajo tras reinicio',job);previous=job['status']
  if job['status']=='completed':break
  if job['status']=='failed':raise RuntimeError('Trabajo fallido: '+text)
  time.sleep(5)
 else:raise RuntimeError('No se recuperó antes del plazo')
 status,report=request(path+'/download');assert status==200 and '# Reporte de alumnos' in report
 capture('Mismo trabajo completado y descargado',{'http_status':status,'job_id':job['job_id'],'report':report})
 logs=docker('logs','--since','5m',NAME)
 capture('Logs del trabajo', [json.loads(line) for line in logs.splitlines() if line.startswith('{') and job['job_id'] in line])
 evidence['result']='passed'
finally:
 docker('update','--restart=unless-stopped',NAME)
 docker('start',NAME)
 capture('Worker restaurado',{'running':docker('inspect','--format','{{.State.Running}}',NAME),'restart_policy':'unless-stopped'})
 target=ROOT/'cna/evidencias/F7-E3-worker-interrumpido.json';target.write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n');print(target,flush=True)
