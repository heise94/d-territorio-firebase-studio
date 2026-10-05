# D-Territorio Campañas — Registro de Decisiones

Este documento resume decisiones de producto y arquitectura ya acordadas. Su objetivo es evitar que futuras iteraciones o una IA de desarrollo reabran temas ya definidos sin una razón clara.

## Cómo usar este registro
- No reemplaza a `MASTER_SPEC.md` ni a los documentos normativos.
- Si una decisión cambia, actualizar aquí y también el documento normativo correspondiente.
- Cada nueva decisión relevante debe registrar fecha aproximada, decisión y motivo.

---

## D-001 — Módulo separado dentro del ecosistema D-Territorio
**Estado:** Aceptada

Campañas será un dominio independiente, previsto para `campanas.d-territorio.cl`, aunque inicialmente viva en el mismo repositorio.

**Motivo:** mantener coherencia con D-Territorio sin mezclar lógica de territorios y campañas.

## D-002 — PWA para participantes + panel web para organizadores
**Estado:** Aceptada

La experiencia de participantes será mobile-first/PWA. La planificación será web-first.

**Motivo:** los hermanos participarán principalmente desde teléfono; los organizadores necesitan más espacio y productividad.

## D-003 — Acceso mediante teléfono + PIN
**Estado:** Aceptada

No se exigirá correo electrónico al participante.

**Motivo:** facilitar el acceso a hermanos mayores o con poco manejo tecnológico.

## D-004 — Dispositivo de confianza
**Estado:** Aceptada

Después del primer acceso correcto, la PWA podrá mantener sesión y no pedir PIN en cada apertura.

## D-005 — Un participante por sesión/perfil en V1
**Estado:** Aceptada

Se descartó administrar permanentemente dos participantes desde una misma cuenta.

**Motivo:** mantener la experiencia simple y reducir errores de identidad/notificaciones.

## D-006 — Horarios configurables
**Estado:** Aceptada

Los bloques no quedan fijos en código y pueden variar por campaña/día.

## D-007 — Máximo de turnos declarado por participante
**Estado:** Aceptada

El participante puede indicar 1, 2, 3 o sin límite específico.

El máximo genera advertencia, pero un organizador puede confirmar una excepción.

## D-008 — Capacidad orientativa, no puntos predefinidos
**Estado:** Aceptada

La campaña puede llegar hasta 8 puntos por bloque en el caso inicial (16 participantes), pero los puntos finales se definen según apoyo real.

## D-009 — Bloque lleno sigue aceptando disponibilidad
**Estado:** Aceptada

Al alcanzar capacidad principal, el bloque se muestra completo pero todavía puede seleccionarse. Los nuevos interesados son reserva potencial.

**Motivo:** contar con reemplazos y no perder disponibilidad útil.

## D-010 — El sistema no arma parejas automáticamente
**Estado:** Aceptada y crítica

Las parejas serán creadas manualmente por los hermanos encargados.

**Motivo:** existen criterios humanos de edad, situación personal, salud y otras consideraciones que no se recopilarán en la aplicación.

## D-011 — Congregación como dato secundario
**Estado:** Aceptada

No es obligatorio mezclar congregaciones. Los organizadores pueden hacerlo manualmente cuando sea conveniente.

## D-012 — Solicitud para trabajar juntos es obligatoria si se acepta
**Estado:** Aceptada

No existe modalidad de mera preferencia.

Si A solicita trabajar con B, B debe aceptar. Una vez aceptado, deben ser asignados juntos.

## D-013 — Solicitud pendiente debe destacarse
**Estado:** Aceptada

Debe aparecer de forma prioritaria al entrar a la PWA y puede generar push.

## D-014 — Lista de disponibles dinámica
**Estado:** Aceptada

Al abrir un bloque se muestran quienes tienen disponibilidad y no están asignados allí. Al asignarlos desaparecen; al liberarlos vuelven.

## D-015 — Programa general automático
**Estado:** Aceptada

El sistema generará una tabla general por fecha, bloques, puntos y parejas, reemplazando la elaboración manual histórica.

Debe admitir impresión y PDF.

## D-016 — Borrador separado de programa publicado
**Estado:** Aceptada

Las asignaciones pueden cambiar durante planificación sin ser visibles como definitivas para participantes.

## D-017 — Cambios posteriores mediante solicitud
**Estado:** Aceptada

Una vez publicado el programa, un participante no modifica unilateralmente una asignación; solicita cambio.

## D-018 — Notificaciones push con fallback interno
**Estado:** Aceptada

Push es una mejora, no un requisito para usar la app. Todas las notificaciones importantes deben quedar también en el historial interno.

## D-019 — No recopilar información sensible para formar parejas
**Estado:** Aceptada y crítica

No se crearán perfiles de salud, diagnóstico u otros datos sensibles para decidir compatibilidad.

## D-020 — Stack técnico V1
**Estado:** Aceptada

Reutilizar el stack actual del repositorio: Next.js 15, React, TypeScript, Firebase/Firestore, Tailwind, Radix, Lucide, Zod, React Hook Form y soporte PWA.

## D-021 — Monolito modular
**Estado:** Aceptada

No usar microservicios para V1.

**Motivo:** volumen moderado, simplicidad, mantenibilidad y desarrollo rápido.

## D-022 — Colaboración de organizadores
**Estado:** Aceptada

Habrá responsables/encargados que pueden colaborar en la planificación. El sistema debe tolerar edición concurrente y evitar dobles asignaciones.

## D-023 — Una campaña debe ser reutilizable
**Estado:** Aceptada

