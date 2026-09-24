# D-TERRITORIO 4.0 — Arquitectura del Sistema

**Documento:** SYSTEM-ARCHITECTURE.md  
**Versión:** 0.1  
**Fecha:** 24-09-2026

---

# 1. Objetivo

Definir la arquitectura técnica inicial de D-TERRITORIO 4.0 como SaaS multi-tenant, segura y escalable.

La arquitectura debe priorizar:

- aislamiento de congregaciones;
- simplicidad operativa;
- seguridad;
- historial confiable;
- generación correcta de S-13;
- mapa interactivo;
- experiencia en tiempo real;
- facilidad de evolución.

---

# 2. Componentes principales

```
Navegador
   |
   v
Next.js / React
   |
   +--> Firebase Authentication
   |
   +--> Firestore
   |
   +--> Backend seguro / Server Actions / API
   |
   +--> Google Maps
   |
   +--> Generación PDF/PNG
   |
   +--> Servicio de feriados
```

---

# 3. Frontend

Propuesta:

- Next.js
- React
- TypeScript
- Tailwind CSS
- ShadCN/Radix
- Lucide Icons
- Geist como fuente principal
- diseño Spatial OS

Responsabilidades del frontend:

- navegación;
- formularios;
- mapa;
- calendario;
- filtros;
- paneles;
- visualización S-13;
- vista previa de documentos.

El frontend NO debe ser responsable exclusivo de seguridad.

---

# 4. Autenticación

V1:

- Firebase Authentication;
- invitación de usuarios;
- vinculación mediante Membership;
- acceso denegado si no existe membresía activa.

Flujo:

```
Login
  ↓
Firebase Auth
  ↓
UID
  ↓
Membership
  ↓
Congregation/Tenant
  ↓
Permisos
```

---

# 5. Tenant activo

En V1 cada usuario tendrá una congregación activa.

El contexto del tenant debe resolverse explícitamente y nunca inferirse solo desde parámetros manipulables de URL.

Toda consulta operativa debe incorporar congregationId validado.

---

# 6. Seguridad Firestore

Regla conceptual:

```
request.auth != null
AND user has active membership
AND membership.congregationId == requested congregation
```

Las reglas deben diferenciar lectura y escritura según rol.

No reutilizar las reglas Legacy:

```
allow read, write: if request.auth != null
```

---

# 7. Operaciones críticas en backend

Operaciones sensibles deberían ejecutarse en entorno servidor cuando corresponda:

- crear congregación;
- invitar usuario;
- cambiar roles;
- corregir ciclo territorial;
- importar datos;
- migraciones;
- generar documentos oficiales si necesitan consistencia fuerte;
- acciones administrativas SaaS.

---

# 8. Tiempo real

Firestore permite listeners en tiempo real.

Usos:

- mapa cambia cuando un territorio inicia/se completa;
- programa cambia cuando se publica una modificación;
- campaña actualiza progreso;
- panel operativo refleja cambios.

Evitar listeners innecesarios en grandes colecciones.

---

# 9. Google Maps / Spatial OS

Google Maps será la capa cartográfica.

D-TERRITORIO controlará:

- polígonos;
- colores;
- hover;
- selección;
- estados;
- información territorial.

Los territorios se almacenarán como GeoJSON.

Google My Maps se utilizará únicamente como fuente de importación inicial.

---

# 10. Importación KML/KMZ

Flujo propuesto:

```
My Maps
  ↓
KML/KMZ
  ↓
parser/importador
  ↓
validación
  ↓
GeoJSON
  ↓
Territory.geometry
```

El importador debe mostrar vista previa antes de guardar.

---

# 11. Calendario y feriados

D-TERRITORIO tendrá:

1. calendario base chileno;
2. configuración propia de la congregación;
3. excepciones manuales.

Los feriados no decidirán automáticamente el comportamiento.

Ejemplo:

