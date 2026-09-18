# ADR-001: Selección de la aplicación

## Contexto

El TP exige evaluar al menos dos aplicaciones web y seleccionar una que pueda comprenderse, desplegarse y verificarse dentro de cuatro a cinco clases.

## Alternativas

1. Jeroky Soft: aplicación de gestión académica desarrollada por el equipo con Next.js, NestJS y PostgreSQL.
2. Twenty CRM: aplicación CRM pública y autohospedable con React, NestJS, PostgreSQL, Redis y otros componentes.

## Decisión

Seleccionar Jeroky Soft, rama `release/1`, como aplicación del TP.

## Justificación

Jeroky posee una arquitectura web real, persistencia, autenticación y funcionalidades demostrables. El equipo conoce su dominio y código, por lo que puede concentrarse en infraestructura, protocolos, medición y seguridad. Twenty CRM tiene buena documentación y actividad, pero su mayor cantidad de componentes incrementa el riesgo de no completar las pruebas en el plazo disponible.

## Consecuencias

- Se utilizarán dos repositorios de aplicación: frontend y backend.
- Se creará una VM independiente para el TP.
- Este repositorio conservará configuraciones, evidencias y el informe.
- Se registrará el commit exacto desplegado antes de la instalación.
