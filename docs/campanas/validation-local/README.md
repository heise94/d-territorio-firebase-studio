# Validación final exclusivamente local

Base: `354d3ce4a229f65c8f4e0c0ef7dbe83b7860e147`.
Rama: `feature/campanas-v1`. Ejecución: 12 de octubre de 2026.

No hubo push, staging, producción, merge ni limpieza de fixtures de QA.
Los datos visuales están rotulados **LOCAL UX REVIEW — NO REAL**.
La configuración cliente de emuladores requiere desarrollo, opt-in y un projectId
`demo-*`; no cambia la configuración productiva.

## Resultado

| Comprobación | Resultado |
| --- | --- |
| Planner original | 51/51 PASS; 13 ejecuciones con emulador limpio |
| Registro | 14/14 PASS (9 integración + 5 primitivas) |
| Privacidad integrada | 13/13 PASS |
| Regresión dashboard | 25/25 PASS |
| Formularios / payload Firestore | 5/5 PASS |
| Typecheck final | PASS, exit 0 |
| Build final | PASS, exit 0 |
| QA 1440×900 | PASS, las 11 pantallas |
| QA 1280×800 | PASS, las 11 pantallas |
| QA 1024×768 | PASS, las 11 pantallas |

No se eliminaron casos ni se relajaron assertions. No se cambió la lógica
transaccional productiva del planner. No hay bloqueos funcionales reproducibles
pendientes dentro del alcance de esta validación.

## Planner: cobertura completa por procesos limpios

Ejecutar `npm run test:campaign-planner:grouped` **antes** de arrancar la app
visual y sobre los puertos de emulador libres. El script verifica que se cubran
exactamente los 51 nombres originales, selecciona grupos con
`--test-name-pattern`, inicia y detiene Auth/Firestore con `emulators:exec`
en cada grupo y verifica el número de PASS y el exit code. No utiliza skips;
los logs muestran `skipped 0`. Los nombres y resultados íntegros están en
[results.json](planner/results.json).

| Grupo | Casos | Cobertura | Resultado |
| --- | ---: | --- | --- |
| 1 | 8 | Fixture, asignación básica, slots, liberación, movimiento | PASS |
| 2 | 8 | Movimiento ocupado, disponibilidad, maxTurns, accepted | PASS |
| 3 | 8 | Accepted legacy/corrupto, capacidad, auditoría, DTO | PASS |
| 4 | 8 | Autorización, revocación, Rules, estados, transporte, overrides | PASS |
| 5 | 8 | Cobertura y rechazos de estructura/identidad/referencias | PASS |
| 6 | 4 | Rechazos de bloque/día/BlockPoint/override | PASS |
| 7 | 1 | Activación idempotente concurrente | PASS |
| 8 | 1 | Dos UID, mismo slot, un ganador | PASS |
| 9 | 1 | Dos UID, misma persona, un ganador | PASS |
| 10 | 1 | Accepted concurrente, sin miembros duplicados | PASS |
| 11 | 1 | Desactivar frente a asignar | PASS |
| 12 | 1 | Liberar frente a mover | PASS |
| 13 | 1 | maxTurns concurrente entre bloques | PASS |
| **Total** | **51** | **Assertions originales intactas** | **PASS** |

Cada log `planner/group-01.log` a `group-13.log` registra salida 0 y apagado
de ambos emuladores. Las siete carreras conservan sus operaciones concurrentes.

El bloqueo monolítico previamente observado fue `Transaction lock timeout`
tras acumular carreras/transacciones en un proceso largo del emulador. La
comparación con estas 13 ejecuciones limpias sitúa el bloqueo en su ciclo de
vida/estado acumulado: todos los casos, incluidas las carreras críticas y
revocaciones, terminan correctamente. No hay una falla funcional reproducible
que justifique cambiar el motor del planner. Este resultado no declara
reparado el emulador ni una ejecución monolítica que no finalizó.

## Registro: causa exacta y corrección

Los perfiles B y C de `tests/campaign-registration/integration.test.ts` no
enviaban el campo obligatorio `congregationId` al servicio de registro.
El error ocurría en el setup, antes de las assertions de inscripción.
Se agregó `congregationId: "associated"` a ambas entradas ficticias.
No se cambió normalización +56, HMAC/pepper, límites de auth ni producto.
La suite completa terminó 14/14 en emulador fresco.

## Privacidad real e integrada

La nueva suite `tests/campaign-privacy/integration.test.ts` usa Firebase Auth
emulado, ID tokens, handlers HTTP reales, Rules y sesiones participantes.

