# Fase 3 — Inscripción y disponibilidad

## Identidad, inscripción y disponibilidad

Participant sigue siendo la identidad de Fase 2. CampaignRegistration corresponde a una
campaña y Availability a un horario de esa inscripción; ninguna representa Assignment.

- `campaignRegistrations`: `id`, `campaignId`, `participantId`, `maxTurns`,
  `registrationStatus`, `createdAt`, `updatedAt`.
- Estados tipados: `active`, `withdrawn`, `cancelled`. El formulario crea/edita solamente
  inscripciones activas; no reactiva automáticamente inscripciones retiradas/canceladas.
  No se añade una nueva acción de retiro/cancelación en esta fase.
- ID de inscripción: SHA-256 de la tupla JSON `[campaignId, participantId]`. La misma
  referencia se lee y escribe en transacción; solicitudes concurrentes no crean duplicados.
- `maxTurns`: `1`, `2`, `3` o `null` para Sin límite; no restringe cuántos horarios se
  pueden ofrecer, ni crea turnos/asignaciones. Selección vacía puede guardarse sin perder
  identidad/inscripción mientras la campaña siga abierta.
- Congregación: solamente activa y asociada por CampaignCongregation. Se preselecciona
  la actual del Participant si sigue siendo válida y se actualiza el Participant dentro
  de la misma transacción. No se añade snapshot duplicado a CampaignRegistration: es un
  dato global de identidad y una corrección puede requerir elegirla de nuevo en otra campaña.
- `availabilities`: namespace físico central existente, sin colecciones paralelas.
  Campos `id`, `registrationId`, `timeBlockId`, `available`, `createdAt`, `updatedAt`, y
  `campaignId` como clave denormalizada mantenida exclusivamente por servidor para consultas.
- ID de disponibilidad: SHA-256 de `[registrationId, timeBlockId]`. Edición actualiza
  el booleano, preserva createdAt y no elimina filas históricas.

## Guardado y concurrencia

`ParticipantAuthService.withParticipantTransaction` reutiliza la misma validación de cookie,
sesión/version/expiración y Participant activo de Fase 2 dentro de la transacción de Fase 3.
No altera límites ni comportamiento de login, registro de identidad, cambio PIN o logout.

Todas las lecturas ocurren antes de las escrituras. Se revalidan Campaign.status,
congregación y asociación, días y bloques, inscripción propia y disponibilidades previas.
Se guardan juntos inscripción, congregación del Participant y selección de horarios.
El backend no recibe participantId/registrationId del request; Zod strict los rechaza.
Los IDs de campaña/bloque no son autorización ni identidad.

Solo `registration_open` permite guardar. `draft` no es visible; campañas cerradas aparecen
solo cuando existe una inscripción propia. `planning`, `published`, `active`, `completed`
son consulta sin modificación directa. Si se cierra una campaña mientras un formulario está
abierto, el guardado falla con un mensaje explícito, sin escrituras parciales.

Los bloques deben pertenecer a la campaña y seguir activos con día activo. Si un horario
se desactiva/elimina después de cargar, una selección enviada obsoleta se rechaza; se pide
recargar. Al editar la selección visible se conservan sin cambios las disponibilidades
históricas de bloques/días inactivos o eliminados, con aviso de cantidad en la pantalla.
Si se reactivan, la selección conservada vuelve a ser visible. No se borran silenciosamente.

Capacidad nunca actúa como bloqueo transaccional: dos participantes pueden superar
el objetivo y ambos conservan su disponibilidad; no existe orden de ganadores.
Límites técnicos de payload: JSON hasta 64 KiB, hasta 400 IDs seleccionados y hasta 450
filas de disponibilidad actualizadas por operación para mantener el guardado acotado.

