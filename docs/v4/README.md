# D-TERRITORIO 4.0 — Documentación

Esta carpeta contiene la documentación de diseño y arquitectura de D-TERRITORIO 4.0.

## Documentos

### 1. D-TERRITORIO-V4-SPEC.md
Documento maestro funcional.

Define:
- visión;
- SaaS multi-tenant;
- módulos;
- programa;
- territorios;
- ciclos;
- campañas;
- S-13;
- fases.

### 2. DATA-MODEL.md
Modelo de datos.

Define:
- entidades;
- relaciones;
- Firestore;
- TerritoryCycle;
- WorkSession;
- ProgramAssignment;
- S-13 calculado;
- seguridad e integridad.

### 3. SYSTEM-ARCHITECTURE.md
Arquitectura técnica.

Define:
- frontend;
- Firebase;
- autenticación;
- multi-tenancy;
- Google Maps;
- generación de documentos;
- realtime;
- seguridad;
- entornos.

### 4. UI-DESIGN-SYSTEM.md
Sistema visual oficial **Spatial OS**.

Define:
- referencia visual;
- tipografía;
- colores;
- sidebar;
- topbar;
- mapas;
- cards;
- estados;
- accesibilidad;
- reglas para Codex/Antigravity.

### 5. UX-FLOWS.md
Flujos principales de usuario.

Define:
- onboarding;
- programa;
- grupos;
- feriados;
- publicación;
- reporte;
- ciclos;
- campañas;
- S-13;
- visita del superintendente;
- importación de mapas.

### 6. PERMISSIONS.md
Matriz de roles y permisos SaaS/congregación.

Define:
- administrador SaaS;
- administrador congregación;
- encargado de territorios;
- capitán;
- solo lectura;
- reglas de acceso por tenant;
- acciones sensibles.

---

## Estado

**Fase actual:** Fase 0 — Especificación.

Antes de comenzar implementación productiva deben quedar validados:

- documento maestro;
- modelo de datos;
- arquitectura;
- UI Design System;
- UX Flows;
- roles y permisos;
- reglas S-13;
- navegación principal.
