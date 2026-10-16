# F11C — Infraestructura real aislada

## Estado actual (05–06 de octubre de 2026)

Base exacta autorizada: `f3b237df20c699ef1ec7f4c39d10729e952df6af`.
Rama exclusiva: `feature/campanas-v1`; PR #15 OPEN / Draft, sin merge ni F12.
La autorización F11C reemplaza las restricciones de configuración cloud de F11B.
`studio-4254178211-20e43` y los demás proyectos anteriores permanecen intactos.

**F11C INCOMPLETA:** staging real validado; producción aislada desplegada y validada;
DNS y VAPID aún pendientes. No se aprueba piloto humano ni lanzamiento general.
No se abrió campaña real, importaron personas, enviaron invitaciones ni push real.

| Recurso | Staging | Producción |
| --- | --- | --- |
| Proyecto | `d-territorio-campanas-staging` | `d-territorio-campanas-prod` |
| Número | `901434652021` | `739711880739` |
| Backend | `campanas-staging` | `campanas-production` |
| Región / máximo | `us-central1` / 1 instancia | `us-central1` / 1 instancia |
| Environment | `staging` | `production` |
| Database | `(default)`, eliminación protegida | `(default)`, eliminación protegida |
| Billing | Blaze, cuenta activa autorizada | misma cuenta, asociado DESPUÉS del smoke staging PASS |
| Presupuesto mensual | CLP 10.000 | CLP 20.000 |

Presupuestos son **alertas**, no límites de gasto; umbrales 50/90/100%, separados
por proyecto. No se cambió facturación de proyectos anteriores.

## URLs y despliegue controlado

- Staging: <https://campanas-staging--d-territorio-campanas-staging.us-central1.hosted.app>
- Producción: <https://campanas-production--d-territorio-campanas-prod.us-central1.hosted.app>
- Destino custom: `campanas.d-territorio.cl`, NO operativo todavía.