Referencia técnica de atomicidad: [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Cobertura derivada

Se cuentan disponibilidades `available=true` de inscripciones `registrationStatus=active`
de esa campaña. Retiradas/canceladas no aportan cobertura. No se envían registros de terceros
ni datos personales/maxTurns de otros participantes al navegador.

Capacidad: `TimeBlock.capacityOverride ?? Campaign.defaultCapacityPerBlock ?? null`.
Se respeta incluso un valor cero existente; no se usa `||` ni cálculo de puntos × 2.
Sin configuración se muestra Por definir, no se marca completo ni se inventan reservas.

- `availableCount`: personas que ofrecieron disponibilidad para el bloque.
- `remainingCapacity`: `max(capacity - availableCount, 0)` o null.
- `reservePotential`: `max(availableCount - capacity, 0)` o null.
- `isFull`: capacidad definida y `availableCount >= capacity`.
- `needsSupport`: capacidad definida y conteo menor que la mitad del objetivo.

Los bloques de baja cobertura se destacan mediante texto, borde y posición dentro del día.
El resto mantiene orden horario. Los días están ordenados cronológicamente.
La reserva es únicamente un agregado potencial, no una entidad persistida ni una decisión
individual. No hay campo assigned, Assignment ficticia ni lista privada de inscritos.

## API y UX

- `GET /api/campanas/participant/campaigns`: campañas abiertas y resumen de inscripciones
  propias en campañas no borrador, con DTO por lista permitida.
- `GET /api/campanas/participant/campaigns/[campaignId]`: inscripción propia, congregaciones
  asociadas/activas, días/bloques activos y conteos de cobertura.
- `PUT` en la misma ruta: `{ congregationId, maxTurns, timeBlockIds }`.
- `/campanas`: inicio simple, sesión anterior intacta, campañas y acceso a disponibilidad.
- `/campanas/disponibilidad`: selector de campañas, sin campaña fija.
- `/campanas/disponibilidad/[campaignId]`: formulario único de inscripción/edición/consulta,
  selección múltiple, fechas completas, controles táctiles grandes y confirmación de guardado.
- Navegación inferior única mantiene Inicio, Disponibilidad, Mi programa, Avisos e Información.
  Solo Inicio/Disponibilidad navegan; destinos de fases futuras siguen sin implementación.

Sin horarios se indica que todavía no están disponibles. Sin congregaciones activas asociadas
se explica contactar a la organización y no se permite finalizar. Un bloque completo mantiene
su checkbox habilitado y explica la posibilidad de reserva. Inscripciones cerradas son lectura.
Un fallo de refresco posterior a un PUT exitoso no se describe falsamente como guardado fallido.

## Seguridad

Firebase Admin server-only; DTOs mínimos; identidad derivada de cookie. Origin y
Sec-Fetch-Site protegen PUT; JSON validado nuevamente en servidor. Respuestas no-store/private
y Vary Cookie. El service worker usa NetworkOnly para todas las rutas `/api/campanas/`
y páginas Campañas; no se cachean disponibilidades privadas ni se confirma guardado offline.

Firestore Rules niega lecturas/escrituras directas de campaignRegistrations/availabilities,
también a clientes Firebase Auth y campaign_admin. No cambia las reglas administrativas.
Las consultas reales son igualdades simples; no requieren índices compuestos nuevos.
Sin cambios de secretos, infraestructura externa o autenticación administrativa.

## Pruebas y regresión

Infraestructura Node test + tsx y Firestore Emulator existente, mismo preload server-only.
Ejecutar las suites en secuencia porque ambas limpian el mismo proyecto ficticio:

```sh
npm ci
npm exec --yes --package firebase-tools@13.35.1 -- firebase emulators:exec --only firestore --project demo-campaign-auth --config firebase.campaign-auth.json 'npm run test:campaign-auth && npm run test:campaign-registration'
npm run typecheck
npm run build
```

Fase 2 mantiene sus 12 casos. Fase 3 prueba máximo/IDs/cobertura, unicidad concurrente,
edición, asociación válida, selección obsoleta/inactiva/ajena, exceso sin bloqueo,
historial, estados, privacidad, Rules, API/CSRF y sesiones revocadas.
Solo se usan identidades, congregaciones, campañas y teléfonos ficticios en el emulador.
El panel/configuración/admin Fase 1 no se modifica; errores históricos Limpieza y
Territorios permanecen fuera de alcance. No se afirma despliegue de infraestructura real.

Resultado local: Fase 2 **12 PASS / 0 FAIL**, Fase 3 **13 PASS / 0 FAIL**, sin omitidas.
`npm ci` correcto; typecheck conserva únicamente los seis errores históricos conocidos.
`npm run build` falla por los dos imports históricos ausentes de Territorios
(`reportar-predicacion-dialog` y `solicitar-territorio-dialog`), sin errores nuevos de Campañas.
Verificación en navegador local + emulador: navegación Disponibilidad, congregación
preseleccionada, máximo Sin límite, dos horarios (uno ya completo), confirmación de guardado,
reserva potencial, persistencia al recargar, edición de selección/máximo, guardado rechazado
al cerrar inscripciones con formulario abierto y modo lectura después de recargar.
Fixtures reproducibles exclusivamente locales: `tests/campaign-registration/demo.ts`.

## REVISAR ANTES DEL PILOTO — RATE LIMITS

No se han cambiado los límites aprobados de Fase 2. Configuración exacta:
`src/app/api/campanas/auth/[action]/route.ts`, antes de register/login, mediante
`auth.limit(public-action, shared, maximum)`; ventana en `server/auth/service.ts`.

- Registro de identidad global: **30 intentos cada 15 minutos**.
- Login global: **120 intentos cada 15 minutos**.
- Registro/login por teléfono: **5 intentos cada 15 minutos**.
- Cambio/reset PIN por participante: **5 cada 15 minutos**.
- Reset/revocación por organizador: **10 cada 15 minutos**.

Los intentos incluyen éxitos y fallos. 40–80 personas creando identidad en una misma
ventana superan 30. Un login por cada persona no supera 120, pero errores/reintentos y
tráfico acumulado pueden alcanzarlo. Personas con sesión válida no consumen el límite
de login por abrir o editar disponibilidad. La ventana se inicia en el primer intento.

Al alcanzar el límite, HTTP 429 y mensaje “Has realizado varios intentos. Intenta
nuevamente más tarde.”; no se crea identidad/sesión en ese intento y no se omite la protección.
Para el piloto: revisar concurrencia prevista, escalonar primer acceso y realizar prueba
controlada de carga antes de invitar a todos; la revisión humana decide ajustes.
Conviene hacer configurables los límites globales con variables server-side validadas y
defaults seguros en una tarea autorizada, manteniendo límites por teléfono y antiabuso.
Este informe no modifica valores ni lo convierte en bloqueador de Fase 3.

## Fuera de alcance

Sin PairRequest, parejas, Assignment, planner, BlockPoint operativo, programa, publicación,
PDF, ChangeRequest ni notificaciones push. PR #15 permanece Draft, sin merge ni cierre de #4.
