# Fase 10 — Validación integral y campaña piloto

Fecha: 2026-10-05. Rama: `feature/campanas-v1`.
Base verificada: `1d640d89fd07288787a8005663c081e6953ddc86`.
Ambas partes del encargo se leyeron antes de modificar el código.

## Decisión

**FASE 10 COMPLETA TÉCNICAMENTE — GO TÉCNICO PARA F11.** Validaciones finales registradas abajo.
No se implementa F11, no se despliega, no se hace merge y no se cierran Issues #8/#11.
QA EXTERNO PENDIENTE: Android/iOS físicos, usabilidad con tres perfiles, FCM real
y vista previa nativa de impresión en Mac. **Piloto final NO aprobado para producción**.
El FAIL de reordenación manual de puntos es MEDIUM no bloqueante, registrado para F12.

## Entorno y límites de la evidencia

Mac local, Node 24.19.0, Next 15.2.3, Firebase Auth/Firestore emulators.
Proyecto exclusivo `demo-campaign-auth`; Auth localhost:9099, Firestore localhost:8088.
Se ejecutó `npm ci`; dependencias sin cambios. npm reporta 82 vulnerabilidades del
árbol histórico (6 low, 34 moderate, 38 high, 4 critical); no se aplicó audit fix ni
se certificó la seguridad de dependencias para producción. La revisión de ese
árbol corresponde al proceso previo a despliegue, separado de los bugs del flujo
Campañas observados aquí.

Todos los nombres, teléfonos, PIN y credenciales de fixtures son sintéticos.
Los seeds rehúsan ejecutarse sin localhost y el ID demo explícito. Limpian solo
la base desechable demo. Ningún dato real, secreto FCM/VAPID/service-account ni job
secret se incluyó en Git. No hay fallback de seed a un proyecto productivo.
La conexión temporal del cliente a emuladores usada en QA de navegador se retiró;
`src/lib/firebase.ts` queda intacto.

Los tests de API invocan Route Handlers reales con NextRequest, cookie/Origin,
bcrypt real y servicios Admin contra emuladores; no son un benchmark HTTP de red.
El flujo crítico usa el repositorio cliente Firebase real con sus Rules.
La prueba de navegador usa la app Next real y esos emuladores. No sustituye
instalación, push o E2E en un móvil físico.

## Reproducibilidad

Arrancar emuladores con `firebase.campaign-auth.json` (Java 17 o compatible):

```sh
FIREBASE_ADMIN_PROJECT_ID=demo-campaign-auth \
  npx firebase-tools@13.35.1 emulators:start --only auth,firestore \
  --project demo-campaign-auth --config firebase.campaign-auth.json
```

En otra terminal, Node >=22, variables explícitas:

```sh
export FIREBASE_ADMIN_PROJECT_ID=demo-campaign-auth
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8088
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
npm ci
npm run test:campaign-auth
npm run test:campaign-registration
npm run test:campaign-pair-requests
npm run test:campaign-admin-dashboard
npm run test:campaign-planner
npm run test:campaign-program
npm run test:campaign-changes
npm run test:campaign-notifications-pwa
npm run test:campaign-pilot
npm run typecheck
npm run build
```

Las suites limpian la misma base demo: ejecutarlas en serie.
Seed visual opcional, sin operar campañas reales:

```sh
node --require ./tests/campaign-auth/server-only.cjs --import tsx tests/campaign-pilot/seed.ts 80 published
# sustituir 80 por 150; omitir published para borrador planning
```

`seed.ts` imprime solo proyecto/tamaño/ID demo/estado, no sesiones/tokens.
Para UI local usar configuración demo y conexión a emuladores en una copia
temporal de desarrollo; jamás apuntar estos fixtures al Firebase productivo.
La preparación es seed, no reparación operativa ni edición manual de datos.

## Datasets

| Característica | Piloto 80 | Rendimiento 150 |
|---|---|---|
| Congregaciones / días / bloques | 4 / 3 / 24 (8/día) | 4 / 3 / 24 (8/día) |
| Puntos globales | 8; activos por bloque 3/4/5/8 | 8 activos por bloque |
| Perfiles/registrations | 80 ficticios activos | 150 ficticios activos |
| Disponibilidad | 0/1/15/16/17/35/60/75 y bloque de exceso | Más de 3000 documentos |
| Capacidad | 16, override cero | 16, override cero probado |
| MaxTurns | 1/2/3/null | 1/2/3/null |
| Vínculos | pending, rejected, accepted, accepted sin overlap | Mismos estados |
| Asignaciones | completas/incompletas/vacantes, reservas y no asignados | 384 slots llenos |
| Nombres | repetidos y nombre extenso | repetidos y nombre extenso |
| Versiones/cambios | Tests publican v1 → v2 → v3 | Publicación real v1 para consultas |

