# Fase 7 — Programa general y publicación

Fecha: 2026-10-05. Base aprobada: `2ac50f9eb38170948f135a554116009ca68feb25`.
Implementación limitada a Fase 7, para revisión en PR #15 Draft. Issue #8 permanece abierta.

## Fuente y vistas

- Programa administrativo: `/campanas/admin/programa/[campaignId]`, enlazado con **Ver programa** desde el planner vigente.
- Vista personal: `/campanas/mi-programa`; conserva Inicio, Disponibilidad, Mi programa, Avisos e Información.
- El borrador se proyecta desde Campaign, días/bloques activos, Point, BlockPoint, Assignment draft, inscripciones y perfiles. No hay formulario de celdas ni programa escrito manualmente.
- Publicado se lee exclusivamente desde ProgramVersion. No se reconstruye desde nombres, puntos, horarios ni asignaciones vivos.
- Días por fecha/sortOrder/ID; bloques por inicio/término/sortOrder/ID; puntos por sortOrder/nombre/ID. Columnas estables: unión de puntos activos en cualquier bloque activo de cada día. Las celdas inactivas muestran **No activo**; las activas siempre contienen las posiciones 1 y 2 y **Pendiente** donde corresponda.
- Web con desplazamiento horizontal y columna horaria fija. El borrador lleva **BORRADOR — NO DISTRIBUIR** en web, impresión y PDF. Publicado muestra v1 y timestamp, sin marca borrador.
- Polling administrativo cada 12 segundos cuando la pestaña está visible, actualización manual y al regresar. No listeners privados de Firestore cliente. La confirmación se invalida si cambia la revisión; mientras está abierto el diálogo se congela el preview que el organizador está confirmando.

## ProgramVersion

Colección centralizada `campaignProgramVersions`; ID determinístico `<campaignId>__v1`.

Campos: id, campaignId, version=1, status=published, sourcePlannerRevision, publishedAt,
publishedBy, createdAt, snapshot, warnings y assignmentCount.

Snapshot mínimo:

- campaña: ID, nombre y ubicación general/detalles;
- días: ID, fecha y etiqueta;
- puntos por día: ID, nombre, descripción y referencia de ubicación;
- bloques: ID, inicio, término, etiqueta y celdas activas;
- dos slots por celda: assignmentId, registrationId, nombre y congregación.

No contiene teléfonos, PIN, hashes, sesiones, Availability cruda, datos de seguridad ni documentos completos.
Las advertencias revisadas quedan congeladas también, para no recalcular excepciones oficiales con datos posteriores.
IDs estructurados permiten futuras versiones, pero no existen endpoints ni flujo v2/v3.

## Validación del servidor

Errores bloqueantes:

- misma persona dos veces por bloque, incluso con dos inscripciones distintas;
- misma posición punto/bloque repetida;
- accepted con miembro ausente, bloque/punto separado, mismo slot o exclusividad/referencias corruptas;
- referencias a campaña, inscripción, perfil, día, bloque, punto o BlockPoint inexistentes/inactivos/ajenos;
- posiciones distintas de 1/2, Assignment no draft dentro de planning;
- falta de disponibilidad sin availabilityOverride **boolean true**;
- exceso de maxTurns sin suficientes turnos extra con maxTurnsOverride **boolean true**;
- ausencia global de días, bloques, puntos activos o asignaciones.

Se leen también las referencias accepted inválidas que el dashboard filtra para su listado operativo:
no pueden ocultarse durante publicación. Una pareja completa enteramente sin asignar permanece en reserva;
no se forman parejas ni se asigna automáticamente.

Compatibilidad con Fase 6: el override de maxTurns pertenece al turno extra, no a todos los turnos
anteriores de esa persona. Cada bloque distinto con excepción cubre un turno excedente. Con maxTurns=1,
un turno normal y un turno extra autorizado son válidos; retirar la bandera del extra bloquea.
No se modifica la preferencia ni las banderas históricas.

Advertencias: punto con una persona, punto vacío y overrides de disponibilidad/máximo autorizados.
Incluyen cantidad y detalle fecha/hora/punto/persona. Con errores, Publicar está deshabilitado.
Con advertencias se exige **He revisado las advertencias y deseo publicar de todas formas.**
Un diálogo adicional explica que v1 será oficial, inmutable y el planner quedará en lectura.

## Publicación y concurrencia

`POST /api/campanas/admin/campaigns/[campaignId]/publish` acepta exclusivamente:
expectedPlannerRevision y confirmWarnings. Ni UID, ni timestamp, ni snapshot del navegador.

Una transacción:

1. autoriza al organizador con Firebase Auth/claim actual;
2. lee planning, configuración, perfiles mínimos, accepted, asignaciones y lock;
3. compara expectedPlannerRevision y ausencia de v1;
4. vuelve a validar errores y confirmación de advertencias;
5. crea v1 con snapshot, timestamps del servidor y UID real;
6. marca sus Assignment draft como published, incrementando version y manteniendo overrides;
7. deja cancelled intactas;
8. cambia Campaign a published y guarda publishedAt/currentProgramVersionId/programVersion;
9. incrementa el lock y crea auditorías mínimas program_published y campaign_status_changed.

expectedPlannerRevision es un SHA-256 determinístico de snapshot, validaciones, versiones de Assignment
y revisión del lock. Detecta también cambios de configuración/perfil que Fase 1 escribe sin incrementar
el lock numérico. La transacción protege lecturas y escrituras; dos organizadores producen una sola
versión y una sola auditoría. Conflicto devuelve 409:
**La planificación cambió o el programa ya fue publicado. Actualiza antes de continuar.**

canTransitionCampaignStatus conserva su comportamiento de configuración. planning→published
requiere contexto explícito publication y solo se usa desde la transacción dedicada.
El endpoint de estados de Fase 6 no acepta published, ni se habilitan retrocesos/estados posteriores.
La respuesta devuelve v1 inmediatamente a la UI, sin esperar polling.
El planner conserva las posiciones publicadas en lectura; sus mutaciones continúan restringidas a planning.

## Privacidad y seguridad

APIs administrativas:

- GET `/api/campanas/admin/campaigns/[campaignId]/program`;
- POST `/api/campanas/admin/campaigns/[campaignId]/publish`;
- GET `/api/campanas/admin/campaigns/[campaignId]/program/pdf`.

Reutilizan ID token Firebase, verificación de revocación, requireCampaignOrganizer y getUser:
sin token/inválido/revocado/deshabilitado se rechaza; sin claim actual campaign_admin se deniega.
Cookie participante nunca concede acceso al programa general/PDF. Publicación valida origen y body
mediante la protección existente. Guard /campanas/admin y MANAGE_CAMPAIGNS sin cambios.

Rules niegan read/list/write de campaignProgramVersions incluso a un cliente con claim administrativo.
No hay endpoint de edición de snapshots ni enlace público permanente.
Respuestas privadas no-store; NetworkOnly existente cubre páginas y APIs de Campañas.
El PDF varía por Authorization; la vista personal varía por Cookie.

GET `/api/campanas/participant/my-program` obtiene la identidad solo de cookie HttpOnly.
Revalida DeviceSession y Participant dentro de la transacción; consulta únicamente sus inscripciones.
Rechaza parámetros de identidad aunque sean propios. Lee solo versiones published y filtra slots en servidor.
DTO: campaña, estado/version/timestamp y turnos propios con fecha, hora, punto, ubicación, descripción y
nombre del compañero del mismo turno. No devuelve matriz, IDs de terceros, otros puntos/personas ni secretos.

Antes de publicar: **El programa todavía no ha sido publicado.**
Sin asignaciones oficiales: **No tienes turnos asignados en el programa publicado.**
Los nombres/horarios/ubicaciones del turno también son los congelados, no los vivos.

## Impresión y PDF

Impresión web: CSS print, A4 horizontal, margen 10mm, blanco/alto contraste, controles ocultos,
encabezado repetido con campaña/fecha/estado y columnas, filas sin división, nombres envueltos,
sin scroll ni columna sticky en papel. Ocho puntos mantienen las ocho columnas en impresión.

