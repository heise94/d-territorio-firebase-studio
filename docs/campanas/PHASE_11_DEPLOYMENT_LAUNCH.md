# Fase 11 — Preparación de infraestructura y lanzamiento

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
