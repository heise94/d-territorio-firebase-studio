# Fase 11 — Preparación de infraestructura y lanzamiento

## Actualización vigente — F11C

Las secciones F11/F11B siguientes son evidencia histórica. La configuración cloud
autorizada y comprobada posteriormente está en
[PHASE_11C_CLOUD_CONFIGURATION.md](./PHASE_11C_CLOUD_CONFIGURATION.md): proyectos
Campañas dedicados, staging HTTPS real PASS y producción aislada HTTPS PASS.
DNS/VAPID y QA físicos siguen pendientes; no hay lanzamiento general aprobado.
No se tocó el Firebase principal, no se abrió campaña real ni se avanzó a F12.

## Estado y evidencia

Base verificada: `f725e41f55972cd45238c32ccbf3e109dc196df0`, rama `feature/campanas-v1`.
**F11 INCOMPLETA: preparación local; STAGING DEPLOY PENDING EXTERNAL.**
**NO-GO DEPLOY PRODUCTIVO / NO-GO LANZAMIENTO GENERAL.**
No se desplegó, creó backend/proyecto, cambió facturación/DNS, abrió inscripción,
envió push real, provisionó un organizador real ni restauró datos reales.
No merge, no main, no F12. Issues #8/#11/#12 no se cierran.

Existe sesión legítima Firebase CLI. `projects:list` reconoce `d-territorio-v2`,
pero ese nombre NO prueba que sea producción. La consulta de backends allí
falló: requiere Blaze para habilitar `firebaseapphosting.googleapis.com`.
No se autoriza facturación por inferencia. Se solicitó confirmar IDs staging/prod.
No hay `.firebaserc`, configuración GitHub Actions ni proyectos predeterminados
versionados. `gcloud` no está disponible en este entorno.

| Recurso | Staging | Producción |
| --- | --- | --- |
| Firebase project ID | PENDIENTE confirmación humana | PENDIENTE confirmación humana |
| App Hosting backend / región | PENDIENTE | PENDIENTE |
| URL HTTPS / certificado | PENDIENTE | `campanas.d-territorio.cl`, previsto, no verificado |
| Firestore/Auth/FCM | independientes, pendientes | independientes, pendientes |
| Database | confirmar `(default)` | confirmar `(default)` |
| Secrets / scheduler / backup | PENDIENTE | PENDIENTE |

## Hosting y aislamiento

Se conserva **Firebase App Hosting** y `maxInstances: 1`, sin cambio de costos
ni proveedor. Plantillas `apphosting.staging.yaml`/`apphosting.production.yaml`
seleccionadas mediante environment name del backend. Cada backend vive en un
proyecto distinto y conserva sus propios Auth/Firestore/FCM/Secret Manager.
No copiar claves/tokens ni secretos de staging a producción.
El backend staging usa `feature/campanas-v1`; desactivar automatic rollouts antes
de conectarlo. Producción no debe conectarse con rollout automático a esta rama.
No conectar estas plantillas al backend del sistema principal sin revisar impacto.
Si la política exige merge: **Se requiere aprobación explícita para merge**.

`apphosting.yaml` referencia nombres de Secret Manager, nunca valores reales.
No está listo para desplegar sin provisionar los secretos legítimos y confirmar
proyectos/orígenes. Dar acceso solo al service account del backend elegido.
Admin usa ADC del runtime; no necesita una clave privada exportada en App Hosting.
Public Firebase config se obtiene de la web app del mismo proyecto. Configurar
Auth authorized domains para el origen legítimo, no wildcard.
El build público contiene configuración Firebase/VAPID pública, NO auth/job secrets.

`.env.example` contiene nombres vacíos y defaults seguros, sin credenciales.
`check:campaign-deployment` valida sin imprimir valores: HTTPS exacto, secretos
de 32+ caracteres, proyecto cliente/Admin concordante, separación staging/prod,
sin emuladores, zona horaria concordante y límites finitos.
Se valida de nuevo antes de acceder a Firebase Admin en runtime producción.
No hay fallback de secreto ni credenciales ficticias para declarar readiness.
Auth defaults: **160 registros / 240 logins / 15 minutos**, individuales intactos.

VAPID: registrar clave legítima de Web Push de cada proyecto. Si se decide no
habilitar push en una etapa, omitir el secret VAPID de la configuración de ese
backend y documentar la autorización humana de usar Avisos. No inventar VAPID.

## Ruteo / DNS / HTTPS

Ruteo opt-in `CAMPAIGNS_HOST_ROUTING=true`: únicamente `/` en hostname del
`CAMPAIGNS_APP_ORIGIN` redirige a `/campanas`. Otros hosts no cambian.
`/?adminLogin=1` conserva el login Firebase administrativo existente, y el guard
Campañas redirige a esa entrada. Tras login existente, acceder a `/campanas/admin`.
No cambiar MANAGE_CAMPAIGNS, campaign_admin ni autorización server-side.
Se conservan `/dashboard`, `/forgot-password`, APIs y assets requeridos por admin;
el host no concede permisos. Revisar esas dependencias en smoke HTTPS, no bloquear
rutas globales a ciegas. APIs privadas conservan controles token/cookie/Origin/Rules.

