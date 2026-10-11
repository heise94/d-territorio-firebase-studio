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
   Excepción de preparación técnica documentada abajo: B envió un evento de
   prueba para observar recepción en Android A; no se cuenta como tarea humana B.
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
la app. El usuario confirmó después apertura desde el icono sin barra de
direcciones de Chrome: **standalone PASS reportado por usuario**.
También guardó disponibilidad, cerró/reabrió la app, editó los horarios y volvió
a guardar correctamente: **Availability crear/editar tras reapertura PASS
reportado por usuario**. No se atribuyen tiempos ni clicks no observados.
Esta prueba de un dispositivo no acredita los tres perfiles humanos de usabilidad.

### Android — activación y primer evento real

El usuario activó notificaciones desde Avisos y reportó cero avisos iniciales.
Con historial vacío, actualizar conserva cero y marcar todos no tiene avisos que
modificar; esta observación por sí sola no demuestra un bug.
Readback técnico: **una suscripción enabled/platform=android**, perteneciente a
perfil A con sesión propia vigente. Sin imprimir token ni cookie.

Para probar recepción se eligió explícitamente el contraparte ficticio B como
fixture técnico (no persona humana simulada ni evidencia de usabilidad B).
Login B → endpoint real PairRequest B→A → logout técnico B. Respuesta 200/pending,
Notification y outbox reales; no edición manual de avisos, Availability, Assignment,
vínculo accepted ni snapshots. No se modifica la sesión Android de A.
Readback del evento 2026-10-11 01:57:57 UTC: `pair_request_created`, título
«Solicitud para participar juntos», unread=1, destino `/campanas/participar-juntos`;
outbox delivered y una delivery delivered/attempts=1/error=null.
FCM accepted técnico se verificó por separado de la observación humana.
El usuario confirmó que apareció automáticamente, sin «Actualizar avisos», el
aviso «Solicitud para participar juntos», marcado «No leído», con acciones para
revisar en la aplicación y marcar como leído. **Foreground/in-app PASS reportado
por usuario**. No se atribuye un banner nativo Android: esa comprobación requiere
la prueba independiente con la app en segundo plano.

### Android — background: primer intento sin notificación visible

Tras pedir ir a la pantalla de inicio sin cerrar sesión, el usuario respondió
«listo». Se eligió explícitamente C como segundo contraparte ficticio técnico y
se creó PairRequest C→A por el endpoint existente, sin aceptación/asignación
automática ni modificación de la sesión Android. Evento 2026-10-11 02:00:37 UTC:
API 200/pending, aviso persistido; outbox y única delivery delivered, intento 1,
error=null. El historial tiene dos avisos sin leer.

El usuario informó **«no mostró nada de nada»** fuera de la app. **FAIL del
primer intento background**, no PASS basado en FCM. Click no ejecutado.
Todavía falta distinguir ausencia de banner frente a ausencia en el panel nativo.
No se atribuye la causa a Xiaomi, batería, permisos ni código sin comprobarla.

Lectura de logs para cada evento: el primero tiene revalidación push-event 200 a
01:57:58 UTC; el segundo tuvo revalidación desde worker a 02:04:16 UTC. Esto no
demuestra una visualización del sistema ni identifica la causa: el envío aceptado
no prueba recepción/ejecución o presentación oportuna en Android y puede haber
demora de logs.
Consulta de señales desde 01:57 UTC sin 5xx/429/push failures/scheduler ERROR.
Sin cambios de ajustes, reenvío ciego, código, IAM ni producción. Diagnóstico
abierto: comprobar primero el panel nativo sin abrir la app.

Continuación humana: el usuario confirmó una notificación nativa «D-Territorio
Campañas», «Tienes un aviso nuevo, revisa la aplicación», con acción de anular
suscripción. **OS display confirmado por usuario**. Indicó que estaba usando
Chrome y pidió repetir para aislar si esa apertura precedió la llegada. Se
conserva el resultado inicial sin aviso observado; no se declara aún independencia
de Chrome ni entrega oportuna en background. Click de navegación sigue sin ejecutar.

