# Evidencias - Fase 1 (Hito 1: Descubrimiento, selección y línea base)

Estado: **completo** (2026-09-14).

| Evidencia | Descripción | Archivo(s) | Estado |
|---|---|---|---|
| F1-E01 | Comparación de aplicaciones candidatas (Jeroky Soft vs. Twenty CRM) | Ver `docs/adr/ADR-001-seleccion-aplicacion.md` | Listo |
| F1-E02 | Repositorios, rama, licencia y commits seleccionados | `F1-E02a-repos-y-rama.png`, `F1-E02b-commits-release1.png`, `docs/ficha-tecnica.md` | Listo |
| F1-E03 | Diagrama lógico inicial | Ver `docs/arquitectura/arquitectura-inicial.md` | Listo |
| F1-E04 | Creación y recursos asignados a la VM | `F1-E04a-recursos-vm-disco-memoria.png` (disco, IP), `F1-E04b-recursos-vm-cpu-ram.png` (2 vCPU, 3.8GiB RAM) | Listo |
| F1-E05 | `hostnamectl` y sincronización de fecha/hora | `F1-E05-hostnamectl-timedatectl.txt` | Listo |
| F1-E06 | `ip addr` e interfaces | `F1-E06-ip-addr.txt` | Listo |
| F1-E07 | `ip route` y ruta por defecto | `F1-E07-ip-route.txt` | Listo |
| F1-E08 | `resolvectl status` y DNS | `F1-E08-resolvectl-dns.txt` | Listo |
| F1-E09 | Conectividad anfitrión-VM y salida a Internet | `F1-E09a-conectividad-vm-internet.png` (VM→Internet, ping a 8.8.8.8), `F1-E09b-conectividad-anfitrion-vm.png` (Mac→VM) | Listo |
| F1-E10 | `ss -lntup` y puertos iniciales | `F1-E10-puertos-escucha.png` | Listo |

## Resumen de línea base

- VM: `jeroky-arqweb-vm`, Ubuntu Server 24.04.5 LTS (arm64) sobre UTM/QEMU.
- Recursos: 2 vCPU, 3.8 GiB RAM, 29 GB disco (20 GB mínimo requerido, cumple).
- Red: interfaz `enp0s1`, IP `192.168.0.17/24`, gateway `192.168.0.1`, DNS
  `186.17.17.17` / `186.16.16.16` (todos asignados por DHCP en la red del
  anfitrión — modo puente).
- Conectividad confirmada en ambos sentidos: anfitrión→VM (ping < 1.2 ms) y
  VM→Internet (ping a 8.8.8.8, ~56 ms promedio, 0% pérdida).
- Puertos en escucha: 22 (SSH), 80 (Nginx, agregado en Hito 2), 3000/3001
  (frontend/backend vía docker-proxy), 5432 (PostgreSQL — pendiente de
  restringir en Hito 4, ver `docs/ficha-tecnica.md`).
- Repositorio del equipo, ADRs y registro de decisiones: ver `docs/adr/`.

Cada archivo oculta secretos y se acompaña de su interpretación técnica (en el
propio `.txt` o en pie de figura dentro del informe LaTeX).
