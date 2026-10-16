# Fase 9 — PWA, avisos internos, push y recordatorios

Implementación sobre `feature/campanas-v1`, base aprobada
`1a036511884ab4fc5abcca57949e3969a6e4164e`. Alcance exclusivamente F9.
No despliegue productivo, F10, merge ni cambios en `main`.

## Una fuente de verdad

Se conserva `campaignNotifications` de F8. No se usa la colección histórica
`notifications` de Territorios ni se duplican los avisos de cambio.
`domain/notification.ts` centraliza tipos, suscripciones y destinos permitidos.
El aviso interno y su outbox se crean en la misma transacción del evento de dominio.
FCM nunca se invoca dentro de esa transacción. Un fallo push no revierte inscripción,
solicitud, aprobación, rechazo, resolución o publicación.

Tipos: `pair_request_created`, `pair_request_accepted`, `pair_request_rejected`,
`program_published`, `assignment_changed`, `change_request_resolved`, `turn_reminder`;
se conservan también `change_request_approved` y `change_request_rejected` de F8.

- PairRequest creada: aviso al destinatario; aceptada/rechazada: al solicitante.
- Publicación inicial: un aviso por participante con turnos, no uno por turno.
- v2/v3+: se conservan los eventos y la comparación de afectados de F8. No se
  repite `program_published` a toda la campaña. Incluye compañero cuyo turno cambió.
- Aprobación de ChangeRequest sigue sin seleccionar reserva ni cambiar programa.
- Resolución de cambio y snapshots oficiales mantienen todas las reglas F8.
- Sin push activado, los avisos internos y Mi programa siguen disponibles.

IDs SHA-256 determinísticos usan evento/tipo/participante, compatibles con F8.
Campos internos: participantId, campaignId, type, title, body, targetRoute,
metadata mínima, createdAt y readAt nullable. Comentarios privados, PIN, teléfonos,
credenciales y sesiones no se copian a payloads push.

## Centro Avisos e Inicio

`/campanas/avisos`: historial propio, no leídos primero y fecha descendente,
marcar uno o todos, contador, enlace a destino interno y paginación de 25
(máximo 50 por respuesta). No se borra historial. Marcar todos escribe lotes
transaccionales de hasta 400, revalidando identidad. Límite individual 60/15 min.
El endpoint existente F8 sigue siendo una proyección de alertas de cambios,
no un segundo almacén. Inicio conserva PairInbox y ChangeAlerts, luego resumen de
avisos, próximo turno del programa vigente, inscripción y acceso a organizadores.
Se consulta backend sin caché y se actualiza al volver a la pestaña; resumen y
próximo turno se refrescan cada 15 segundos visibles. Foreground FCM vuelve a
validar ownership del evento antes de solicitar actualización de la UI.

DTO Avisos: id opaco, type, title, body, targetRoute, createdAt y readAt.
Sin participantId, DeviceSession, token FCM, UID organizador o metadata interna.
Destinos exactos permitidos: `/campanas`, `/campanas/avisos`,
`/campanas/mi-programa`, `/campanas/participar-juntos`; otros se convierten a Avisos.

## PWA y privacidad offline

Se mantiene `@ducanh2912/next-pwa`, registro único `/sw.js`, scope `/` y custom
worker `worker/index.js` importado por el worker generado. No existe otro scope
FCM ni `firebase-messaging-sw.js` competidor. Manifest `/campanas.webmanifest`:
Inicio `/campanas`, standalone, español, iconos locales 192/512 y maskable 512.
Identidad vectorial propia coherente con el megáfono/teal del módulo; sin imágenes
externas ni placeholders.

Android: beforeinstallprompt contextual, no bloqueo del flujo; descartable siete
días. iPhone/iPad/iPadOS: Compartir → Añadir a pantalla de inicio, descartable;
no botón programático ficticio. Instalación detectada por display-mode/standalone.

