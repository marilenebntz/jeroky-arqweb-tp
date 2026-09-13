# Jeroky Soft - TP Integrador de Arquitectura Web

Repositorio de evidencias, configuraciones e informe técnico del Trabajo Práctico Integrador de Electiva III - Arquitectura Web, FP-UNA, segundo semestre 2026.

## Objetivo

Demostrar de forma reproducible la comprensión, instalación y publicación de Jeroky Soft en una máquina virtual GNU/Linux, verificando arquitectura, conectividad, DNS, HTTP/HTTPS, rendimiento, seguridad y resiliencia.

## Aplicación seleccionada

| Componente | Repositorio | Rama |
|---|---|---|
| Backend | [jerokybackend](https://github.com/marilenebntz/jerokybackend/tree/release/1) | `release/1` |
| Frontend | [jerokyfrontend](https://github.com/marilenebntz/jerokyfrontend/tree/release/1) | `release/1` |

Ambos componentes se distribuyen bajo licencia MIT en la rama seleccionada.

## Arquitectura inicial

```mermaid
flowchart LR
    C["Cliente / navegador"] -->|HTTP 80 / HTTPS 443| P["Nginx - planificado"]
    P -->|HTTP 3000| F["Frontend Next.js"]
    F -->|API HTTP 3001| B["Backend NestJS"]
    B -->|TCP 5432| D["PostgreSQL"]
    B -->|HTTPS 443| E["Servicios externos"]
```

## Fases

| Fase | Alcance | Estado |
|---|---|---|
| Hito 1 | Selección, arquitectura, VM y línea base | En progreso |
| Hito 2 | Instalación y publicación HTTP | Pendiente |
| Hito 3 | DNS local, TLS y mediciones | Pendiente |
| Hito 4 | Seguridad, resiliencia y defensa | Pendiente |

## Organización

- `docs/`: ficha técnica, arquitectura y decisiones ADR.
- `evidencias/`: comandos, salidas, capturas y explicaciones por fase.
- `config/`: configuraciones reproducibles sin secretos.
- `matriz/`: trazabilidad de las pruebas P01-P12.
- `scripts/`: scripts de instalación, verificación y medición.
- `informe/`: fuentes del informe final en LaTeX.

## Reglas para las evidencias

Cada evidencia se nombrará como `F{fase}-E{número}` e incluirá fecha, comando o acción ejecutada, salida relevante, interpretación y prueba de la matriz relacionada.

No se deben versionar contraseñas, tokens, claves privadas, datos biométricos ni información personal real.
