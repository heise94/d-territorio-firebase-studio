# D-Territorio Campañas — Roles, Permisos y Flujo Operativo

## 1. Objetivo

Definir quién puede hacer qué dentro del módulo, especialmente porque la planificación será colaborativa entre hermanos de distintas congregaciones.

## 2. Roles

### super_admin
Puede:
- crear/eliminar campañas;
- configurar todo;
- administrar organizadores;
- ver auditoría;
- publicar/despublicar programa;
- resolver conflictos;
- revocar sesiones;
- restablecer PIN de participantes.

### campaign_admin
Puede, dentro de campañas asignadas:
- editar configuración;
- abrir/cerrar inscripciones;
- revisar participantes;
- planificar;
- crear/mover/eliminar asignaciones;
- gestionar puntos;
- resolver solicitudes;
- publicar nuevas versiones del programa;
- ver notas internas y auditoría básica.

### congregation_coordinator
Puede colaborar en campañas autorizadas.

Por defecto puede:
- revisar participantes;
- revisar disponibilidad;
- crear/mover/eliminar asignaciones;
- colaborar en PairRequest/ChangeRequest;
- agregar notas operativas;
- consultar programa.

No restringir automáticamente su vista solo a miembros de su congregación, porque el trabajo real se realizará en conjunto.

Acciones sensibles como crear campaña, cambiar configuración global o administrar usuarios pueden quedar fuera de este rol.

### participant
Solo opera sobre sus propios datos y acciones permitidas por estado de campaña.

## 3. Estados de campaña y acciones

### draft
Organizadores:
- configuran campaña;
- definen días/bloques;
- preparan congregaciones.

Participantes:
- no ven inscripción pública.

### registration_open
Organizadores:
- monitorean cobertura;
- pueden corregir datos;
- no es necesario definir puntos finales todavía.

Participantes:
- se registran;
- marcan disponibilidad;
- cambian disponibilidad;
- indican máximo de turnos;
- crean/responden solicitudes para participar juntos.

### planning
Organizadores:
- trabajan asignaciones manuales;
- activan puntos necesarios;
- utilizan reservas;
- revisan restricciones.

Participantes:
- siguen viendo su disponibilidad;
- cambios que puedan afectar planificación deben ser limitados o convertirse en solicitud según política configurada.

### published
Organizadores:
- programa vigente visible;
- cambios posteriores deben quedar auditados;
- al republicar se incrementa versión.

Participantes:
- ven sus asignaciones;
- solicitan cambios;
- reciben notificaciones.

### active
Mismas bases que published, pero indica campaña en ejecución.

### completed
Datos quedan principalmente en modo histórico.

## 4. Planificación colaborativa

Varios organizadores pueden trabajar al mismo tiempo.

El sistema debe:
- actualizar en tiempo real;
- validar en backend;
- evitar doble asignación;
- mostrar mensajes de conflicto claros;
- mantener auditoría.

No se requiere bloquear toda la pantalla a un solo organizador.

## 5. Creación de asignación

Flujo:
1. Organizador selecciona bloque.
2. Ve lista de disponibles no asignados.
3. Selecciona una persona o una pareja obligatoria confirmada.
4. Selecciona punto/slot.
5. Backend valida disponibilidad y conflictos.
6. Si confirma, Assignment queda en borrador.
7. Persona desaparece de disponibles.

## 6. Pareja obligatoria confirmada

Si A+B tienen PairRequest accepted:
- la UI debe identificarlos claramente;
- deben poder asignarse juntos con pocos pasos;
- backend debe impedir publicar separación accidental;
- si solo uno está asignado, mostrar estado incompleto.

Esto no significa que el sistema cree parejas por sí solo.

## 7. Máximo de turnos

El máximo declarado es una restricción suave para organizadores, no una prohibición absoluta.

Si se intenta superar:
- mostrar advertencia clara;
- requerir confirmación explícita;
- registrar override si se confirma.

Razón: pueden existir casos donde el hermano acepte cubrir más turnos posteriormente.

## 8. Capacidad de bloque

La capacidad es guía operativa.

Al alcanzar la capacidad principal:
- marcar bloque como completo;
- mantener visibles reservas potenciales;
- no impedir que la organización ajuste número de puntos/capacidad si corresponde.

## 9. Publicación

Antes de publicar ejecutar validaciones:
- no duplicados por bloque;
- no slots sobreocupados;
- parejas obligatorias completas;
- puntos válidos;
- campaña/día/bloque activos;
- advertencias por máximo de turnos;
- asignaciones incompletas claramente identificadas.

Errores críticos bloquean publicación.
Advertencias requieren revisión pero pueden permitir publicar.

## 10. Deshacer y cambios

Durante borrador:
- mover/eliminar asignaciones debe ser fácil.

Después de publicado:
- cambios siguen permitidos a organizadores autorizados;
- deben generar nueva versión o quedar incluidos en próxima publicación;
- participantes afectados reciben aviso cuando el cambio entra en vigencia.

## 11. Solicitudes de cambio

Participante puede crear ChangeRequest desde una asignación publicada.

Organizador puede:
- revisar;
- contactar si corresponde fuera del sistema;
- aprobar/rechazar/resolver;
- modificar asignación manualmente.

Aprobar una solicitud no debe autoasignar reemplazo.

## 12. Datos visibles

### En planificador
Organizadores pueden ver:
- nombre;
- congregación secundaria;
- disponibilidad del bloque;
- turnos asignados / máximo;
- vínculo obligatorio;
- nota operativa autorizada.

No mostrar ni solicitar información médica/sensible.

### En PWA participante
Solo:
- sus datos;
- su disponibilidad;
- sus solicitudes;
- sus asignaciones publicadas;
- nombre de compañero cuando ya esté asignado y publicado;
- información del punto.

## 13. Auditoría mínima

Guardar actor y fecha en:
- cambios de estado de campaña;
- cambios de capacidad/puntos;
- assignment create/move/delete;
- overrides de máximo de turnos;
- publicación;
- cambios post-publicación;
- reset de PIN;
- resolución de solicitudes.