DNS real pendiente. En Firebase Console → App Hosting → backend CONFIRMADO →
Settings → Domains → Add custom domain `campanas.d-territorio.cl`:
1. Copiar **exactamente** cada nombre/tipo/valor mostrado por el wizard.
2. Entregar esa lista al administrador DNS y conservar evidencia sin secretos.
3. Cambiar solo registros para ese subdominio/verificación mostrada.
4. Esperar verificación/certificado; comprobar resolución, HTTPS, HTTP→HTTPS,
   origin, cookies Secure y scope SW desde el dominio real.
No hay IP/CNAME de destino inventado: los registros exactos solo existen cuando
se haya creado/identificado el backend. No tocar MX/SPF/DKIM/DMARC, root ni otros
subdominios. Si el wizard pide un cambio fuera del subdominio, detener y consultar.

## Rules e índices

Rules actuales conservadas, sin apertura de colecciones privadas. Usar
`firebase.campaign-deployment.json`, que solo declara Firestore, y proyecto
explícito. Las pruebas de emulador NO equivalen a Rules staging desplegadas.
Antes de deploy descargar la versión ACTUAL del proyecto desde Firebase Console
Firestore → Rules → historial, guardarla en ubicación privada y registrar release,
fecha, project/database y hash. La versión de Git no sustituye esta copia real.

Tras confirmar staging y revisión de su Rules anterior:

```sh
firebase deploy --project "$CAMPAIGNS_STAGING_PROJECT_ID" --config firebase.campaign-deployment.json --only firestore:rules,firestore:indexes
```

Ese comando solo se ejecuta con variable explícita validada, nunca alias/default.
Probar participante aislado, organizador válido/sin claim, versiones/asignaciones,
ChangeRequest/Notifications/PushSubscription/sesiones y campaña completed.
No desplegar producción antes de staging PASS y copia previa productiva.
Índices existentes: campaignDays/timeBlocks/points `(campaignId ASC, sortOrder ASC)`.
Ningún índice nuevo especulativo. Si staging da FAILED_PRECONDITION, revisar consulta
y registrar el índice realmente requerido antes de incorporarlo.

## Provisioning y datos iniciales

El operador debe disponer de ADC legítimas con permiso Auth sobre proyecto explícito.
Crear/verificar cuenta Auth activa por canal seguro; nunca hardcodear UID/email.

```sh
npm run provision:campaign-organizer -- --project "$CAMPAIGNS_STAGING_PROJECT_ID" --uid "$CAMPAIGNS_ORGANIZER_UID"
npm run provision:campaign-organizer -- --project "$CAMPAIGNS_STAGING_PROJECT_ID" --uid "$CAMPAIGNS_ORGANIZER_UID" --apply --confirm-project "$CAMPAIGNS_STAGING_PROJECT_ID"
```

Primera ejecución es dry-run. Segunda requiere confirmación exacta del proyecto,
conserva otros claims, comprueba cuenta activa y relee claim después. El usuario
debe renovar ID token (`getIdToken(true)` o cerrar/abrir sesión). Ejecutar con
ventana exclusiva de gestión de claims: Auth no ofrece CAS para custom claims.
No dar privilegios desde browser ni usar credenciales del CLI como claves exportadas.

Producción: configuración manual desde panel existente, inicialmente **draft**:
nombre, ubicación, descripción, cuatro congregaciones, fechas, bloques, capacidad
y puntos reales revisados. No abrir automáticamente ni importar fixture/demo.
Los seeds piloto siguen exclusivos de `demo-campaign-auth` + ambos emuladores
localhost; rechazan NODE_ENV production/CAMPAIGNS_ENV y no admiten fallback remoto.
Para staging real introducir datos sintéticos por el panel; no usar seed destructivo.

## Scheduler seguro

Pendiente, no ejecutado. Tras staging HTTPS y secretos legítimos:
1. Cloud Console → Cloud Scheduler → Create job, proyecto staging CONFIRMADO,
   región elegida con el backend, nombre `campaign-turn-reminders-staging`.
2. Frecuencia `*/15 * * * *`, timezone `America/Santiago`.
3. HTTP POST a **origin exacto** + `/api/internal/campanas/turn-reminders`.
4. Header `Content-Type: application/json`; body `{}`.
5. Header `Authorization: Bearer <valor legítimo de CAMPAIGNS_NOTIFICATION_JOB_SECRET>`.
   Introducirlo de forma privada; jamás URL, Git, captura, terminal/log o NEXT_PUBLIC.
6. Limitar IAM sobre Scheduler (su configuración contiene el header) y Secret
   Manager; retries limitados (3), backoff mínimo 60 s; lock e idempotencia existentes.
7. Test manual solo sobre datos sintéticos autorizados; comprobar 200, rechazo
   401 sin bearer, 503 sin configuración, 429 lock y contadores sin secretos.
8. Producción usa OTRO job/secret/proyecto/origin, inicialmente pausado hasta
   autorización humana. No usar OIDC como sustituto del bearer compartido sin
   modificar y probar explícitamente el contrato existente.

FCM real: pendiente subscribe → background → click → assignment changed → logout
→ unsubscribe en Android/Chrome HTTPS, dispositivos sintéticos voluntarios.
No enviar mensajes a participantes reales durante esta preparación.

## Backup y restore

