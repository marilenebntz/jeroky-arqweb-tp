# Scripts reproducibles

| Script | Dónde se ejecuta | Propósito |
|---|---|---|
| `hito4-smoke.sh` | VM | Verifica frontend, API, 404, TRACE y cabeceras |
| `hito4-resiliencia.sh` | VM, dentro de `~/jeroky` | Detiene el backend, espera 502, lo inicia y mide recuperación |
| `hito4-recursos.sh` | VM | Muestra `docker stats` hasta presionar Ctrl+C |
| `hito4-carga.sh` | Mac anfitrión | Ejecuta ApacheBench contra `/alumnos` |

Los scripts no contienen credenciales. La prueba de resiliencia exige
`CONFIRM_OUTAGE=yes` porque provoca una indisponibilidad breve y controlada.

Ejemplo:

```bash
BASE_URL=https://jeroky.local bash scripts/hito4-smoke.sh
CONFIRM_OUTAGE=yes bash scripts/hito4-resiliencia.sh
```