Los overrides del seed son datos sintéticos deliberados para warnings/maxTurns,
no una dispensa de validación. El flujo crítico crea sus propias assignments
por servicios de dominio, con confirmaciones reales, sin reparar Firestore.

## Flujo crítico y evidencia de navegador

`critical-flow.test.ts` ejecuta los 27 pasos: organizer autenticado configura una
campaña con el repositorio de la pantalla; abre inscripción antes de puntos;
cuatro identidades se registran con AuthRoute; guardan Availability; A pide B;
B acepta; organizer pasa a planning, crea/activa ocho puntos, asigna A+B como
unidad y otra pareja manual; genera borrador, publica v1, consulta solo turnos
propios/compañero; A solicita cambio, admin aprueba sin cambiar v1, elige reserva
manual, resuelve en unidad, crea v2; Mi programa/avisos se actualizan y PDF v1
permanece byte-identical. createdBy conserva el UID real del emulador.
El flujo no usa Excel, Forms ni scripts/ediciones manuales como herramientas
operativas: scripts únicamente para seed/pruebas.

En navegador local: participante ficticio 003 ingresa, abre Mi programa v1,
solicita cambio sin comentario (microcopy no información privada), ve pending.
Organizer real del emulador abre la solicitud y aprueba; versión sigue v1,
sin reserva seleccionada y sin cambio de assignment. Elige explícitamente
participante ficticio 040 desde lista alfabética, revisa/acepta advertencias,
confirma y resuelve: panel muestra v2/pending=0. Mi programa recargado muestra
v2, desaparece el turno retirado y aparecen avisos de resolución/actualización.
Los tests además verifican accepted saliente/entrante como unidad, release sin
reemplazo, stale, dos resoluciones y publicación concurrentes y v3.

## AUTH RATE LIMIT PILOT RESULT

Antes: 30 registros y 120 logins globales por 15 minutos.
Medición previa sobre ruta real, concurrency=4:

| Registro | HTTP 200 | HTTP 429 legítimos | p50 ms | p95 ms | Máximo ms |
|---|---:|---:|---:|---:|---:|
| 40 identidades | 30 | 10 | 215 | 12288 | 19529 |
| 80 identidades | 30 | 50 | 5 | 5750 | 9058 |

El límite 30 no sirve para 40–80 altas concentradas.
Final: **160 registros / 240 logins / 15 minutos**.
Server-only: `CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT` y
`CAMPAIGNS_AUTH_LOGIN_GLOBAL_LIMIT`. Rango entero 1–10000; valor inválido falla
cerrado (503), nunca desactiva protección. Sin NEXT_PUBLIC ni permiso cliente.
5 intentos por identidad/teléfono siguen intactos; cambio/reset PIN y budgets
administrativos permanecen iguales. Se comprueba cinco PIN erróneos →401,
sexto intento →429; otro teléfono funciona. También techo global configurado a
2: tres identidades → dos éxitos y un 429.

Se observó contención de transacciones del contador global en un mismo proceso,
con colas de latencia de 7–17 segundos incluso sin 429. Se serializa por clave
HMAC local solo la operación del contador; **Firestore sigue siendo autoridad
distribuida** entre procesos. No hay contador en memoria que conceda acceso ni
se relajan límites individuales. Las entradas de cola se eliminan al finalizar.

| Acción / cantidad | HTTP 200 | 429 legítimos | p50 ms | p95 ms | Máximo ms |
|---|---:|---:|---:|---:|---:|
| register / 40 | 40 | 0 | 852 | 3754 | 4185 |
| register / 80 | 80 | 0 | 856 | 861 | 1060 |
| login / 40 | 40 | 0 | 861 | 1077 | 1080 |
| login / 80 | 80 | 0 | 863 | 1082 | 1099 |
| login / 100 | 100 | 0 | 864 | 1080 | 1088 |

Resultados finales: 40/80 altas, 40/80/100 logins (80 + 20 reintentos), todos HTTP 200.
La cola redujo p95 de registro 80 a 861 ms y de login 80 a 1082 ms; cold start
registro 40 conserva p95 3754 ms. No se promete ese rendimiento en producción.

El script `tests/campaign-pilot/baseline.ts` permite reproducir 30/120 únicamente
contra demo. No genera carga global baja para otras operaciones. Muestras locales
pequeñas, bcrypt costo 12 y arranque frío; no SLA ni benchmark de producción.

## Rendimiento y concurrencia

