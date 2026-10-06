# Fase 4 — Solicitudes para participar juntos

`accepted` representa **un vínculo obligatorio**: cuando ambos sean asignados, deben ir
juntos. No es preferencia y no crea Assignment, punto, horario ni selección de Availability.
La organización hará la asignación manual en Fase 6; su implementación queda fuera de esta fase.

## Modelo, unicidad e historial

Namespace central `pairRequests`: `id` opaco Firestore, `campaignId`,
`requesterRegistrationId`, `recipientRegistrationId`, `status`, `createdAt`, `updatedAt`
y `respondedAt` al aceptar/rechazar/cancelar. Estados pending/accepted/rejected/cancelled.
Sin teléfono, PIN, notas ni datos sensibles duplicados.

Colección exclusivamente interna `campaignPairRequestLocks` con sentinels SHA-256 de tuplas:

- Relación: `[relation, campaignId, ...sort(registrationA, registrationB)]` apunta a la
  última solicitud. Crear lee esa referencia y el estado anterior en transacción. Pending
  y accepted impiden duplicados, incluso A→B/B→A concurrentes.
- Exclusividad: `[accepted, campaignId, registrationId]` para cada extremo. Aceptar lee
  ambos sentinels en orden estable y crea ambos atómicamente con el cambio de estado.
  Aceptaciones concurrentes que compartan cualquier extremo solo permiten un vínculo.
  No se liberan: no existe cancelación participante de accepted en V1.

Rejected/cancelled permiten otro documento con ID nuevo y nueva confirmación; el sentinel
apunta al nuevo sin borrar ni sobrescribir la historia. Otras pending se mantienen pendientes,
pero su aceptación incompatible se rechaza. No hay aceptación/cierre automático en cascada.
Crear también rechaza si cualquiera ya tiene un vínculo accepted en esa campaña.

## Autorización y estados

Cookie → DeviceSession → Participant activo → inscripción propia determinística.
Crear/buscar requiere CampaignRegistration active y registration_open. Crear valida receptor
inscrito active, perfil activo, misma campaña y distinto del emisor. Aceptar revalida ambos
perfiles/inscripciones y exclusividad. Solo receptor acepta/rechaza, solo emisor cancela pending.
Rejected/cancelled/accepted no admiten nuevas transiciones sobre el documento existente.

Todas las mutaciones revalidan campaña/sesión dentro de la transacción, sin lecturas después
de escrituras. Planning/published/active/completed son lectura propia; draft no es visible.
Cancelar/rechazar no requiere que el otro perfil siga activo, para poder cerrar una pending
obsoleta; quien actúa sí debe mantener sesión e inscripción activas.

## Búsqueda y privacidad

Búsqueda explícita por nombre, no autocomplete masivo ni teléfono. Query 2–80 caracteres
(también mínimo dos después de normalizar); trim, minúsculas y NFD sin acentos. Para V1
40–80 personas, servidor consulta inscripciones de esa campaña y sus perfiles; filtra active
y propio, ordena alfabéticamente y devuelve como máximo 10. Sin ranking/recomendaciones.
DTO: registrationId opaco, fullName y nombre de congregación secundario, sin participantId,
teléfono, maxTurns, PIN ni disponibilidades. El navegador nunca descarga el directorio completo.

Listar solicitudes filtra en servidor las que involucran la inscripción propia. DTO de cada
solicitud: ID/estado/dirección, nombre/congregación del otro, timestamps y horarios compartidos.
No devuelve inscripciones ni identificadores internos de terceros en ese listado.

## Disponibilidad común y conflictos

Intersección de Availability available=true de ambos, misma campaña, TimeBlock activo y
CampaignDay activo. Devuelve solo bloques comunes con fecha/hora, no la selección completa
del otro. Se calcula en cada consulta desde los datos actuales, no snapshot persistido.

`availabilityConflict = sharedBlocks.length === 0`. Puede crearse/aceptarse sin coincidencias;
se muestra “Actualmente no tienen horarios disponibles en común. Revisen su disponibilidad.”
Cambiar Availability no rompe accepted ni selecciona alternativas. Perfil/inscripción retirados
generan participationConflict visible, sin cancelar el vínculo ni reasignar al otro.

## API, UX y notificación interna

- GET `/api/campanas/participant/campaigns/[campaignId]/pair-candidates?q=...`.
- GET `/api/campanas/participant/campaigns/[campaignId]/pair-requests`: consulta propia.
- POST misma ruta: `{action: create, recipientRegistrationId}` o
  `{action: accept|reject|cancel, requestId}`. Zod strict rechaza identidad/estado inyectados.
- GET `/api/campanas/participant/pair-inbox`: resumen propio agrupado por campaña.
- `/campanas/participar-juntos/[campaignId]`: buscar, confirmar envío/aceptación,
  responder, cancelar pending, historial y conflicto con enlace a mi disponibilidad.