- Responsable MAQUEHUE: lista exclusivamente sus pending, approved y
  not_approved. IDs conocidos de HUICHAHUE, MAPUDUNGÚN y PULMAHUE
  pending/not_approved reciben 404 opaco sin escritura.
- CAMPAIGN_ADMIN: obtiene approved de las cuatro congregaciones de su campaña;
  pending/not_approved por ID reciben 404 y Mi congregación no se autoriza.
- Grant de A: A accesible; B y una campaña inexistente devuelven la misma
  respuesta opaca. No se revela la existencia de B.
- Participante sin claim/grant: APIs admin, revisión, Mi congregación y acceso
  a roles/grants denegados. Rules también rechazan lecturas directas de las
  colecciones privadas.
- Approved vinculado a persona pending: la ficha y las métricas compartidas
  no revelan esa identidad privada. El vínculo no se cancela ni se altera.

Se corrigieron dos fugas detectadas por las pruebas: respuesta distinguible
para revisión de otra congregación e identidad privada filtrada por contexto
de PairRequest. Las assertions que fallaban pasan sin relajarlas.

## Approval invisible

Se ejecutaron por separado `pending → approved` y
`pending → not_approved` mediante el handler real de revisión. En ambas:

- 0 nuevas Notification;
- 0 nuevos outbox, push deliveries o push subscriptions;
- endpoint participante idéntico antes/después, sin approvalStatus ni mensajes
  de revisión/aprobación;
- Avisos participante devuelve 0;
- solo existe la auditoría interna esperada.

**APPROVAL INVISIBLE: PASS** (end-to-end de servicio, no simulación de helpers).

## Bugs encontrados y correcciones locales verificadas

- Firebase cliente sin configuración local: launcher sintético y conexión
  explícita a emuladores solo en desarrollo.
- Contraste negro sobre negro heredado del tema global: tema claro acotado al
  shell administrativo, sin afectar otras áreas.
- Query de sección ignorada y tres entradas de sidebar activas: editor muestra
  la sección solicitada y una sola entrada activa.
- Planner desbordaba el documento a 1024 px: columnas adaptadas sin cambiar
  asignación, accepted ni concurrencia.
- Mi congregación cortaba la acción “No aprobar” a 1024 px: acciones se
  acomodan y quedan visibles.
- Resumen mostraba 216 asignaciones aunque había 5: conteo sobre slots del
  programa real (5 de 32), no sobre disponibilidades.
- Información rechazaba enlaces opcionales vacíos; luego enviaba undefined
  anidado a Firestore: validación de URL vacía y limpieza central recursiva.
  Se preservan 0, false, null, permisos independientes y sentinels Firestore.
- Nueva campaña, Horarios y puntos e Información: refinamiento de formularios
  existentes con labels, cards, jerarquía y campos legibles. Sin nuevas
  funciones, endpoints, permisos ni rediseño general.

La creación real desde Nueva campaña guardó draft y createdBy del UID local.
El guardado real de Información confirmó éxito y, tras recarga/readback,
conservó el enlace opcional vacío y el permiso de WhatsApp.

## QA visual real

Navegador local, no capturas construidas desde código. Comparación con
`docs/campanas/ux-references/admin/`: sidebar teal, fondo cálido, jerarquía,
cards, tablas, espaciado, inputs, acciones visibles y exhibidor neutral
(sin cruces). Ninguno de los tres tamaños tiene overflow horizontal del
documento. Formularios largos conservan scroll vertical normal.

Los warnings del programa son deliberados: fixture con puntos incompletos.
No son fallas de render ni bloqueo genérico. Las capturas full page permiten
inspeccionar formularios y tablas bajo el primer viewport.

### Capturas de viewport (33)

