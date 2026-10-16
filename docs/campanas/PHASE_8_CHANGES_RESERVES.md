# Fase 8 — Cambios posteriores y reservas

Fecha: 2026-10-05. Base aprobada: `e646047c8135f16ba70c699433e49cbfaf8cf7e0`.
Implementación exclusiva F8. PR #15 OPEN Draft; Issues #8/#9 abiertas para revisión humana.

## Solicitud y estados

`changeRequests` server-only: id, campaignId, registrationId, participantId, assignmentId,
sourceProgramVersionId/sourceProgramVersion, status, reasonCode, comment, organizerResponse,
createdAt/updatedAt, resolvedAt/resolvedBy y resolvedProgramVersionId al resolver.

Pending → approved → resolved; pending → rejected. Rejected/resolved son terminales.
Aprobar **no** cancela/crea Assignment, elige reserva, cambia Campaign ni crea versión.
Solo acepta gestionar la petición y genera aviso interno. Rechazar conserva programa,
registra actor/fecha terminal y respuesta breve. No se borran solicitudes ni históricos.

Participante: Mi programa → Solicitar cambio → motivo general → comentario opcional ≤500.
Microcopy: “No necesitas incluir información médica o privada”. Historial propio muestra
estado, turno original, motivo, comentario y respuesta del organizador. No pide datos sensibles.

El turno usa un identificador opaco autenticado AES-256-GCM (locator, nunca autoridad),
con clave derivada y nonce determinístico HMAC por tupla inmutable versión/Assignment.
No revela IDs internos al decodificar base64; se mantiene estable para la misma versión/turno.
Backend revalida cookie → sesión → participante activo → inscripción activa propia →
snapshot oficial actual → Assignment published propia. Una referencia histórica, ajena,
draft/cancelled o un body con identidad/status inyectados se rechaza.

Sentinel `campaignChangeRequestLocks` por inscripción/asignación y consulta de históricos
impiden dos pending/approved incluso por carrera o registros antiguos sin sentinel.
Rate limit individual: **10 intentos válidos de creación / 15 minutos por participante**.
Duplicados también consumen el contador para evitar abuso; no hay cuota global de campaña.

## Panel y reservas

`/campanas/admin/cambios/[campaignId]`, enlazado desde dashboard publicado y programa.
Badge pending+approved; filtros estado/día/bloque/congregación/nombre. Pending primero,
approved después y más antiguas primero; rejected/resolved disponibles en historial.
Detalle incluye contexto, compañero, capacidad objetivo, versión original y alerta stale.

Reserva **derivada, sin colección ni ranking**: perfil e inscripción activos,
Availability=true y sin slot en el bloque del snapshot oficial actual.
Orden alfabético. Muestra congregación, turnos oficiales/maxTurns y vínculo accepted.
No muestra teléfono, credenciales o sesiones. Solo selección manual; no autopromoción.
No se implementa flujo excepcional de participantes no disponibles.

## Resolución y accepted

Servicio dedicado post-publicación, independiente de las mutaciones planning de F6.
Seleccionar reserva o confirmar explícitamente liberar sin reemplazo; revisar validación,
confirmar warnings y confirmar nueva versión. No usa heurísticas de selección.

Unidad accepted saliente: ambas Assignment del bloque se cancelan atómicamente.
Liberar ambos preserva accepted. Reserva accepted: entran ambos en slots compatibles
del mismo punto/bloque; si solo cabe uno se rechaza. Confirmación explícita de unidad.
La selección de una persona libre no crea PairRequest. **No se implementa cancelación
administrativa de accepted** (opción C opcional); nunca se cancela implícitamente.

Assignment anterior published → cancelled; no cambia registrationId. Conserva identidad,
createdBy original y agrega cancelledBy/cancellationChangeRequestId/cancelledInVersion,
sin sobrescribir sourceChangeRequestId de su creación en una resolución anterior.
Nueva Assignment published con createdBy UID real, sourceChangeRequestId,
publishedInVersion, createdAt/updatedAt, version y flags de override.