- `/campanas/participar-juntos`: todas las campañas con pendientes recibidas.
- Disponibilidad enlaza “Participar con otro hermano” después de inscribirse.
- Inicio muestra tarjeta pendiente antes del contenido secundario: contador, hasta tres
  campañas, hasta dos nombres por campaña, enlace de gestión y acceso al resumen completo.

Las consultas se refrescan al abrir/enfocar y cada 30 segundos mientras la página esté visible.
La acción propia refresca inmediatamente; no se promete streaming en tiempo real. Estado/error
visibles, botones grandes, confirmación obligatoria antes de enviar/aceptar. Sin nueva pestaña.
Esta tarjeta + sección de solicitudes es la notificación interna de Fase 4: no Notification,
PushSubscription, permiso push ni envío externo. Seguridad prevalece sobre UX_FLOWS antiguo
que mencionaba búsqueda telefónica/push. Los cinco destinos actuales se conservan.

## Seguridad, auditoría y límites

Firebase Admin server-only, cookie como única autoridad, DTO por lista permitida,
Cache-Control private/no-store y Vary Cookie. POST reutiliza Origin/Sec-Fetch-Site/JSON
acotado de Fase 3. PWA NetworkOnly existente ya cubre nuevas rutas. Firestore Rules niega
leer/listar/escribir pairRequests y campaignPairRequestLocks incluso con campaign_admin.
No se modifica configuración administrativa ni autenticación previa.

AuditLog transaccional por acción: pair_request_created/accepted/rejected/cancelled,
actorId lógico, campaignId, entityId y createdAt, sin teléfono/secreto/payload personal.
Una mutación fallida no escribe evento de éxito. Consultas usan una igualdad por vez;
no se requieren índices compuestos nuevos. Sentinels son infraestructura privada, no un
segundo modelo de vínculo ni nuevo namespace funcional.

Límites distribuidos reutilizan ParticipantAuthService.limit y su ventana de 15 minutos:
búsqueda **60**, creación **20**, respuesta/cancelación conjuntamente **60**, por Participant
en todas sus campañas. No hay límite global de PairRequest. Intentos cuentan éxitos/fallos;
sin sesión válida no se consume cuota. Sesión y permisos se revalidan después de consumirla.
Código/valores centralizados en PairRequestService; HTTP 429 conserva mensaje humano de Fase 2.

## Pruebas y alcance

Solo fixtures ficticios y Firestore Emulator; nunca datos reales ni producción.
Suites secuenciales (comparten proyecto y limpieza):

```sh
npm ci
npm exec --yes --package firebase-tools@13.35.1 -- firebase emulators:exec --only firestore --project demo-campaign-auth --config firebase.campaign-auth.json 'npm run test:campaign-auth && npm run test:campaign-registration && npm run test:campaign-pair-requests'
npm run typecheck
npm run build
```

Fase 4: 16 casos de integración y 4 unitarios; búsqueda/privacidad/límites, validaciones,
duplicados cruzados, exclusividad en ambos extremos, aceptación concurrente, permisos,
reenvío/historial, conflictos actuales, estados, auditoría, Rules y Route Handlers reales.
Fixtures browser: tests/campaign-pair-requests/demo.ts, exclusivos 127.0.0.1:8088/demo.
Panel Fase 1 intacto; Fases 2/3 conservan suites 12 y 13. Errores históricos Limpieza/Territorios
siguen fuera de alcance. Sin despliegue real, merge, cierre de #5 ni avance a Fases 5/6.

Resultado local: npm ci correcto; Fase 2 **12 PASS / 0 FAIL**, Fase 3 **13 PASS / 0 FAIL**,
Fase 4 **20 PASS / 0 FAIL**, sin omitidas. Typecheck solo informa los cuatro errores
Date/Timestamp históricos de Limpieza y los dos imports ausentes de Territorios. Build falla
solo por esos imports (`reportar-predicacion-dialog`, `solicitar-territorio-dialog`).
Recorrido navegador/emulador verificado: A busca José sin acento, confirma/envía, ve Pending;
B ingresa y ve tarjeta prioritaria, confirma/acepta; A recarga y ve Accepted; B modifica
Availability y ambos ven conflicto sin perder Accepted; en otra campaña A envía/cancela,
reenvía y B rechaza, conservando ambos históricos. Vista móvil 390×844 revisada con
texto, controles y cinco destinos legibles; no se usaron identidades reales.

## REVISAR ANTES DEL PILOTO — RATE LIMITS AUTH

Sin cambios: registro de identidad global **30/15 minutos** y login global **120/15 minutos**,
en src/app/api/campanas/auth/[action]/route.ts; ventana en server/auth/service.ts.
40–80 altas concentradas superan 30; reintentos pueden agotar 120. HTTP 429 con mensaje
“Has realizado varios intentos. Intenta nuevamente más tarde.” Escalonar primer acceso,
revisar carga y considerar variables server-side en tarea autorizada; decisión humana pendiente.
