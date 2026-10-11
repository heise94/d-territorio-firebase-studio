# F11F — Piloto humano y físico

Fecha local: 2026-10-10 (America/Santiago). Lecturas cloud: 2026-10-11 UTC.
SHA inicial local/remoto/PR verificado: `67806c82841c8ebe09e43c6a32be507a4c1c6de0`.
Rama exclusiva: `feature/campanas-v1`. Estado: **PREPARACIÓN TÉCNICA LISTA;
QA ANDROID FÍSICO EN CURSO; F11F INCOMPLETA**.

## Alcance y límites

Solo staging: <https://campanas-staging--d-territorio-campanas-staging.us-central1.hosted.app/campanas>.
Personas reales usando identidades ficticias; ninguna captura de nombres,
teléfonos, correos o PIN personales. Sin grabación de audio/video.
No producción mutable, campaña real, apertura general, merge, Ready for Review,
cierre automático de issues, F12 ni funcionalidades nuevas.

Se verificaron origin oficial, fetch, rama, árbol limpio y pull ff-only.
Issue #8 está CLOSED/completed, confirmado en GitHub: impresión nativa F7 PASS
según F11E y posterior cierre humano. Issues #11/#12 siguen OPEN; PR #15 OPEN/Draft.

## PASS TÉCNICO — preparación efectivamente creada

Proyecto: `d-territorio-campanas-staging`.
Campaña: **Piloto humano F11F — NO REAL**, ID `f11f-20261010-humano`.
Marcador de ownership de la configuración: `qaRun = f11f-20261010`.

| Configuración | Readback |
| --- | --- |
| Estado inicial | registration_open, solo staging |
| Congregaciones | 4 nuevas, nombres F11F/ficticia/NO REAL |
| Días ficticios | 2026-10-20 y 2026-10-21, sin actividad presencial real |
| Bloques | 08:00–09:00, 10:00–11:00, 12:00–13:00 en cada día |
| Puntos | 4; 24 BlockPoint activos (4 por bloque) |
| Cupos | 2 slots por punto; capacidad objetivo 8 por bloque |
| Participantes | 3 independientes, nombres Perfil ficticio A/B/C — NO REAL |
| Inscripciones | 3 active, maxTurns=3 |
| Disponibilidad | Sin preselecciones; la registran los humanos |
| PairRequest | Ninguna precreada; la solicitan/responden los humanos |
| Organizadores | 2 cuentas ficticias existentes, activas y claim actual campaign_admin=true |
| Admin HTTPS | overview 200 y planner 200, ambos privados/no-store |

La configuración nueva se creó en un único commit Firestore con precondiciones
`exists=false`, sin modificar el fixture anterior F11C/F11D. Los participantes se
crearon por el endpoint real de registro; la inscripción inicial vacía usa el
endpoint real de Availability. Las sesiones técnicas de preparación se cerraron.
PINs distintos y descartables; acceso privado separado por perfil, fuera de Git.
No se conserva cookie, ID token, password administrativo ni pepper en esos accesos.

Un teléfono ficticio propuesto coincidía con un perfil de F11D. Registro 400
esperado; se verificó ownership y se eligieron tres claves telefónicas libres.
El perfil F11D no se editó ni eliminó. Esto no demuestra un bug de producto.

Preflight HTTPS de A/B/C: login 200, session 200 y vista de inscripción 200 para
cada perfil; dos días/seis bloques, sin selección, respuestas private/no-store y
logout posterior. Se distingue expresamente de evidencia humana y física.
No hay métricas de comprensión todavía.

## Entrega breve a testers

Cada tarjeta privada contiene únicamente URL, teléfono ficticio, PIN temporal y
objetivo breve. No se incluyen ubicaciones de botones ni una guía paso a paso.
Objetivo: ingresar con la identidad ficticia, indicar disponibilidad, cambiar un
horario, intentar trabajar con otro perfil, revisar Avisos/Mi programa cuando estén
disponibles y cerrar sesión. No usar datos personales ni compartir el PIN fuera
del tester correspondiente. Ayudar solo si se atasca y registrar esa ayuda.

## Secuencia operativa preparada — no ejecutada en lugar de los humanos

