# Fase 6 — Planificador manual

## Alcance

Ruta `/campanas/admin/planificar/[campaignId]`, enlazada desde Participantes y
cobertura únicamente en `planning`. Conserva el editor de configuración vigente.
No matching, auto-pair, ranking, publicación, PDF, programa participante ni push.

El organizador selecciona persona, punto y slot. Dos personas sin vínculo accepted
pueden compartir un punto, pero esa decisión no crea PairRequest ni relación permanente.
Desktop: Disponibles | Puntos/Asignaciones | Contexto/Reserva; en móvil se apilan.
Selección de día/bloque y anterior/siguiente sin recarga completa. Poll visible de
12 segundos, botón Actualizar y refresh al confirmar cada mutación; sin escrituras optimistas.

## Estado y preservación de configuración

La API administrativa de estado acepta exclusivamente `draft → registration_open`
y `registration_open → planning`. Cerrar inscripciones exige confirmación explícita.
La UI muestra el resultado confirmado por el servidor. No retrocesos ni estados posteriores.
Los servicios participantes de Fase 3/4 ya permiten mutaciones solo en
registration_open: pasan a lectura sin modificar Availability, inscripción ni PairRequest.
El formulario general conserva todos sus campos, pero no persiste status: evita que
un formulario antiguo revierta planning al guardar información general.

## BlockPoint

Colección server-only `blockPoints`: campaignId, timeBlockId, pointId, active,
createdAt y updatedAt. ID SHA-256 de JSON `[timeBlockId, pointId]`: relación única
sin concatenaciones ambiguas. Activación idempotente; no duplica relación/auditoría.
Solo día/bloque/punto activos de la misma campaña. Se respeta maxPointsOverride del
día o maxPointsDefault, si existe. No existe un límite fijo de ocho en producción.
Desactivar un punto ocupado se rechaza: primero hay que liberar las asignaciones;
no se borran automáticamente. Se puede desactivar un punto vacío aunque el punto
global ya no esté activo, para limpiar su relación operativa.

Cada punto activo tiene exactamente dos slots. Cero/uno/dos participantes son
estados de borrador válidos; uno se marca Incompleto, sin bloquear guardado.
Capacidad objetivo `capacityOverride ?? defaultCapacityPerBlock` sigue intacta
(incluyendo cero); slots abiertos = puntos activos × 2 se muestra por separado.
Reserva potencial por capacidad conserva calculateCoverage de Fase 3/5.

## Assignment, atomicidad y concurrencia

Colección `campaignAssignments`: id, campaignId, timeBlockId, pointId,
registrationId, slotNumber 1/2, status draft/cancelled, createdBy, createdAt,
updatedAt, version, availabilityOverride y maxTurnsOverride. createdBy se deriva
del UID Firebase verificado; el esquema estricto rechaza campos inyectados.
Cancelar conserva documento e historial; una reasignación crea otro documento.
Mover dentro del bloque conserva identidad/createdBy y aumenta version.

Todas las mutaciones usan una transacción que lee primero campaña, configuración,
inscripciones, disponibilidades, vínculos, assignments y revisión, y valida antes
de escribir. Cada operación efectiva aumenta `campaignPlannerLocks/{campaignId}.revision`.
Este punto común serializa las decisiones incompatibles de una campaña, incluyendo
maxTurns entre bloques, sin bloquear la pantalla para un organizador. V1 favorece
integridad sobre alto throughput; no es diseño para miles de participantes.
No hacen falta sentinels redundantes de slot/persona. Todos los writes pasan por
esta revisión; Rules niegan acceso directo incluso al cliente campaign_admin.

Máximo una assignment draft por bloque+persona y por bloque+punto+slot.
En el retry transaccional se vuelve a validar el estado vigente. PATCH exige
expectedVersion para evitar que liberar/mover desde una pantalla antigua pise
una operación más reciente. Un conflicto responde 409 con:

“La planificación cambió mientras trabajabas. Actualiza el bloque e intenta nuevamente.”

Mover entre bloques exige liberar y reasignar manualmente: dos decisiones explícitas,
la cancelación queda trazable si la nueva asignación no puede completarse. No se
promete una transferencia automática ni se borra el origen sin confirmación.

## Vínculos accepted y excepciones

Accepted es obligatorio, no preferencia. Crear asigna ambos miembros atómicamente
en el mismo bloque/punto y slots distintos. Mover y liberar operan sobre ambos.
Vínculos incompatibles/corruptos se rechazan; no se elige uno automáticamente.
Un registro previo con un solo miembro muestra conflicto: Completar vínculo
asigna al miembro faltante únicamente en el mismo punto/slot libre, o Liberar
cancela la unidad. No se mueve o separa silenciosamente para resolver conflictos.

Disponibles = inscripción active, Availability true, sin assignment draft en el
bloque. Profiles inactivos se muestran para revisión y no son asignables. Asignar
los retira de la lista; liberar los devuelve después del refresh confirmado.
Reserva actual es esa misma lista derivada, alfabética, sin colección ni prioridad.

Asignar excepcionalmente permite seleccionar no disponibles. El backend devuelve
422 con advertencias por persona; cada casilla de confirmación autoriza solamente
la excepción indicada. “Esta persona no indicó disponibilidad para este horario.”
Accepted sin horarios en común sigue visible; los miembros sin disponibilidad
necesitan sus propias confirmaciones. Nunca se modifica Availability.

