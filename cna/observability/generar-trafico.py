"""Genera tráfico local de demostración; no es una prueba de carga."""
import json
import time
import urllib.request

jobs = []
for iteration in range(40):
    paths = ['http://127.0.0.1:3103/v2/search?q=Juana&type=student',
             'http://127.0.0.1:3102/v2/audit?page=1&limit=1']
    if jobs:
        paths.append('http://127.0.0.1:3104/v2/exports/' + jobs[-1])
    for url in paths:
        with urllib.request.urlopen(url, timeout=10) as response:
            response.read()
    if iteration in (0, 20):
        request = urllib.request.Request('http://127.0.0.1:3104/v2/exports',
            data=b'{"report":"students","format":"markdown"}',
            headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=10) as response:
            jobs.append(json.load(response)['job_id'])
    time.sleep(1)
print('Tráfico de demostración generado durante unos 40 segundos.')
