# Fase 5 — Participantes y cobertura

Implementación de lectura operativa para revisión en PR #15 Draft. Issue #6 permanece
abierto. No implica despliegue a producción ni inicio de Fase 6.

## Arquitectura y navegación

El único editor de configuración existente sigue siendo `CampaignAdminV2`.
Su campaña seleccionada ofrece el enlace **Participantes y cobertura** a
`/campanas/admin/participantes/[campaignId]`, bajo el mismo layout/guard administrativo.
No hay AdminV3 ni editor alternativo. Cuatro componentes separan coordinación de
consultas, cobertura, lista/filtros y ficha en diálogo. Escritorio/tablet prioritarios;
tarjetas y filtros se apilan en móvil, sin tabla ancha obligatoria.

API Next.js Node/server-only:

| GET | Respuesta |
| --- | --- |
| `/api/campanas/admin/campaigns/[campaignId]/overview` | Campaña, métricas, días/bloques activos, congregaciones |
| `/api/campanas/admin/campaigns/[campaignId]/participants` | Página filtrada de inscripciones, 25 filas |
| `/api/campanas/admin/campaigns/[campaignId]/participants/[registrationId]` | Ficha de esa inscripción en esa campaña |

No hay handlers de escritura. El servicio no escribe documentos ni persiste snapshots
administrativos. Las consultas usan una transacción de lectura para cada respuesta.
Se permiten todos los estados de campaña, incluido draft vacío, sin agregar transiciones.

## Autorización real

Cada entrada del servicio autoriza antes de leer la campaña o validar filtros:

1. Bearer ID token del Firebase Auth administrativo existente.
2. `requireCampaignOrganizer()` verifica token con revocación y claim `campaign_admin`.
3. `getUser(uid)` confirma claim **actual** y cuenta no deshabilitada.

Sin token, inválido/revocado: 401. Usuario sin claim o claim retirado: 403 (una sesión
que Firebase revoca al deshabilitar también puede producir 401). Fallo de infraestructura:
503 sin detalles internos. Una cookie de participante no autoriza este API.
El cliente solicita `user.getIdToken(true)` antes de actualizar; no guarda credenciales.
El guard React y MANAGE_CAMPAIGNS no sustituyen la comprobación servidor.

El guard y la decisión de permisos no se modificaron. La prueba con cuenta ficticia
detectó que settings podía terminar antes que la consulta de perfil, causando una
redirección prematura. `PermissionsProvider` ahora expone carga hasta que **ambas**
consultas resuelven; errores/perfiles ausentes siguen denegando acceso. No se añadieron
roles, permisos, bypasses ni provisioning. Las Rules permanecen idénticas.

## DTOs y privacidad

DTOs explícitos en `domain/admin-dashboard.ts`; nunca se serializa un documento privado
completo. Respuestas `private, no-store`, Vary Authorization/X-Campaign-Search y PWA
NetworkOnly existente. Sin logs de identidades, queries ni credenciales.

- Resumen: nombre/ubicación/fechas/estado; conteos derivados y cobertura.
- Lista: registrationId, nombre/congregación, maxTurns, estado/perfil activo, bloques
  disponibles actuales, compañero accepted/conflictos y pendientes enviados/recibidos.
- Ficha: lo anterior, teléfono autorizado, selección actual e histórica, solicitudes
  propias de la inscripción y bloques activos en común.
- Teléfono no se lee para resumen/listado por nombre: se usan field masks de perfiles.
  Solo la búsqueda por móvil completo carga phoneNormalized en servidor para comparar;
  la respuesta de lista **no** contiene teléfonos. La ficha lee solo el teléfono de
  la persona seleccionada, nunca el del compañero.
- El navegador transmite la búsqueda codificada en `X-Campaign-Search`, fuera de la URL
  y de los logs de acceso habituales; no guarda filtros privados en URL/localStorage.
  No configurar infraestructura para registrar Authorization ni este encabezado.
- No PIN/hash, sesiones, tokenHash, índices privados, límites ni auditoría auth. No datos
  médicos/edad/sexo/observaciones sensibles. IDs de otra campaña no permiten abrir fichas.

Colecciones privadas siguen denegadas al SDK cliente, incluso con campaign_admin.
El panel no usa listeners Firestore para participantes/inscripciones/disponibilidad/pares.
Los listeners existentes de **configuración y permisos** se preservan.

## Agregados y cobertura

Inscritos activos = CampaignRegistration.registrationStatus === active, igual que Fase 3.
Una Availability cuenta únicamente si available === true, la inscripción pertenece a
la campaña y está activa, y el TimeBlock y su CampaignDay están activos. Cada selección
por inscripción/bloque se cuenta una vez. El perfil inactivo se advierte, sin alterar la
definición vigente de cobertura de Fase 3.

Se reutiliza `calculateCoverage`:

```text
capacity = capacityOverride ?? campaign.defaultCapacityPerBlock ?? null
remainingCapacity = max(capacity - availableCount, 0)
reservePotential = max(availableCount - capacity, 0)
```

Capacidad null conserva faltantes/reserva null; override 0 es válido.
Estados con texto, no solo color:

- Necesita apoyo: menos de la mitad.
- Cobertura media: desde la mitad hasta menos del 80%.
- Cerca de completo: desde el 80% hasta menos de capacidad.
- Completo: disponibles >= capacidad.
- Capacidad por definir: capacidad null, sin inventar cantidades objetivo.