Páginas, RSC y APIs privadas de Campañas son NetworkOnly antes de reglas genéricas.
Se desactiva caché de start_url y recarga automática al volver online. Caché pública
para assets/shell; no programas, avisos, sesión, PIN ni solicitudes en CacheStorage,
IndexedDB o localStorage. Solo timestamp de descarte de instalación en localStorage.
Sin red se muestra `campanas-offline.html` o el estado offline de CampaignPwa:
“Necesitas conexión para actualizar información de la campaña”. No se ofrece
éxito, no sincronización en segundo plano ni cola de mutaciones. `campaignFetch`
aplica no-store y rechaza intentos offline/caída de red explícitamente.

Workbox serializa callbacks: el fallback usa una función autosuficiente, sin
helpers async externos, y `caches.match(..., {ignoreSearch:true})` para la clave
revisionada del precache. Se mantiene el precache público automático del plugin,
incluidos iconos y fallback, sin sustituirlo por un listado incompleto.

Actualización: skipWaiting=false; banner “Hay una actualización disponible”,
botón Actualizar, confirmación que advierte pérdida de formularios no enviados,
SKIP_WAITING solo después de confirmar, recarga una vez en controllerchange.
Logout desactiva suscripción de la sesión revocada; navegación completa descarta
estado privado en memoria, worker limpia posibles entradas privadas/avisos del SO.
Worker y BroadcastChannel emiten solo un evento sin identidad/secretos para que
otras pestañas de Campañas descarten también su estado privado al cerrar sesión.
Una página restaurada desde BFCache se recarga para revalidar identidad.

## Push y dispositivos

Firebase Messaging cliente + Admin FCM servidor, detrás de `PushDeliveryService`.
Solo `Notification.requestPermission()` tras clic contextual explícito.
Estados: activadas, desactivadas, permiso bloqueado, navegador no disponible y
entorno no configurado; guía específica iOS. Rechazar permiso nunca bloquea Avisos.
No se piden permisos al ingresar. Desactivación no cierra sesión y afecta solo a
este dispositivo. Si permiso está bloqueado pero existe suscripción, aún puede
desactivarse desde la UI.

`pushSubscriptions` server-only: token/hash, participantId derivado de cookie,
sessionRef hash privado, plataforma, enabled y timestamps. Token único por hash;
rotación desactiva tokens anteriores de la misma sesión, sin afectar otros
dispositivos. Un token de una identidad ajena vigente no se puede tomar. Logout,
caducidad, revocación, perfil inactivo o sessionVersion antiguo impiden entrega.
Una sesión ya inválida puede liberar el token para otra identidad de ese navegador.
Al consultar un dispositivo ya activado con permiso granted se refresca su token
sin volver a pedir permiso. Subscribe tiene límite individual 30/15 min.

Outbox `campaignNotificationOutbox` + ledger `campaignPushDeliveries`:
evento/dispositivo lógico determinístico (sessionRef, no token), lease 120 s,
fencing, máximo cinco intentos y backoff 1/2/4/8 minutos (cap 1 hora).
Tokens inválidos/no registrados se desactivan; errores guardan únicamente código
sanitizado. Dos dispatchers no reclaman simultáneamente el mismo dispositivo.
No hay log de tokens, cuerpos sensibles o errores externos completos.
`after()` de Next ejecuta hasta cuatro lotes de 50 eventos después de eventos
HTTP (publicación piloto de 40–80); dispatcher/job tienen lote acotado de 25 por
defecto/máximo 50. Job protegido recupera
pendientes. El aviso interno nunca se elimina por fallo de transporte.

FCM es best-effort: no se promete exactly-once físico entre servicios externos.
Una caída después de aceptación FCM pero antes del ack podría reintentar; eventId
y tag del worker consolidan el mismo aviso. No se duplican eventos internos ni
entregas ya confirmadas. Payload data-only genérico; worker vuelve a consultar
`notifications/push-event` con cookie antes de mostrar/abrir el aviso, evitando
que logout/login muestre información de otra identidad. Click reutiliza ventana
de Campañas o abre destino de la allowlist. No confianza en URL recibida por push.

