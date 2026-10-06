# F11E — QA final, evidencia y pendientes

Fecha: 2026-10-06. Rama exclusiva `feature/campanas-v1`.
Inicio local/remoto verificado: `62adaf1c271e6d1b76fa6b5198e6c3d4f37abaab`.
Reanudación: HEAD local/remoto `792f86991b696452dc7ce6109868923418c2bd37`,
fetch/pull ff-only y árbol limpio antes del QA interactivo.
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
- Producción conserva `*-build-2026-10-06-003` / SHA `fe80aff...`.
  Staging B: rollout no funcional autorizado `*-build-2026-10-06-004`,
  SUCCEEDED; health reporta SHA `792f869...`. Sin rollout productivo. OTEL real
  `tracecontext,baggage`, sin Jaeger/exporter público; maxInstances 1.
  Runtime sin Owner, Editor, Firebase SDK Admin amplio ni Auth Admin;
  Auth viewer conservado. El CLI volvió a conceder SDK Admin amplio al runtime
  staging; se retiró únicamente ese binding tras terminar el deploy y se
  verificó nuevamente least privilege.
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

### Reanudación interactiva — evidencia nueva

- Un único perfil productivo ficticio F11E. Registro, Inicio, refresh,
  cierre/reapertura de pestaña, persistencia, logout y relogin PASS.
- Cookie observada en DevTools: HttpOnly/Secure marcadas, SameSite=Lax,
  dominio `campanas.d-territorio.cl` sin dominio padre y path `/`.
  Después del logout la tabla mostró cero cookies. Sin documentar valores.
- Suscripción real SDK Firebase con worker existente y registro server-side.
  Dos eventos propios recorrieron Notification → outbox → delivery → FCM,
  delivered=1/failed=0 cada uno. Badge de Inicio 0→1 sin reload; Avisos
  incorporó el segundo evento y pasó 1→2 sin reload ni Actualizar avisos.
- Background: ventanas productivas browser/standalone minimizadas; evento
  real delivered=1/failed=0. **No** equivale a display OS ni click comprobado.
- Unsubscribe mostró «Notificaciones desactivadas» conservando sesión.
  Login dentro de standalone y nueva activación PASS. Logout con suscripción
  activa llevó ambas ventanas a Ingresar; intento posterior delivered=0,
  processed=1 y sin deliveryRecords. No quedó contenido privado visible.
- Offline real desde DevTools: Avisos ocultó datos y controles de escritura
  y mostró «Los cambios no se enviaron». Navegaciones Mi programa/Inicio
  mostraron fallback Sin conexión sin datos privados ni éxito ficticio.
  Checkbox restaurado a 0; Reintentar recuperó la misma sesión y avisos.
  Comprobación directa adicional de cada API privada/mutación offline pendiente.
- Cache Storage: precache con 150 entradas exclusivamente públicas/estáticas,
  sin API privada, HTML privado ni `_rsc`; otras cachés: Google Fonts.
- DevTools: un registro `/sw.js`, scope `/`, worker productivo #6988 activo,
  sin waiting observado; push reutiliza ese mismo registro.
- PWA instalada realmente como app macOS «D-Territorio Campañas», bundle
  `com.google.Chrome.app.gmcngniacamfhoogdlpinpnckggdcoee`. Ventana standalone
  sin barra de direcciones, sesión conservada; Inicio, Avisos, Mi programa,
  logout y login dentro de standalone PASS. Se conserva la app instalada,
  pero se elimina el perfil ficticio productivo.
- Admin UI staging: login organizador ficticio, guard, configuración,
  dashboard/cobertura, planner publicado readonly y programa v2 actual.
  Selector v1 muestra «VERSIÓN HISTÓRICA — v1 · Solo lectura».
  Sin modificar campañas/snapshots del fixture staging.
- Dispatcher: un intento cercano recibió HTTP 429 esperado; reintento
  posterior entregó una vez el evento idempotente. No fue auth429.

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
Reanudación sin cambios de código: se conserva este baseline aprobado, sin
repetir innecesariamente la regresión, conforme al prompt de continuación.