Managed export completo de Firestore a bucket **privado**, mismo proyecto/lugar
compatible, IAM mínimo, retención acordada y presupuesto Blaze autorizado.
Export completo incluye configuración y colecciones internas sin olvidar
participants, campaignRegistrations, availabilities, pairRequests,
campaignAssignments, campaignProgramVersions, changeRequests, campaignNotifications,
pushSubscriptions, deviceSessions, locks, outbox, auditLogs y auth rate-limit/private
indexes. Confirmar listado real antes de primer backup; no excluir colecciones por
usar solo nombres de dominio. Datos Auth/custom claims de Firebase Auth no son
export Firestore: mantener recuperación de organizadores por procedimiento separado.

Desde Cloud Shell autorizado (gcloud no disponible localmente):

```sh
gcloud firestore export "$CAMPAIGNS_BACKUP_URI" --project "$CAMPAIGNS_PRODUCTION_PROJECT_ID" --database='(default)'
gcloud firestore operations list --project "$CAMPAIGNS_PRODUCTION_PROJECT_ID"
```

URI = prefijo único `gs://BUCKET_PRIVADO/FECHA_SHA/`; ninguna persona/dato en Git.
Export lee documentos y puede generar costos: aprobación previa. Registrar operación
DONE, objetos/metadata, región y responsable. Programar export diario durante campaña
y antes de Rules/modelo/release de riesgo; programación efectiva pendiente.

Restore de prueba SOLO de **backup sintético staging** hacia proyecto/database
staging de recuperación vacío, explícito y diferente de producción:

```sh
gcloud firestore import "$CAMPAIGNS_SYNTHETIC_EXPORT_URI" --project "$CAMPAIGNS_RESTORE_STAGING_PROJECT_ID" --database='(default)'
```

Confirmar destino con lectura previa y revisar prefijo manifest exacto devuelto por
export. No borrar datos para vaciar un staging usado. No copiar PII productiva a QA
ordinario. Import puede sobrescribir IDs; requiere autorización del destino vacío.
Verificar conteos/referencias/versiones/claims independientes y PDF snapshots;
registrar fecha/operación/resultados. **RESTORE TEST PENDING EXTERNAL**, no realizado.
PDF por ProgramVersion es respaldo operacional adicional, nunca reemplazo de export.
**No destructive migration required** para estos cambios F11; no mutación de modelo.

## Observabilidad, health y rollback

Logs estructurados mínimos por área/status y conteos push: auth 429 agregables,
backend 5xx, publicación fallida, resolución ChangeRequest fallida, delivery y job.
Sin Error/message arbitrario, body, PIN/hash, cookie/session/FCM tokens, teléfono,
UID o comentarios. Cloud Logging filtro `jsonPayload.component="campaigns"`,
agrupar por area/status; alertas 5xx sostenidos y 429 sostenidos, fallos push/job.
Cloud Run/App Hosting request logs sirven para latencia/5xx y eventos no capturados;
no activar logging de headers/body y limitar IAM/retención.
Umbrales iniciales a confirmar con piloto: 5xx >1%/5 min con al menos 20 requests;
job sin éxito >30 min; 429 sostenidos requieren revisar sin bajar seguridad.
La configuración efectiva de alertas está **PENDING EXTERNAL**.

`GET /api/campanas/health`: no-store, 200/503 por validación de configuración,
environment, SHA40 válido o null, deployedAt válido o null; no IDs/nombres/secrets.
No promete comprobar conectividad, IAM, Rules, FCM ni certificado.
Configurar `CAMPAIGNS_BUILD_SHA` y `CAMPAIGNS_DEPLOYED_AT` en release real; no
inventar fecha/SHA. Contrastar con commit del rollout y registrar evidencia operativa.

Rollback código exacto: Firebase Console → App Hosting → backend confirmado →
Rollouts → seleccionar último rollout **realmente estable y probado** → Roll back
(instant rollback si artefacto vigente), verificar proyecto/commit/config antes de
confirmar. Si expiró, crear rollout/rebuild apuntando a ese SHA explícito, sin merge.
Primero pausar apertura y pedir a organizadores detener mutaciones; después health,
login/mi-programa/PDF. No borrar Assignment ni restaurar Firestore automáticamente.
`f725e41...` es base técnica, NO un rollout estable comprobado.

Rollback Rules: Firestore Console → Rules → historial → versión previamente guardada
del MISMO project/database → revisar contenido → publicar esa versión. Alternativa
CLI: archivo privado verificado como rules de config privada, `firebase deploy
--project PROJECT_CONFIRMADO --config CONFIG_PRIVADA --only firestore:rules`.
No usar `git checkout` de Rules como sustituto de evidencia de lo desplegado.
Última release estable y copia Rules real: **PENDING EXTERNAL**.

## QA, seguridad de dependencias y cierre

Ejecutar npm ci, F2–F10 sin relajarlos, suite deployment, typecheck, build y ambos
audits. Resultados definitivos se registran tras ejecutar, no inferidos por snippets.
Se corrigieron mínimamente cuatro Date/Timestamp de Limpieza y dos imports de
Territorios existentes; no exclusiones/ignoreBuildErrors. Next actualizado dentro
de major 15; transitivas compatibles de seguridad actualizadas sin `audit fix --force`.
Detalle audit y resultados: sección de validación al final de este documento.