Aunque la primera implementación sea Cementerio Padre Las Casas, fechas, congregaciones, horarios, puntos y capacidades no deben quedar rígidos.

## D-024 — Piloto antes de producción general
**Estado:** Aceptada

Antes de abrir a las cuatro congregaciones, probar internamente y con un grupo pequeño de usuarios reales.

---

## Plantilla para futuras decisiones

### D-XXX — Título
**Fecha:** YYYY-MM-DD
**Estado:** Propuesta / Aceptada / Reemplazada / Rechazada

**Decisión:**

**Motivo:**

**Documentos afectados:**
- `...`

## D-025 — Implementación Fase 2: identidad participante

**Fecha:** 2026-10-04
**Estado:** Aceptada para revisión en PR Draft

Se utiliza Firebase Admin server-only y Route Handlers Next.js, bcrypt con costo 12 y
pepper servidor, sesiones de 30 días en cookie HttpOnly y unicidad mediante índice HMAC
transaccional. Congregación opcional validada contra congregaciones activas; no implica
inscripción en campaña. Cambio/reset invalidan todas las sesiones mediante versión atómica.
Recuperación administrativa queda como servicio que verifica ID token y `campaign_admin`,
sin nuevo panel ni provisioning del claim. Diseño, configuración y pruebas:
[PHASE_2_AUTH.md](./PHASE_2_AUTH.md).

## D-026 — Fase 3: inscripción, disponibilidad y cobertura derivada

**Fecha:** 2026-10-04
**Estado:** Implementada para revisión en PR Draft

Inscripción única por campaign+participant y disponibilidad única por registration+block
mediante IDs derivados y transacciones servidor con sesión revalidada. maxTurns 1/2/3/null;
congregación global del Participant activa/asociada, sin snapshot duplicado. Solo
registration_open permite edición. Históricos inactivos conservados. Capacidad override
→ default → Por definir; completo sigue aceptando disponibilidad. Reserva potencial
agregada sin Assignment. No se alteran los rate limits de Fase 2; revisión humana antes
del piloto obligatoria. APIs, UX, seguridad y pruebas en
[PHASE_3_REGISTRATION.md](./PHASE_3_REGISTRATION.md).

## D-027 — Fase 4: vínculo obligatorio y concurrencia de solicitudes

**Fecha:** 2026-10-04
**Estado:** Implementada para revisión en PR Draft

PairRequest accepted es una restricción obligatoria futura, nunca preferencia ni asignación.
Solicitud por inscripción/campaña con búsqueda privada por nombre, sin teléfono. Sentinels
transaccionales de relación simétrica y exclusividad por inscripción impiden duplicados y
aceptaciones incompatibles concurrentes. Reenvíos crean documentos nuevos preservando historia.
Disponibilidad común/conflictos se calculan desde Availability actual sin cambiar el vínculo.
Inicio prioritario y sección de solicitudes implementan notificación interna sin push.
Límites individuales nuevos, globales auth intactos. Diseño, APIs y pruebas:
[PHASE_4_PAIR_REQUESTS.md](./PHASE_4_PAIR_REQUESTS.md).

## D-028 — Fase 5: lectura operativa administrativa sin Assignment

**Fecha:** 2026-10-04
**Estado:** Implementada para revisión en PR Draft

Panel de participantes/cobertura enlazado desde el editor vigente, sin editor alternativo.
Cada consulta usa Firebase Auth existente, requireCampaignOrganizer y claim actual del
usuario servidor, no cookie participante. DTOs permitidos, field masks y lecturas bulk
impiden divulgar hashes/sesiones o descargar teléfonos innecesarios. Búsqueda administrativa
de móvil completo en encabezado privado, no URL; filtros/paginación servidor. Cobertura y
reserva conservan cálculo de Fase 3, sin elegir personas de reserva. Accepted sigue siendo
obligatorio y sus conflictos no modifican vínculos. Polling visible de 30 segundos y
actualización manual, sin listeners cliente privados. Carga del perfil y permisos completa
antes de decidir acceso, sin cambiar guard, roles ni autorización. Fixture V1 de 80 y
Auth/Firestore Emulator real; rate limits auth intactos con checkpoint humano previo al
piloto. Detalles, límites y validación:
[PHASE_5_ADMIN_DASHBOARD.md](./PHASE_5_ADMIN_DASHBOARD.md).

## D-029 — Fase 6: decisiones manuales y unidad accepted transaccional

**Fecha:** 2026-10-05
**Estado:** Implementada para revisión en PR Draft

BlockPoint determinístico abre exactamente dos slots por punto/bloque. Assignment
draft/cancelled, unicidad slot/persona y maxTurns entre bloques se validan servidor
con revisión transaccional común por campaña. Vínculos accepted se crean, mueven y
liberan atómicamente; legacy incompleto se completa en origen o se libera. Sin
auto-pair/ranking. Overrides individuales de disponibilidad/maxTurns confirmados y
auditados nunca modifican preferencias. Mover entre bloques requiere cancelar y
reasignar explícitamente. Capacidad objetivo y slots activos siguen siendo medidas
separadas; reserva es derivada, no colección. Solo draft→registration_open→planning,
sin retrocesos/publicación. Estado sale del formulario general para impedir rollback
por datos antiguos. Token Firebase y claim actual, DTO mínimo, Rules deny y lectura
bulk; polling visible 12 segundos y refresh confirmado. Rate limits intactos y
checkpoint humano obligatorio antes del piloto. Diseño, límites y pruebas en
[PHASE_6_PLANNER.md](./PHASE_6_PLANNER.md).