### Limpieza y readback final

Primer intento: seis documentos propios eliminados. Reanudación: nombre/teléfono
exactos y ownership de cada documento verificados; IDs de límites contrastados
por HMAC esperado. Borrado atómico con precondición `updateTime`: **30 documentos
propios** (participante 1, índice teléfono 1, sesiones 3, auditorías 6, límites 5,
subscriptions 2, notifications 4, outbox 4, deliveries 3, lock dispatch 1).
Ningún dato ajeno. Se descartan los secretos temporales en memoria.
No se conservan tokens/cookies/PIN en archivos. La cuenta Firebase auxiliar
sin claim pertenecía solo a staging y también fue eliminada.

Agregaciones Firestore productivas posteriores: campaigns 0, participants 0,
campaignRegistrations 0, availabilities 0, pairRequests 0, campaignAssignments 0,
campaignNotifications 0, pushSubscriptions 0, deviceSessions 0, congregations 0.
`listCollectionIds` final vacío: ninguna colección técnica global con documentos
remanentes del test. Primer intento sin eventos FCM. Reanudación: tres eventos
FCM ficticios con entrega confirmada; cuarto evento tras logout sin entrega.
Revalidación posterior: staging B y producción A health 200, OTEL correcto,
IAM sin roles amplios, exports ENABLED, buckets privados/PAP/lifecycle,
managed backup productivo presente, staging reminders ENABLED y producción
PAUSED. Logs desde 16:40 UTC: staging sin señales; producción únicamente el
429 esperado del dispatcher, sin 5xx ni errores scheduler/push persistentes.

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

Primer intento: bloqueo por uso simultáneo de Chrome. Reanudación: ventanas
propias identificadas; no se cerraron las otras pestañas. Acceso nativo Mac
intermitente: bloqueos informados repetidamente y, durante impresión, cambio
externo de Vista Previa. No se eludieron bloqueos ni se alteraron extensiones
o permisos globales. No es un fallo de entrega FCM.

Pendientes técnicos de Codex (no reclasificar como QA físico externo): display
OS y click real; completar APIs privadas/mutación offline; update A→B,
waiting, posposición, confirmación/activación y ausencia de loop.
Staging B desplegado, pero browser conserva worker #6987 recibido 11:06 sin
banner/waiting observable después de reload y comprobación manual.
**No se afirma PASS de update ni un bug de producto demostrado.** Se observó
ETag débil/Last-Modified fijo en el recurso servido: posible interferencia de
validación HTTP pendiente de diagnóstico reproducible, sin cambiar globalmente
la caché por una hipótesis. No hubo ningún rollout productivo.
No se convierte evidencia F11D en evidencia nueva F11E.

Impresión F7 nativa: **PENDIENTE**. Se abrió Vista Previa y su diálogo macOS
para `long-names.pdf`, fixture ficticio de seis páginas con grupos de cuatro
columnas que cubren ocho puntos y nombres largos. El diálogo mostró seis
páginas y controles de orientación/color; comprobación horizontal/monocroma
interrumpida por cambio externo de la app. No se inspeccionaron todas las
páginas/filas ni una campaña de cuatro puntos. No es PRINT NATIVE F7 PASS.
La skill PDF ayudó a identificar el fixture; ningún render sustituyó al preview
nativo. Issue #8 permanece abierta.

## Publicación y decisión

Solo documentación F11E en Git; sin bugfix. Rollout no funcional e IAM de
staging descritos arriba. DECISIONS_LOG
no recibe entradas: no hubo una decisión nueva de producto/arquitectura que
justifique repetir F11D. Infraestructura cloud: GO en comprobaciones descritas.
F11 técnica: INCOMPLETA por QA browser. Piloto humano/lanzamiento general: NO-GO.

F10-M01 reordenación manual permanece MEDIUM/F12, fuera de este QA.
Rate limits vigentes 160 registros / 240 logins por 15 minutos, sin modificación.
PR #15 OPEN/Draft; Issues #8/#11/#12 abiertas, sin cierre automático.
