# Pruebas del entorno aislado

Ejecutar desde la raíz del repositorio, con Docker y `cna-arqui` funcionando.
Las pruebas no apuntan al Jeroky original. Los scripts que detienen contenedores
los vuelven a arrancar en un bloque de limpieza; no cerrar forzadamente la terminal.

## CA-5: degradación del monolito

```bash
python3 cna/pruebas/degradacion-monolito.py
```

Detiene, por separado, search, audit y export. Para cada caída exige:

- 503 JSON del servicio por gateway, con el request_id de prueba.
- Respuesta final 200 del frontend después de seguir redirecciones locales.
- Login del monolito aceptado y consulta de alumnos autenticada con respuesta 200.
- Recuperación del servicio: `/readyz` listo y ruta funcional disponible de nuevo
  por HTTPS. En export se consulta un ID inexistente y se espera 404; ese paso no
  afirma que se generó un reporte nuevo.

Todas las llamadas funcionales de la prueba pasan por el gateway con TLS y
verificación del certificado local. Las sondas `/readyz` usan puertos de diagnóstico
locales. El token se usa dentro del backend sin guardarlo en los resultados. No se
crean ni modifican alumnos. La evidencia se conserva incluso ante un fallo; solo
`result: passed` acredita la prueba completa.

[Resultados reales CA-5](../evidencias/CA5-degradacion-monolito.json).
La duración de recuperación registrada empieza al solicitar `docker start` y
termina al observar readiness y la ruta esperada del gateway. No mide toda la
interrupción ni demuestra autorrecuperación después de `docker kill`.

La prueba cubre tres caídas individuales de los servicios extraídos. No prueba
caídas simultáneas, broker, DB, worker o nodo. Auditoría detenida conserva mensajes
en RabbitMQ. Con export caído el worker puede seguir trabajando sobre su almacén;
no se mata el worker en esta prueba. Las reglas de alertas pueden activarse si una
interrupción dura suficiente tiempo. Todo debe quedar activo al terminar.

## Otros ensayos

- `medir-latencia-busqueda.py`: diez cambios secuenciales y su aparición en búsqueda.
- `ediciones-monolito.py`: veinte ediciones reales sobre alumnos ficticios nuevos
  durante la detención de auditoría. Conserva esos alumnos.
- `consumidor-detenido.py`: veinte eventos sintéticos y uno duplicado; no son ediciones
  de Jeroky. Conserva el historial de prueba.
- `worker-interrumpido.py`: SIGKILL de un worker durante running y recuperación del
  mismo trabajo al vencer el lease.

Los ensayos usan tiempos y resultados reales, no sustituyen las capturas con
usuario y hostname ni las pruebas de carga y de nodo exigidas por la guía.