Máximo se calcula desde turnos oficiales actuales. Nuevo exceso requiere override
individual maxTurnsOverrides; persiste bandera y metadata auditada, no modifica maxTurns.
Reservas normales no necesitan availabilityOverride ni cambian Availability.

## Validación y snapshot

Reutiliza `projectProgram` de F7 con contexto published y posibilidad de programa vacío
tras liberación explícita; no cambia el comportamiento predeterminado de F7.
Blockers duplicados, slots, perfiles/referencias, accepted, disponibilidad y maxTurns
se mantienen. Incompletos/vacíos y overrides autorizados requieren revisión explícita.
Permite liberar el último turno: slots Pendiente con warnings, sin requisito nuevo de mantener
al menos una persona asignada. Estructura/días/bloques/puntos siguen siendo obligatorios.

Estado resultante = programa oficial anterior más reemplazos explícitos. Snapshot completo,
no delta. Nombres/configuración de celdas no afectadas permanecen congelados: una edición
viva de perfil/horario/punto no se incorpora silenciosamente por resolver otra solicitud.
Referencias y restricciones actuales se revalidan mediante el motor compartido.

## Atomicidad y versiones

Transacción lee estado oficial, source completo/raw accepted, solicitud y lock; compara
expectedProgramVersion, currentProgramVersionId y expectedRevision determinística.
La revisión incluye también perfiles, disponibilidades, maxTurns y vínculos de reservas
no asignadas, además del fingerprint F7: un candidato cambiado después de revisar no se
incorpora silenciosamente.
Cancela anteriores, crea nuevas Assignment, crea `<campaignId>__v<N+1>`, actualiza pointer,
marca resolved, auditoría y notificaciones dentro de la misma transacción.
Solo create para ProgramVersion; no update/delete de snapshots por servicios de aplicación.
Soporta v2/v3/v4…, sin hardcodear v2. Versiones previas permanecen reproducibles.

Campaign permanece published. publishedAt = primera publicación, intacta;
updatedProgramAt = timestamp de última versión. ProgramVersion.publishedAt identifica
su propia publicación. No published→active/completed ni retrocesos.

Lock F6 común serializa operaciones. Versión/revisión vieja → HTTP409:
“El programa cambió mientras trabajabas. Actualiza antes de continuar.”
Mismo request/slot/version base concurrente tiene un ganador, sin duplicar vN+1.

Solicitud stale se conserva con aviso. No se resuelve automáticamente: requiere
consulta renovada, revisión explícita confirmStale y Assignment todavía oficial propia.
Si fue reemplazada/cancelada, no se aplica y queda para revisión humana; no se elimina.

## Historial, PDF y Mi programa

Programa administrativo indica versión actual y selector histórico de solo lectura:
**VERSIÓN HISTÓRICA — vN**. API programa/PDF acepta versión administrativa seleccionada;
consulta siempre snapshot guardado. Filename campana-…-vN.pdf.
PDFKit existente sin nueva dependencia ni reconstrucción desde datos vivos.

Mi programa siempre usa currentProgramVersionId. Poll visible 12s y al recuperar visibilidad;
refresh inmediato al crear solicitud. No listener privado Firestore ni escritura optimista.
DTO personal incluye solo turnos propios y locator opaco autenticado, nunca matriz general.
Una solicitud pending/approved oculta el botón duplicado y muestra su estado en el turno.
Al seleccionar otra versión se bloquea impresión/descarga hasta terminar la consulta,
evitando imprimir una vista anterior durante la carga.

## Avisos internos mínimos

`campaignNotifications`: participantId, campaignId, type, title, body, targetRoute,
metadata mínima, createdAt y readAt nullable. Tipos change_request_approved/rejected/resolved
y assignment_changed. IDs SHA256 determinísticos evento+tipo+destinatario evitan duplicados
por retries transaccionales. Cada transición terminal/status es además idempotente por rechazo
de acciones repetidas. No se guarda el comentario libre en Notification/auditoría.