PDF directo: **pdfkit 0.20.2**, única dependencia nueva de aplicación, server-only Node.
[API oficial PDFKit](https://pdfkit.org/docs/getting_started.html) y
[texto/fuentes](https://pdfkit.org/docs/text.html). Declaración TypeScript local para las APIs utilizadas.
Noto Sans regular/bold TTF incluidas con licencia SIL OFL; no fuentes externas en ejecución.
Next outputFileTracingIncludes conserva las fuentes en el bundle de despliegue.
Sin Chrome/Puppeteer/Playwright de producción, servicios externos ni dependencia del diálogo Imprimir.

A4 horizontal; grupos de hasta cuatro puntos, con horarios/contexto repetidos.
Ocho puntos producen dos grupos por día. Nombre 11pt, fuente embebida Unicode, alturas calculadas y
salto de página entre filas; número de página y estado repetidos. No se reduce todo a letra diminuta.
Con tres días de fixture, borrador/publicado dan **seis páginas**. Nombres largos y acentos revisados.
Filename `campana-<slug>-borrador.pdf` o `campana-<slug>-v1.pdf`.
Publicado usa solo snapshot, timestamps congelados y metadata estable: bytes idénticos tras cambiar
nombres, puntos, ubicación y horarios vivos en la prueba de integración.

## Pruebas y revisión

Emuladores Auth/Firestore reales, tokens reales y cookie/sesión real; sin mock de autorización.
Fixture local protegida por demo project y hosts localhost: 80 inscripciones, cuatro congregaciones,
tres días, seis bloques activos, ocho puntos, 3/5/8 activos variables, accepted, incompletos/vacíos,
availability override, maxTurns override y cancelled histórica. No altera límites de registro público.
Lecturas por campaña y getAll bulk de perfiles/congregaciones; sin N+1 por participante.

`npm ci` correcto. Suites F2 12/12, F3 13/13, F4 20/20, F5 25/25, F6 51/51, sin editar sus tests.
F7: `npm run test:campaign-program`, 64 casos para generación, blockers/warnings, confirmación,
estados/revisiones/concurrencia, inmutabilidad de DTO y bytes PDF, seguridad administrativa/personal,
origen, Rules, cookie expirada/revocada e identidad inyectada, PDF válido/filename/páginas/orientación.
Las pruebas PDF usan Node, sin requisito de instalar Poppler en CI.
QA visual adicional usa herramientas PDF para extracción y render de páginas.

Navegador local: entrada administrativa y participante reales; marca borrador, 39 advertencias
con detalles, accepted incompleto→bloqueo visible, confirmación doble, publicación v1 inmediata,
ausencia de marca borrador, descarga real de ambos PDF y Mi programa propio en móvil 390px.
No hay turnos draft para participante, ni otros turnos después de publicar.
PDF descargado: seis páginas, ocho puntos presentes, sin marca borrador oficial, sin nombres recortados.
Vista previa nativa de impresión iniciada en Chrome; inspección del diálogo pendiente por Mac bloqueado.
No se afirma que esa inspección haya concluido.

Typecheck: solo cuatro Date/Timestamp históricos de Limpieza y dos imports ausentes de Territorios.
Build falla únicamente por los dos imports históricos de Territorios. No hay errores nuevos de Campañas.
Ninguna de esas áreas se modifica.
Conexión cliente a emuladores solo temporal durante QA; se retira antes del commit.
PR #15 permanece Draft, sin merge, sin despliegue de producción; push solo feature/campanas-v1.

## Pendientes existentes y fuera de alcance

Provisioning campaign_admin y congregation_coordinator no bloqueantes; no se agregan permisos/claims.
**REVISAR ANTES DEL PILOTO — RATE LIMITS AUTH:** registro global 30/15 min, login global 120/15 min.
No se modifican. Apertura de 40–80 altas concentradas requiere decisión humana previa:
escalonar o autorizar un ajuste separado. La fixture no representa carga del registro público.

Sin ChangeRequest, reemplazos, reservas avanzadas post-publicación, republicación v2/v3,
push/PushSubscription, recordatorios, published→active ni active→completed. No Fase 8.

## Archivos de esta fase

- `docs/campanas/PHASE_7_PROGRAM_PUBLICATION.md`
- `src/app/api/campanas/admin/campaigns/[campaignId]/program/pdf/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/program/route.ts`
- `src/app/api/campanas/admin/campaigns/[campaignId]/publish/route.ts`
- `src/app/api/campanas/participant/my-program/route.ts`
- `src/app/campanas/admin/programa/[campaignId]/page.tsx`
- `src/app/campanas/mi-programa/page.tsx`
- `src/modules/campaigns/assets/fonts/NotoSans-Bold.ttf`
- `src/modules/campaigns/assets/fonts/NotoSans-Regular.ttf`
- `src/modules/campaigns/assets/fonts/OFL.txt`
- `src/modules/campaigns/components/campaign-program.tsx`
- `src/modules/campaigns/components/personal-program.tsx`
- `src/modules/campaigns/components/program-matrix.tsx`
- `src/modules/campaigns/components/program-print.css`
- `src/modules/campaigns/components/program.module.css`
- `src/modules/campaigns/domain/program.ts`
- `src/modules/campaigns/server/program-http.ts`
- `src/modules/campaigns/server/program-pdf.ts`
- `src/modules/campaigns/server/program-projection.ts`
- `src/modules/campaigns/server/program-service.ts`
- `src/types/pdfkit.d.ts`
- `tests/campaign-program/fixture.ts`
- `tests/campaign-program/integration.test.ts`
- `docs/campanas/DECISIONS_LOG.md`
- `firestore.rules`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `src/modules/campaigns/components/campaign-planner.tsx`
- `src/modules/campaigns/components/participant-navigation.tsx`
- `src/modules/campaigns/domain/campaign-status.ts`
- `src/modules/campaigns/domain/planner.ts`
- `src/modules/campaigns/domain/types.ts`
- `src/modules/campaigns/lib/paths.ts`
- `src/modules/campaigns/server/planner-source.ts`
