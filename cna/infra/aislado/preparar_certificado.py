"""Genera el certificado del gateway sin reemplazar uno existente."""
from pathlib import Path
import subprocess
folder=Path(__file__).resolve().parents[2]/'deploy/gateway'
certs=folder/'certs';certs.mkdir(exist_ok=True)
key=certs/'localhost.key';cert=certs/'localhost.crt'
if key.exists()!=cert.exists():raise SystemExit('Par incompleto de clave/certificado: revisar sin sobrescribir.')
if not key.exists():
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','90','-config',str(folder/'localhost.cnf'),'-keyout',str(key),'-out',str(cert)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    key.chmod(0o600)
    print('Certificado local generado')
else:print('Certificado local existente conservado')
subprocess.run(['openssl','x509','-checkend','0','-noout','-in',str(cert)],check=True,stdout=subprocess.DEVNULL)
