# D-Territorio Campañas — Autenticación, Sesiones y Seguridad

## 1. Objetivo

Permitir una experiencia muy simple para los participantes sin depender de correo electrónico y contraseña tradicional.

Modelo UX:

**teléfono + PIN corto + dispositivo de confianza**

El PIN se usa principalmente para primer ingreso, recuperación o revalidación. La PWA debe mantener una sesión persistente para evitar pedirlo en cada apertura.

## 2. Importante: el teléfono no es una contraseña

El número de teléfono identifica al participante, pero no debe considerarse secreto.

La autenticación real depende de:
- PIN correcto;
- controles antiabuso;
- sesión/token emitido por backend;
- autorización de cada operación.

## 3. Normalización de teléfono

Para Chile, normalizar internamente a formato E.164 cuando sea posible.

Ejemplo:

`+56912345678`

La UI puede aceptar distintas formas de escritura y normalizarlas.

No usar el teléfono como ID de documento.

## 4. PIN

V1 recomendada:
- PIN numérico de 4 a 6 dígitos;
- nunca guardar texto plano;
- almacenar hash con algoritmo de contraseña adecuado;
- aplicar rate limiting;
- bloquear temporalmente después de múltiples intentos fallidos;
- permitir regeneración/restablecimiento por un organizador autorizado si fuera necesario.

La implementación no debe enviar el PIN de vuelta al cliente después de establecerlo.

## 5. Alta de participante

Flujo sugerido:

1. Usuario abre campaña.
2. Ingresa teléfono.
3. Si no existe perfil, crea inscripción con nombre, congregación y PIN.
4. Backend normaliza teléfono y valida unicidad razonable.
5. Se crea sesión segura.
6. El dispositivo queda reconocido.

Como no se ha definido verificación SMS para V1, el sistema debe asumir que el PIN es un mecanismo práctico de acceso y no una identidad de alta seguridad.

No afirmar al usuario que su número fue verificado si no hubo OTP/SMS real.

## 6. Inicio de sesión

1. Teléfono.
2. PIN.
3. Backend valida credenciales.
4. Se entrega sesión segura.
5. La PWA recuerda el dispositivo.

Después, abrir la PWA debe llevar directamente a Inicio mientras la sesión sea válida.

## 7. DeviceSession

Cada sesión persistente debe representar un dispositivo/sesión autorizada.

Campos sugeridos:
- id
- participantId
- tokenHash o referencia segura
- createdAt
- lastSeenAt
- expiresAt
- revokedAt
- userAgent resumido opcional
- deviceLabel opcional

No guardar el token reutilizable en texto plano en Firestore.

## 8. Almacenamiento en navegador

Preferir cookie segura HttpOnly cuando la arquitectura lo permita.

Propiedades:
- Secure
- HttpOnly
- SameSite=Lax o Strict según flujo
- expiración explícita

Evitar almacenar tokens de sesión sensibles directamente en `localStorage` si puede evitarse.

LocalStorage/IndexedDB puede utilizarse para preferencias no sensibles y caché de UX.

## 9. Expiración

La sesión debe ser larga para favorecer usabilidad, pero no infinita.

Propuesta inicial:
- sesión renovable por 30 días;
- renovación silenciosa mientras el dispositivo se siga usando;
- revocación por cierre de sesión, reseteo de PIN o acción administrativa.

El valor final puede configurarse.

## 10. Recuperación

La V1 necesita un mecanismo práctico para hermanos que olviden el PIN.

Flujo recomendado:
- botón “No recuerdo mi PIN”;
- mensaje para contactar al coordinador/organización;
- organizador verifica identidad fuera del sistema y genera restablecimiento;
- el participante define un nuevo PIN.

No utilizar preguntas de seguridad.

SMS OTP puede evaluarse en una fase posterior.

## 11. Autenticación de organizadores

Los organizadores no deben usar el mismo mecanismo simplificado de participantes si ya existe autenticación administrativa en D-Territorio.

Preferir reutilizar el sistema de autenticación administrativo existente y asignar roles:
- super_admin
- campaign_admin
- congregation_coordinator

Si el repositorio usa Firebase Auth para administración, mantenerlo.

## 12. Autorización

Toda lectura/escritura debe validar identidad y alcance.

Participante puede:
- leer su perfil;
- leer su inscripción;
- editar su disponibilidad cuando el estado lo permita;
- leer sus propias asignaciones publicadas;
- leer sus notificaciones;
- responder solicitudes dirigidas a él;
- crear solicitudes permitidas.

Participante NO puede:
- listar todos los participantes;
- leer teléfonos de terceros;
- leer notas internas;
- cambiar asignaciones;
- leer borradores administrativos.

Organizadores operan según rol y campaña.

## 13. Firestore Rules + backend

Las Firestore Security Rules deben servir como segunda barrera.

Sin embargo, operaciones críticas deben pasar por backend confiable.

No diseñar una aplicación donde el cliente escriba libremente `assignments` y la seguridad dependa solo de la UI.

## 14. PairRequest y privacidad

Para buscar a la persona con quien desea participar, no exponer un directorio completo con teléfonos.

UX recomendada:
- búsqueda por nombre dentro de los inscritos de la campaña;
- resultados mínimos: nombre + congregación como dato secundario;
- nunca mostrar teléfono del otro participante.

Si hay nombres idénticos, el sistema puede pedir confirmación mediante congregación u otro dato no sensible ya existente.

## 15. Notas internas

No almacenar información médica ni diagnósticos.

Si los coordinadores conocen condiciones personales necesarias para asignar correctamente, ese criterio se conserva fuera del sistema.

Las notas internas deben limitarse a información operativa no sensible.

## 16. Rate limiting

Aplicar límites en endpoints de:
- login;
- creación/reset de PIN;
- PairRequest;
- notificaciones;
- operaciones críticas administrativas.

La configuración exacta dependerá del hosting.

## 17. Auditoría

Auditar como mínimo:
- login exitoso/fallido de forma agregada y segura;
- reseteo de PIN;
- revocación de sesión;
- creación/movimiento/eliminación de asignaciones;
- publicación de programa;
- cambios de configuración;
- resolución de PairRequest/ChangeRequest.

No registrar secretos.

## 18. Riesgo aceptado de V1

Sin verificación SMS, una persona que conozca teléfono y PIN podría acceder a ese perfil.

Esto es aceptable solo porque:
- el sistema contiene información operativa de baja sensibilidad;
- se mantiene minimización de datos;
- los participantes no ven información privada de terceros;
- el PIN se protege y limita intentos.

Si el alcance del producto cambia, reevaluar autenticación.
