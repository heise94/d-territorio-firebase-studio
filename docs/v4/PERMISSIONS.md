# D-TERRITORIO 4.0 — Roles y Permisos

**Documento:** PERMISSIONS.md  
**Versión:** 0.1  
**Fecha:** 24-09-2026

---

# 1. Objetivo

Definir quién puede ver, crear, editar, publicar y corregir información dentro de D-TERRITORIO 4.0.

Principios:

1. mínimo privilegio;
2. aislamiento por tenant;
3. seguridad aplicada en backend/Firestore;
4. UI coherente con permisos reales;
5. auditoría de acciones sensibles.

---

# 2. Roles de plataforma

## 2.1 SaaS Admin

Ámbito: plataforma completa.

Puede:

- crear tenants;
- activar/suspender tenants;
- revisar estado técnico;
- gestionar soporte;
- gestionar planes/suscripciones en el futuro;
- administrar configuraciones globales del SaaS.

No debe usar su rol para consultar ordinariamente datos operativos sensibles de congregaciones.

Acceso a datos de tenant debe estar restringido y auditado.

---

# 3. Roles de congregación

## 3.1 Congregation Admin

Puede:

- administrar configuración del tenant;
- administrar miembros;
- administrar roles;
- administrar capitanes;
- administrar casas;
- administrar territorios;
- administrar grupos;
- administrar campañas;
- preparar/publicar programa;
- corregir reportes;
- corregir ciclos;
- generar S-13;
- ver auditoría;
- exportar información.

Es el rol congregacional con mayor privilegio.

---

## 3.2 Territory Manager

Rol operativo principal.

Puede:

- ver dashboard;
- administrar territorios;
- administrar casas;
- administrar capitanes;
- administrar grupos;
- crear programa;
- publicar programa;
- crear campañas;
- revisar reportes;
- corregir sesiones;
- cerrar/corregir ciclos con auditoría;
- generar S-13;
- preparar visita;
- consultar historial.

No puede:

- administrar tenant SaaS;
- cambiar roles del administrador principal;
- acceder a otros tenants.

---

## 3.3 Captain

Puede:

- ver sus asignaciones;
- ver datos necesarios de casa/territorio asignado;
- ver mapa de su territorio;
- consultar programa publicado;
- informar indisponibilidad;
- reportar salida;
- reportar parcial;
- reportar completado;
- añadir notas operativas.

No puede:

- editar S-13;
- cambiar startedBy de un ciclo;
- editar otros capitanes;
- publicar programa;
- administrar campañas;
- ver datos de otros tenants.

---

## 3.4 Viewer

Puede:

- consultar programa publicado;
- consultar mapas autorizados;
- consultar reportes autorizados;
- consultar S-13 si la congregación lo permite.

No puede escribir.

---

# 4. Permisos granulares

Permisos conceptuales:

```
tenant.read
tenant.settings.manage

members.read
members.manage
roles.manage

captains.read
captains.manage
captains.availability.self
captains.availability.manage

houses.read
houses.manage

territories.read
territories.manage
territories.import
territories.archive

program.read
program.create
program.edit
program.publish

groups.read
groups.manage

campaigns.read
campaigns.manage

workSessions.read
workSessions.create
workSessions.editOwn
workSessions.correct

cycles.read
cycles.manage
cycles.correctStartedBy

s13.read
s13.generate
s13.export

audit.read
exports.create
```

---

# 5. Matriz inicial

| Acción | SaaS Admin | Congregation Admin | Territory Manager | Captain | Viewer |
|---|---:|---:|---:|---:|---:|
| Ver tenant | Soporte | Sí | Sí | Sí | Sí |
| Editar configuración | No ordinario | Sí | Limitado | No | No |
| Administrar miembros | No ordinario | Sí | No | No | No |
| Administrar capitanes | No | Sí | Sí | Solo propio | No |
| Administrar casas | No | Sí | Sí | No | No |
| Administrar territorios | No | Sí | Sí | No | No |
| Importar mapas | No | Sí | Sí | No | No |
| Administrar grupos | No | Sí | Sí | No | No |
| Crear programa | No | Sí | Sí | No | No |
| Publicar programa | No | Sí | Sí | No | No |
| Ver programa publicado | No | Sí | Sí | Sí | Sí |
| Crear campañas | No | Sí | Sí | No | No |
| Reportar salida | No | Sí | Sí | Sí asignada | No |
| Corregir reporte | No | Sí | Sí | Solo propio antes de bloqueo* | No |
| Corregir ciclo | No | Sí | Sí con auditoría | No | No |
| Cambiar capitán inicial | No | Sí | Sí con confirmación especial | No | No |
| Generar S-13 | No | Sí | Sí | No | Opcional |
| Exportar S-13 | No | Sí | Sí | No | Opcional |
| Ver auditoría | Soporte limitado | Sí | Opcional | No | No |