1. Los tres humanos ingresan y guardan/cambian Availability. Se observan también
   Inicio y cobertura. La campaña permanece registration_open durante esta etapa.
2. Solicitudes/respuestas reales desde sus dispositivos generan PairRequest y
   avisos mediante los servicios existentes. El organizador no suplanta esas
   acciones para atribuirlas a un tester. Coordinar una respuesta aceptada y otra
   rechazada si las relaciones y su exclusividad lo permiten; no cancelar accepted
   automáticamente para acomodar un guion.
3. Después de esa etapa, cerrar inscripción explícitamente; configurar Assignment
   manualmente respetando Availability, maxTurns y unidades accepted. No elegir
   reservas automáticamente. Revisar warnings/blockers y publicar v1 con el motor
   existente. Cada humano revisa su propio programa y los avisos de publicación.
4. Una solicitud de cambio se crea desde el turno propio publicado. Aprobar no
   altera programa. Resolución manual posterior produce v2 y avisos solo a afectados;
   el tester confirma que entiende el cambio. Históricos permanecen inmutables.
5. Preparar un turno ficticio en la ventana REAL de 23–24 horas ANTES de publicar
   su snapshot (fecha/hora controladas, America/Santiago). El Scheduler staging
   existente genera turn_reminder; leer Notification/outbox/delivery y comprobar
   por separado visualización/clic físicos. Si hay que cambiar un turno ya
   publicado, usar una NUEVA versión válida, jamás editar el snapshot histórico.
6. Para foreground/background/click, esperar confirmación del estado real del
   dispositivo antes de generar el evento de dominio. No insertar un aviso manual
   y presentarlo como prueba de PairRequest/publicación/cambio/reminder.
7. Actualización Android: NOT EXECUTED hasta poder provocar un rollout staging
   seguro con la PWA instalada; ninguna configuración de actualización forzada.
   El PASS de actualización Mac en F11E no acredita Android.

Operación preparada con helpers privados stage-only: contexto, cierre protegido
por Availability de los tres perfiles, asignación explícita, publicación con
revisión/confirmación, approve/reject/preview/resolve y ejecución del Scheduler
staging. Ninguna selección automática ni escritura de snapshots.
No se ejecutaron estas mutaciones post-publicación durante la preparación.
Concurrencia previa con dos organizadores: PASS F11C; no repetida innecesariamente.
Ambos organizadores accedieron al contexto del nuevo piloto sin error visible de API.
La comprobación visible durante el piloto queda pendiente, no se infiere del API.

## Dispositivos físicos — Android en curso

El usuario pidió continuar **solo con Android**. iOS/iPadOS queda fuera de esta
continuación, sin atribuirle PASS ni exigir un dispositivo Apple para avanzar aquí.
Dispositivo físico aportado: Xiaomi, modelo **21081111RG**, **Android 14**,
versión de sistema **1.0.17.0.UKWMIXM**, según captura de especificaciones.
No se deduce un nombre comercial del código ni se registran identificadores privados.
No usar emulación, Chrome desktop o macOS como sustitutos.

Evidencia humana con perfil A: el usuario confirmó instalación y, después de
cerrar/reabrir la aplicación, permanencia dentro sin solicitar teléfono ni PIN.
**PASS reportado por el usuario** para instalación y persistencia, no observación
remota directa de Codex. La captura adjunta acredita especificaciones, no la UI de
la app. Ausencia de barra de direcciones/standalone todavía no confirmada.
Esta prueba de un dispositivo no acredita los tres perfiles humanos de usabilidad.

| Comprobación | Android | iOS/iPadOS |
| --- | --- | --- |
| Instalación real | PASS — confirmado por usuario, perfil A | NOT EXECUTED |
| Standalone | NOT EXECUTED | NOT EXECUTED |
| Login/persistencia/cierre/reapertura | PASS — confirmado por usuario, perfil A | NOT EXECUTED |
| Availability/Avisos/Mi programa | NOT EXECUTED | NOT EXECUTED |
| Permiso push contextual | NOT EXECUTED | NOT EXECUTED |
| Foreground | NOT EXECUTED | NOT EXECUTED |
| Background / aviso OS visible | NOT EXECUTED | NOT EXECUTED |
| Click / destino / ownership | NOT EXECUTED | NOT EXECUTED |
| Offline sin falso guardado | NOT EXECUTED | NOT EXECUTED |
| Recovery / reintento explícito | NOT EXECUTED | NOT EXECUTED |
| Update | NOT EXECUTED | NOT EXECUTED |
| Logout / desaparición de datos privados | NOT EXECUTED | NOT EXECUTED |