Comparación anterior/nueva por persona de turnos, punto/horario y compañero identifica afectados:
retirado, agregado y compañero cuyo compañero cambia. Un participante con turnos idénticos
no recibe assignment_changed. Se muestra aviso en Inicio/Mi programa. No centro Avisos completo,
gestión avanzada de leídos, push, FCM ni permiso de notificaciones.
El DTO de avisos omite una aprobación ya terminada por resolución/rechazo: no muestra
“está siendo gestionada” después de finalizar. El evento persistido se conserva intacto.

## Auditoría y seguridad

change_request_created/approved/rejected/resolved, post_publish_assignment_cancelled/created,
program_version_created. actorId real (Participant para creación, UID Firebase para admin),
campaignId/entityId/version/timestamp y metadata mínima. Overrides auditados; comentarios
y respuestas no se copian completos a audit. No accepted_link_cancelled porque no se cancela vínculo.

APIs privadas no-store; POST Origin/CSRF/body limitado y Zod strict.
Admin: token Firebase vigente/no revocado, cuenta activa y claim campaign_admin actual mediante
autorización existente/requireCampaignOrganizer. Cookie participante no autoriza admin.
Rules deny explícito a changeRequests, campaignNotifications, locks nuevos; conserva deny de
campaignProgramVersions/campaignAssignments/locks previos. No cambios guard/MANAGE_CAMPAIGNS.

## APIs

- GET/POST `/api/campanas/participant/change-requests`.
- GET `/api/campanas/participant/change-notifications` (avisos propios mínimos).
- GET `/api/campanas/admin/campaigns/[campaignId]/change-requests` y `/[id]`.
- POST `/change-requests/[id]/approve`, `/reject`, `/preview`, `/resolve`.
- GET `/program/versions`; `/program?version=N` y `/program/pdf?version=N`.

## Verificación

Nueva suite `npm run test:campaign-changes`, Auth/Firestore Emulator reales, fixture aislada
demo-campaign-auth de 80 participantes, cuatro congregaciones, ocho puntos. Sin mocks de permisos.
Corrida final secuencial sin fallos ni omitidas, Node 24.19.0 y emuladores locales:

| Suite | Resultado |
| --- | --- |
| F2 Auth | 12/12 |
| F3 Registration | 13/13 |
| F4 PairRequest | 20/20 |
| F5 Dashboard | 25/25 |
| F6 Planner | 51/51 |
| F7 Program | 64/64 |
| F8 Changes | 64/64 |

`npm ci` correcto, sin cambios de dependencias ni audit fix. Suites F2–F7 intactas.
F8 cubre ownership/strict/duplicados/estados/aprobación sin efectos, reemplazo/liberación,
reservas/maxTurns/accepted, v1→v2→v3, PDF histórico, stale, carreras, auditoría,
avisos idempotentes/afectados, privacidad, Rules/claim actual/revocación y rate limit.
Pruebas adicionales cubren cambios de candidato después de revisar, bloqueo de referencia
inactiva, último turno liberado y rechazo de overrides ajenos.

QA real en navegador integrado con Auth/Firestore Emulator, no en producción:

1. Juan ficticio solicita sobre su turno v1 con comentario vacío; aparece pending.
2. Organizador aprueba: conserva turno y v1, sin selección de reserva.
3. Selección manual de Ana, warnings y doble confirmación: v2; Juan retirado,
   Ana ve su turno v2 y aviso; historial de Juan resuelto.
4. Solicitud de Ana rechazada: mismo turno/v2, aviso e historial terminal.
5. Nueva solicitud aprobada, fixture sin reservas en ese bloque: mensaje sin reservas,
   liberación explícita/warnings y v3 con Pendiente. Históricos v1/v2 siguen intactos.
