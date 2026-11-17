"""Prepara la contraseña administrativa local sin imprimirla ni reemplazarla."""
from pathlib import Path
import secrets
folder = Path(__file__).resolve().parent / '.local'
folder.mkdir(mode=0o700, exist_ok=True)
folder.chmod(0o700)
password = folder / 'grafana-admin-password'
try:
    with password.open('x') as stream:
        stream.write(secrets.token_urlsafe(40) + '\n')
    password.chmod(0o644)
    print('Configuración local de Grafana preparada.')
except FileExistsError:
    print('Configuración local existente conservada.')