Repetición expresamente solicitada: el usuario borra solo el aviso nativo, NO
anula la suscripción, deja Chrome/Campañas en segundo plano y responde «listo».
Se verifica que sigue existiendo una suscripción Android activa con sesión vigente.
Para generar un evento NUEVO por el servicio normal, el contraparte técnico B
cancela únicamente su solicitud original pending y crea otra B→A. Se verifica ID,
ownership y status antes de cancelar; jamás se toca accepted, Availability,
Assignment, snapshots ni solicitud C→A. Historial y auditoría conservados.
Evento nuevo 2026-10-11 02:07:35 UTC: API 200/pending, tercera Notification propia;
outbox/delivery delivered, intento 1/error=null. No reenvío del evento anterior.
El usuario informó que no hubo aviso nativo con Chrome cerrado; al abrir Campañas
sí vio los avisos internos. Confirmó expresamente que Chrome solo estaba cerrado,
no forzado ni deshabilitado.

Último control aislado: se creó un cuarto evento nuevo C→A a las 02:15:03 UTC,
previa cancelación únicamente de la solicitud técnica C→A pending original y sin
tocar relaciones accepted, Availability, Assignment ni snapshots. API 200/pending,
Notification/outbox/delivery delivered (intento 1/error=null). El usuario confirmó
que tampoco apareció en el panel nativo, ni antes ni después de abrir Chrome, sin
abrir Campañas durante esa comprobación. **FAIL reproducible de entrega visible
background Android**. El envío FCM y el dato persistido no constituyen PASS.

Control adicional de configuración: el usuario verificó permiso general y del
sitio activos y desactivó temporalmente para Chrome la opción Xiaomi de pausar la
actividad de una app no usada (que puede retirar permisos/detener notificaciones).
Con Campañas en segundo plano y Chrome cerrado, se creó un quinto evento nuevo
C→A a las 02:24:50 UTC, cancelando exclusivamente la solicitud técnica C→A
pending inmediata anterior. API 200/pending, Notification/outbox/delivery
delivered, intento 1/error=null. El usuario confirmó **«no pasa nada»** en el
panel nativo. Ese ajuste no resolvió el fallo; se suspende el reintento ciego y
queda pendiente revisar batería/datos y ejecución real del worker.

| Comprobación | Android | iOS/iPadOS |
| --- | --- | --- |
| Instalación real | PASS — confirmado por usuario, perfil A | NOT EXECUTED |
| Standalone | PASS — desde icono, sin barra Chrome, confirmado por usuario | NOT EXECUTED |
| Login/persistencia/cierre/reapertura | PASS — confirmado por usuario, perfil A | NOT EXECUTED |
| Availability guardar/editar tras reapertura | PASS — confirmado por usuario, perfil A | NOT EXECUTED |
| Avisos | PASS — aviso recibido automáticamente, confirmado por usuario | NOT EXECUTED |
| Mi programa | NOT EXECUTED | NOT EXECUTED |
| Permiso push contextual | Activación reportada por usuario; suscripción Android vigente verificada | NOT EXECUTED |
| Foreground / recepción in-app | PASS — confirmado por usuario sin refresh manual | NOT EXECUTED |
| Background / aviso OS visible | FAIL reproducible: no visible con Chrome cerrado ni al abrir Chrome; hubo un único display previo con factor Chrome no aislado | NOT EXECUTED |
| Click / destino / ownership | NOT EXECUTED | NOT EXECUTED |
| Offline sin falso guardado | PASS — perfil A: app cerrada y luego abierta sin red muestra «Sin conexión»; app abierta al activar modo avión cambia inmediatamente a esa pantalla y no permite editar Availability | NOT EXECUTED |
| Recovery / reintento explícito | PASS — tras reactivar conectividad, Availability cargó normalmente y conservó el estado anterior; sin reintento oculto | NOT EXECUTED |
| Update | NOT EXECUTED | NOT EXECUTED |
| Logout / desaparición de datos privados | PASS — perfil A cerró sesión y, al reabrir, solo vio acceso por teléfono y PIN; sin datos previos visibles | NOT EXECUTED |