Dataset 150, 12 muestras por consulta real, p50 aproximado mediana inferior;
p95 aproximado nearest-rank con 12 muestras coincide con máximo. Latencias de
servicios server-side incluyen Auth/Firestore local, no transferencia HTTP/UI.

| Consulta (150) | p50 ms | p95 ms | Máximo ms | Errores |
|---|---:|---:|---:|---:|
| overview | 67 | 78 | 78 | 0 |
| participants | 66 | 75 | 75 | 0 |
| filters | 67 | 79 | 79 | 0 |
| planner | 76 | 80 | 80 | 0 |
| program | 7 | 8 | 8 | 0 |
| versions | 9 | 12 | 12 | 0 |
| notifications | 8 | 9 | 9 | 0 |
| myProgram | 16 | 22 | 22 | 0 |

F5 mantiene 7 consultas + 2 getAll con máscaras de campos, listas paginadas.
No hay instrumentación existente para total de lecturas facturadas del piloto:
no se inventa ese dato. No se observaron queries descontroladas, timeouts ni
degradación crítica en las ocho operaciones del dataset 150. No aparecieron
missing-index/FAILED_PRECONDITION en el flujo probado; **el emulador no certifica
los índices productivos**. No se añadieron índices especulativos.

Ráfagas auth concurrency=4; F3 cubre registro/Availability únicos concurrentes;
F4 solicitudes cruzadas/accepted concurrentes; F6 y F10 dos UID mismo slot;
F7 doble publicación; F8/F10 doble resolución/versiones/stale;
F9 token compartido/outbox/dispatchers/reminders. F10 añade cuatro reads de
overview simultáneos y cuatro lecturas paralelas de Avisos/Mi programa.
No DDoS ni ranking automático.

## PWA, seguridad y recordatorios

F9 se ejecuta íntegra sin relajación: manifest/iconos locales, worker único,
NetworkOnly de páginas/API privadas, offline público sin datos, sin cola de
mutaciones y sin anunciar un guardado falso; guía iPhone, prompt contextual y
actualización manual. Cookie segura persiste; logout revoca y no conserva datos
privados en caché. Los artefactos del build se restauran, sin cambiar el worker.

Regresión F9 detectada en carrera de token: Firestore emulador devolvía
`3 INVALID_ARGUMENT: Transaction is invalid or closed.` en el perdedor, no
el 409 contractual. Se traduce únicamente esa condición de transacción cerrada
y ABORTED a conflicto 409, sin transferencia de ownership ni ocultar errores
INVALID_ARGUMENT genéricos. F10 agrega prueba determinista de ambos códigos,
de propagación de otro error y ausencia de escrituras; F9 original se conserva.

F2–F9 revalidan cookie → sesión → perfil; Zod strict, Origin/CSRF, no-store,
claim actual campaign_admin, cuenta activa/token vigente/no revocado y UID
organizer server-only. Privacidad de DTOs, assignments propios y colecciones
internas cerradas incluso al cliente con claim. Guard MANAGE_CAMPAIGNS intacto.
Rules F10 bloquean editar/eliminar campaign completed y sus días/bloques/puntos/
asociaciones, incluyendo rebind a campaña editable. Congregaciones globales no
se congelan por finalizar una campaña.

Adapter FCM/multidispositivo/rotación/unsubscribe/errores/transitorios/backoff
se validan con proveedor fake explícito: no son prueba de entrega FCM real.
No se crearon claves, tokens reales, VAPID, service accounts ni permisos push.
Job probado con reloj inyectado (zona America/Santiago y DST), no scheduler
productivo. F11 documentada, NO implementada: POST
`/api/internal/campanas/turn-reminders` cada 15 min vía HTTPS,
Bearer `CAMPAIGNS_NOTIFICATION_JOB_SECRET` >=32 caracteres solo en gestor de
secretos; cuerpo strict {}; nunca URL/NEXT_PUBLIC. Ventana 23–24 h previa,
zona Campaign.timeZone → CAMPAIGNS_TIME_ZONE → America/Santiago.

## Responsive y accesibilidad básica

Inspección visual del login en 360/390/430/768/1280 px; Inicio/Mi programa y
solicitud en 390 px; solicitudes administrativas en 360 y 1280 px; programa
en 768 px. No overflow horizontal en páginas medidas (scrollWidth=clientWidth).
Nombre extenso envuelve. Navegación inferior Inicio/Disponibilidad/Mi programa/
Avisos/Más, CTA textual, estados pending/approved/resolved y versión visibles,
comentario opcional con microcopy de privacidad.
Se corrige formulario admin: etiquetas explícitas en español, min-w-0 y ancho
adaptable, formulario de creación con flex-wrap. No se rediseña la app.
PWA utiliza controles principales grandes, texto/estado sin depender solo del
color, confirmaciones para acciones críticas. Esto es revisión básica, **no**
certificación WCAG ni prueba de comprensión con usuarios mayores.
Checklist humano de tres perfiles permanece pendiente.

