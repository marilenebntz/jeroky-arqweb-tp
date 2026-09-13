# ADR-002: Licencia de Jeroky Soft

- Fecha: 2026-09-13
- Estado: Aceptada

## Contexto

La aplicación seleccionada debía contar con una licencia de código abierto identificable. Los repositorios inicialmente no incluían un archivo de licencia y el backend declaraba `UNLICENSED`.

## Decisión

Adoptar la licencia MIT para la rama `release/1` del frontend y del backend, con aprobación del equipo.

## Justificación

MIT es una licencia abierta, permisiva y sencilla de aplicar y explicar. Conserva el aviso de autoría y permite usar, modificar y distribuir el software sin ofrecer garantías.

## Implementación

- Se agregó `LICENSE` en ambos repositorios.
- El campo `license` de ambos archivos `package.json` se estableció en `MIT`.
- La rama `master` no fue modificada en esta decisión.