Android: Chrome → URL → instalar → abrir standalone → login → cerrar/reabrir →
Availability/Avisos/programa → habilitar permiso por clic → foreground/background
→ clic/destino propio → offline/intento mutable sin éxito falso → reconexión/reintento
explícito → update si seguro → logout. Registrar modelo/OS general, no identificadores.

### Android — offline sin falso guardado

El usuario realizó dos pruebas físicas con el perfil A. Con Campañas cerrada y
modo avión activado, al intentar abrirla apareció «Sin conexión». Con Campañas ya
abierta, al activar modo avión la pantalla cambió inmediatamente a «Sin conexión».
En ambos casos no fue posible editar Availability ni simular un guardado. **PASS
reportado por usuario: offline bloquea la mutación sin falso éxito.** Queda por
verificar la recuperación al restablecer conectividad y el reintento explícito.
El usuario reactivó conectividad, abrió Campañas y confirmó que la pantalla dejó
de indicar «Sin conexión», Availability cargó normalmente y conservó su estado
anterior. **PASS reportado por usuario: recuperación sin pérdida ni reintento
oculto.**

### Android — logout

El usuario cerró sesión en el perfil A y al reabrir Campañas volvió a la pantalla
de ingreso por teléfono y PIN, sin datos previos de la cuenta visibles. **PASS
reportado por usuario: logout y ocultación de datos privados.** Falta únicamente
el reingreso posterior como comprobación separada de recuperación de sesión.
El usuario reingresó con el perfil A sin error y confirmó que recuperó Inicio y
su disponibilidad previa. **PASS reportado por usuario: reingreso posterior y
restauración de estado propio.**

### Android — orientación en Inicio

Desde Inicio, el usuario confirmó que identifica fácilmente el nombre de la
campaña, el acceso a su disponibilidad y la información de estado/cobertura sin
ayuda. **PASS reportado por usuario: orientación básica de Inicio para perfil A.**

### Android — Mi programa antes de publicación

El usuario abrió Mi programa y encontró el nombre de la campaña ficticia,
«El programa todavía no ha sido publicado» y «Mis solicitudes de cambio: no tiene
solicitudes de cambio». Confirmó que el estado se entiende sin ayuda. **PASS
reportado por usuario: estado vacío pre-publicación y ausencia de ChangeRequests
claros.** Esto no acredita Mi programa con asignaciones: para ello hace falta
publicar un programa de piloto válido tras disponibilidad humana B/C.

### Programa ficticio v1 — publicación controlada

Después de que el operador guardara Availability para B y C, se verificaron tres
inscripciones activas. Se cerraron inscripciones **solo** para la campaña staging
`Piloto humano F11F — NO REAL` y se creó manualmente una unidad A–C en Punto
ficticio 1, lunes 08:00–09:00. El motor respetó el vínculo accepted, disponibilidad
y máximo de turnos, sin override ni blocker. Se revisaron y confirmaron de forma
explícita los warnings de puntos ficticios vacíos. Publicación 200: campaña
`published`, ProgramVersion v1 única, dos Assignments `published`; no producción
ni campaña real afectada. Pendiente la observación física de Mi programa y Avisos
para A/C; B queda sin turno publicado.

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

El operador del piloto inició sesión correctamente en el perfil ficticio C desde
el mismo Xiaomi usado por A. Es una comprobación funcional de acceso C; **no** se
acredita como prueba humana independiente del perfil C ni como evidencia de
usabilidad de adulto mayor.
El operador marcó y guardó los tres bloques de la mañana del primer día para C.
Readback técnico confirmó los tres Availability y su coincidencia con bloques ya
marcados por A. Es preparación funcional para un vínculo de prueba, no evidencia
humana independiente C.
En «Participar con otro hermano», el operador vio A como vínculo aceptado y los
tres horarios compartidos; el texto dejó claro que deben ser asignados juntos,
sin presentar un turno como confirmado. **PASS funcional A–C: vínculo accepted
con bloques comunes visibles.**