## Recordatorios y job

`dispatchTurnReminders(now, options)` acepta reloj y adapter inyectados.
Ventana por defecto: 23–24 horas antes de inicio (lead=24 h, window=60 min).
Zona IANA: Campaign.timeZone si existe; CAMPAIGNS_TIME_ZONE; America/Santiago.
Se convierte fecha/hora de dominio a instante en zona explícita, con DST.
Hora ambigua o inexistente no se desplaza silenciosamente: se omite y se cuenta
en invalidTimes. Solo published, snapshot oficial actual, Assignment published
consistente, Registration active y Participant active. Draft/cancelled/históricos
no generan recordatorio. Clave campaign/assignment/person persiste cuando v2
conserva un turno; reemplazo nuevo tiene nueva clave. Dispatcher vuelve a validar
vigencia antes de enviar un recordatorio que quedó pendiente.

`POST /api/internal/campanas/turn-reminders`: Bearer de infraestructura,
CAMPAIGNS_NOTIFICATION_JOB_SECRET mínimo 32 caracteres, comparación constant-time,
body Zod strict `{}` de máximo 256 bytes, no reloj desde browser, lock 60 segundos,
private/no-store. Sin secreto responde 503; credencial inválida 401; carrera 429.
No es un endpoint participante/organizador ni admite cookie como autoridad.

**Scheduler productivo NO desplegado/NO activo.** No existe infraestructura cron
apropiada ya instalada. En F11/deploy configurar ejecución HTTPS del job cada
15 minutos (cumple ventana de 60 min); cada minuto si se desea recuperar push
pendiente más rápido. Nunca poner secreto en URL ni NEXT_PUBLIC; almacenarlo en
gestor de secretos de infraestructura. Observar resultados y no registrar headers.
No se ha creado cron, Cloud Function, secreto ni deploy productivo en esta fase.

## Seguridad y endpoints

Identidad cookie HttpOnly → DeviceSession → Participant activo. Zod strict,
Origin/CSRF para POST de participante, límite de cuerpo, private/no-store y Vary:
Cookie. Revalidación transaccional y no aceptación de participantId/sessionRef
del browser. Reglas Firestore cierran campaignNotifications, pushSubscriptions,
outbox, ledger y locks incluso al cliente Firebase con campaign_admin. Mantienen
cerrados Assignment, versiones, ChangeRequest y sesiones. Ningún guard/admin claim
se modifica; F2–F8 mantienen autenticación y autorización server-side anteriores.

- GET `/api/campanas/participant/notifications` (limit/cursor).
- POST `.../notifications/read` (one/all).
- GET `.../notifications/push-event` (ownership mínimo para worker).
- GET `.../push/status`; POST `.../push/subscribe`; POST `.../push/unsubscribe`.
- POST `/api/internal/campanas/turn-reminders` (solo infraestructura).

## Configuración pendiente para desarrollo real/deploy

Mantener variables Firebase públicas existentes (API_KEY, AUTH_DOMAIN, PROJECT_ID,
STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID), todas `NEXT_PUBLIC_FIREBASE_*`.
Agregar NEXT_PUBLIC_FIREBASE_VAPID_KEY de Firebase Console / Cloud Messaging / Web
Push certificates. VAPID pública no es el secreto de infraestructura; no generar
valores ficticios para declarar entrega real. Admin requiere credenciales/ADC de
desarrollo autorizadas para FCM y su API habilitada. Origen HTTPS permitido y
CAMPAIGNS_APP_ORIGIN exacto, AUTH_SECRET existente sin cambio.

CAMPAIGNS_TIME_ZONE=America/Santiago; NEXT_PUBLIC_CAMPAIGNS_TIME_ZONE puede
configurarse igual para el resumen Próximo turno. CAMPAIGNS_NOTIFICATION_JOB_SECRET
solo servidor/infraestructura. No se agregaron credenciales al repositorio.

## Validación y evidencia