## PDF e impresión

F7 genera borrador/publicado a partir de datos estructurados; F8/F10 comparan
bytes de PDF de v1/v2 antes y después de nuevas versiones: snapshot histórico
no reconstruido desde datos vivos. Nombres de archivo incluyen versión.
Se inspeccionaron las seis páginas del PDF de nombres largos generado por
F7: A4 horizontal, 8 puntos en grupos de 4, texto envuelto sin recorte,
encabezados/pies por página y contraste negro/blanco.
PDF piloto v1 y v2: 18 páginas A4 horizontales cada uno. Se renderizaron e
inspeccionaron las 18 páginas de v2: los nombres extensos envuelven, no hay
recortes ni solapamientos; encabezados/pies y versión son legibles. La suite
comprueba que v1/v2 históricos conservan exactamente sus bytes.
No se reexportaron ni alteraron PDFs para maquillar evidencia.

**Inspección visual nativa de impresión en Mac: PENDIENTE.**
La herramienta nativa informó Mac bloqueado/no desbloqueable. No se intentó
sortearlo, no se marca PASS y Issue #8 sigue abierta. Renderizar PDF no sustituye
preview nativo, impresión color o papel físico.

## Bug triage

| ID | Severidad | Área | Resultado | Evidencia | Estado |
|---|---|---|---|---|---|
| F10-H01 | HIGH | Auth | 10/40 y 50/80 altas legítimas recibían 429 | baseline ruta real; suite ráfagas | CORREGIDO: 160/240 |
| F10-M02 | MEDIUM | Auth rendimiento | Contención de contador local creaba colas de varios segundos | medición antes/después | CORREGIDO: cola por clave, transacción distribuida |
| F10-H03 | HIGH | Programa | active/completed perdían programa personal/oficial | F10 active/completed | CORREGIDO: lectura de versión actual preservada |
| F10-M04 | MEDIUM | Configuración | completed seguía editable | F10 Rules/fieldset disabled | CORREGIDO: UI + Rules |
| F10-M05 | MEDIUM | Accesibilidad | EntityForm sin etiquetas españolas explícitas y creación sin wrap | inspección + revisión componente | CORREGIDO localizado |
| F10-M06 | MEDIUM | Push concurrency | Perdedor de token race escapaba como error transacción inválida | reproducción 4 carreras + F9 original + F10 mock específico | CORREGIDO: conflicto 409, ownership intacto |
| F10-M01 | MEDIUM | Orden de puntos | sortOrder inicial existe, falta control de reordenación manual | repositorio + panel actual; AC 8.1 | ABIERTO F12; no integridad/seguridad/bloqueo del flujo |
| F10-L01 | LOW | Programa admin | Muchas advertencias del dataset desplazan programa hacia abajo | 157 warnings en QA v2 tablet | ABIERTO F12, posible presentación colapsable |
| F10-E01 | — | QA externo | Android/iOS/FCM/Mac/usuarios reales no disponibles | sin dispositivos/HTTPS/VAPID; Mac bloqueado | PENDING EXTERNAL |

No hay BLOCKER ni HIGH abierto del flujo principal una vez aprobadas las
validaciones finales. No se arreglan los errores históricos ajenos a Campañas.

## Validación técnica final

| Suite | Resultado final |
|---|---|
| F2 auth | 12/12 |
| F3 registration | 13/13 |
| F4 pair requests | 20/20 |
| F5 dashboard | 25/25 |
| F6 planner | 51/51 |
| F7 program | 64/64 |
| F8 changes | 64/64 |
| F9 notifications/PWA | 56/56 |
| F10 pilot | 12/12 |

Total: **317/317**, sin skips. Salida de todas las suites: 0.
Logs locales: `/tmp/f10-final-campaign-*.log`, typecheck/build en
`/tmp/f10-final-typecheck.log` / `/tmp/f10-final-build.log`.
Los logs son evidencia efímera local; métricas/resultados se conservan aquí.

Typecheck: únicamente cuatro errores Date/Timestamp en Limpieza y dos imports
ausentes de Territorios. Build: falla por esos dos imports de Territorios.
No se cambian, silencian ni exceptúan desde configuración. No errores nuevos
de Campañas. Build fallido **no** se presenta como build productivo aprobado.
Los tests previos no se modificaron ni relajaron.
Se registró fallo intermitente F9 inicialmente; se diagnosticó y corrigió en
código de producción con prueba nueva, antes del pase final. La primera
invocación sin variables de emulador se detuvo de forma segura; no se usó como
evidencia de funcionalidad.

