"""Importa fuentes privados preparados en la Mac; genera secretos locales después."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,tarfile,tempfile
folder=Path(__file__).resolve().parent
if len(sys.argv)!=2:raise SystemExit('Uso: python3 importar_fuentes.py /ruta/paquete.tar.gz')
lock=json.loads((folder/'fuentes.lock.json').read_text())
runtime=folder/'.runtime';runtime.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='cna-import-') as temp:
    staged=Path(temp)
    with tarfile.open(sys.argv[1],'r:gz') as archive:
        total=0
        for member in archive.getmembers():
            path=Path(member.name)
            if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] not in {*lock,*(n+'-manifest.json' for n in lock)}:raise SystemExit('Ruta de paquete no permitida')
            if not member.isfile() or any(p.startswith('.env') or p=='.git' for p in path.parts):raise SystemExit('Contenido de paquete no permitido')
            total+=member.size
            if total>200*1024*1024:raise SystemExit('Paquete demasiado grande')
            target=staged/path;target.parent.mkdir(parents=True,exist_ok=True)
            if target.exists():raise SystemExit('Entrada duplicada en paquete')
            target.write_bytes(archive.extractfile(member).read());target.chmod(member.mode&0o755)
    def digest(root):
        return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
                for p in root.rglob('*') if p.is_file() and p.name not in {'.dockerignore','.DS_Store','next-env.d.ts'}
                and not any(x in {'.git','node_modules','.next','dist','coverage'} for x in p.relative_to(root).parts)
                and not p.name.startswith('.env') and not p.name.endswith('.log')}
    # Validar todo antes de importar cualquiera de las copias.
    manifests={}
    for name,source in lock.items():
        manifest=json.loads((staged/(name+'-manifest.json')).read_text())
        if manifest['source']!=source or manifest['files']!=digest(staged/name):raise SystemExit('Fuente o integridad incorrecta: '+name)
        target=runtime/name
        if target.exists() and digest(target)!=manifest['files']:raise SystemExit('Existe otra copia local; se conserva sin reemplazar: '+name)
        manifests[name]=manifest
    for name in lock:
        if not (runtime/name).exists():shutil.copytree(staged/name,runtime/name)
        (runtime/(name+'-manifest.json')).write_text(json.dumps(manifests[name],indent=2)+'\n')
        print(name+': fuentes importados y verificados')
# El preparador conserva/importa manifests y genera SOLO los secretos de esta VM.
subprocess.run([sys.executable,str(folder/'preparar_fuentes.py')],check=True)
print('Fuentes listos. No se transfirieron credenciales de la Mac.')
