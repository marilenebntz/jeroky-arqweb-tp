"""Exporta solo fuentes previamente verificados, sin .env ni historia Git."""
from pathlib import Path
import hashlib,io,json,tarfile,sys
folder=Path(__file__).resolve().parent
lock=json.loads((folder/'fuentes.lock.json').read_text())
output=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/jeroky-fuentes-fijados.tar.gz')
entries={}
for name,source in lock.items():
    runtime=folder/'.runtime';root=runtime/name
    marker=runtime/(name+'-manifest.json')
    if not marker.exists():raise SystemExit('Falta verificar fuentes en la Mac: ejecutar preparar_fuentes.py primero.')
    manifest=json.loads(marker.read_text())
    if manifest['source']!=source:raise SystemExit('Manifest no coincide con fuentes.lock.json')
    for relative,expected in manifest['files'].items():
        path=Path(relative)
        if path.is_absolute() or '..' in path.parts or any(part.startswith('.env') or part=='.git' for part in path.parts):raise SystemExit('Ruta no permitida en manifest')
        full=root/path
        if full.is_symlink():raise SystemExit('No se exportan enlaces simbólicos')
        data=full.read_bytes()
        if hashlib.sha256(data).hexdigest()!=expected:raise SystemExit('Fuente local modificada; no se generó paquete: '+relative)
        entries[name+'/'+relative]=(data,full.stat().st_mode&0o777)
    entries[name+'/.dockerignore']=((root/'.dockerignore').read_bytes(),0o644)
    entries[name+'-manifest.json']=(marker.read_bytes(),0o644)
# No se incluyen env, certificados, bases, node_modules ni metadata del usuario.
with tarfile.open(output,'w:gz') as archive:
    for relative,(data,mode) in sorted(entries.items()):
        info=tarfile.TarInfo(relative);info.size=len(data);info.mode=mode
        archive.addfile(info,io.BytesIO(data))
output.chmod(0o600)
print('Paquete:',output)
print('Archivos:',len(entries))
print('SHA256:',hashlib.sha256(output.read_bytes()).hexdigest())
