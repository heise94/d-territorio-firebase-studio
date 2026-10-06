# F11E — QA final, evidencia y pendientes

Fecha: 2026-10-06. Rama exclusiva `feature/campanas-v1`.
Inicio local/remoto verificado: `62adaf1c271e6d1b76fa6b5198e6c3d4f37abaab`.
Estado: **INCOMPLETA**. No piloto ni lanzamiento general autorizados.
No merge, main, F12, inscripciones reales ni campaña real.

## PASS TÉCNICO

- Staging y producción: HTTPS válido, health 200/ready, raíz 307 al origen
  canónico `/campanas`, manifest 200 y SW 200. Manifest standalone,
  start_url/scope `/campanas`. Esto no acredita instalación.
- Producción inició con cero colecciones con documentos. Se creó solamente
  `Perfil ficticio F11E — no real`, teléfono técnico ficticio, PIN descartable
  no registrado en documentación. Registro browser e Inicio autenticado PASS;
  no campañas abiertas ni turnos reales. No se creó campaña productiva.
- Chrome mostró el CTA de instalación real; no equivale a PWA instalada.
- Rules: ocho colecciones internas deniegan 403 tanto al organizador ficticio
  staging como al cliente anónimo productivo: assignments, versions, changes,
  notifications, sessions, subscriptions, outbox y deliveries. Sin aperturas.
- API administrativa staging: organizador real con claim actual 200;
  sin token 401; cuenta Firebase ficticia sin claim 403. La cuenta auxiliar
  sin claim se eliminó inmediatamente después de comprobarlo.
- `?adminLogin=1` conserva HTTP 200. Forwarded host `evil.test` devuelve 200
  sin redirect externo. API real conserva guard. Tres POST con Origin externo,
  hosted.app productivo y Origin ausente rechazados 403. No se debilita CSRF.
- Ambas revisiones activas `*-build-2026-10-06-003`: OTEL real
  `tracecontext,baggage`, sin Jaeger/exporter público; maxInstances 1.
  Runtime sin Owner, Editor, Firebase SDK Admin amplio ni Auth Admin;
  Auth viewer conservado. No hubo modificación IAM ni rollout en este QA.
- Scheduler staging ENABLED; recordatorios producción PAUSED.
  Exports diarios ENABLED: última ejecución 06:15 UTC, status 0, ambos proyectos.
  Buckets uniform/PAP enforced, sin miembros públicos y lifecycle configurado.
  Backup administrado productivo diario: retención 604800 segundos (7 días).
  No restore productivo.
- Cuatro métricas y cuatro políticas enabled por entorno. Consulta posterior
  al inicio de QA no encontró 5xx ni errores operacionales/fallos de push.
  Una lectura Cloud Logging devolvió 429 RESOURCE_EXHAUSTED; la consulta
  posterior pasó. Era cuota de la API de consulta, no auth429 del backend.
  No se afirma entrega de email ni visualización de incidente en consola.
- Audit fresco: total 66 (5 LOW, 33 MODERATE, 28 HIGH, **0 CRITICAL**);
  omit-dev 51 (2 LOW, 28 MODERATE, 21 HIGH, **0 CRITICAL**). npm ls sin problemas.
  Mismas siete causas raíz y mitigaciones F11B/C/D: Jaeger desactivado en
  revisión real; gRPC/Prometheus no alcanzables en Campañas; braces/PostCSS/
  serialize-javascript/tmp build-only, tooling adicional dev-only. No UNKNOWN
  nuevo ni HIGH runtime relevante sin mitigación identificado. No force.
- npm ci, typecheck y build PASS. Ninguna modificación funcional.
  Assets generados del build restaurados al baseline, no publicados como cambios.

### Regresión final

| Fase / suite | Resultado |
| --- | --- |
| F2 Auth | 12/12 |
| F3 Registration | 13/13 |
| F4 PairRequest | 20/20 |
| F5 Dashboard | 25/25 |
| F6 Planner | 51/51 |
| F7 Programa | 64/64 |
| F8 Cambios | 64/64 |
| F9 Notificaciones/PWA | 56/56 |
| F10 Piloto | 12/12 |
| F11 Deployment | 17/17 |

**334 PASS, cero skips**, sin relajar suites. No se afirma una corrida única
limpia: primer runner Node 24.4.1 quedó sin progreso en Planner y fue detenido;
runtime estable 24.19.0 dio 48/51 y después 49/51, con fallos de carreras y
`Transaction is invalid or closed` en logs del emulador. Reiniciar únicamente
los emuladores propios de QA produjo 51/51 en la suite completa intacta.
No hay regresión de código demostrada ni se cambió el servicio para ocultar
esa intermitencia. Los demás resultados finales corresponden a suites completas.