Android: Chrome → URL → instalar → abrir standalone → login → cerrar/reabrir →
Availability/Avisos/programa → habilitar permiso por clic → foreground/background
→ clic/destino propio → offline/intento mutable sin éxito falso → reconexión/reintento
explícito → update si seguro → logout. Registrar modelo/OS general, no identificadores.

iOS: Safari → URL → Añadir a pantalla de inicio → abrir standalone → login →
cerrar/reabrir → Availability/Avisos/programa → permiso/push/background/clic solo
si soportados en la versión y desde instalación → offline/recovery → logout.
Una limitación de plataforma necesita evidencia concreta y fallback comprobado;
no se presupone limitación ni se atribuye a Campañas sin diagnóstico.

En ambos: viewport real aproximadamente 360–430px, teclado abierto, formularios,
diálogos, scroll, textos largos y controles alcanzables. Revisar targets, contraste
observable, zoom, labels/foco/errores y teclado. Sin declaración formal WCAG.
FCM accepted, notificación visible, clic y destino son evidencias separadas.

## Tres perfiles humanos — PENDING EXTERNAL

| Perfil | Ingreso | Disponibilidad | Pareja | Avisos | Mi programa | Cambio | Ayuda requerida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A tecnológico | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | No observada |
| B smartphone básico | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | No observada |
| C adulto mayor/WhatsApp | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED | No observada |

Registrar por tarea: PASS sin ayuda / PASS con ayuda / FAIL, confusión concreta,
ayuda requerida y comentario textual breve real. Tiempo/clics/errores solo si
observables; actualmente no medidos. Cubrir comprender Inicio, guardar y cambiar
disponibilidad, cobertura si aplica, solicitar pareja, responder cuando corresponda,
Avisos, programa, entender cambio y logout. No hay respuestas simuladas por IA.

## Findings / bugs / fixes

### BLOCKER

Ninguno demostrado por preparación. QA crítico pendiente: no significa cero
blockers acreditados en dispositivos/personas.

### HIGH

Ninguno nuevo observado; sin evaluación física/humana todavía.

### MEDIUM

F10-M01: reordenación manual de puntos, backlog previo F12. No implementada ni
usada para bloquear la ejecución del piloto.

### LOW

Presentación de warnings, backlog previo F12. Sin cambio en esta fase.

No bugs funcionales corregidos ni código de aplicación modificado. Si aparece un
bug real: reproducir/clasificar, test, fix mínimo, regresión requerida, deploy solo
staging y repetir la prueba física. Dos perfiles incapaces de tarea crítica sin
ayuda importante, atrapamiento, falso éxito, pérdida de datos o barrera de acceso
se clasifican conforme al prompt; no decidir por métricas inventadas.

## Observación técnica y producción read-only

- Health 200/ready en ambos. Staging código desplegado `607a88fa13a02541de307cbecc8d9b72d202a5d0`;
  producción `fe80aff9c2e99ab62f15fc4e7301831cb7af231b`. SHA de documentación
  posterior no se presenta como código desplegado. No rollout en F11F.
- Readback productivo: campaigns, participants, campaignRegistrations, availabilities,
  pairRequests, campaignAssignments, campaignNotifications, pushSubscriptions y
  deviceSessions = **0 cada una**. No se modificó producción para lograr estos ceros.
- Recordatorios staging ENABLED/status 0; producción PAUSED. Export diario de ambos
  ENABLED, últimas ejecuciones 2026-10-10 06:15 UTC/status 0.
- Buckets uniform/private, public access prevention enforced, lifecycle 30 días;
  backup administrado productivo diario/7 días. No restore productivo.
- Cuatro métricas y cuatro políticas enabled por entorno. Consulta staging acotada
  desde 2026-10-11 00:47 UTC: solo 400 esperado por teléfono ficticio ya existente;
  sin 5xx/auth429/push failures/scheduler ERROR observados. No acredita monitoreo
  del futuro piloto ni ausencia de errores de navegador físico.
