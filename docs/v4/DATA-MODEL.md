# D-TERRITORIO 4.0 — Modelo de Datos

**Documento:** DATA-MODEL.md  
**Versión:** 0.1  
**Fecha:** 24-09-2026  
**Estado:** Diseño inicial  
**Documento relacionado:** `D-TERRITORIO-V4-SPEC.md`

---

# 1. Objetivo

Definir el modelo de datos de D-TERRITORIO 4.0 para:

- SaaS multi-tenant;
- aislamiento por congregación;
- administración de territorios;
- programa de predicación;
- capitanes y disponibilidad;
- casas de salida;
- grupos de predicación;
- campañas;
- ciclos territoriales;
- sesiones de trabajo;
- generación automática de S-13;
- auditoría y migración histórica.

Este documento describe la estructura lógica. La implementación exacta de Firestore puede ajustarse durante la fase técnica, pero las reglas funcionales aquí descritas no deben alterarse sin una decisión explícita.

---

# 2. Principios del modelo

## 2.1 Multi-tenant desde la raíz

Toda información operativa debe estar asociada a una congregación.

Estructura base recomendada:

```
congregations/{congregationId}
  memberships/{membershipId}
  captains/{captainId}
  territories/{territoryId}
  territoryCycles/{cycleId}
  workSessions/{sessionId}
  houses/{houseId}
  preachingGroups/{groupId}
  scheduleTemplates/{templateId}
  programAssignments/{assignmentId}
  campaigns/{campaignId}
  calendarExceptions/{exceptionId}
  settings/{documentId}
  auditLogs/{auditLogId}
```

No deben existir consultas operativas globales que mezclen tenants.

---

## 2.2 Fuente de verdad vs datos derivados

D-TERRITORIO debe distinguir:

### Fuente de verdad

Registros históricos que no deben recalcularse arbitrariamente:

- quién inició un ciclo;
- cuándo comenzó;
- cuándo terminó;
- cada sesión de trabajo;
- quién dirigió cada sesión;
- asignaciones programadas;
- campañas relacionadas.

### Datos derivados

Se pueden calcular a partir de la historia:

- última fecha completado;
- días desde último completado;
- estado actual;
- porcentaje de campaña;
- territorios pendientes;
- S-13;
- estadísticas.

Evitar duplicar información si puede calcularse de forma confiable.

Cuando se duplique por rendimiento, debe considerarse un **cache derivado**, nunca la única fuente de verdad.

---

# 3. Entidad: Congregation

Ruta:

```
congregations/{congregationId}
```

Campos conceptuales:

```ts
Congregation {
  id: string
  name: string
  shortName?: string
  countryCode: string              // CL
  timezone: string                 // America/Santiago
  locale: string                   // es-CL
  status: "active" | "suspended" | "archived"
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}
```

Ejemplo:

```
id: "maquehue"
name: "Congregación Maquehue"
countryCode: "CL"
timezone: "America/Santiago"
locale: "es-CL"
```

---

# 4. Entidad global: User

Los usuarios de autenticación no deben duplicarse completamente por congregación.

Colección global propuesta:

```
users/{userId}
```

Campos:

```ts
User {
  id: string
  authUid: string
  displayName: string
  email: string
  phone?: string
  status: "active" | "disabled"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

El usuario por sí solo NO otorga acceso a ninguna congregación.

El acceso depende de Membership.

---

# 5. Entidad: Membership

Ruta:

```
congregations/{congregationId}/memberships/{membershipId}
```

Campos:

```ts
Membership {
  id: string
  userId: string
  congregationId: string
  role:
    | "congregation_admin"
    | "territory_manager"
    | "captain"
    | "viewer"
  status:
    | "invited"
    | "active"
    | "suspended"
    | "revoked"
  permissions?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  invitedBy?: string
}
```

## Regla

Toda lectura/escritura operativa debe verificar que:

```
membership.userId == request.auth.uid
membership.congregationId == tenant solicitado
membership.status == "active"
```

La implementación exacta dependerá de cómo se vincule Firebase Auth UID con User/Membership.

---

# 6. Entidad: Captain

Ruta:

```
congregations/{congregationId}/captains/{captainId}
```

Un capitán puede o no tener cuenta de usuario.

Campos:

```ts
Captain {
  id: string
  userId?: string

  displayName: string
  phone?: string
  email?: string

  active: boolean

  regularAvailability: CaptainAvailabilityRule[]
  exceptions: AvailabilityException[]

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## CaptainAvailabilityRule

```ts
CaptainAvailabilityRule {
  id: string
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  slotIds?: string[]
  startTime?: string
  endTime?: string
  available: boolean
}
```

## AvailabilityException

```ts
AvailabilityException {
  id: string
  startDate: string       // YYYY-MM-DD
  endDate: string         // YYYY-MM-DD
  type: "unavailable" | "available_override"
  reason?: string
}
```

Ejemplos:

- vacaciones;
- viaje;
- enfermedad;
- disponibilidad especial;
- ausencia puntual.

---

# 7. Entidad: House

Ruta:

```
congregations/{congregationId}/houses/{houseId}
```

Campos:

```ts
House {
  id: string

  familyName: string
  hostName?: string
  address: string
  phone?: string

  location?: {
    lat: number
    lng: number
  }

  regularAvailability: HouseAvailabilityRule[]
  exceptions: AvailabilityException[]

  nearbyTerritoryIds: string[]

  active: boolean
  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Regla

Una casa puede relacionarse con múltiples territorios.

Ejemplo:

```
Casa Pichinao
  nearbyTerritoryIds:
  - U-17
  - U-28
  - U-29
```

En una fase futura la cercanía podrá calcularse mediante geodatos.

---

# 8. Entidad: PreachingGroup

Ruta:

```
congregations/{congregationId}/preachingGroups/{groupId}
```

Campos:

```ts
PreachingGroup {
  id: string
  name: string
  code: string
  order: number
  active: boolean
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Ejemplo:

```
G1
G2
G3
G4
```

Los grupos no gobiernan el resto de la arquitectura.

Se utilizan principalmente cuando un horario/día se configura como:

```
organizationMode = "groups"
```

---

# 9. Entidad: Territory

Ruta:

```
congregations/{congregationId}/territories/{territoryId}
```

Campos:

```ts
Territory {
  id: string

  code: string                 // "1", "U-1", "R-3"
  displayName?: string

  category:
    | "urban_residential"
    | "rural"
    | "business"
    | "other"

  active: boolean

  geometry?: GeoJSONGeometry

  centroid?: {
    lat: number
    lng: number
  }

  legacyMapImageUrl?: string
  googleMapsReference?: string

  blockCount?: number
  approxHouseCount?: number

  blocks?: TerritoryBlock[]

  nearbyHouseIds: string[]

  warnings?: string[]
  notes?: string

  // Cache derivado:
  currentCycleId?: string
  currentStatus?:
    | "available"
    | "assigned"
    | "in_progress"
    | "blocked"

  lastCompletedAt?: Timestamp

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## TerritoryBlock

```ts
TerritoryBlock {
  id: string
  label: string
  approxHouseCount?: number
  geometry?: GeoJSONGeometry
  active: boolean
}
```

---

# 10. Geometría territorial

Formato recomendado:

GeoJSON.

Ejemplo conceptual:

```json
{
  "type": "Polygon",
  "coordinates": []
}
```

Ventajas:

- interoperabilidad;
- importación KML/KMZ -> GeoJSON;
- Google Maps;
- futuras integraciones;
- cálculo de centroides;
- mapas dinámicos.

Google My Maps será una fuente inicial de geometrías, no la fuente operativa de estado.

---

# 11. Entidad: TerritoryCycle

Ruta:

```
congregations/{congregationId}/territoryCycles/{cycleId}
```

Esta es una de las entidades más importantes del sistema.

Campos:

```ts
TerritoryCycle {
  id: string

  territoryId: string
  territoryCodeSnapshot: string

  status:
    | "open"
    | "completed"
    | "cancelled"

  startedAt: Timestamp

  startedByCaptainId: string
  startedByCaptainNameSnapshot: string

  completedAt?: Timestamp

  completedByCaptainId?: string
  completedByCaptainNameSnapshot?: string

  campaignId?: string
  campaignNameSnapshot?: string
  campaignColorSnapshot?: string

  sourceAssignmentId?: string

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

# 12. Regla crítica del ciclo

Al abrir el ciclo:

```
startedByCaptainId
startedByCaptainNameSnapshot
```

se vuelven **inmutables**.

Aunque:

- otro capitán continúe;
- otro capitán trabaje una parte;
- otro capitán termine;

el campo utilizado por el S-13 sigue siendo:

```
startedByCaptainNameSnapshot
```

---

# 13. ¿Cuándo se abre un ciclo?

NO se abre al crear el programa.

Se abre cuando una sesión reporta trabajo real y:

```
territory.currentCycleId == null
```

Ejemplo:

Programa:

```
24/09
16:00
Benjamín
U-17
```

Si se cancela:

```
No se crea TerritoryCycle.
```

Si efectivamente comienzan:

```
crear TerritoryCycle
startedAt = 24/09
startedBy = Benjamín
```

---

# 14. Entidad: WorkSession

Ruta:

```
congregations/{congregationId}/workSessions/{sessionId}
```

Cada vez que un territorio se trabaja se crea una WorkSession.

Campos:

```ts
WorkSession {
  id: string

  territoryId: string
  cycleId: string

  date: string
  startedAt?: Timestamp
  endedAt?: Timestamp

  captainId: string
  captainNameSnapshot: string

  assignmentId?: string

  result:
    | "partial"
    | "completed"
    | "no_work"

  workedBlockIds?: string[]
  pendingBlockIds?: string[]

  notes?: string

  campaignId?: string

  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Regla

Si result = `completed`:

- cerrar TerritoryCycle;
- asignar completedAt;
- registrar completedBy;
- limpiar Territory.currentCycleId;
- actualizar Territory.lastCompletedAt;
- Territory.currentStatus -> available.

---

# 15. Programación vs trabajo real

Deben ser entidades separadas.

## ProgramAssignment

Representa:

> lo que estaba planificado.

## WorkSession

Representa:

> lo que realmente ocurrió.

Esto permite conservar:

```
Programado U-12
pero no trabajado
```

sin contaminar S-13.

---

# 16. Entidad: ScheduleSlotTemplate

Ruta:

```
congregations/{congregationId}/scheduleTemplates/{templateId}
```

Campos:

```ts
ScheduleSlotTemplate {
  id: string

  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6

  time: string

  active: boolean

  preachingType:
    | "house_to_house"
    | "rural"
    | "zoom"

  organizationMode:
    | "congregation"
    | "groups"

  season?: "all_year" | "summer" | "winter"

  order: number

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Ejemplo Maquehue:

```
Sábado
10:30
organizationMode: groups
```

---

# 17. Entidad: ProgramAssignment

Ruta:

```
congregations/{congregationId}/programAssignments/{assignmentId}
```

Campos:

```ts
ProgramAssignment {
  id: string

  date: string                 // YYYY-MM-DD
  time: string

  preachingType:
    | "house_to_house"
    | "rural"
    | "zoom"

  organizationMode:
    | "congregation"
    | "groups"

  groupId?: string

  captainId?: string
  captainNameSnapshot?: string

  houseId?: string
  houseFamilySnapshot?: string
  houseAddressSnapshot?: string

  territoryIds?: string[]
  territoryCodesSnapshot?: string[]

  status:
    | "draft"
    | "published"
    | "cancelled"
    | "completed"

  campaignId?: string

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

# 18. Por qué guardar snapshots

Ejemplo:

En 2027 una casa cambia de dirección.

El programa histórico de septiembre 2026 debe seguir mostrando la dirección utilizada en ese momento.

Por eso una asignación guarda:

```
houseId
houseFamilySnapshot
houseAddressSnapshot
```

Lo mismo aplica a:

- nombre del capitán;
- código del territorio;
- nombre de campaña.

IDs permiten relacionar.

Snapshots preservan historia.

---

# 19. Programa por grupos

Si un slot está en modo groups:

Crear una ProgramAssignment por grupo.

Ejemplo:

```
2026-09-26 10:30

assignment A:
groupId = G1
territory = 6

assignment B:
groupId = G2
territory = 24

assignment C:
groupId = G3
territory = 14

assignment D:
groupId = G4
territory = 23
```

El generador "Clásico Maquehue" los consolida visualmente:

```
G1: 6 / G2: 24
G3: 14 / G4: 23
```

---

# 20. Entidad: Campaign

Ruta:

```
congregations/{congregationId}/campaigns/{campaignId}
```

Campos:

```ts
Campaign {
  id: string

  name: string
  type:
    | "book_study"
    | "assembly_invitation"
    | "memorial_invitation"
    | "special"
    | "other"

  startDate: string
  endDate: string

  color: string

  active: boolean

  territoryScope:
    | "all"
    | "selected"

  selectedTerritoryIds?: string[]

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

# 21. Campaña y ciclo territorial

Un ciclo puede estar relacionado con una campaña.

Regla inicial:

Si el ciclo se inicia durante una campaña y esa salida está etiquetada con la campaña:

```
TerritoryCycle.campaignId = campaignId
```

El snapshot de color/nombre permite conservar históricamente la apariencia aunque posteriormente la campaña sea editada.

---

# 22. Seguimiento de campaña

No usar únicamente TerritoryCycle para calcular progreso.

Podría existir una entidad adicional:

```
campaignTerritoryProgress
```

Ruta:

```
congregations/{congregationId}/campaigns/{campaignId}/territories/{territoryId}
```

Campos:

```ts
CampaignTerritoryProgress {
  territoryId: string

  status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "completed"

  firstAssignedAt?: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp

  assignmentIds?: string[]
  cycleIds?: string[]

  updatedAt: Timestamp
}
```

Esto separa:

- progreso de campaña;
- estado operativo normal.

---

# 23. Entidad: CalendarException

Ruta:

```
congregations/{congregationId}/calendarExceptions/{exceptionId}
```

Campos:

```ts
CalendarException {
  id: string

  startDate: string
  endDate: string

  type:
    | "holiday"
    | "assembly"
    | "circuit_overseer_visit"
    | "no_preaching"
    | "special_schedule"
    | "organization_override"
    | "other"

  name: string

  behavior:
    | "normal"
    | "no_schedule"
    | "special_schedule"
    | "override_mode"
    | "manual_review"

  replacementSlots?: ScheduleSlotOverride[]

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Los feriados oficiales de Chile pueden provenir de una fuente del sistema y luego combinarse con excepciones del tenant.

---

# 24. Configuración general

Ruta:

```
congregations/{congregationId}/settings/general
```

Campos posibles:

```ts
CongregationSettings {
  congregationDisplayName: string

  programTemplateId: string

  serviceYearStartMonth?: number

  defaultCountryCode: string
  timezone: string

  enableCampaignColorsInS13: boolean

  s13OutputMode:
    | "standard"
    | "management"

  programGenerationPreferences?: object

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

# 25. S-13 como vista calculada

NO crear una colección llamada:

```
s13Rows
```

como fuente de verdad.

El S-13 debe generarse desde TerritoryCycle.

Proceso:

```
Territory
   ↓
TerritoryCycles ordenados
   ↓
selección del período
   ↓
máximo 4 ciclos visibles
   ↓
buscar ciclo anterior
   ↓
generar fila S-13
```

---

# 26. Algoritmo S-13

Entrada:

- congregationId;
- período;
- territorios activos;
- ciclos.

Por cada territorio:

1. Obtener ciclos válidos.
2. Ordenarlos por startedAt ascendente.
3. Identificar los ciclos que pertenecen al período solicitado.
4. Si hay más de 4, tomar los 4 más recientes.
5. El ciclo completado inmediatamente anterior al primer ciclo visible aporta:
   - "Última fecha en que se completó".
6. Cada ciclo visible aporta:
   - startedByCaptainNameSnapshot;
   - startedAt;
   - completedAt.
7. Si hay menos de 4:
   - columnas restantes vacías.
8. Si el ciclo tiene campaña:
   - aplicar estilo de campaña únicamente en modo de gestión.
9. No mostrar capitanes que solo continuaron o completaron el ciclo en la columna "Asignado a".

---

# 27. Caso S-13 de ejemplo

Historial:

```
Ciclo A
Carlos
10/01 -> 15/01

Ciclo B
Benjamín
10/03 -> 14/03

Ciclo C
Diego
20/04 -> 20/04

Ciclo D
Víctor
01/06 -> 03/06

Ciclo E
Gonzalo
15/07 -> 15/07
```

Si el informe muestra los últimos cuatro:

```
Última fecha completado:
15/01

Asignado a:
Benjamín | Diego | Víctor | Gonzalo

Asignado:
10/03 | 20/04 | 01/06 | 15/07

Completado:
14/03 | 20/04 | 03/06 | 15/07
```

---

# 28. Auditoría

Operaciones relevantes deben quedar registradas.

Ruta:

```
congregations/{congregationId}/auditLogs/{logId}
```

Campos:

```ts
AuditLog {
  id: string

  actorUserId: string
  actorNameSnapshot?: string

  action: string

  entityType: string
  entityId: string

  before?: object
  after?: object

  createdAt: Timestamp
}
```

Ejemplos:

- corregir fecha de un ciclo;
- cambiar capitán inicial;
- borrar una sesión;
- cerrar manualmente territorio;
- modificar programa publicado;
- editar campaña.

---

# 29. Política de eliminación

Evitar borrado físico de información histórica importante.

Preferir:

```
active = false
archivedAt
archivedBy
```

Especialmente para:

- territorios;
- capitanes;
- casas;
- grupos;
- campañas.

Los ciclos y sesiones históricas no deben eliminarse ordinariamente.

Si se requiere corregir un error:

- registrar auditoría;
- permitir corrección controlada.

---

# 30. Índices conceptuales necesarios

Firestore necesitará índices según consultas.

Ejemplos:

## ProgramAssignments

```
date + status
date + organizationMode
date + campaignId
```

## TerritoryCycles

```
territoryId + startedAt
territoryId + status
campaignId + status
```

## WorkSessions

```
territoryId + date
cycleId + date
captainId + date
```

## CalendarExceptions

```
startDate + endDate
```

Los índices reales se decidirán cuando existan consultas concretas.

---

# 31. Reglas de seguridad conceptuales

Ejemplo lógico:

```
canReadTenant(congregationId):
  authenticated
  AND hasActiveMembership(congregationId)
```

```
canManageTenant(congregationId):
  role in [
    congregation_admin,
    territory_manager
  ]
```

```
captainCanReport:
  membership active
  AND assignment.captainId == current captain
  OR permission explicit
```

Nunca:

```
allow read, write: if request.auth != null
```

como regla general.

---

# 32. Datos personales y minimización

Guardar únicamente información necesaria para operación.

Evitar:

- datos sensibles no relacionados con la función;
- historial personal innecesario;
- observaciones privadas irrelevantes.

Teléfono y dirección deben estar protegidos por permisos.

---

# 33. Migración desde Legacy

Mapeo inicial:

```
Legacy territories
  -> Territory

Legacy casas
  -> House

Legacy users asignables
  -> Captain

Legacy availability
  -> regularAvailability/exceptions

Legacy assignments
  -> ProgramAssignment

Legacy lastReportData
  -> candidatos para reconstruir WorkSession/TerritoryCycle
```

Los ciclos históricos no deben reconstruirse automáticamente sin validación.

Se desarrollará un script de migración con:

- dry-run;
- reporte de inconsistencias;
- confirmación antes de escritura.

---

# 34. Campos que NO deben cambiar retroactivamente

Usar snapshots en historia:

- nombre del capitán;
- código territorial;
- dirección de casa;
- nombre de familia;
- nombre y color de campaña.

Esto evita que una edición actual modifique informes históricos.

---

# 35. Estados principales

## Territory

```
available
assigned
in_progress
blocked
```

## TerritoryCycle

```
open
completed
cancelled
```

## WorkSession

```
partial
completed
no_work
```

## ProgramAssignment

```
draft
published
cancelled
completed
```

## CampaignTerritoryProgress

```
pending
assigned
in_progress
completed
```

---

# 36. Integridad de datos

Reglas funcionales:

1. Un territorio puede tener máximo un TerritoryCycle abierto.
2. Un WorkSession activa debe pertenecer a un ciclo válido.
3. Un ciclo completado debe tener completedAt.
4. startedBy del ciclo no cambia por sesiones posteriores.
5. ProgramAssignment no modifica S-13 por sí solo.
6. No marcar Territory.lastCompletedAt por una sesión parcial.
7. Un ciclo nuevo no se abre si todavía existe uno abierto.
8. Las campañas no borran historial normal.
9. La eliminación de un capitán no borra snapshots históricos.
10. La eliminación de una casa no altera programas históricos.

---

# 37. Decisiones abiertas de modelo

- ¿Un capitán puede pertenecer a varias congregaciones con el mismo User?
- ¿Los ciclos abiertos se muestran siempre en S-13 o depende del período/uso?
- ¿La campaña pertenece al ciclo completo o también puede variar por WorkSession?
- ¿Cuánto detalle guardar de manzanas para territorios rurales?
- ¿Necesitamos subcolección de TerritoryBlocks o basta embebida?
- ¿Quién puede corregir startedBy después de crear un ciclo?
- ¿Cuándo un ProgramAssignment pasa automáticamente a completed?
- ¿Se permitirá más de un territorio por salida congregacional desde V1?
- ¿Cómo se representa predicación Zoom cuando no tiene territorio?

---

# 38. Recomendación para V1

Mantener V1 deliberadamente simple:

- una congregación por usuario;
- uno o varios territorios por assignment solo cuando el tipo lo requiera;
- máximo un ciclo abierto por territorio;
- campañas vinculadas al ciclo que se inició dentro de ellas;
- bloques embebidos dentro de Territory;
- Firebase Auth + Membership;
- Firestore con subcolecciones por tenant.

La arquitectura debe permitir expansión sin requerir reescribir el producto.
