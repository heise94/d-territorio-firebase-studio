# Fase 2 — Identidad y autenticación del participante

Implementación única en `src/modules/campaigns/server/auth`, con Route Handlers Next.js 15
en `/api/campanas/auth/[action]`, runtime Node.js >=22. Firebase Admin es necesario para
operaciones confiables, transacciones y colecciones que no son accesibles al cliente.
Su inicialización es lazy, `server-only` y reutiliza una aplicación nombrada en hot reload.
La autenticación administrativa Firebase Auth, el guard, `MANAGE_CAMPAIGNS` y
`campaign_admin` no se sustituyen ni se flexibilizan.

## Modelo y persistencia

- `participants`: ID opaco generado por Firestore, `id`, `fullName`, `phoneNormalized`,
  `congregationId` opcional, `pinHash`, `active`, `createdAt`, `updatedAt`, `sessionVersion`.
- `deviceSessions`: `id` opaco derivado del hash del token aleatorio, `participantId`,
  `tokenHash`, `sessionVersion`, `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt`.
  No se recolecta fingerprint, hardware ni user agent.
- `campaignParticipantPhones`: índice interno HMAC del teléfono → `participantId`.
  La transacción crea índice, participante y sesión conjuntamente. Dos registros simultáneos
  del mismo teléfono no crean dos identidades. También se reserva el teléfono de perfiles
  inactivos: se recuperan administradamente, no se crean duplicados.
- `campaignAuthLimits`: contadores con clave HMAC y `expiresAt`; `failures` agrega fallos
  de login sin almacenar teléfono, PIN ni intento individual.
- `auditLogs`: eventos mínimos de registro, login correcto, cambio/reset y revocación,
  con ID del participante y fecha; sin teléfono, hash o token.

Las dos colecciones internas no son entidades de campaña ni implementan nuevas fases.
Las consultas reales usan lecturas por ID y una igualdad `congregations.active == true`;
no requieren índices compuestos nuevos. Se puede configurar TTL sobre `expiresAt` en
`campaignAuthLimits` y `deviceSessions` para limpieza; no es requisito de seguridad:
el servidor verifica expiración aunque el documento no haya sido eliminado.

## Teléfono y PIN

Chile V1: `912345678`, `9 1234 5678`, `+56 9 1234 5678` → `+56912345678`.
Solo móviles chilenos válidos; no se verifica posesión del teléfono ni se usa SMS.
PIN de 4–6 dígitos, validado con Zod en cliente y servidor, confirmado al crear/cambiar.
HMAC con secreto del servidor como pepper, seguido de bcrypt con salt aleatorio y costo 12.
No es SHA-256 como sustituto de hash de contraseña. El secreto debe ser estable: cambiarlo
invalida la verificación de PIN e índices telefónicos y requiere migración administrada.

## Flujos

- Registro: nombre, teléfono, PIN/confirmación, congregación opcional. El selector solo
  carga nombres/IDs de congregaciones activas; el servidor vuelve a validar su existencia
  y estado dentro de la transacción. No crea `CampaignRegistration` ni inscripción.
- Login: búsqueda por índice privado, bcrypt (comparación dummy si no existe), estado activo,
  nueva sesión. Revalida hash/versión/estado en transacción para impedir carreras con reset.
  Las fallas no distinguen cuenta inexistente, PIN incorrecto o perfil inactivo.
- Cookie `campaign_participant_session`: HttpOnly, Secure en producción, SameSite=Lax,
  Path=/, Expires explícito a 30 días. Token aleatorio de 32 bytes; solo su SHA-256 persiste.
  Nunca se serializa el token en JSON ni se utiliza localStorage/sessionStorage/IndexedDB.
- `/campanas/ingresar` y `/campanas/registro` redirigen al inicio si la cookie sigue válida.
  `/campanas` es el inicio protegido. Conserva el shell visual anterior, incluida Información;
  sus destinos futuros continúan sin funcionalidad.
- `getCurrentParticipant()` / `requireParticipantSession()` validan token, vencimiento,
  revocación, versión de sesiones y participante activo. Retornan solo el DTO:
  `id`, `fullName`, `congregationId` si existe y `active`.
- `GET session` renueva a 30 días y actualiza `lastSeenAt` como máximo una vez por hora.
  El cliente lo consulta al abrir/enfocar la pantalla. Renderizar el servidor no escribe ni
  renueva cookies. No se autentica una identidad nueva estando offline.
- Logout revoca la sesión actual en servidor y expira la cookie.
- Cambio de PIN exige sesión válida y PIN actual, genera nuevo hash e incrementa
  `sessionVersion`. Todas las sesiones anteriores, incluida la actual, dejan de ser válidas;
  se elimina la cookie y se ingresa con el nuevo PIN.
- Reset y pérdida de dispositivo: servicios `resetParticipantPin(idToken, input)` y
  `revokeParticipantSessions(idToken, participantId)` en `server/auth/session.ts`.
  Verifican Firebase ID token con revocation check y claim `campaign_admin` en servidor.
  No hay endpoint público ni panel adicional de reset. Un coordinador verifica identidad
  externamente; el participante elige el nuevo PIN y el coordinador utiliza el servicio
  desde código servidor autorizado. No devolver, registrar o almacenar ese PIN fuera del hash.
  `sessionVersion` permite revocar atómicamente cualquier cantidad de sesiones sin límites
  de batch ni carreras con un login concurrente. Las sesiones antiguas conservan su versión;
  `revokedAt` se escribe para logout individual, no se recorre toda la colección en reset.