- Runtime ambos sin Owner/Editor/SDK Admin/Auth Admin amplio. Solo datastore.user,
  developerconnect.readTokenAccessor, firebaseapphosting.computeRunner,
  firebaseauth.viewer, firebasecloudmessaging.admin y storage.objectViewer.
  OTEL real `tracecontext,baggage`; sin Jaeger. IAM/OTEL no se cambiaron.
- Sin audit nuevo ni dependencia modificada; se conserva evidencia F11E de
  0 CRITICAL, sin UNKNOWN nuevo ni HIGH relevante no mitigado identificado.
  Auth vigente **160 registros / 240 logins / 15 minutos**, sin cambios.

## Regresión

Sin cambios de código de aplicación ni dependencias: baseline F11E aprobado,
**334 PASS / 0 skips** preservado, no rerun completo atribuido a F11F.
F2 12, F3 13, F4 20, F5 25, F6 51, F7 64, F8 64, F9 56, F10 12, F11 17.
Typecheck/build: PASS del baseline F11E; no ejecución nueva en F11F documental.
Helpers privados de QA son herramientas operacionales fuera del repositorio,
no funcionalidad nueva ni cambio del producto. No se relajó ninguna suite.

## Cleanup reproducible — preparado, NO aplicado

Manifest privado durable fuera de Git: proyecto explícito, run/campaignId,
paths exactos de 45 documentos de configuración propios y tres identidades.
Dry-run inicial: **66 documentos propios**, antes del preflight adicional.
Dry-run posterior al preflight: **78 documentos propios**, seis sesiones técnicas
ya revocadas, sin borrar ni deshabilitar los perfiles.
El número crece con sesiones/eventos del piloto: recalcular, nunca usar ese número
como autorización para borrar otros documentos. PINs solo en tarjetas privadas
con permisos 0600/directorio 0700; descartarlos después del cleanup.

Procedimiento stage-only:

1. Esperar análisis concluido y no borrar una reproducción de bug pendiente.
2. Verificar proyecto, marcador qaRun, nombre exacto/telefono ficticio de cada
   identidad y ownership de inscripciones. Si otro participante se inscribió o
   existe actividad de estas cuentas en otra campaña: STOP y revisar, no borrarla.
3. Descubrir hijos por campaignId/participantId; incluir sesiones/subscriptions/
   notifications/outbox/deliveries, audit y locks propios. Índices telefónicos y
   límites individuales se contrastan por HMAC en memoria, nunca por teléfono real.
4. Congelar únicamente perfiles verificados con precondición updateTime;
   releer sesiones/perfiles. Eliminar targets exactos en batch con updateTime;
   cualquier carrera falla sin borrado parcial. No recursiveDelete.
5. Readback de ausencia de IDs/consultas propias; descartar PINs y tarjetas.
   Conservar evidencia sin secretos. Global auth limits/dispatcher lock/fixture
   F11C/F11D ajenos permanecen intactos; TTL global es infraestructura compartida.

Herramienta preparada con dry-run por defecto y confirmación separada de análisis
completo para apply. **No cleanup aplicado:** las tres personas aún necesitan sus
cuentas y no se deshabilitaron antes del piloto.

## Decisión y siguientes acciones

**PILOTO CONTROLADO: EN CURSO / NO ACREDITADO**. Instalación y persistencia Android
confirmadas por el usuario; resto del flujo crítico aún no completado. No un FAIL
funcional demostrado ni un PASS del piloto completo. **LAUNCH READINESS = NO-GO**.
No nueva decisión de arquitectura/producto: DECISIONS_LOG sin entrada repetida.
Issues #11/#12: mantener abiertas, sin recomendación de cierre todavía.
PR #15 OPEN/Draft, sin merge ni main.

Pendientes reales de esta continuación (máximo cinco): resto de QA Android físico;
tres humanos A/B/C; completar eventos/observación durante esas sesiones;
cleanup/análisis y recomendación final tras evidencia. iOS no ejecutado y fuera
de esta continuación a petición del usuario. No pedir configuraciones cloud.
