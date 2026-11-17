# ADR-008 Plataforma de orquestación

Estado: adoptado para desarrollo local; despliegue de entrega pendiente. Fecha: 2026-11-16.

## Contexto

El prototipo se ejecuta con Docker Desktop y fuentes de Jeroky copiadas localmente. No se midió todavía presupuesto completo de CPU y RAM ni se desplegó en varias VM.

## Decisión

Usar Docker Compose con proyecto cna-arqui y una red interna. La guía acepta Compose en un nodo como base, pero quedan la justificación de infraestructura y la validación de entrega. Datos en volúmenes separados y credenciales fuera de Git.

## Alternativas

Swarm en dos nodos facilitaría scheduling y réplicas, con más operación y restricciones del almacenamiento SQLite. k3s agrega probes y objetos de despliegue, pero exige más configuración y recursos. No se afirma que Compose resulte más liviano por una medición que no hicimos.

## Consecuencias

Es sencillo repetir comandos en el laboratorio. No ofrece convergencia de nodos ni mueve contenedores entre equipos. El script levantar.sh actual no arranca el gateway y la preparación de fuentes es un paso previo. CA-7 sigue abierto. Faltan límites, reinicio coherente, versionado de imágenes y prueba desde checkout limpio.