- `/campanas/recuperar` explica el contacto con la organización, sin preguntas de seguridad,
  SMS, consultas telefónicas ni enumeración de cuentas.

## Protección y aislamiento

Rate limiting distribuido mediante transacciones Firestore: 5 operaciones cada 15 minutos
por teléfono para login/registro, 5 por participante para cambio/reset, 10 por organizador
para reset/revocación. Login y registro tienen además límites globales de 120 y 30 por
15 minutos, respectivamente. Se cuenta cada intento, incluso exitoso, para evitar carreras;
el bloqueo temporal retorna 429. El contador no se reinicia al ingresar correctamente.
Se usa una clave global adicional en lugar de confiar en IPs de headers manipulables.
No depende de la memoria de una instancia. Fallas del datastore no abren el acceso.

Mutaciones: Origin debe coincidir exactamente con `CAMPAIGNS_APP_ORIGIN`, rechazan
`Sec-Fetch-Site: cross-site`, requieren JSON y limitan el cuerpo a 4 KiB. En desarrollo
sin origen configurado se admite el origen de la URL local; producción exige configuración.
Respuestas privadas `Cache-Control: private, no-store`, `Vary: Cookie`; sin CORS público.
PWA: páginas Campañas y API de autenticación usan NetworkOnly antes del cache por defecto;
no hay precache del inicio dinámico ni almacenamiento de DTO/sesiones por el service worker.

Ningún endpoint admite ID arbitrario para datos del participante. `session` deriva la identidad
exclusivamente de su cookie. Los DTO se construyen por lista permitida, no con spread de
entidades. Firestore Rules niegan toda lectura/escritura cliente de participantes, sesiones,
índice telefónico, límites y auditoría, incluso para Firebase Auth/campaign_admin.
Admin SDK usa IAM en servidor; sus credenciales nunca deben llegar al browser.

## Variables de entorno (sin valores reales)

- `CAMPAIGNS_AUTH_SECRET`: secreto aleatorio estable, mínimo 32 caracteres, solo servidor.
- `CAMPAIGNS_APP_ORIGIN`: origen canónico exacto con protocolo, sin barra final; obligatorio
  en producción. Debe coincidir con el dominio desde el que se accede a las pantallas.
- `FIREBASE_ADMIN_PROJECT_ID`: ID del proyecto Firebase para el backend.
- `FIREBASE_ADMIN_CLIENT_EMAIL` y `FIREBASE_ADMIN_PRIVATE_KEY`: opcionales si se usa una
  cuenta de servicio explícita; los tres campos deben configurarse conjuntamente.
  La clave admite saltos de línea reales o escapados. Usar el gestor de secretos de hosting.
- `GOOGLE_APPLICATION_CREDENTIALS`: alternativa ADC local, ruta a una credencial fuera del
  repositorio. En App Hosting utilizar identidad de ejecución/ADC y permisos IAM apropiados.
- `FIRESTORE_EMULATOR_HOST`: exclusivamente pruebas locales; nunca configurarlo en producción.

Ninguna variable secreta usa `NEXT_PUBLIC_`. No se incluyen archivos de credenciales.
Al desplegar se deben configurar estos secretos/origen y publicar las reglas actualizadas.
Estas pruebas no afirman haber desplegado infraestructura ni validado un dominio de producción.

## Pruebas reproducibles

```sh
npm ci
npm exec --yes --package firebase-tools@13.35.1 -- firebase emulators:exec --only firestore --project demo-campaign-auth --config firebase.campaign-auth.json 'npm run test:campaign-auth'
npm run typecheck
npm run build
```

El CLI se usa temporalmente; no es dependencia de producción. Las pruebas requieren Java 17
y usan exclusivamente el proyecto ficticio `demo-campaign-auth` y puerto local 8088.
La suite falla explícitamente si falta el emulador (no consulta producción).
Prueba funciones puras, bcrypt, transacciones reales, registro duplicado concurrente,
perfil inactivo, login correcto/incorrecto, límites entre instancias, sesión/renovación,
expiración/logout, cambio/reset/revocación total, cookies reales de los Route Handlers,
CSRF, DTOs e intentos de acceso directo con rules para anónimo, usuario y organizador.

Resultado local 2026-10-04: 12 pruebas aprobadas, sin omitidas. Verificación adicional
en navegador con Next dev + emulador: formularios de ingreso/registro disponibles,
login de identidad ficticia, inicio protegido con nombre, recarga sin pedir PIN,
logout con retorno al ingreso. No se usaron perfiles ni credenciales de producción.
`npm ci` correcto. Typecheck reporta únicamente los seis errores históricos indicados;
build se detiene únicamente por los dos imports históricos de Territorios.

Errores históricos excluidos: cuatro incompatibilidades Date/Timestamp en Limpieza y dos
imports inexistentes en Territorios. No se modifican para cerrar esta fase.
El provisionamiento de `campaign_admin` y el panel completo de recuperación administrativa
siguen fuera de alcance; la base servidor de recuperación sí queda preparada.
Sin avance a Fase 3, cambios del panel Fase 1, merge, ni cierre automático del issue #3.
