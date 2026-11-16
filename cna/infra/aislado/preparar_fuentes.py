"""Crea copias locales del codigo para el laboratorio de Arquitectura."""
from pathlib import Path
import json
import secrets
import shutil
import subprocess
import sys

folder = Path(__file__).resolve().parent
if len(sys.argv) != 3:
    raise SystemExit('Uso: python3 preparar_fuentes.py /ruta/backend /ruta/frontend')
runtime = folder / '.runtime'
if runtime.exists():
    raise SystemExit('Las copias ya existen. Se conservan las versiones preparadas.')
sources = [Path(argument).expanduser().resolve() for argument in sys.argv[1:]]
for source in sources:
    if not (source / 'package-lock.json').is_file():
        raise SystemExit(f'Falta package-lock.json en {source}')
manifest = {}
for name, source in zip(['backend', 'frontend'], sources):
    shutil.copytree(source, runtime / name, ignore=shutil.ignore_patterns(
        '.git', '.env*', 'node_modules', '.next', 'dist', 'coverage', '*.log'))
    (runtime / name / '.dockerignore').write_text('node_modules\n.git\n.env*\n.next\ndist\n')
    manifest[name] = subprocess.check_output(
        ['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
(runtime / 'origen.json').write_text(json.dumps(manifest, indent=2) + '\n')
env = folder / '.env.local'
if not env.exists():
    values = {
        'DB_PASSWORD': secrets.token_hex(24),
        'JWT_SECRET': secrets.token_hex(32),
        'ENCRYPTION_KEY': secrets.token_hex(16),
        'BROKER_PASSWORD': secrets.token_hex(24),
        'LAB_EMAIL': 'admin.arqui@example.test',
        'LAB_PASSWORD': secrets.token_hex(12),
    }
    env.write_text(''.join(f'{key}={value}\n' for key, value in values.items()))
    env.chmod(0o600)
print('Copias y credenciales de Arquitectura preparadas')
