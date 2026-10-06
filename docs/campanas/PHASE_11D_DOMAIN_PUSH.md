# F11D — Dominio canónico, VAPID y verificación cloud

Fecha: 2026-10-06, America/Santiago. Rama exclusiva: `feature/campanas-v1`.
Inicio verificado en `b427b7384a16a40dd9898b5fbf5321e924e818b4`.
Sin merge, push a main, F12, campaña real ni invitaciones.
El proyecto principal `studio-4254178211-20e43` permanece intacto.

## Estado y límites de la evidencia

**F11D INCOMPLETA** mientras no se termine la comprobación browser de push
productivo y offline/actualización. El Mac estaba bloqueado al intentar usar
las herramientas nativas; se solicitó desbloqueo, sin eludir esa protección.
Esto no invalida TLS, DNS, routing ni las pruebas cloud que sí se completaron.
No se confunde aceptación FCM con visualización de una notificación del sistema.

Android físico, iOS instalado en Home Screen, tres perfiles humanos y vista
previa nativa de impresión Mac F7 permanecen PENDING EXTERNAL. No son pruebas
realizadas por las suites ni por el emulador. Issues #8/#11/#12 siguen OPEN;
PR #15 OPEN / Draft. No se autoriza piloto ni lanzamiento general.

## VAPID legítima y separación de entornos

Se generó una pareja Web Push desde Firebase Console en cada proyecto dedicado.
Las claves públicas tienen 87 caracteres y son distintas. Solo la pública se
guardó como `NEXT_PUBLIC_FIREBASE_VAPID_KEY` en Secret Manager de cada proyecto;
la privada quedó bajo gestión de Firebase, sin descargarla ni mostrarla.

Los dos YAML de entorno referencian el secreto en BUILD y RUNTIME. Se concedió
acceso al backend mediante App Hosting. No hay valores de claves, cookies,
PIN, tokens FCM o credenciales JSON en Git, PR o este documento. Runtime usa ADC.

## DNS y dominio

Cloudflare tenía dos registros raíz: A de hosting principal y TXT de su sitio.
Se conservaron ambos sin edición. Se añadieron únicamente:

| Tipo | Nombre | Configuración |
| --- | --- | --- |
| A | `campanas.d-territorio.cl` | `35.219.200.6`, DNS only, TTL Auto |
| TXT | `campanas.d-territorio.cl` | Ownership exacto solicitado por Firebase, TTL Auto |
| CNAME | `_acme-challenge_ch6d4t7ytio3ccze.d-territorio.cl` | Destino ACME exacto solicitado por Firebase, DNS only, TTL Auto |

No se tocaron root/www/MX/SPF/DKIM/DMARC ni se crearon credenciales Cloudflare.
Inventarios privados antes/después:
`gs://d-territorio-campanas-prod-backups/dns/f11d-cloudflare-before.json` y
`gs://d-territorio-campanas-prod-backups/dns/f11d-cloudflare-after.json`.
Google DNS 8.8.8.8 y Cloudflare 1.1.1.1 confirmaron los tres registros.
La API Firebase confirmó HOST_ACTIVE, OWNERSHIP_ACTIVE y CERT_ACTIVE;
la petición HTTPS real validó el certificado sin desactivar TLS.

URL definitiva: `https://campanas.d-territorio.cl`.
`CAMPAIGNS_APP_ORIGIN` productivo pasó a este origen mediante una nueva versión
del secreto **solo después** de validar TLS. Staging conserva su hosted.app.
Authorized domains incluye el hostname exacto, sin wildcard nuevo.
El hosted.app productivo queda disponible técnicamente para diagnóstico/rollback,
no como origen participante: POST desde ese origen se rechaza por CSRF.

## Causa real y corrección de raíz