Agrupación por día; orden inicial por mayor déficit máximo del día y luego déficit de
sus bloques, desempate cronológico. Selector cronológico sencillo, sin algoritmo planner.
Click en bloque aplica día/bloque, inscripción activa, borra búsqueda y conserva los
otros filtros explícitos. Se muestran todas las personas disponibles que cumplan filtros,
sin ranking de reservas. La reserva resumen suma **excedentes por bloque**, no personas
únicas; una persona puede contar en varios bloques.

Métricas: activos, bloques con apoyo, completos, reserva potencial, solicitudes pending,
vínculos accepted y conflictos accepted sin bloques activos en común. Pares se cuentan
por documento, no dos veces por sus extremos; rejected/cancelled no son pendientes.
No existe métrica Assigned ni Assignment funcional.

## Búsqueda, filtros y ficha

Filtros strict/combinables: nombre o móvil chileno completo normalizado, congregación,
día activo, bloque activo, estado active/withdrawn/cancelled (active por defecto), vínculo
all/none/pending/accepted/conflict. Nombre tolera acentos/case. Móvil parcial devuelve
mensaje humano; filtros ajenos/inactivos se rechazan. Orden alfabético, página de 25.
Sin descarga de dataset completo para filtrar en navegador.

La ficha distingue selección actual de histórico/inactivo/eliminado. maxTurns null se
muestra «Sin límite». Accepted es vínculo **obligatorio** para futura planificación;
se señala compañero, conflicto de disponibilidad o participación. Pending es secundario,
con dirección enviada/recibida. No hay aceptar/rechazar/cancelar por el organizador ni
edición de disponibilidad. Un conflicto no disuelve el vínculo.

## Actualización y rendimiento V1

Botón Actualizar, polling cada 30 segundos mientras la pestaña está visible y actualización
al volver a ella. Dos solicitudes API por consulta; tres con ficha abierta. Ficha también
se actualiza durante polling. AbortController cancela consultas anteriores y evita respuestas
obsoletas; carga/error/vacío/última actualización son visibles. En 401/403 o fallo de
renovación del token se limpian datos privados visibles; errores de servicio indican datos
de la última consulta correcta.

Una consulta agrega campaña + seis queries por campaignId, y dos lecturas getAll por lotes
para perfiles/congregaciones. Ficha añade una lectura de teléfono seleccionado. No hay
N+1 Firestore por participante. Lectura proporcional al dataset V1; no se pretende optimizar
para miles de registros. Sin consultas a points/assignments/planner.

## Validación

`npm ci` ejecutado. Suites secuenciales, sin mocks de autorización:

```sh
FIREBASE_ADMIN_PROJECT_ID=demo-campaign-auth firebase emulators:exec \
  --project demo-campaign-auth --config firebase.campaign-auth.json \
  --only firestore,auth \
  'npm run test:campaign-auth && npm run test:campaign-registration && npm run test:campaign-pair-requests && npm run test:campaign-admin-dashboard'
npm run typecheck
npm run build
```

Auth Emulator acuña ID tokens reales; se verifican por el Admin SDK existente, con claim
actual, usuario deshabilitado y revokeRefreshTokens. El shim server-only del runner no
sustituye autenticación. Configuración añade solo Auth Emulator local; Rules sin cambios.

Fixture 80 participantes / 4 congregaciones / tres días / varios bloques: baja cobertura,
full/exceso, capacidad cero, indefinida, históricos, pending/accepted/accepted sin overlap,
withdrawn/cancelled y referencia ajena inválida. Se siembran datos operativos ficticios en
emuladores exclusivamente; no se llaman 80 registros públicos ni se reducen límites auth.
Pruebas de DTOs/headers/filtros/aislamiento/concurrencia/volumen/bulk field masks/Rules.

Prueba manual en navegador: login Firebase ficticio y claim real de emulador, enlace desde
configuración, resumen/déficit/full/reserva, bloque → disponibles, búsqueda sin acentos y por
móvil, congregación/día/bloque combinados, pending/accepted/conflicto, ficha histórica,
maxTurns/disponibilidad actualizados, móvil 390px y actualización visible. La conexión de
los SDK cliente a emuladores se aplicó **temporalmente para QA** y se retiró; no hay bypass
ni cambio global Firebase en el commit.

Resultado final secuencial: Fase 2 **12/12**, Fase 3 **13/13**, Fase 4 **20/20** y
Fase 5 **25/25**; cero fallos/omitidas. npm ci correcto (82 advertencias de vulnerabilidades
del árbol existente; no se ejecutó audit fix ni se cambiaron dependencias). Typecheck:
solo cuatro Date/Timestamp de Limpieza y dos imports de Territorios. Build: solo esos dos
imports faltantes. No se corrigen esas áreas ni se declara build exitoso.

## REVISAR ANTES DEL PILOTO — RATE LIMITS AUTH

Intactos: registro global **30/15 minutos**, login global **120/15 minutos**. La fixture
operativa de 80 confirma que una apertura con 40–80 altas concentradas excedería 30: entre
10 y 50 intentos quedarían fuera de la primera ventana, sin contar reintentos. No es una
prueba de carga del endpoint público. Login también requiere revisar margen para reintentos.
Decisión humana antes del piloto: escalonar acceso o autorizar un ajuste en tarea separada.
No se modifican límites, credenciales ni provisioning en Fase 5.

Pendientes no bloqueantes existentes: provisioning de campaign_admin y eventual infraestructura
segura para congregation_coordinator. Ninguno introduce criterios adicionales a esta fase.
Fuera de alcance: Assignment, parejas manuales, planner, puntos, BlockPoint operativo,
programa/publicación/PDF, ChangeRequest y push. No se avanzó a Fase 6.