Smoke staging HTTPS pendiente: registro/login/Availability/PairRequest/Mi programa/
Avisos/ChangeRequest/logout, admin config/cobertura/planner/publicación/cambios/PDF,
manifest/SW/cookies/CSRF/offline; dos organizadores con planner/slot/publicación/
resolución simultáneos. No confundir carreras de emulador con QA real HTTPS.
Android **PENDING EXTERNAL — BLOCKS GENERAL LAUNCH**; iOS/FCM/tres perfiles pendientes.
Inspección visual de vista previa nativa de impresión en Mac: **PENDIENTE F7**.
F10-M01 MEDIUM/F12 y warnings LOW/F12 preservados sin implementación.
Checklist y apertura gradual: [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md).

## Fuentes oficiales de operación

- [App Hosting configuración](https://firebase.google.com/docs/app-hosting/configure)
- [Entornos separados](https://firebase.google.com/docs/app-hosting/multiple-environments)
- [Dominio: registros del wizard](https://firebase.google.com/docs/app-hosting/custom-domain)
- [Rollouts y rollback](https://firebase.google.com/docs/app-hosting/rollouts)
- [Firestore export/import](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Next seguridad](https://github.com/vercel/next.js/security/advisories)

## Auditoría de dependencias — resultado del lock final

| Consulta | Antes | Después |
| --- | --- | --- |
| npm audit total | 82: 6 LOW / 34 MODERATE / 38 HIGH / 4 CRITICAL | 66: 6 LOW / 32 MODERATE / 28 HIGH / 0 CRITICAL |
| npm audit --omit=dev | 64: 3 LOW / 28 MODERATE / 30 HIGH / 3 CRITICAL | 51: 3 LOW / 27 MODERATE / 21 HIGH / 0 CRITICAL |

Audit devuelve exit 1 mientras haya alertas: no se interpreta como PASS limpio.
Se corrigieron Next 15.2.3→15.5.27, Handlebars 4.7.8→4.7.9,
websocket-driver 0.7.4→0.7.5, grpc-js raíz→1.14.5; y versiones compatibles de
express/lodash/fast-uri/nanoid/minimatch/brace-expansion/browserslist/rollup y otras
transitivas según lock. form-data/axios/js-yaml/adm-zip se actualizaron también
dentro de los rangos existentes, eliminando el último CRITICAL dev. Sin force.

**Clasificación: omit=dev NO equivale a código ejecutado en producción.**

- Build/postinstall instalados como dependencies: next-pwa/workbox/serialize-javascript,
  braces/micromatch/chokidar/fast-glob, find-yarn-workspace-root/patch-package/tmp,
  tailwindcss/animate y PostCSS. Procesan assets/config del repositorio, no un
  body participante como CSS/patrón. Alertas transitivas HIGH siguen en lock;
  no se resolvieron con downgrades sugeridos de PWA 10→6 o Genkit CLI→0.0.2.
- Runtime transitivo Firebase: grpc-js 1.9.16 anidado sigue fijado por Firebase
  a `~1.9.0`, propagando alertas a firebase/firestore/compat/tanstack. Admin usa
  raíz 1.14.5 corregida. No hay servidor gRPC propio ni autenticación con
  `getAuthContext` en el código Campañas. No forzar reemplazo fuera del rango.
- Runtime AI/Genkit: SDK OpenTelemetry 0.52.1 y propagator-jaeger 1.25.1 siguen
  transitivos. La solución disponible implica SDK mayor/incompatible con rangos
  actuales, no una actualización compatible que npm update pudiera instalar.
  No consta Jaeger como propagador activo ni exporter Prometheus HTTP expuesto
  en la configuración versionada; esto NO acredita configuración real del cloud.
  No se declara eliminado el riesgo por simplemente ser ajeno a Campañas.
- Dev-only adicionales: Genkit CLI/telemetry tools, tRPC y tooling de tests/CLI.
  No forman endpoint PWA productivo; no exponer esos servidores en App Hosting.
  El total audit incluye estos paquetes y las mismas transitivas repetidas.

Inferencia de alcance limitada al código/config inspeccionados: los riesgos opt-in
de OpenTelemetry y gRPC no son explotabilidad demostrada del flujo participante.
Las configuraciones productivas aún desconocidas impiden certificar ausencia de
HIGH runtime relevantes: **NO-GO DEPLOY PRODUCTIVO** hasta revisión/mitigación o
upgrade compatible validado, además de los pendientes de infraestructura.
Fuentes primarias: [Jaeger opt-in](https://github.com/open-telemetry/opentelemetry-js/security/advisories/GHSA-45rx-2jwx-cxfr),
[gRPC server auth context](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j).

## Validación técnica ejecutada

Node 24.19.0 y emuladores Auth/Firestore locales con project `demo-campaign-auth`.
`npm ci`: PASS. Suites existentes sin eliminar ni relajar pruebas:

| Fase | Suite | Resultado |
| --- | --- | --- |
| F2 | campaign-auth | 12/12 PASS |
| F3 | campaign-registration | 13/13 PASS |
| F4 | campaign-pair-requests | 20/20 PASS |
| F5 | campaign-admin-dashboard | 25/25 PASS |
| F6 | campaign-planner | 51/51 PASS |
| F7 | campaign-program | 64/64 PASS |
| F8 | campaign-changes | 64/64 PASS |
| F9 | campaign-notifications-pwa | 56/56 PASS |
| F10 | campaign-pilot | 12/12 PASS |
| F11 | campaign-deployment | 15/15 PASS |

**332/332 PASS**, cero skipped en la corrida final secuencial tras npm ci.
Una corrida inicial de F6/F7 falló por exportar origin localhost:3000 cuando
sus requests esperan localhost sin puerto; se corrigió el entorno de ejecución,
no las pruebas ni CSRF. La corrida final completa pasó sin esa variable externa.
`typecheck`: PASS, cero errores, incluidos los históricos autorizados corregidos.
`build`: PASS, exit 0, sin ignoreBuildErrors/excludes. Mantiene warnings de
bundling AI/Genkit (exporter-jaeger opcional ausente y require.extensions de
Handlebars), no errores nuevos de Campañas. No se instala un SDK incompatible
para silenciar estos warnings.

Smoke del servidor local de build productivo en 127.0.0.1:3142: `/campanas` 200
con no-store, manifest 200, health 503/private/no-store con environment unconfigured
y metadatos null. Preflight real `check:campaign-deployment`: exit 1 esperado por
configuración legítima ausente, imprime solo nombres inválidos. No se inventaron
credenciales para convertirlo a PASS. Estos resultados NO son smoke staging HTTPS.
Archivos SW/workbox/worker generados al build se restauraron/retiraron; reproducibles
con build, ningún dato real eliminado. Rules e índices no modificados.

## Archivos de preparación

- `.env.example`, `.gitignore`, `apphosting.yaml`, `apphosting.staging.yaml`, `apphosting.production.yaml`.
- `firebase.campaign-deployment.json`, `next.config.ts`, `package.json`, `package-lock.json`.
- `scripts/campaign-deployment-check.ts`, `scripts/campaign-organizer-provision.ts`.
- `src/modules/campaigns/lib/deployment.ts`, `demo-environment.ts`.
- `src/modules/campaigns/server/operational-log.ts`, `firebase-admin.ts`, `participant-http.ts`, `admin-dashboard-http.ts`, `push-delivery.ts`.
- `src/app/api/campanas/health/route.ts`, auth/[action], publicación, resolución ChangeRequest y job turn-reminders.
- `src/app/campanas/admin/layout.tsx`: solo destino del login, permisos conservados.
- `src/app/(app)/cleaning/program/page.tsx`, `src/app/(app)/territorios/asignaciones/page.tsx`: seis reparaciones mínimas autorizadas.
- `tests/campaign-deployment/deployment.test.ts`, `tests/campaign-pilot/fixture.ts`: guard local reforzado, aserciones F2–F10 intactas.
- `docs/campanas/PHASE_11_DEPLOYMENT_LAUNCH.md`, `LAUNCH_CHECKLIST.md`, `DEPLOYMENT_GUIDE.md`, `DECISIONS_LOG.md`.

## F11B — Cloud readiness verification

Verificación de solo lectura, 2026-10-05, base exacta
`f03dd99c6db021d386a408721889e8b62cbe13d6`. **F11 continúa INCOMPLETA**.
No cambios de código/dependencias, APIs, facturación, DNS, proyectos, Rules,
secretos cloud, cuentas reales, campañas reales ni recursos de producción.
No merge, no F12; Issues #8/#11/#12 permanecen abiertas.

### Autenticación y método seguro

Firebase CLI autenticada: `projects:list` respondió correctamente. Solo se emitieron
IDs/nombres/números/estado; NO se repitió `login:list`, que devuelve tokens.
La consulta ordinaria `apphosting:backends:list` del CLI 14.17.0 incorpora
`ensureApiEnabled`; por eso no se utilizó para inventariar F11B.
Se usaron endpoints oficiales GET con la sesión legítima del CLI en memoria,
sin imprimir/persistir tokens, respuestas crudas ni headers. Se filtró únicamente
metadata solicitada. No se ejecutaron métodos de habilitación de servicios.

**Reautenticación Firebase CLI requerida.** La renovación OAuth interactiva necesita
navegador/consentimiento humano. No se revocó silenciosamente la cuenta ni se
confundió un access token aún válido con revocación de la sesión anteriormente
expuesta. El usuario debe renovar de forma privada (`firebase login --reauth`,
sin `--debug`, sin compartir salida/códigos/tokens) y revisar/revocar la sesión
anterior desde seguridad de su cuenta Google. Este paso no bloquea las consultas
de metadata ya efectuadas; sí queda pendiente para volver a operar con confianza.

### Inventario Firebase y evidencia de entorno

Todos ACTIVE; Cloud Billing devolvió HTTP 200 con `billingEnabled=false` en los ocho.
Esto verifica que no hay facturación habilitada en el momento de la consulta,
no su historial ni el plan pasado. `API enabled` tampoco implica despliegue viable.

| Proyecto / display name / número | Posible rol | Blaze/App Hosting | Evidencia |
| --- | --- | --- | --- |
| app-trans-heise-2026 / app Trans Heise 2026 / 22675968899 | Sin vínculo D-Territorio acreditado | Billing off, API DISABLED | Backend list 403 SERVICE_DISABLED |
| boxplanner / Agenda Neuro / 326759877717 | Sin vínculo D-Territorio acreditado | Billing off, API ENABLED | Lista backend studio/us-central1; detalle 403, URL hosted.app 404 |
| d-territorio-v2 / D-territorio-V2 / 196689422029 | Candidato por nombre, rol NO confirmado | Billing off, API DISABLED | WebApps sin entradas; Hosting default site, web.app 404 |
| edutrack-lite-gzmzy / EduTrackLite / 732365288083 | Sin vínculo D-Territorio acreditado | Billing off, API DISABLED | Sin WebApps registradas; ningún rol Campañas confirmado |
| studio-1631504953-985c2 / Firebase app / 838678055961 | Rol desconocido | Billing off, API DISABLED | WebApp registrada; Hosting web.app 404 |
| studio-2080457768-80bac / Firebase app / 435990920417 | Rol desconocido | Billing off, API DISABLED | WebApp registrada; Hosting web.app 404 |
| studio-4254178211-20e43 / Firebase app / 769493333492 | **Sitio principal D-Territorio acreditado**; Campañas por confirmar | Billing off, API ENABLED | Hosting web.app 200/title D-TERRITORIO; dominio d-territorio.cl HOST_ACTIVE/OWNERSHIP_ACTIVE |
| studio-7963169270-96256 / Firebase app / 878967730806 | Rol desconocido | Billing off, API DISABLED | WebApp registrada; Hosting web.app 404 |

Evidencia especialmente relevante: `studio-4254178211-20e43` está vinculado al
dominio principal **d-territorio.cl**, según GET de customDomains de Firebase Hosting.
Eso identifica el sistema existente, NO autoriza adoptarlo como producción Campañas
ni publicar Rules que puedan afectarlo. No usarlo como staging por inferencia.
Un 404 y/o ausencia de WebApp NO demuestran que Firestore esté vacío o no tenga
datos reales; no se enumeraron documentos de participantes para deducir ese rol.

```text
DEVELOPMENT: demo-campaign-auth + Auth/Firestore localhost (confirmado).
STAGING: REQUIERE CONFIRMACIÓN HUMANA; ningún proyecto aislado acreditado.
PRODUCTION (Campañas): REQUIERE CONFIRMACIÓN HUMANA.
Sistema principal existente: studio-4254178211-20e43, dominio d-territorio.cl activo.
```

Hay proyectos accesibles adicionales, pero no evidencia de un par separado
staging/production de Campañas. Si ninguno es autorizado para staging, se necesita
crear un proyecto separado, solo con autorización explícita. No se crea ni se
elige arbitrariamente. Validator existente sigue rechazando staging === production.

### Blaze y App Hosting

Los dos backends listables se llaman `studio`, región `us-central1`:

- `boxplanner`: `studio--boxplanner.us-central1.hosted.app` → 404.
- `studio-4254178211-20e43`: `studio--studio-4254178211-20e43.us-central1.hosted.app` → 404.

GET backend individual/builds/rollouts devuelve 403 PERMISSION_DENIED; sus errores
mencionan billing deshabilitado. No se puede acreditar estado saludable, repository,
branch, environment, rollout SHA, runtime service account ni configuración env.
No se confunden esos endpoints con el sitio **Firebase Hosting** principal, que sí
responde 200. No se disparó build/release ni rollout automático.

Para cualquiera de los candidatos, la intervención requerida es:

```text
Proyecto: el ID staging que confirme el usuario (ninguno elegido aún).
Acción necesaria: autorizar/habilitar Blaze y asociar billing legítimo SOLO allí.
Consola: https://console.firebase.google.com/project/PROJECT_ID/usage/details
Motivo: App Hosting requiere Blaze; billingEnabled=false, endpoints bloqueados.
Impacto/costo esperado: pago por consumo por encima de cuotas gratuitas;
Cloud Run, builds, bandwidth, Artifact Registry, Secret Manager y otros servicios.
No es promesa de gratuidad; configurar presupuesto/alertas y revisar costos antes.
```

Accesos de consola verificables para los candidatos más relevantes:
[sitio principal](https://console.firebase.google.com/project/studio-4254178211-20e43/usage/details),
[d-territorio-v2](https://console.firebase.google.com/project/d-territorio-v2/usage/details).
No se pide habilitar Blaze en producción en F11B ni reutilizar backend principal.
[Firebase: costos y requisito Blaze](https://firebase.google.com/docs/app-hosting/costs).

### Secrets / ADC / Rules / staging

Secret Manager API DISABLED en d-territorio-v2, studio-1631504953-985c2,
studio-2080457768-80bac y studio-7963169270-96256. En studio-4254178211-20e43 está
ENABLED, pero listar metadata devuelve 403 y el error menciona billing.
No se accedió a ninguna versión/valor secreto. **No verificado no significa ausente**.

Nombres requeridos que deben verificarse/provisionarse en el staging elegido:

- CAMPAIGNS_AUTH_SECRET
- CAMPAIGNS_NOTIFICATION_JOB_SECRET
- FIREBASE_ADMIN_PROJECT_ID
- CAMPAIGNS_STAGING_PROJECT_ID
- CAMPAIGNS_PRODUCTION_PROJECT_ID
- CAMPAIGNS_APP_ORIGIN
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_VAPID_KEY (FCM; no bloquea el resto si se decide usar Avisos)

CAMPAIGNS_ENV usa overlay staging/production; origen y Firebase público deben salir
del backend/web app confirmados, NO valores inventados. Timezone server/client
America/Santiago y auth 160/240 están en la configuración versionada. Secretos
random no generados: falta confirmar destino. Después de confirmación y permisos,
pueden generarse CSPRNG y guardarse directamente, sin mostrar valores.
ADC runtime preferido, sin JSON descargado; identidad/IAM runtime **PENDING** hasta
backend staging verificable. Sesión CLI no demuestra ADC runtime ni autorización
Firebase Admin funcional de un proyecto aún no elegido.

Preflight local `check:campaign-deployment`: exit 1 esperado, ready=false por
variables/proyectos/secretos ausentes en este entorno. Solo nombres emitidos.
No se usaron fixtures para convertir readiness real a PASS.
Rules/indexes locales presentes e intactos. No se descargaron Rules reales a Git,
no hay copia de rollback verificada del staging aún desconocido, no se desplegaron
Rules/indexes. Orden posterior: confirmar destino → Blaze/permisos → snapshot privado
Rules anterior → secretos/ADC → preflight PASS → deploy explícito solo staging →
smoke permisos → backend/rollout staging con SHA explícito y sin automatic rollout.

**STAGING DEPLOY PENDING EXTERNAL**. Sin URL staging verificada, smoke HTTPS,
FCM ni Scheduler staging. No usar `d-territorio.cl` como URL de smoke Campañas.
FCM PENDING EXTERNAL; Scheduler producción prohibido, staging pendiente con job
cada 15 min conforme runbook previo. DNS/facturación no modificados.

### Security audit — causas raíz, no conteo de paquetes propagados

`npm audit --json`: 66 (6 LOW, 32 MODERATE, 28 HIGH, 0 CRITICAL), exit 1.
`npm audit --omit=dev --json`: 51 (3 LOW, 27 MODERATE, 21 HIGH, 0 CRITICAL), exit 1.
`npm ls --json`: exit 0, problems=[]; árbol consistente.
Los 21 HIGH omit-dev se agrupan en **7 causas raíz** (PostCSS contiene dos HIGH
advisories). Paquetes como Firebase/Genkit/PWA tienen severidad propagada por esas
dependencias; no son 21 endpoints explotables ni 21 causas distintas.

| Causa / advisory | Ruta, instalada → corregida | Clasificación y evidencia / recomendación |
| --- | --- | --- |
| gRPC auth context GHSA-m9gg-hp2v-232j | firebase → @firebase/firestore → grpc-js 1.9.16 → 1.13.6 o 1.14.5 | **NOT_REACHABLE_IN_CAMPAIGNS**: advisory requiere servidor gRPC y autorización con getAuthContext/client cert opcional. Campañas no crea servidor ni usa esa función; Admin/google-gax usa raíz 1.14.5 corregida. Firebase fija ~1.9.0, cuyo último es 1.9.16; Firebase 11.10 también fija ese rango. No override fuera del rango ni upgrade major ciego. |
| Jaeger malformed header GHSA-45rx-2jwx-cxfr | Genkit → sdk-node 0.52.1 → sdk-trace-node 1.25.1 → propagator-jaeger 1.25.1 → 2.9.0 | **UNKNOWN (configuración runtime cloud)**: configuración de repo no activa Jaeger; default instalado tracecontext+baggage, mitigación aceptable SOLO bajo ese default. NodeSDK puede cambiar por OTEL_PROPAGATORS; cloud no inspeccionable. Verificar/no habilitar jaeger-only antes de deploy. Corrección 2.9 fuera del SDK fijado; no migrar OpenTelemetry mayor improvisadamente. |
| Prometheus HTTP malformed URI GHSA-q7rr-3cgh-j5r3 | Genkit → sdk-node 0.52.1 → 0.217.0+ | **NOT_REACHABLE_IN_CAMPAIGNS** en código/árbol inspeccionado: no exporter-prometheus ni auto-instrumentations-node instalados, no metricReader configurado ni servidor/puerto métricas expuesto. No habilitar exporter público en cloud; revisar configuración real al crear backend. SDK 0.217 fuera ^0.52.0. |
| braces stack exhaustion GHSA-vfj7-8cjw-p6xm | PWA/Workbox + Tailwind → micromatch/chokidar → braces 3.0.3 → sin versión publicada corregida | **BUILD_ONLY**: patterns de archivos/config del repo, no datos participantes como glob. Registry sigue ofreciendo 3.0.3; no downgrade PWA 10→6 ni quitar pruebas. Build solo código revisado, sin archivos/patrones ajenos. |
| PostCSS source maps GHSA-6g55-p6wh-862q y GHSA-r28c-9q8g-f849 | Next 15.5.27 → postcss 8.4.31 fijado; corregida >8.5.17 para esos HIGH; 8.5.29 instalada raíz | **BUILD_ONLY**: CSS/config confiables, no conversión server-side de CSS participante. Next fija versión; parchear motor fuera del contrato no se improvisa. Mantener CSS de terceros revisado, no ejecutar builds arbitrarios con secretos. |
| serialize-javascript RCE GHSA-5c6j-r48x-rmvq | PWA/Workbox → plugin-terser y terser-webpack-plugin → serialize-javascript 6.0.2 → 7.0.3+ (7.1.2 disponible) | **BUILD_ONLY**: serializer de opciones del minificador/workers durante build; sin import en API Campañas ni input participante. Padres fijan ^6, corrección major 7 requiere actualizar tooling validado, no force. No procesar opciones JS no confiables. |
| tmp traversal GHSA-ph9p-34f9-6g65 | patch-package/external-editor → tmp 0.0.33 → 0.2.6+ | **BUILD_ONLY** en omit-dev (también tooling dev): no uso en API, sin prefijo/postfijo/dir controlado por participante. Padre ^0.0.33 no permite parche 0.2.6. No exponer CLI/editors ni aplicar patches no revisados. |

Grupos adicionales HIGH solo en audit total: **DEV_ONLY** tRPC experimental caller
10.45.2 (Genkit tools-common; fix 10.45.3), adm-zip 0.5.18 (Genkit tools-common;
DoS/extracción, fix 0.6.1) y extract-zip 2.0.1 (Genkit CLI; symlink traversal,
sin fix publicado compatible identificado). No hay import ni endpoints Campañas
que ejecuten esos callers/extractores; no publicar servidor Genkit CLI.
Se incluyen en el riesgo del entorno de desarrollo, no se esconden por ser dev.

Comprobación de actualización compatible para UNKNOWN/HIGH: `npm explain`,
`npm outdated` y `npm view` verificaron que SDK ^0.52.0 termina en 0.52.1.
Incluso **@genkit-ai/core 1.42.0** sigue fijando SDK ^0.52.0 y core/traces ~1.25.0:
actualizar Genkit dentro de major 1 NO elimina esas causas. No se actualiza un
paquete ajeno solo para aparentar cierre ni se usa `audit fix --force`.
No cambio de dependencias/código en F11B; no se afirma que alertas fueron parcheadas.

**Seguridad dependencies para deploy cloud: NO-GO**, no por el número 21, sino
por Jaeger UNKNOWN respecto de configuración runtime cloud sin evidencia real.
0 CRITICAL runtime, 0 HIGH runtime demostrado explotable en las rutas Campañas
inspeccionadas; UNKNOWN queda delimitado y con acción concreta: verificar que
no se active Jaeger-only (mantener W3C/baggage o deshabilitar telemetry) en el backend
staging, sin aceptar esos headers por un propagador vulnerable. Esa mitigación
no se declara aplicada en una nube aún no configurada. Build/dev riesgos requieren
inputs confiables; no ejecutar builds arbitrarios con permisos sobre secretos.

Fuentes primarias:
[gRPC](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j),
[Jaeger](https://github.com/open-telemetry/opentelemetry-js/security/advisories/GHSA-45rx-2jwx-cxfr),
[Prometheus](https://github.com/open-telemetry/opentelemetry-js/security/advisories/GHSA-q7rr-3cgh-j5r3),
[serialize-javascript](https://github.com/yahoo/serialize-javascript/security/advisories/GHSA-5c6j-r48x-rmvq),
[PostCSS](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q).

### Regresión ejecutada en F11B

Aunque solo cambió este documento, se ejecutaron `npm ci`, las diez suites,
`npm run typecheck` y `npm run build`. npm ci PASS; typecheck PASS; build PASS
con los warnings de bundling AI/Genkit ya documentados, sin errores nuevos.
No se editaron dependencias, código, Rules ni pruebas; los service workers
regenerados por build se restauraron al estado inicial antes de publicar.

| Suite | Resultado final |
| --- | --- |
| F2 auth | 12/12 |
| F3 registration | 13/13 |
| F4 pair-requests | 20/20 |
| F5 admin-dashboard | 25/25 |
| F6 planner | 51/51 tras repetir sin cambios |
| F7 program | 64/64 |
| F8 changes | 64/64 |
| F9 notifications-pwa | 56/56 |
| F10 pilot | 12/12 |
| F11 deployment | 15/15 |

Resultado agregado final: **332/332, cero omitidas**. No se afirma una corrida
única limpia: en la primera ejecución F6 pasó 50/51, fallando la expectativa
PlannerWarnings de `maxTurns concurrente entre bloques`; al repetir la suite
completa con los mismos servicios de emulador y sin relajar pruebas pasó 51/51.
Se conserva esta intermitencia como evidencia, no como reparación implementada
ni como demostración de readiness cloud. Las otras nueve suites pasaron al primer
intento. Emuladores aislados demo-campaign-auth, no datos reales/cloud.

### Readiness y siguientes pasos

Listo: configuración versionada, emuladores aislados, validators, runbooks y
clasificación audit con evidencia; no es infraestructura desplegada.
Automatizable después de confirmación/Blaze/reauth: leer metadata pendiente,
generar secretos random directamente en destino autorizado, comprobar ADC/permisos,
guardar Rules previas privadamente, configurar y desplegar SOLO staging, smoke
sintético, FCM de prueba y scheduler staging si sus prerrequisitos permiten.
Nada de eso requiere DNS final, merge ni tocar producción.

Acciones humanas (máximo cinco):
1. Confirmar proyecto producción Campañas; decidir explícitamente si corresponde
   al sitio principal `studio-4254178211-20e43` o debe ser otro independiente.
2. Confirmar un proyecto staging distinto y sin datos reales, o autorizar creación
   de uno nuevo. Los nombres/404 no prueban ausencia de datos.
3. Autorizar/habilitar Blaze SOLO en ese staging, cuenta de facturación legítima,
   presupuesto/alertas; no cambiar producción todavía.
4. Reautenticar Firebase CLI privadamente y revisar/revocar la sesión anterior.
5. Solo si persiste 403 tras Blaze: conceder al operador permisos mínimos App
   Hosting/Secret Manager/IAM del staging elegido. No compartir JSON ni tokens.

No se pide acceso DNS ahora: F11B lo prohíbe y no hace falta para hosted.app staging.
Android/iOS físicos, FCM real, tres perfiles e impresión nativa F7 siguen pendientes.
No se declaran completados por inspección de metadata ni por tests de emulador.