```
Feriado detectado
  ↓
Regla tenant
  ↓
normal / horario especial / no programar / revisar
```

---

# 12. Motor del programa

Entrada:

- plantilla semanal;
- horarios;
- modo congregación/grupos;
- capitanes;
- disponibilidad;
- casas;
- territorios;
- campañas;
- excepciones.

Salida:

- borrador de ProgramAssignments.

El sistema puede sugerir, pero las decisiones finales quedan en manos del usuario.

---

# 13. Motor territorial

Cuando se reporta una salida:

```
ProgramAssignment
  ↓
Reporte real
  ↓
¿Se trabajó?
  ├── No -> registrar sin ciclo
  └── Sí
       ↓
   ¿Existe ciclo abierto?
       ├── No -> crear ciclo
       └── Sí -> reutilizar ciclo
       ↓
   crear WorkSession
       ↓
   ¿Completado?
       ├── No -> mantener abierto
       └── Sí -> cerrar ciclo
```

---

# 14. Motor S-13

Debe ser determinista.

No usar IA para decidir qué mostrar.

Entrada:

- Territory;
- TerritoryCycles;
- período;
- modo estándar/gestión.

Salida:

- filas S-13;
- máximo cuatro ciclos visibles;
- fecha previa;
- colores campaña opcionales.

El PDF debe poder regenerarse en cualquier momento desde la historia.

---

# 15. Generación de documentos

Documentos iniciales:

- Programa Clásico Maquehue PNG
- Programa Clásico Maquehue PDF
- S-13 estándar PDF
- S-13 gestión PDF

La generación debe ser reproducible.

No depender de capturas manuales de pantalla.

---

# 16. Auditoría

Acciones críticas deben escribir AuditLog.

La auditoría debe permitir responder:

- quién cambió;
- qué cambió;
- cuándo;
- valor anterior;
- valor nuevo.

---

# 17. Administración SaaS

Separar aplicación congregacional de consola SaaS.

Conceptualmente:

```
app.d-territorio.cl
admin.d-territorio.cl
```

No es requisito que sean dominios distintos desde V1, pero sí responsabilidades diferentes.

---

# 18. Backups

Debe existir estrategia de respaldo.

V1:

- exportación periódica;
- respaldos gestionados si Firebase/Google Cloud lo permite;
- exportación manual de datos esenciales.

Nunca depender únicamente del PDF S-13 como respaldo.

---

# 19. Observabilidad

Registrar al menos:

- errores;
- fallos de importación;
- fallos al generar documentos;
- operaciones administrativas;
- fallos de permisos.

Evitar registrar datos personales sensibles innecesariamente.

---

# 20. Entornos

Separar:

- development;
- staging;
- production.

Nunca desarrollar directamente contra producción.

Datos de prueba no deben mezclarse con datos reales.

---

# 21. Repositorio

Estructura conceptual futura:

```
/
  docs/
    architecture/
    product/
  src/
    app/
    components/
    features/
      territories/
      program/
      captains/
      houses/
      campaigns/
      reports/
    lib/
      auth/
      firebase/
      maps/
    server/
  scripts/
    migration/
    import/
```

---

# 22. Estrategia de implementación

Orden obligatorio:

1. tenant + auth + permisos;
2. modelo Firestore;
3. layout/design system;
4. territorios;
5. mapa;
6. capitanes;
7. casas;
8. programa;
9. reportes/ciclos;
10. S-13;
11. campañas;
12. migración Legacy.

No construir S-13 antes de que TerritoryCycle y WorkSession sean correctos.

---

# 23. Decisiones técnicas por validar antes de código

- Firebase App Hosting vs otro hosting;
- Google Maps API exacta y costos;
- librería KML/KMZ -> GeoJSON;
- generación PDF server/client;
- estrategia de backups;
- si PWA entra en V1;
- mecanismo de feriados;
- Identity Platform multi-tenancy en V1 o posterior;
- modelo de suscripción futuro.