## Matriz completa de Acceptance Criteria

Cada fila corresponde a un bullet de ACCEPTANCE_CRITERIA.md o paso global.
PASS es evidencia técnica del entorno indicado; no significa aprobación
productiva ni sustituye pruebas físicas. FAIL 8.1 se refiere exclusivamente a
reordenación manual faltante (CRUD/activación sí pasan), severidad MEDIUM F12.
No se declara PASS de instalación/FCM real/impresión nativa/usabilidad externa.

| ID | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1.1 | Se puede crear una campaña sin valores fijos en código. | PASS | F10 critical-flow: repositorio cliente real crea Campaign con UID; sin constantes de campaña productiva. |
| 1.2 | Fechas, bloques horarios, congregaciones, capacidad objetivo y máximo de puntos son configurables. | PASS | F10 critical-flow: 4 congregaciones, 3 días, 24 bloques, capacidad/puntos configurados. |
| 1.3 | Los estados `draft`, `registration_open`, `planning`, `published`, `active` y `completed` afectan correctamente la interfaz. | PASS | F3/F5/F6 controlan estados; F10 active/completed conserva lectura oficial y Rules impiden editar completed. |
| 1.4 | No se requiere definir todos los puntos antes de abrir inscripciones. | PASS | F10 critical-flow abre inscripción antes de crear/activar puntos. |
| 2.1 | Un participante puede identificarse mediante teléfono + PIN. | PASS | F2 login + F10 ráfagas vía route real con teléfono/PIN. |
| 2.2 | El PIN nunca se almacena en texto plano. | PASS | F2 bcrypt costo 12, salt/pepper y DTO; ningún PIN real. |
| 2.3 | Tras un acceso correcto, el dispositivo puede quedar como confiable. | PASS | F2 cookie HttpOnly, expiración y DeviceSession. |
| 2.4 | La sesión persistente permite volver a abrir la PWA sin pedir PIN mientras siga vigente. | PASS | F2 persistencia/renovación; reapertura física PENDING EXTERNAL. |
| 2.5 | Existe un mecanismo de cierre/revocación de sesión. | PASS | F2 logout, cambio/reset PIN y revocación total. |
| 2.6 | Un participante no puede leer datos privados de otros participantes. | PASS | F2/F3/F8/F9 aislamiento, Rules y DTO mínimos. |
| 3.1 | La PWA puede instalarse cuando el navegador lo permite. | PENDING EXTERNAL | F9 manifest/prompt técnico PASS; instalación real Android/iOS pendiente. |
| 3.2 | Existe una experiencia clara para Android y una guía para iPhone cuando corresponda. | PASS | F9 guía iPhone, detección iPadOS y banner Android; prueba física pendiente. |
| 3.3 | La navegación móvil es simple, predecible y usable por personas mayores. | PENDING EXTERNAL | Revisión visual móvil PASS básico; usabilidad con adultos mayores aún pendiente. |
| 3.4 | Existe una pantalla offline básica. | PASS | F9 offline: NetworkOnly privado, fallback público y ningún falso guardado. |
| 3.5 | La app conserva sesión de forma segura. | PASS | F2 cookie persistente segura; F9 sin caché privada. |
| 4.1 | El participante puede registrar nombre, teléfono, congregación, disponibilidad y máximo de turnos. | PASS | F10 critical-flow usa AuthRoute y RegistrationService; F3 schemas strict. |
| 4.2 | La disponibilidad se registra por bloque horario. | PASS | F3 transacción multi-bloque + F10 24 bloques. |
| 4.3 | El máximo de turnos es visible para los organizadores. | PASS | F3 MaxTurns 1/2/3/null; F5 ficha/listado y F10 reservas. |
| 4.4 | Una inscripción puede actualizarse mientras esté permitido por el estado de campaña. | PASS | F3 estado abierto permite edición; planning/published la bloquean. |
| 5.1 | Cada bloque muestra cantidad disponible, asignada y reserva potencial. | PASS | F5 overview: available/assigned/reserve; F10 cobertura variada. |
| 5.2 | La capacidad es configurable. | PASS | F3/F5 fallback, override y cero. |
| 5.3 | Al alcanzar la capacidad principal, el bloque se muestra como completo. | PASS | F3/F5 casos 15/16,16/16 y exceso. |
| 5.4 | Un bloque completo todavía permite que nuevos participantes marquen disponibilidad. | PASS | F3 cobertura concurrente: bloque completo acepta dos disponibilidades. |
| 5.5 | Los nuevos interesados se consideran reserva potencial sin perder su disponibilidad. | PASS | F3/F5 reserva derivada, sin colección/promoción automática. |
| 5.6 | La UI da mayor visibilidad a bloques con baja cobertura. | PASS | F5 mayor déficit primero, textos Necesita apoyo/Completo. |
| 6.1 | Un participante puede solicitar participar obligatoriamente con otro participante. | PASS | F4 creación pending propia; F10 A solicita B. |
| 6.2 | El receptor debe confirmar o rechazar. | PASS | F4 receptor acepta/rechaza; F10 B acepta. |
| 6.3 | La solicitud pendiente aparece destacada al ingresar a la PWA. | PASS | F4 inbox prioritario y componente PWA existente. |
| 6.4 | También puede generar notificación push. | PENDING EXTERNAL | F9 outbox/adapter PASS; entrega FCM real pendiente. |
| 6.5 | La relación solo pasa a ser obligatoria después de la aceptación. | PASS | F4/F6 relación pending no obliga; accepted sí. |
| 6.6 | Una relación aceptada impide publicar asignaciones incompatibles. | PASS | F6/F7 blockers accepted incompatible; F10 asignación unidad. |
| 6.7 | Si no existe disponibilidad común, el sistema muestra el conflicto y no lo resuelve automáticamente. | PASS | F4/F5 conflicto sin overlap; F10 fixture accepted-conflict no asignada. |
| 7.1 | Al seleccionar un bloque solo aparecen participantes disponibles para ese bloque que todavía no fueron asignados en él. | PASS | F6 available/no duplicados; F10 reserva para bloque. |
| 7.2 | Al asignar a un participante, desaparece inmediatamente de la lista de disponibles de ese bloque. | PASS | F6 creación/quitar refleja disponibles. |
| 7.3 | Al quitar una asignación, vuelve a aparecer. | PASS | F6 liberación recupera disponibilidad. |
| 7.4 | Una misma persona no puede ser asignada dos veces en el mismo bloque. | PASS | F6 lock/duplicación; F10 dos UID un slot, un ganador. |
| 7.5 | Los organizadores pueden formar manualmente parejas y asignarlas a puntos. | PASS | F10 unidad A+B y pareja manual independiente vía servicio. |
| 7.6 | El sistema nunca forma parejas automáticamente en V1. | PASS | F6/F8 manual; ningún ranking/auto-pair agregado. |
| 7.7 | El máximo de turnos genera advertencia clara antes de excederse. | PASS | F6 warning maxTurns y F8 reemplazo. |
| 7.8 | Un organizador puede confirmar explícitamente una excepción. | PASS | F6/F8 override explícito y auditado; maxTurns no cambia. |
| 8.1 | Se pueden crear, editar, ordenar y activar/desactivar puntos. | FAIL | CRUD/activación PASS por F10 repositorio y F6; orden inicial sortOrder existe, pero no hay control de reordenación manual: F10-M01. |
| 8.2 | Un bloque puede tener una cantidad distinta de puntos activos que otro. | PASS | F6 BlockPoint independiente + F10 3/4/5/8 activos. |
| 8.3 | El sistema soporta al menos 8 puntos por bloque sin degradar la interfaz. | PASS | F7 PDF agrupa 8 puntos; F10 benchmark 150 y visual programa tablet. |
| 8.4 | Cada punto admite dos participantes por bloque en V1. | PASS | F6 slots 1/2 y punto lleno; F10 asignación unidad. |
| 9.1 | El programa se genera desde las asignaciones estructuradas. | PASS | F7 projectProgram; F10 borrador desde assignments. |
| 9.2 | Muestra fecha, bloques, puntos y ambos participantes de cada punto. | PASS | F7 snapshot contiene fecha/bloque/punto/slots; PDF QA. |
| 9.3 | Se adapta a cantidades variables de puntos y bloques. | PASS | F7 paginación puntos/bloques; F10 24 bloques. |
| 9.4 | Existe una versión borrador claramente identificada. | PASS | F7 BORRADOR — NO DISTRIBUIR comprobado en PDF. |
| 9.5 | La versión publicada refleja exactamente los datos publicados. | PASS | F7/F8 snapshots oficiales; F10 aprobación conserva v1. |
| 9.6 | La impresión/PDF mantiene legibilidad, contraste y encabezados. | PENDING EXTERNAL | PDF técnico/visual PASS; impresión nativa/color/papel pendiente. |
| 10.1 | Antes de publicar, las asignaciones permanecen en estado borrador. | PASS | F6 draft y F10 antes de publish. |
| 10.2 | La publicación realiza validaciones antes de confirmar. | PASS | F7 blockers/warnings/expected revision. |
| 10.3 | No se puede publicar una pareja obligatoria aceptada de forma incompatible. | PASS | F7 bloquea accepted separada; F10 unidad validada. |
| 10.4 | Al publicar, cada participante ve solo sus propias asignaciones. | PASS | F7/F10 Mi programa filtrado por cookie y compañero. |
| 10.5 | Se registra fecha de publicación. | PASS | F7 publishedAt y versiones; F10 v1/v2/v3. |
| 10.6 | La publicación puede generar notificaciones a los participantes afectados. | PASS | F9 publicación solo asignados, idempotente; F10 avisos. |
| 11.1 | Un participante puede solicitar un cambio cuando ya no puede modificar directamente una asignación publicada. | PASS | F8 propiedad/versión oficial; navegador F10 crea pending. |
| 11.2 | El organizador puede aprobar, rechazar o resolver la solicitud. | PASS | F8 estados; navegador F10 approve luego resolve; F8 reject. |
| 11.3 | Las modificaciones posteriores al programa quedan auditables. | PASS | F8 audit actor UID/version y trazabilidad cancel/create. |
| 11.4 | Los participantes afectados reciben la información actualizada. | PASS | Navegador F10 Mi programa v2 y aviso destacado. |
| 12.1 | Existe un historial interno de notificaciones. | PASS | F9 centro privado/paginado/leído; F10 notification reads. |
| 12.2 | Push e historial pueden originarse desde el mismo evento de dominio. | PASS | F9 evento interno/outbox atómico e IDs determinísticos; adapter. |
| 12.3 | Se soportan al menos: solicitud de pareja, respuesta, publicación, cambio de asignación, resolución de solicitud y recordatorio. | PASS | F9 pruebas 7 eventos, PairRequest/publicación/F8/reloj reminder. |
| 12.4 | Si el push falla, la información sigue siendo visible dentro de la PWA. | PASS | F9 falla transitoria/invalid-token no borra historial ni revierte programa. |
| 13.1 | Las validaciones importantes existen en backend/reglas, no solo en la interfaz. | PASS | F2–F9 backend/Rules, F10 completed. |
| 13.2 | Los roles administrativos respetan los permisos definidos. | PASS | F5 requireCampaignOrganizer: token/claim vigente/activo; no cambios al guard. |
| 13.3 | Los organizadores autorizados pueden colaborar en la campaña. | PASS | F6/F7/F8 y F10 dos UID reales en emulador. |
| 13.4 | Los participantes nunca pueden acceder a vistas administrativas. | PASS | F5/F8 cookie participante no autoriza admin; guard intacto. |
| 13.5 | No se recopilan datos sensibles innecesarios. | PASS | F2–F9 DTOs sin secretos; comentario breve con microcopy privacidad. |
| 14.1 | Controles principales en PWA tienen tamaño táctil adecuado. | PASS | Revisión móvil: CTA PWA grandes, navegación simple; no auditoría WCAG completa. |
| 14.2 | Texto y estados tienen contraste suficiente. | PASS | Revisión visual: texto oscuro/teal y estados legibles; impresión B/N técnica. |
| 14.3 | No se depende únicamente del color para comunicar estados. | PASS | F5/F7/F8 estados textuales; pendiente/aprobada/versión visibles. |
| 14.4 | Las acciones destructivas o importantes requieren confirmación cuando corresponde. | PASS | Navegador F10 confirmar warnings/resolución; F6/F7 confirmaciones. |
| 14.5 | La UI respeta `DESIGN_SYSTEM.md` y `UI_COMPONENTS.md`. | PASS | Revisión básica DESIGN_SYSTEM/UI_COMPONENTS: PWA tarjetas/nav inferior, labels admin restaurados; no rediseño. |
| 15.1 | se crea campaña; | PASS | F10 critical-flow repositorio cliente real. |
| 15.2 | se abren inscripciones; | PASS | F10 status service con ID token real. |
| 15.3 | participantes se registran y marcan disponibilidad; | PASS | F10 AuthRoute y RegistrationService reales. |
| 15.4 | se gestionan solicitudes de participación conjunta; | PASS | F10 PairRequestService A→B→accepted. |
| 15.5 | organizadores planifican manualmente; | PASS | F10 PlannerService asigna unidad + pareja manual. |
| 15.6 | se genera y valida el programa; | PASS | F10 getProgram sin blockers. |
| 15.7 | se publica; | PASS | F10 publish v1 atómico. |
| 15.8 | participantes reciben y consultan su asignación; | PASS | F10 personal + notification; FCM externo pendiente separado. |
| 15.9 | se procesa al menos una solicitud de cambio posterior; | PASS | F10 approve conserva v1; reserva manual→resolve→v2. |
| 15.10 | el sistema pasa las pruebas críticas de `TEST_PLAN.md`. | PASS | F2–F9 suites + F10; E2E móvil físico pendiente antes de producción. |