Despliegue oficial de código local desde checkout limpio de la rama verificada,
mediante `firebase.campaign-staging.json` / `firebase.campaign-production.json` y
`--project` explícito. No existe conexión GitHub persistente ni auto-rollout de
la rama. [Firebase documenta este mecanismo](https://firebase.google.com/docs/app-hosting/alt-deploy).
La conexión permanente GitHub requeriría consentimiento de instalación; no se
afirma configurada ni se usa una rama main por defecto.

Staging estable: `build-2026-10-05-003`, rollout SUCCEEDED,
`2026-10-05T23:50:35.888711703Z`; SHA de código
`fd285ab5527a3b5fe91e72dad63889e3ea15af41`. Health 200 / ready / staging,
private no-store. Producción estable: `build-2026-10-06-001`, rollout SUCCEEDED,
`2026-10-06T00:07:00.452584347Z`, código
`e3df128cdc2d46520b1d069a23e85f92c7ba0963`. Health 200 / ready / production,
landing/manifest/SW 200, admin sin token 401, base de datos todavía vacía.
Un commit posterior solo de documentación no cambia el SHA del código desplegado.

Dos intentos staging fallaron antes del estable: permisos de resolución de
versiones Secret Manager; luego el wrapper del adapter Next TS exportaba CommonJS
y una preview de pruebas importaba default ESM. Se corrigieron permisos y se
convirtió `next.config.ts` a `next.config.mjs`, preservando configuración PWA.
Los tests únicamente ajustan el nombre/import de configuración, sin relajar
aserciones. El exit 0 de CLI NO se tomó como prueba de deploy: estados build,
rollout, revisión Cloud Run y HTTPS se verifican independientemente.

## APIs, Auth, ADC y secretos

APIs: App Hosting, Firestore, Identity Toolkit, Secret Manager, FCM y FCM
Registrations, Scheduler, Cloud Build, Artifact Registry, Cloud Run, Logging,
Monitoring, Developer Connect, IAM, Storage, Firebase Storage y Billing Budgets.
Web App y bucket Firebase reales creados por proyecto; email/password es el único
proveedor administrativo habilitado. Authorized domains exactos, sin wildcard.
Identidad participante teléfono+PIN propia se conserva.

CLI reautenticada sin revelar credenciales; esto NO certifica revocación de
cualquier token histórico. No se descargaron claves JSON. Runtime usa ADC.
Firestore `roles/datastore.user`, Auth lectura `roles/firebaseauth.viewer`, FCM
`roles/firebasecloudmessaging.admin`, permisos gestionados App Hosting y acceso
por secreto. Sin Owner/Editor para runtime. El permiso amplio sdkAdmin que crea
CLI se retira tras deploy, conservando bindings ajenos y etag: **reconciliar IAM
después de cada futuro despliegue CLI**, que puede volver a conceder ese rol.

Secretos configurados en AMBOS proyectos, sin valores en Git:

- `CAMPAIGNS_AUTH_SECRET` y `CAMPAIGNS_NOTIFICATION_JOB_SECRET`: CSPRNG 48 bytes,
  distintos por entorno, exclusivamente runtime.
- `CAMPAIGNS_STAGING_PROJECT_ID`, `CAMPAIGNS_PRODUCTION_PROJECT_ID`,
  `FIREBASE_ADMIN_PROJECT_ID`, `CAMPAIGNS_APP_ORIGIN`.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
  `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.

`CAMPAIGNS_STAGING_SMOKE_AUTH` almacena credenciales de DOS organizadores ficticios
solo para el operador, sin acceso del backend. `campaign_admin=true` provisionado
con script existente, readback y preservación de claims. Su función acepta
credencial en memoria opcional; su uso normal sigue ADC y confirmación de proyecto.
Ningún UID/PIN/password real entra en repositorio o evidencia.

Preflight PASS con valores auténticos en memoria en ambos entornos. Límites auth
160 registros / 240 logins / 15 minutos; individuales intactos, America/Santiago.
Origen exacto HTTPS hosted.app por entorno, cookies Secure/HttpOnly/SameSite=Lax.
No se cambia origin al dominio custom hasta que DNS/TLS estén listos.

## Rules, índices y smoke real

Proyectos nuevos vacíos comprobados antes de deploy. No había release Rules previo
(404); estado inicial deny implícito. Rules actuales desplegadas explícitamente y
copia del primer release/ruleset guardada en bucket privado de cada proyecto.
Los tres índices `campaignDays`, `points`, `timeBlocks` están READY en ambos proyectos.
Colecciones Campañas privadas conservan deny, no se abre el cliente para la UI.
Prueba con Firebase ID token REAL de organizer confirma permission-denied en
campaignAssignments, campaignProgramVersions, changeRequests, campaignNotifications,
deviceSessions y pushSubscriptions. `notifications` legacy NO es el namespace de
Campañas y no fue cambiado.

Smoke HTTPS staging **PASS**, una campaña explícitamente ficticia, cuatro
congregaciones ficticias y tres perfiles sin personas reales, operando mediante
repositorio cliente con Rules y endpoints reales (sin seed remoto destructivo):

- Configuración, registro, cookie, inscripción, Availability, PairRequest accepted.
- Cobertura/planner, vínculo como unidad, publicación y Mi programa v1.
- Dos organizadores: mismo slot, publicación y resolución, exactamente 200/409.
- Solicitud propia, aprobar SIN cambio, reserva manual, resolución v2.
- V1 intacta, avisos a afectados, Mi programa actualizado, PDF v1/v2 reproducible.
- Origin/CSRF rechazado, logout/login; admin sin token 401.

Solo campaña sintética STAGING fue abierta/publicada para el ensayo autorizado.
Producción no contiene campañas, congregaciones ni participantes.

## PWA y FCM

Manifest, SW y pantalla offline HTTPS 200; navegador real muestra ingreso y fallback
sin conexión legible, sin recursos http inseguros en la pantalla inspeccionada.
Pruebas F9 preservan actualización/offline NetworkOnly y privacidad. No se afirma
que visitar fallback equivalga a ensayar corte de red ni instalación física.

FCM v1 habilitado. VAPID legítima aún NO creada: consola permite Generate key pair,
esperando confirmación requerida para crear credencial persistente mediante UI.
Se omite referencia a secreto inexistente; NO se inventa clave ni se oculta fallo.
Avisos internos funcionan. Suscripción/envío foreground web real y push background
físico siguen pendientes; no hay FCM token real ni mensaje enviado.

## Scheduler, backups y observabilidad

Recordatorios staging ENABLED; endpoint privado POST probado 200 con secreto en
memoria. Producción PAUSED hasta apertura humana. Ambos `*/15 * * * *`, timezone
America/Santiago, retries 2, backoff 30–120s y deadline 60s, secretos diferentes.

Buckets `<project>-backups`: uniform access y public access prevention enforced,
lifecycle 30 días para objetos de backup. Export inicial vacío completado en
ambos. Staging export posterior al smoke completado y restaurado en base separada
`backup-recovery-f11c` protegida; 2 ProgramVersion en origen y 2 recuperadas.
Nunca se importó encima de `(default)` ni producción.

Producción: backup gestionado diario Firestore, retención 7 días. Además export
diario a bucket privado a las 03:15 America/Santiago en AMBOS proyectos mediante
Scheduler OAuth y service account dedicado SIN JSON. Rol custom solo
`datastore.databases.export`, no import ni escrituras de documentos. Prefijo bucket
sin carpeta produce timestamp único por export, [según Firestore](https://docs.cloud.google.com/firestore/native/docs/manage-data/export-import).
Primer ensayo staging dio 403 durante propagación IAM y retry obtuvo 200, status
final 0; no se amplió el rol para ocultar el fallo. Job productivo ENABLED,
primera ejecución verificada status 0, `2026-10-06T00:15:50.951596Z`, tras demora
inicial de aprovisionamiento. Export automático y manual productivos completados,
backup gestionado diario creado. No se ejecutaron recordatorios productivos.
[Google documenta demora inicial del primer job](https://docs.cloud.google.com/scheduler/docs/schedule-run-cron-job).

Cuatro métricas y cuatro políticas por entorno: 5xx sostenidos, auth429 anormal,
scheduler errors y push errors; ventana/align 5 minutos, umbral 3 salvo auth 20.
Alertas email operador configuradas, SIN afirmar entrega/verificación del canal.
Campos de logs fijos, sin PII, PIN, headers de autenticación ni tokens push.

## Seguridad de dependencias

Audit total 66: 6 LOW / 32 MODERATE / 28 HIGH / **0 CRITICAL**.
Omit-dev 51: 3 LOW / 27 MODERATE / 21 HIGH / **0 CRITICAL**; npm ls sin problemas.
No cambia lock, no audit fix --force ni migración mayor improvisada.

Se conserva la matriz de siete causas raíz de F11B. Jaeger pasa
**UNKNOWN → MITIGATED / NOT_REACHABLE_IN_CAMPAIGNS (staging)**: configuración REAL
de revisión lista Cloud Run tiene `OTEL_PROPAGATORS=tracecontext,baggage`, confirmado
por API. No exporter Jaeger/Prometheus ni puerto de métricas configurado, ni
metricReader explícito en código. gRPC y Prometheus permanecen no alcanzables;
braces/PostCSS/serialize-javascript/tmp build-only; adicionales tRPC/zip dev-only.
No significa que los paquetes vulnerables estén parcheados. Desplegar solo código
revisado, no builds arbitrarios con acceso a secretos. **DEPENDENCY SECURITY = GO
staging y producción**, sin HIGH runtime relevante sin mitigación ni UNKNOWN
restante. Cloud Run productivo confirmó la misma variable y maxInstances=1 en
revisión `campanas-production-build-2026-10-06-001`, no solo una plantilla local.

## Validación y pendientes

npm ci, typecheck y build PASS. Suites finales agregadas **332/332**, cero skips:
F2 12, F3 13, F4 20, F5 25, F6 51, F7 64, F8 64, F9 56, F10 12, F11 15.
Se registran intentos previos: F3 12/13 y F6 48/51 por invalid/closed transaction
del emulador; corrida completa posterior F6 50/51 en carrera accepted, repetición
final F6 51/51 sin cambiar aserciones. No se declara una corrida única limpia.
Smoke de concurrencia contra Firestore REAL pasó. No nuevos errores Campañas.

DNS previo: NS Cloudflare kirk/tessa, sin A/CNAME de campanas; inventario real y
plan de Firebase respaldados en `gs://d-territorio-campanas-prod-backups/dns/f11c-before-changes.json`.
Cloudflare login
pendiente; no se editó registro alguno. Firebase entregó A/TXT exactos y CNAME ACME
para certificado: conservar inventario al poder acceder y tocar SOLO lo requerido
para campanas, nunca MX/SPF/DKIM/DMARC/root/otros destinos. No hay HTTPS custom listo.

QA externo PENDIENTE: Android/iOS reales, push foreground/background, tres perfiles
humanos e **inspección de vista previa nativa de impresión Mac F7**. Issues #8/#11/#12
OPEN; F10-M01 MEDIUM y warnings LOW F12 siguen fuera de alcance. No abrir campaña
real, anunciar URL, merge, push main ni avanzar a F12.

Acciones humanas máximas: confirmar creación VAPID; iniciar sesión Cloudflare;
ensayo físico/humano agrupado. Todo lo demás se configura por el agente.

En hosted.app productivo HTTP→HTTPS respondió 301. `/campanas` funciona; `/`
respondió 200 sin redirect pese al opt-in configurado: el ruteo de entrada raíz
NO se declara validado en App Hosting. Revisar host forwarding/redirect de la
plataforma al configurar el dominio custom, sin alterar el sitio principal.
Infraestructura HTTPS base GO; configuración final F11C/piloto/lanzamiento NO-GO
hasta pendientes reales, sin añadir requisitos funcionales de otra fase.

Rollback: petición REST `validateOnly=true` al build estable aceptada HTTP 200 en
ambos entornos (respuesta vacía de validación, no rollout nuevo creado).
Mantener build estable y crear rollout al build existente, sin reconstruir
desde datos vivos. Validar petición `validateOnly=true` sin ejecutar rollback sobre
sitio saludable. Rules copia privada permite release al ruleset respaldado. Nunca
usar restauración destructiva de datos como rollback de código. Referencias estables:
staging `build-2026-10-05-003` / SHA `fd285ab5527a3b5fe91e72dad63889e3ea15af41`;
prod `build-2026-10-06-001` / SHA `e3df128cdc2d46520b1d069a23e85f92c7ba0963`.
