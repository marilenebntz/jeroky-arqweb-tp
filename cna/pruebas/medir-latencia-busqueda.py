"""Mide 10 cambios reales; nunca incluye token ni credenciales en la evidencia."""
from pathlib import Path
import subprocess,json,datetime
root=Path(__file__).resolve().parents[2]
code=(root/'cna/pruebas/latencia-busqueda.cjs').read_text()
cert=(root/'cna/deploy/gateway/certs/localhost.crt').read_text()
p=subprocess.run(['docker','exec','-i','cna-arqui-backend-1','node','-e',code],input=json.dumps({'cert':cert}),capture_output=True,text=True,timeout=250)
if not p.stdout.strip():raise SystemExit('No hubo resultado de medición; revisar los servicios.')
result=json.loads(p.stdout);result['measured_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
path=root/'cna/evidencias/CA3-latencia-edicion-busqueda.json';path.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print('Resultado:',result['result'])
for sample in result['samples']:print('Edición',sample['iteration'],sample['from_patch_start_ms'],'ms')
print('Máximo:',result.get('maximum_ms'),'ms');print(path)
if p.returncode or result['result']!='passed':raise SystemExit('La medición no aprobó el umbral; conservar el resultado real.')