## Checklist externo exacto — antes de producción

Preparar entorno HTTPS autorizado de prueba, proyecto no productivo, cuatro
identidades demo y organizer con claim/profiling legítimo. No reutilizar PIN
sintético como credencial real. No editar Firestore para completar los pasos.
Registrar dispositivo/OS/browser, fecha, versión app/programa, PASS/FAIL y captura
sin teléfonos/PIN/tokens. Ante fallo registrar pasos/resultado, no corregir datos
externamente.

### Android físico — PENDING EXTERNAL

- [ ] Chrome abre HTTPS; campaña correcta; teléfono/PIN demo ingresan sin ambigüedad.
- [ ] Instalar cuando el navegador lo permita; comprobar icono y modo standalone.
- [ ] Cerrar/reabrir PWA sin PIN con sesión vigente; navegar todas las pestañas.
- [ ] Orientación vertical/horizontal; nombres extensos, 360/390/430 equivalentes.
- [ ] Disponibilidad guarda solo en registration_open; texto no equivale a asignación.
- [ ] A solicita B, B acepta; admin planifica A+B, publica v1; ambos ven solo turnos propios.
- [ ] Solicitar cambio; aprobar no cambia v1; admin elige reserva y confirma v2; verificar Mi programa/avisos y PDF histórico.
- [ ] Offline muestra estado seguro: ninguna mutación anuncia guardado; volver online permite actualizar.
- [ ] Push solo tras acción explícita: aceptar/rechazar permiso y probar entrega real si FCM legítimo configurado.
- [ ] Logout; reapertura exige acceso; ningún turno/aviso privado queda en caché.