El diagnóstico HTTPS de staging, autorizado con un ID token real de organizador,
demostró: Host no coincide con el origen canónico; X-Forwarded-Host sí; routing
estaba habilitado. La regla `has: host` existente no se ejecutaba detrás del proxy.
No se dedujo la causa de un curl local ni se asumió que DNS la corregiría.
La [documentación oficial de Firebase](https://firebase.blog/posts/2024/07/app-hosting-updates/)
describe X-Forwarded-Host como hostname original en App Hosting.

Middleware nuevo, limitado a `/`, reutiliza una función pura. Requiere opt-in
explícito, origen HTTPS exacto y Host público exacto o Host de un backend Cloud
Run **exactamente allowlisted** junto al forwarded host canónico exacto. Nunca
construye destinos desde headers, acepta sufijos o listas forwarded, ni usa esta
decisión como autorización/CSRF. Los nombres internos son configuración pública
de despliegue por entorno, no credenciales. El destino siempre viene del secreto
de origen. Conserva la regla Next existente como fallback de Host directo.

Evidencia HTTPS real en ambos entornos: `/` → 307 canónico `/campanas`;
`?adminLogin=1` → 200; `/campanas` autenticado → 200; sin sesión conserva el
redirect a ingresar. Admin layout conserva MANAGE_CAMPAIGNS y APIs sin token
devuelven 401. Forwarded host `evil.test` no produjo redirect externo. APIs y
otras rutas no pasan por el matcher. El diagnóstico temporal fue eliminado;
su URL vuelve a responder 404. Sitio principal HTTPS → 200, DNS raíz intacto.

## Cookies y CSRF bajo el origen definitivo

Prueba con perfil HTTP exclusivamente ficticio: registro, sesión, logout,
revocación del cookie anterior y nuevo login pasan. Cookie HttpOnly, Secure,
SameSite=Lax, host-only, sin Domain compartido. Respuestas private/no-store.
Origen definitivo válido pasa; origen externo, hosted.app productivo, Origin
ausente y sec-fetch-site cross-site devuelven 403. Un forwarded host falsificado
no convierte un origen externo en autoridad. No se cambiaron reglas de seguridad.

## FCM y PWA

Staging: perfil ficticio, permiso explícito concedido por el usuario, SW activo
utilizado por Firebase Messaging, suscripción real almacenada sin exponer token.
Aviso técnico enviado por el outbox y el dispatcher existentes: un delivery
`delivered`, cero failed. El contador de Inicio pasó de 1 a 2 **sin recarga** y
Avisos mostró el texto ficticio: foreground real PASS.

Con la única pestaña staging cerrada se envió otro evento: FCM lo aceptó y
persistió delivery `delivered`, sin errores. Visualización OS/click en background
no acreditados por estar bloqueado el Mac; pendiente externo, no PASS inferido.
IDs determinísticos permiten reintentar sin duplicar los eventos del test.

Producción: registro ficticio real bajo el custom HTTPS PASS. Permiso de Chrome
preparado, pero suscripción/evento foreground no se completaron por bloqueo del
Mac. Se cerró la pestaña temporal y canceló ese permiso pendiente al terminar.
No se han usado tokens staging en producción ni se han mezclado VAPID/proyectos.

Custom domain sirve manifest 200 (scope/start_url `/campanas`, standalone),
`/sw.js` 200 y fallback offline 200. Worker contiene NetworkOnly para Campañas/API
y el fallback sin datos privados. La aplicación ofrece instalación. Staging
detectó una actualización y mostró el aviso; la interacción con confirmación
nativa no pudo verificarse hasta el final. **Offline simulado, scope activo
productivo y aplicación de actualización siguen pendientes de inspección browser**;
servir esos archivos no equivale a validar un corte de red real.

No se añadió funcionalidad nueva ni se cambió la política de cache/FCM existente.
Se eliminaron definitivamente solo los 17 documentos ficticios: dos participantes,
dos índices de teléfono, tres sesiones, cinco contadores auth y cinco auditorías
de esos perfiles. Se verificaron nombre/teléfono ficticios, ownership y claves
HMAC esperadas antes del commit atómico con precondición updateTime; abortaría ante
datos ajenos/cambios concurrentes. No se persistieron copias de PIN/cookies/tokens.
Readback final: **0 colecciones productivas con datos**; ninguna campaña real.
Estos perfiles descartables pueden volver a crearse para retomar la prueba, no
se conserva una sesión operativa productiva de test.

## Despliegues y operación

Código final: `fe80aff9c2e99ab62f15fc4e7301831cb7af231b`.
Los commits posteriores de informe/rotulado de test no modifican el runtime.
Staging `build-2026-10-06-003`: health ready con ese SHA, aprobado antes del
rollout productivo con el parche de dependencias.
Producción final `build-2026-10-06-003`: SUCCEEDED, health ready con el mismo SHA.
Ambos rollouts finales se verificaron por API, no solo por exit 0 de Firebase CLI.
El rollout previo `build-2026-10-06-002` verificó dominio y routing con
`5aca14b499946970599b5e64cb7cf33bd7766f20`.

Tras **cada** deploy se revisó y retiró la concesión automática
`roles/firebase.sdkAdminServiceAgent` al runtime, sin quitar roles gestionados
necesarios. Auth runtime viewer, no auth admin; sin owner/editor. OTEL real en
revisión Cloud Run: `tracecontext,baggage`; sin exporter Jaeger/Prometheus
configurado, maxInstances 1. Readback final confirmó esto en las dos revisiones
`*-build-2026-10-06-003`, no solo en plantilla o revisión anterior. Health respondió
200/ready aun con un header Jaeger malformado. Se mantienen mitigaciones, no se
afirma que el paquete Jaeger vulnerable esté parcheado.

Scheduler staging ENABLED; productivo PAUSED. Se actualizó únicamente su URI al
origen canónico, conservando credencial, método, estado y horario. No se activaron
recordatorios reales. Export diario de ambos proyectos ENABLED, última ejecución
06:15 UTC del 6 de octubre status 0. Buckets uniform/PAP enforced, sin acceso
público, lifecycle 30 días; backup administrado productivo diario sigue intacto.
Restore aislado F11C en recovery no se repitió encima de producción.

Cuatro métricas y cuatro políticas ENABLED por entorno: backend 5xx, auth429,
scheduler y push. Ventana 5 minutos y umbrales existentes conservados. Logs
operacionales se consultan con whitelist de campos; entrega del canal email
no se declara comprobada. Tres índices por proyecto READY, Rules privadas sin
apertura de ChangeRequest, Notification, ProgramVersion, Assignment o sesiones.
Prueba real de Rules: ocho colecciones internas deniegan HTTP 403 al organizador
ficticio staging y al cliente anónimo productivo. No se abrieron permisos para QA.
Logs de request de las dos revisiones finales llegaron a Cloud Logging (4 y 5
entradas consultadas, HTTP 200), sin publicar URLs, cookies o headers. Rollback a
build anterior aceptado por `validateOnly=true` en ambos proyectos; no ejecutado.

## Seguridad de dependencias

Audit fresco detectó GHSA-jqcg-44mw-7w3h en proxy-addr 2.0.7. Aparece vía
Express/Genkit, tanto en el árbol de tooling como en `npm ls --omit=dev`; no se
lo clasifica como exclusivamente desarrollo. Se aplicó el parche 2.0.8 al lock,
sin majors, overrides amplios ni `audit fix --force`. Se agregó un test de lock.
[Advisory y versión corregida](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).

Después de npm ci: audit total 66 (5 LOW, 33 MODERATE, 28 HIGH, **0 CRITICAL**);
omit-dev 51 (2 LOW, 28 MODERATE, 21 HIGH, **0 CRITICAL**). npm ls sin problemas.
No significa que todos los HIGH estén parcheados. Mantiene la clasificación
F11B/F11C: Jaeger mitigado con configuración runtime real; gRPC/Prometheus no
alcanzables por rutas Campañas; braces/PostCSS/serialize-javascript/tmp build-only;
tRPC/zip dev-only. No se ejecutan builds arbitrarios con secretos.

## Validación

| Suite | Resultado final |
| --- | --- |
| F2 Auth | 12/12 |
| F3 Registration | 13/13 |
| F4 PairRequest | 20/20 |
| F5 Dashboard | 25/25 |
| F6 Planner | 51/51 |
| F7 Programa/PDF | 64/64 |
| F8 Cambios | 64/64 |
| F9 Notificaciones/PWA | 56/56 |
| F10 Piloto | 12/12 |
| F11 Deployment | 17/17 |

Total 334 PASS, sin tests relajados ni eliminados. F11 conserva los 15 anteriores
y añade routing exacto y lock del parche. Un intento F7 dio 63/64 por ausencia
de `/tmp/campaign-phase7-pdf` tras reiniciar el entorno; preparado ese directorio,
la suite completa pasó sin cambiar assertions. npm ci, typecheck y build PASS.
No errores nuevos Campañas ni cambios a Limpieza/Territorios en F11D. Assets SW
generados localmente se restauraron; no se commitea ruido de build ni secretos.

## GO / NO-GO

Infraestructura HTTPS/canonical routing y seguridad: **GO**, incluyendo readback
del parche productivo, IAM, OTEL, índices, backups y Scheduler PAUSED.
F11D técnica INCOMPLETA por las comprobaciones browser indicadas, no por DNS.
Piloto y lanzamiento general NO-GO: QA físicos/humano siguen pendientes.
QA impresión nativa F7: **PENDIENTE**; Issue #8 no se cierra.
Rate limits vigentes F10: 160 registros / 240 logins por 15 minutos, budgets
individuales conservados; no se modifican en F11D.