assignedTurns cuenta bloques distintos con assignment draft en toda la campaña,
no documentos ni cancelados. maxTurns null no limita; 1/2/3 son límites suaves.
Exceder exige confirmación específica del miembro y guarda maxTurnsOverride,
sin modificar la preferencia. Un retry que descubre un exceso adicional solicita
otra confirmación; no lo acepta silenciosamente.

## API y seguridad

Base `/api/campanas/admin/campaigns/[campaignId]`:

- GET `/planner?blockId=...`: DTO operativo, bloque inicial cronológico si se omite.
- POST `/block-points`: timeBlockId, pointId, active.
- POST `/assignments`: timeBlockId, pointId, registrationId, slotNumber, overrides.
- PATCH `/assignments/[assignmentId]`: action move/cancel y expectedVersion;
  move añade pointId, slotNumber, overrides.
- POST `/status`: solo registration_open/planning en el orden permitido.

Firebase ID token, requireCampaignOrganizer y registro actual del usuario/claim
en cada consulta/mutación; cookie participante nunca autoriza. Cuerpo limitado,
JSON estricto y origen/CSRF existente. Respuestas private/no-store; no logging de
credenciales o identidades. No cambios al guard, MANAGE_CAMPAIGNS, provisioning
de claims, ni políticas globales auth.

DTO sin teléfono, PIN/hash, sesión o datos médicos. Perfiles/congregaciones se leen
en bulk con field masks; 11 lecturas get de documento/consulta + dos getAll
enmascarados por snapshot, no una consulta por participante. Las consultas nuevas
son campaignId==; no se necesitan índices compuestos nuevos.

## Auditoría

assignment_created, assignment_cancelled, assignment_moved, max_turns_override,
availability_override, block_point_activated, block_point_deactivated; además
campaign_status_changed para la transición explícita. actorId = UID real,
campaignId, entityId, createdAt y metadata mínima de IDs/slot. Sin nombres,
teléfono ni razones libres sensibles. Overrides persistidos en Assignment y audit.

## Validación

`npm ci`; suites previas sin editar/relajar: F2 12, F3 13, F4 20, F5 25.
Nueva `npm run test:campaign-planner`, integración contra Auth y Firestore Emulator
reales con dos UID organizadores. Fixture estrictamente local demo-campaign-auth:
80 personas ficticias, cuatro congregaciones, varios días/bloques, ocho puntos
globales y 3/5/8 activos, accepted normal/conflictivo, maxTurns 1/2/3/null.
Los casos crean puntos incompletos y legacy accepted incompleto y verifican su UX/DTO.
No se usan endpoints públicos para el bulk fixture ni se alteran rate limits.

Pruebas de unicidad, atomicidad de accepted, overrides, auditoría, liberar/mover,
colisiones mismo slot/persona/accepted, desactivar versus asignar, liberar versus
mover, maxTurns entre bloques, claim actual, DTO y Rules. Comprobación de navegador
con los ocho escenarios operativos solicitados.

Validación final (2026-10-05): F2 **12/12**, F3 **13/13**, F4 **20/20**,
F5 **25/25**, F6 **51/51**. Se ejecutaron en secuencia, sin relajar suites previas.
F3 tuvo corridas iniciales intermitentes con `INVALID_ARGUMENT: Transaction is
invalid or closed` del emulador; aprobó al repetir, sin modificar servicio ni tests.
La corrida final F3→F6 aprobó completa. npm ci completado; no se actualizaron dependencias.

Navegador: cuatro puntos/ocho slots, dos compañeros manuales, accepted atómico,
duplicado de persona rechazado entre pestañas, maxTurns con casilla individual,
no disponible con casilla individual, liberar y retorno inmediato, mismo slot en
dos pestañas con un solo ganador y mensaje 409. También se comprobó el cierre con
confirmación desde F5, estado planning inmediato y CTA al planner. La comprobación
manual utilizó dos pestañas del mismo usuario; integración concurrente usó dos UID
distintos. Overrides auditados y maxTurns/Availability intactos verificados servidor.
Conexión temporal del SDK cliente a emuladores retirada antes del commit.

Typecheck/build mantienen como excepción histórica únicamente cuatro errores
Date/Timestamp de Limpieza y dos imports ausentes de Territorios. No se corrigen aquí.

## RATE LIMIT CHECKPOINT obligatorio antes del piloto

Fase 2 mantiene 30 registros globales y 120 logins globales por 15 minutos.
Treinta registros no alcanzan para una jornada de 40–80 participantes.
Antes del piloto una persona responsable debe revisar y decidir el límite y la
operación de altas/login. Esta decisión humana continúa pendiente y no bloquea
la fase técnica; no se aumentan ni se evaden los límites en esta implementación.

## Fuera de alcance

Fase 7 validará/publicará el programa completo. No Assignment published,
ProgramVersion, publishedAt, Mi programa funcional, PDF, impresión, push,
ChangeRequest ni automatización de compañeros. PR #15 permanece Draft, sin merge;
Issue #7 permanece abierto para revisión humana.