### iPhone físico — PENDING EXTERNAL

- [ ] Safari HTTPS; guía Compartir → Añadir a pantalla de inicio; icono/standalone.
- [ ] Login, cerrar/reabrir, sesión persistente, navegación y teclado/PIN.
- [ ] Repetir Availability → accepted → asignación → publicación v1 → cambio manual → v2.
- [ ] Avisos internos/propiedad; offline/logout no filtran datos.
- [ ] Permiso/push solo si versión iOS/PWA instalada y proveedor FCM configurado lo soportan.
- [ ] Si no soporta push, UI lo informa sin impedir historial ni flujo principal.

### Usabilidad — tres perfiles PENDING EXTERNAL

Para A habituado, B básico y C adulto mayor/WhatsApp, ejecutar sin explicación
previa adicional de la interfaz; anotar tiempo, dudas, errores y ayuda necesaria:

- [ ] Ingresar por teléfono/PIN.
- [ ] Identificar campaña y estado.
- [ ] Elegir disponibilidad y explicar con sus palabras por qué no es asignación.
- [ ] Encontrar solicitud pending y aceptar/rechazar cuando sea receptor.
- [ ] Encontrar Mi programa y compañero/fecha/punto.
- [ ] Leer Avisos y abrir destino.
- [ ] Solicitar cambio sin información privada; comprender pending/aprobada ≠ turno cambiado.
- [ ] Reabrir app, identificar versión actual y aviso después del reemplazo.

### FCM real — PENDING EXTERNAL / configuración F11

- [ ] Configuración pública Firebase/VAPID válida y credenciales Admin legítimas; HTTPS.
- [ ] Permiso aceptado/rechazado/unsupported no bloquea historial.
- [ ] Entrega siete eventos en dispositivo habilitado; título genérico/ruta interna.
- [ ] Dos dispositivos, rotación/unsubscribe y logout sin cruce de identidad.
- [ ] Proveedor fallido: aviso interno permanece; secretos/tokens ausentes del browser DTO.
- [ ] Job con secret legítimo/reloj real, sin activarlo hasta autorización de despliegue.

### Impresión nativa F7 — PENDING EXTERNAL

- [ ] Mac desbloqueado, Chrome/Safari autorizado; abrir programa v1 y v2 histórico.
- [ ] Vista previa nativa A4 horizontal; 4 y 8 puntos, varios bloques/multipágina.
- [ ] Nombres largos no cortados; encabezado, versión y pies legibles en todas las páginas.
- [ ] Revisar color y blanco/negro, saltos de página y columnas completas.
- [ ] Guardar evidencia humana; cerrar Issue #8 solo después de esa revisión humana.
