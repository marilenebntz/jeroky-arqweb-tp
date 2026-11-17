"""Obtiene fuentes fijados; nunca escribe en repositorios originales."""
from pathlib import Path
import hashlib,json,os,secrets,shutil,subprocess,tempfile

folder=Path(__file__).resolve().parent
lock=json.loads((folder/'fuentes.lock.json').read_text())
runtime=folder/'.runtime';runtime.mkdir(exist_ok=True)
ignore=shutil.ignore_patterns('.git','.env*','node_modules','.next','dist','coverage','*.log','.DS_Store','next-env.d.ts')
dockerignore='node_modules\n.git\n.env*\n.next\ndist\n'
def digest(root):
    return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file() and p.name not in {'.dockerignore','.DS_Store','next-env.d.ts'}
            and not any(x in {'.git','node_modules','.next','dist','coverage'} for x in p.relative_to(root).parts)
            and not p.name.startswith('.env') and not p.name.endswith('.log')}
for name,source in lock.items():
    target=runtime/name
    marker=runtime/(name+'-manifest.json')
    if target.exists() and marker.exists():
        previous=json.loads(marker.read_text())
        if previous.get('source')==source and previous.get('files')==digest(target):
            print(name+': copia fijada existente verificada');continue
        raise SystemExit(name+': la copia local cambió; se conserva sin sobrescribir. Revisar antes de regenerar.')
    with tempfile.TemporaryDirectory(prefix='cna-fuente-') as temp:
        checkout=Path(temp)/'repo'
        env={**os.environ,'GIT_TERMINAL_PROMPT':'0'}
        subprocess.run(['git','init','-q',str(checkout)],check=True,env=env)
        subprocess.run(['git','-C',str(checkout),'fetch','--quiet','--depth=1',source['url'],source['commit']],check=True,env=env,timeout=180)
        actual=subprocess.check_output(['git','-C',str(checkout),'rev-parse','FETCH_HEAD'],text=True).strip()
        if actual!=source['commit']:raise SystemExit('Commit descargado inesperado')
        subprocess.run(['git','-C',str(checkout),'checkout','--quiet','--detach','FETCH_HEAD'],check=True,env=env)
        staged=Path(temp)/'source';shutil.copytree(checkout,staged,ignore=ignore)
        (staged/'.dockerignore').write_text(dockerignore)
        expected=digest(staged)
        if target.exists():
            if digest(target)!=expected:raise SystemExit(name+': copia previa distinta del commit fijado; no se reemplazó.')
        else:shutil.copytree(staged,target)
        marker.write_text(json.dumps({'source':source,'files':expected},indent=2)+'\n')
        print(name+': commit fijado obtenido y verificado')
envfile=folder/'.env.local'
if not envfile.exists():
    values={'DB_PASSWORD':secrets.token_hex(24),'JWT_SECRET':secrets.token_hex(32),
            'ENCRYPTION_KEY':secrets.token_hex(16),'BROKER_PASSWORD':secrets.token_hex(24),
            'LAB_EMAIL':'admin.arqui@example.test','LAB_PASSWORD':secrets.token_hex(12)}
    descriptor=os.open(envfile,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(descriptor,'w') as stream:stream.write(''.join(f'{key}={value}\n' for key,value in values.items()))
    print('Credenciales locales creadas sin mostrarlas')
else:print('Credenciales locales existentes conservadas')