| Pantalla | 1440×900 | 1280×800 | 1024×768 |
| --- | --- | --- | --- |
| Campañas — SUPER_ADMIN | [Captura](captures/1440-01-campanas.jpg) | [Captura](captures/1280-01-campanas.jpg) | [Captura](captures/1024-01-campanas.jpg) |
| Nueva campaña | [Captura](captures/1440-02-nueva-campana.jpg) | [Captura](captures/1280-02-nueva-campana.jpg) | [Captura](captures/1024-02-nueva-campana.jpg) |
| Resumen | [Captura](captures/1440-03-resumen.jpg) | [Captura](captures/1280-03-resumen.jpg) | [Captura](captures/1024-03-resumen.jpg) |
| Campaña | [Captura](captures/1440-04-campana.jpg) | [Captura](captures/1280-04-campana.jpg) | [Captura](captures/1024-04-campana.jpg) |
| Horarios y puntos | [Captura](captures/1440-05-horarios-puntos.jpg) | [Captura](captures/1280-05-horarios-puntos.jpg) | [Captura](captures/1024-05-horarios-puntos.jpg) |
| Mi congregación — MAQUEHUE / Pendientes | [Captura](captures/1440-06-mi-congregacion.jpg) | [Captura](captures/1280-06-mi-congregacion.jpg) | [Captura](captures/1024-06-mi-congregacion.jpg) |
| Participantes | [Captura](captures/1440-07-participantes.jpg) | [Captura](captures/1280-07-participantes.jpg) | [Captura](captures/1024-07-participantes.jpg) |
| Planificación | [Captura](captures/1440-08-planificacion.jpg) | [Captura](captures/1280-08-planificacion.jpg) | [Captura](captures/1024-08-planificacion.jpg) |
| Programa | [Captura](captures/1440-09-programa.jpg) | [Captura](captures/1280-09-programa.jpg) | [Captura](captures/1024-09-programa.jpg) |
| Solicitudes | [Captura](captures/1440-10-solicitudes.jpg) | [Captura](captures/1280-10-solicitudes.jpg) | [Captura](captures/1024-10-solicitudes.jpg) |
| Información | [Captura](captures/1440-11-informacion.jpg) | [Captura](captures/1280-11-informacion.jpg) | [Captura](captures/1024-11-informacion.jpg) |

### Capturas completas adicionales

Disponibles para cada ancho con el sufijo `-full.jpg` en las pantallas
02, 04, 05, 06, 07, 09, 10 y 11. Por ejemplo:
[Horarios completo 1024](captures/1024-05-horarios-puntos-full.jpg),
[Información completa 1024](captures/1024-11-informacion-full.jpg),
[Programa completo 1024](captures/1024-09-programa-full.jpg).

Pantallas pendientes: **ninguna** dentro del alcance local.
Bugs funcionales abiertos de Campañas detectados por esta validación:
**ninguno**.

## Compilación: notas no bloqueantes

Build final concluye exit 0 y typecheck final exit 0, sin errores nuevos
de Campañas. Persisten warnings globales de Genkit/Handlebars y de su import
opcional Jaeger. El build sin variables cliente remotas avisa que la
configuración Firebase está incompleta; la QA usa el launcher sintético
separado. No se agregaron credenciales ni secretos remotos.

El primer intento de build coincidió con la terminación del servidor dev y
falló limpiando `.next` (Directory not empty). Se verificó la salida completa
del servidor y el puerto libre; el reintento terminó PASS. No era un error
de compilación del producto.

En el login/dashboard global se observó además el conflicto preexistente
entre `public/favicon.ico` y `src/app/favicon.ico`; no interfiere con las
pantallas ni operaciones de Campañas. No se refactorizó ese módulo global.

## Reproducción exclusivamente local

Usar proyecto demo, nunca staging ni producción. Primero ejecutar los tests
con emuladores frescos, luego la QA; no ejecutarlos contra los fixtures vivos.

```sh
npm run test:campaign-planner:grouped

npx --offline firebase-tools@13.35.1 emulators:exec --only auth,firestore --project demo-campaign-auth --config firebase.campaign-auth.json "npm run test:campaign-registration"
npx --offline firebase-tools@13.35.1 emulators:exec --only auth,firestore --project demo-campaign-auth --config firebase.campaign-auth.json "npm run test:campaign-privacy"
npx --offline firebase-tools@13.35.1 emulators:exec --only auth,firestore --project demo-campaign-auth --config firebase.campaign-auth.json "npm run test:campaign-admin-dashboard"
node --import tsx --test tests/campaign-admin-forms.test.ts

npm run typecheck
npm run build
```

Para la app visual, iniciar Auth/Firestore con `emulators:start` usando esa
misma configuración demo. En otro terminal:
```sh
FIREBASE_ADMIN_PROJECT_ID=demo-campaign-auth FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed:campaign-local
npm run dev:campaign-local
```
El seed exige emulador demo local vacío y rechaza sobrescribir fixtures
existentes. No volver a ejecutarlo sobre la sesión de QA conservada.

**ESTADO: LISTO PARA PUSH A STAGING.** Este estado no autoriza ni ejecuta push.