`npm ci` ejecutado. Suites F2 12/12, F3 13/13, F4 20/20, F5 25/25, F6 51/51,
F7 64/64, F8 64/64: sin eliminar/relajar pruebas anteriores.
Nueva `npm run test:campaign-notifications-pwa`: 56/56, emuladores Auth/Firestore
locales + adapter. Cubre siete eventos, afectados, DTO/ownership, read one/all,
paginación, atomicidad, suscripción/rotación/multidispositivo, logout, PIN/expiry,
errores FCM, retries/concurrencia, reloj/zona/DST, recordatorios vigentes/idempotentes,
job, Rules, manifest/PNG y red caída/offline sin mutación exitosa.

Typecheck: únicamente cuatro Date/Timestamp históricos de Limpieza y dos imports
faltantes de Territorios. Build oficial: falla únicamente por esos dos imports
de Territorios. No se han reparado ni ocultado errores históricos.

La app QA aislada `tests/campaign-notifications-pwa/pwa-preview` usa configuración
next-pwa y componentes reales; excluye módulos ajenos que bloquean build, sin
alterar el build oficial, aliases falsos de Territorios o flags ignoreBuildErrors.
Compiló worker custom + Workbox + precache real; se inspeccionó NetworkOnly antes
de reglas genéricas, callbacks autosuficientes e iconos/fallback revisionados.
No se sustituye el worker de producción por los artefactos de esta app QA.

QA local navegador integrado, datos ficticios: ingreso, Inicio, próximo turno,
Avisos/publicación y sesión al navegar/recargar. Entorno sin VAPID muestra “No
configuradas en este entorno”, sin pedir permiso. Nueva versión del worker mostró
banner y confirmación antes de recargar; interacción final del diálogo nativo
pendiente por Mac bloqueado, no se declara aceptada/instalación standalone real.
En un origen local limpio se detuvo el servidor: navegación privada y API privada
mostraron fallback estático “Sin conexión”, sin programa/avisos cacheados.
Reanudación del servidor permite consultar otra vez. Mutaciones offline se prueban
también ejecutando el wrapper real con conexión caída y verificando cero éxito.

**Push pipeline implementado y testeado con adapter; entrega FCM real pendiente
de credenciales/entorno HTTPS.** QA físico Android (instalación/standalone/push click)
e iPhone/iPad no disponible: detección/UI/config testeadas, dispositivo real
pendiente no bloqueante. No se afirma push entregado, OS badge o cron productivo.

## Checkpoints y fuera de alcance

**Inspección visual de vista previa nativa de impresión en Mac: PENDIENTE.**
Issue #8 abierta; no se intentó resolver F7 mientras Mac continúa inaccesible.
Issue #10 abierta hasta revisión humana F9; PR #15 OPEN/Draft, sin merge.

**REVISAR ANTES DEL PILOTO — RATE LIMITS AUTH:** 30 registros / 15 minutos,
120 logins / 15 minutos, sin cambios. 40–80 altas concentradas pueden superar el
límite de registro. Configuración scheduler y entrega real se documentan para
deploy, no se agregan bloqueadores a la definición congelada de F9.

Fuera de alcance: F10/11 implementadas, PWA offline completa, colas de escrituras,
auto-reemplazo, ranking, auto-pair, selección de reservas/algoritmos, modificación
de snapshots históricos, active/completed o despliegue productivo.

## Archivos de esta fase

Lista completa; no incluye artefactos generados de la app QA ni secretos.
Los SW compilados históricos se conservan sin cambios: los nuevos se generan
durante build a partir de next.config.ts y worker/index.js.