*La política exacta de edición de reportes propios se define en implementación.

---

# 6. Aislamiento por congregación

Toda autorización tiene dos dimensiones:

1. ¿el usuario puede realizar esta acción?
2. ¿puede realizarla dentro de ESTE tenant?

Nunca basta con el rol.

Ejemplo:

```
user.role = territory_manager
```

NO significa:

```
puede leer cualquier /congregations/{id}
```

Debe existir membership activa para el congregationId solicitado.

---

# 7. Resolución del tenant

El frontend puede incluir congregationId en ruta/contexto, pero la seguridad nunca debe confiar solo en ese dato.

Backend/Firestore debe validar:

- usuario autenticado;
- membership;
- tenant coincidente;
- estado activo;
- permiso.

---

# 8. Información sensible

Teléfono y dirección de casas deben limitarse a usuarios que realmente los necesitan.

Ejemplo:

Capitán puede ver:

- dirección de la casa de su asignación;
- teléfono solo si la política de la congregación lo permite.

Viewer no debería recibir automáticamente teléfonos.

---

# 9. Permisos del capitán para reportar

Un capitán puede reportar una salida si:

- es el capitán asignado; o
- un administrador le otorgó acceso; o
- existe un flujo de reemplazo confirmado.

El sistema debe evitar que cualquier capitán pueda modificar arbitrariamente cualquier asignación.

---

# 10. Corrección de ciclos

Cambios sensibles:

- startedAt;
- startedByCaptain;
- completedAt;
- estado completed;
- campaña del ciclo.

Requieren:

- rol autorizado;
- confirmación;
- motivo de corrección;
- AuditLog.

---

# 11. Cambio de "Asignado a" S-13

Como startedBy controla "Asignado a", modificarlo es una acción crítica.

UI debe advertir:

> Esta modificación cambiará el nombre que aparece en el S-13 para este ciclo.

Requiere:

- permiso cycles.correctStartedBy;
- motivo;
- auditoría.

---

# 12. Publicación del programa

Distinguir:

- guardar borrador;
- publicar.

Capitán/Viewer solo acceden al programa según reglas de publicación.

Las modificaciones de un programa ya publicado deben generar auditoría y, de ser necesario, notificación.

---

# 13. Roles configurables

V1 puede utilizar roles predeterminados.

La arquitectura debe permitir permisos adicionales por membership sin crear decenas de roles.

Ejemplo:

```
role = captain

permissionsExtra = [
  "s13.read"
]
```

---

# 14. Denegación por defecto

Si una acción no está expresamente autorizada:

**denegar**.

No utilizar reglas tipo:

```
authenticated == true
=> acceso completo
```

---

# 15. Auditoría mínima obligatoria

Registrar:

- cambios de rol;
- cambios de tenant;
- creación/eliminación de usuarios;
- cambios a ciclos;
- correcciones de workSessions;
- cambios de startedBy;
- publicación/republicación;
- importaciones;
- exports sensibles cuando sea conveniente.

---

# 16. Estado de usuario

Membership:

- invited;
- active;
- suspended;
- revoked.

Solo active obtiene acceso operativo.

Un usuario autenticado con membership revoked no debe poder leer datos.

---

# 17. Regla SaaS Admin

El SaaS Admin no se convierte automáticamente en miembro de todos los tenants.

Separar:

- gestión de plataforma;
- acceso al contenido.

El soporte excepcional debe diseñarse más adelante con trazabilidad explícita.

---

# 18. Pendientes

- definir si Viewer puede ver S-13;
- definir visibilidad de teléfonos para Captain;
- definir ventana para editar reportes propios;
- definir flujo formal de reemplazo de capitán;
- definir soporte excepcional SaaS;
- definir notificaciones por cambios publicados.