### Limpieza y readback final

Se cerró únicamente la pestaña productiva F11E y se descartó su PIN en memoria.
Se verificó nombre/teléfono exactos y ownership de cada documento; IDs de rate
limit contrastados mediante HMAC esperado. Commit atómico de borrado con
precondición `updateTime`: seis documentos propios (un participante, un índice
de teléfono, una sesión, una auditoría y dos límites auth). Ningún dato ajeno.
No se conservan tokens/cookies/PIN en archivos. La cuenta Firebase auxiliar
sin claim pertenecía solo a staging y también fue eliminada.

Agregaciones Firestore productivas posteriores: campaigns 0, participants 0,
campaignRegistrations 0, availabilities 0, pairRequests 0, campaignAssignments 0,
campaignNotifications 0, pushSubscriptions 0, deviceSessions 0, congregations 0.
`listCollectionIds` final vacío: ninguna colección técnica global con documentos
remanentes del test. La revisión final de logs tampoco encontró 5xx, auth429,
errores scheduler ni push persistentes durante el QA. No se enviaron eventos FCM
productivos porque no se completó suscripción; no se afirma su entrega.

## PENDING EXTERNAL

### Android físico — PENDING EXTERNAL

1. Abrir URL definitiva e instalar PWA.
2. Login; cerrar/reabrir y comprobar persistencia.
3. Permitir notificaciones; recibir foreground y background.
4. Click, destino seguro y Avisos.
5. Offline sin datos privados ni falso guardado; recuperación y actualización.
6. Logout y ausencia de contenido privado posterior.

### iOS físico — PENDING EXTERNAL

1. Safari → URL → Añadir a pantalla de inicio → abrir standalone.
2. Login y persistencia al cerrar/reabrir.
3. Avisos y Mi programa; push si soportado/configurado.
4. Logout y ausencia de datos privados.

### Tres perfiles humanos — PENDING EXTERNAL

Tecnológico, smartphone básico y adulto mayor principalmente WhatsApp.
Cada persona debe ingresar, indicar disponibilidad, gestionar pareja,
revisar Avisos/Mi programa y solicitar cambio. Registrar éxito sin ayuda,
ayuda requerida y problemas observados; no simular personas con IA.

## FAIL

**Cierre técnico F11E no alcanzado**: QA browser no concluido. No existe bug
funcional nuevo demostrado. Los fallos iniciales de regresión y su repetición
final PASS se describen arriba; no se ocultan ni se relajan las comprobaciones.

La ventana Chrome fue utilizada simultáneamente por el usuario durante la
prueba. Se solicitó dejarla libre; no se toman sus otras pestañas ni se altera
su trabajo. Esto es un bloqueo de coordinación de UI, **no un fallo de FCM**.
El Mac inicialmente permitió acceso nativo; no se lo declara bloqueado.

Pendientes técnicos browser, que debe retomar Codex cuando la ventana esté libre
(no se reclasifican como QA físico externo): sesión completa refresh/cierre/
reapertura/logout/login, inspección de cookie, permiso/suscripción FCM productiva,
foreground sin reload, background delivery, display/click OS, unsubscribe/logout
push, offline real/recuperación/cache, worker único/scope/waiting, update A→B y
posposición, instalación/standalone, login y navegación administrativa UI.
No se hizo rollout staging solo para QA porque no se podía completar la
observación interactiva A→B. No hubo ningún nuevo rollout productivo.
No se convierte evidencia F11D en evidencia nueva F11E.

Impresión F7 nativa: **PENDIENTE**, no ejecutada en este intento. Retomar preview
Mac horizontal, encabezados, 4/8 puntos, nombres largos, varias páginas,
blanco/negro y ausencia de cortes. No se sustituye por tests PDF; Issue #8 abierta.

## Publicación y decisión

Solo documentación F11E; no bugfix ni cambio de configuración. DECISIONS_LOG
no recibe entradas: no hubo una decisión nueva de producto/arquitectura que
justifique repetir F11D. Infraestructura cloud: GO en comprobaciones descritas.
F11 técnica: INCOMPLETA por QA browser. Piloto humano/lanzamiento general: NO-GO.

F10-M01 reordenación manual permanece MEDIUM/F12, fuera de este QA.
Rate limits vigentes 160 registros / 240 logins por 15 minutos, sin modificación.
PR #15 OPEN/Draft; Issues #8/#11/#12 abiertas, sin cierre automático.