6. Saliente accepted: intento sin confirmación de unidad bloqueado; liberar ambos
   con confirmación conserva el vínculo y crea v4.
7. Dos pestañas revisando v3 y resolviendo la misma solicitud: una publica v4,
   otra recibe HTTP409 y el mensaje de conflicto. Mi programa consulta v4.

Historial administrativo v1/v2/v3, etiquetas históricas de solo lectura y descarga de
los tres PDF comprobados desde UI. PDFs de seis páginas cada uno renderizados y revisados:
v1 contiene Juan, v2 Ana y v3 Pendiente, con versión/nombre de archivo correctos.
Avisos de Inicio/Mi programa comprobados; aprobación obsoleta no queda visible tras resolver.
Esto no equivale a inspección nativa de impresión de Mac.

Typecheck falla exclusivamente por cuatro Date/Timestamp históricos de
`src/app/(app)/cleaning/program/page.tsx` (201, 202, 334, 335) y dos imports ausentes de
`src/app/(app)/territorios/asignaciones/page.tsx` (40, 41).
Build falla exclusivamente por esos dos imports de Territorios.
Sin errores nuevos de Campañas; ninguna de esas áreas se modifica.
Conexión temporal de emuladores y archivos generados por build restaurados antes del commit.

## Checkpoints y fuera de alcance

**QA impresión nativa Fase 7: PENDIENTE**. Inspección visual de vista previa nativa
de impresión en Mac: PENDIENTE; no se intenta ni declara completada con Mac inaccesible.
No bloquea F8. Issue #8 permanece abierta; Issue #9 espera revisión humana.

**REVISAR ANTES DEL PILOTO — RATE LIMITS AUTH:** 30 registros y 120 logins / 15 minutos,
sin cambios. 40–80 altas concentradas pueden superar 30; decisión humana previa al piloto.
Provisioning de claim sigue no bloqueante. Sin push/FCM/PushSubscription, offline completo,
recordatorios, auto-reemplazo, ranking, auto-pair ni F9. Sin merge/push main.

## Archivos de esta fase

- `docs/campanas/DECISIONS_LOG.md`
- `docs/campanas/PHASE_8_CHANGES_RESERVES.md`
- `firestore.rules`
- `package.json`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/approve/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/preview/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/reject/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/resolve/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/program/pdf/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/program/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/program/versions/route.ts`
- `src/app/api/campanas/participant/change-notifications/route.ts`
- `src/app/api/campanas/participant/change-requests/route.ts`
- `src/app/api/campanas/participant/my-program/route.ts`
- `src/app/campanas/admin/cambios/[campaignId]/page.tsx`
- `src/app/campanas/page.tsx`
- `src/modules/campaigns/components/admin-dashboard.tsx`
- `src/modules/campaigns/components/campaign-changes.tsx`
- `src/modules/campaigns/components/campaign-program.tsx`
- `src/modules/campaigns/components/participant-change-requests.tsx`
- `src/modules/campaigns/components/personal-program.tsx`
- `src/modules/campaigns/domain/change-request.ts`
- `src/modules/campaigns/domain/planner.ts`
- `src/modules/campaigns/domain/program.ts`
- `src/modules/campaigns/domain/types.ts`
- `src/modules/campaigns/schemas/change-request-schemas.ts`
- `src/modules/campaigns/server/change-notifications.ts`
- `src/modules/campaigns/server/change-request-admin.ts`
- `src/modules/campaigns/server/change-request-context.ts`
- `src/modules/campaigns/server/change-request-participant.ts`
- `src/modules/campaigns/server/change-request-review.ts`
- `src/modules/campaigns/server/program-history.ts`
- `src/modules/campaigns/server/program-projection.ts`
- `src/modules/campaigns/server/program-service.ts`
- `src/modules/campaigns/server/program-turn-locator.ts`
- `tests/campaign-changes/fixture.ts`
- `tests/campaign-changes/integration.test.ts`