- `docs/campanas/DECISIONS_LOG.md`
- `docs/campanas/PHASE_9_PWA_NOTIFICATIONS.md`
- `firestore.rules`
- `next.config.ts`
- `package.json`
- `public/campanas-icon-192.png`
- `public/campanas-icon-512.png`
- `public/campanas-icon-maskable.png`
- `public/campanas-icon.svg`
- `public/campanas-offline.html`
- `public/campanas.webmanifest`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/approve/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/reject/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/change-requests/[id]/resolve/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/publish/route.ts`
- `src/app/api/campanas/participant/campaigns/[campaignId]/pair-requests/route.ts`
- `src/app/api/campanas/participant/notifications/push-event/route.ts`
- `src/app/api/campanas/participant/notifications/read/route.ts`
- `src/app/api/campanas/participant/notifications/route.ts`
- `src/app/api/campanas/participant/push/status/route.ts`
- `src/app/api/campanas/participant/push/subscribe/route.ts`
- `src/app/api/campanas/participant/push/unsubscribe/route.ts`
- `src/app/api/internal/campanas/turn-reminders/route.ts`
- `src/app/campanas/avisos/page.tsx`
- `src/app/campanas/layout.tsx`
- `src/app/campanas/page.tsx`
- `src/modules/campaigns/components/admin-dashboard.tsx`
- `src/modules/campaigns/components/availability-form.tsx`
- `src/modules/campaigns/components/campaign-changes.tsx`
- `src/modules/campaigns/components/campaign-planner.tsx`
- `src/modules/campaigns/components/campaign-program.tsx`
- `src/modules/campaigns/components/campaign-pwa.tsx`
- `src/modules/campaigns/components/campaign-status-controls.tsx`
- `src/modules/campaigns/components/next-turn.tsx`
- `src/modules/campaigns/components/notification-center.tsx`
- `src/modules/campaigns/components/pair-inbox.tsx`
- `src/modules/campaigns/components/pair-requests.tsx`
- `src/modules/campaigns/components/participant-auth-form.tsx`
- `src/modules/campaigns/components/participant-campaigns.tsx`
- `src/modules/campaigns/components/participant-change-requests.tsx`
- `src/modules/campaigns/components/participant-navigation.tsx`
- `src/modules/campaigns/components/participant-session.tsx`
- `src/modules/campaigns/components/personal-program.tsx`
- `src/modules/campaigns/components/push-settings.tsx`
- `src/modules/campaigns/domain/change-request.ts`
- `src/modules/campaigns/domain/notification.ts`
- `src/modules/campaigns/lib/campaign-fetch.ts`
- `src/modules/campaigns/lib/pwa-support.ts`
- `src/modules/campaigns/server/auth/service.ts`
- `src/modules/campaigns/server/change-notifications.ts`
- `src/modules/campaigns/server/notification-center.ts`
- `src/modules/campaigns/server/notification-events.ts`
- `src/modules/campaigns/server/pair-request-service.ts`
- `src/modules/campaigns/server/program-service.ts`
- `src/modules/campaigns/server/push-delivery.ts`
- `src/modules/campaigns/server/push-dispatch-after.ts`
- `src/modules/campaigns/server/push-subscriptions.ts`
- `src/modules/campaigns/server/turn-reminders.ts`
- `tests/campaign-notifications-pwa/README.md`
- `tests/campaign-notifications-pwa/integration.test.ts`
- `tests/campaign-notifications-pwa/offline.test.ts`
- `tests/campaign-notifications-pwa/pwa-preview/.gitignore`
- `tests/campaign-notifications-pwa/pwa-preview/app/campanas/avisos/page.js`
- `tests/campaign-notifications-pwa/pwa-preview/app/campanas/ingresar/page.js`
- `tests/campaign-notifications-pwa/pwa-preview/app/campanas/mi-programa/page.js`
- `tests/campaign-notifications-pwa/pwa-preview/app/campanas/page.js`
- `tests/campaign-notifications-pwa/pwa-preview/app/layout.js`
- `tests/campaign-notifications-pwa/pwa-preview/next.config.ts`
- `tests/campaign-notifications-pwa/pwa-preview/postcss.config.mjs`
- `tests/campaign-notifications-pwa/pwa-preview/tailwind.config.ts`
- `tests/campaign-notifications-pwa/pwa-preview/tsconfig.json`
- `worker/index.js`