Registrar por tarea: PASS sin ayuda / PASS con ayuda / FAIL, confusión concreta,
ayuda requerida y comentario textual breve real. Tiempo/clics/errores solo si
observables; actualmente no medidos. Cubrir comprender Inicio, guardar y cambiar
disponibilidad, cobertura si aplica, solicitar pareja, responder cuando corresponda,
Avisos, programa, entender cambio y logout. No hay respuestas simuladas por IA.

Observación de usabilidad real durante el perfil A: al abrir un aviso de PairRequest
se vio únicamente el nombre del invitante y el mensaje «Conflicto de horarios».
El conflicto es esperado en este fixture: B/C técnicos no tienen Availability
humana cargada, por lo que no existe bloque compartido. La PairRequest vigente es
un vínculo para la campaña, no una invitación a un turno particular; cuando sí hay
intersección, la interfaz existente lista fecha y hora de los bloques compartidos.
Feedback del usuario: hacer más explícito que debe revisar/actualizar su propia
disponibilidad y que los horarios aparecerán al existir coincidencia. No se expone
la disponibilidad individual del invitante ni se cambia el alcance congelado de
F11F sin decisión explícita; registrar para revisión de UX posterior.

El usuario rechazó una solicitud pendiente de prueba. Confirmó que el estado pasó
a «Rechazada», desaparecieron los controles para responder y la solicitud quedó
en el historial conservando el nombre esperado. **PASS reportado por usuario:
PairRequest pending → rejected, historial visible y sin exposición adicional.**

## Findings / bugs / fixes

### BLOCKER

Ninguno demostrado por preparación. QA crítico pendiente: no significa cero
blockers acreditados en dispositivos/personas.

### HIGH

F11F-A01, HIGH: notificación background no visible de forma reproducible en
Android perfil A. En tres controles aislados no apareció con Chrome cerrado;
uno tampoco apareció al abrir Chrome y otro ocurrió con la pausa automática de
apps sin uso desactivada. Hubo una sola visualización previa,
no aislada porque el usuario estaba usando Chrome. El backend registró Notification,
outbox y delivery FCM sin error, pero ello no acredita presentación nativa. No hay
bug de código ni limitación de plataforma causalmente confirmados todavía. No
cerrar como PASS ni aplicar un fix especulativo: investigar el recorrido Android
real y permisos/worker con evidencia antes de cambiar producto.

### MEDIUM

F10-M01: reordenación manual de puntos, backlog previo F12. No implementada ni
usada para bloquear la ejecución del piloto.

### LOW

Presentación de warnings, backlog previo F12. Sin cambio en esta fase.

F11F-U01, observación UX: el texto de conflicto de PairRequest puede no explicar
suficientemente que la solicitud no está ligada a un turno y que los horarios
compartidos solo se muestran después de que ambos indiquen disponibilidad. No es
fallo de datos ni de seguridad; revisar el microcopy y su enlace de disponibilidad
con evidencia adicional de perfiles humanos antes de priorizarlo.

F11F-U02, observación UX: el operador no encontró inicialmente «Participar con
otro hermano» porque no está en la navegación inferior; la ruta es
Disponibilidad → campaña → enlace bajo el título. La función operó correctamente
una vez localizada. Evaluar descubribilidad de la entrada sin alterar F11F.

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

**PILOTO CONTROLADO: EN CURSO / NO ACREDITADO**. Instalación, standalone,
persistencia y guardar/editar Availability tras reapertura en Android confirmados
por el usuario; resto del flujo crítico aún no completado. No un FAIL
funcional demostrado ni un PASS del piloto completo. **LAUNCH READINESS = NO-GO**.
No nueva decisión de arquitectura/producto: DECISIONS_LOG sin entrada repetida.
Issues #11/#12: mantener abiertas, sin recomendación de cierre todavía.
PR #15 OPEN/Draft, sin merge ni main.

Pendientes reales de esta continuación (máximo cinco): resto de QA Android físico;
tres humanos A/B/C; completar eventos/observación durante esas sesiones;
cleanup/análisis y recomendación final tras evidencia. iOS no ejecutado y fuera
de esta continuación a petición del usuario. No pedir configuraciones cloud.
