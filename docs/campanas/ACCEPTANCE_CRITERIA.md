# D-Territorio Campañas — Criterios de Aceptación

Este documento define cuándo cada capacidad principal de V1 puede considerarse correctamente implementada.

## 1. Campaña y configuración
- Se puede crear una campaña sin valores fijos en código.
- Fechas, bloques horarios, congregaciones, capacidad objetivo y máximo de puntos son configurables.
- Los estados `draft`, `registration_open`, `planning`, `published`, `active` y `completed` afectan correctamente la interfaz.
- No se requiere definir todos los puntos antes de abrir inscripciones.

## 2. Acceso de participantes
- Un participante puede identificarse mediante teléfono + PIN.
- El PIN nunca se almacena en texto plano.
- Tras un acceso correcto, el dispositivo puede quedar como confiable.
- La sesión persistente permite volver a abrir la PWA sin pedir PIN mientras siga vigente.
- Existe un mecanismo de cierre/revocación de sesión.
- Un participante no puede leer datos privados de otros participantes.

## 3. PWA
- La PWA puede instalarse cuando el navegador lo permite.
- Existe una experiencia clara para Android y una guía para iPhone cuando corresponda.
- La navegación móvil es simple, predecible y usable por personas mayores.
- Existe una pantalla offline básica.
- La app conserva sesión de forma segura.

## 4. Inscripción
- El participante puede registrar nombre, teléfono, congregación, disponibilidad y máximo de turnos.
- La disponibilidad se registra por bloque horario.
- El máximo de turnos es visible para los organizadores.
- Una inscripción puede actualizarse mientras esté permitido por el estado de campaña.

## 5. Cobertura de bloques
- Cada bloque muestra cantidad disponible, asignada y reserva potencial.
- La capacidad es configurable.
- Al alcanzar la capacidad principal, el bloque se muestra como completo.
- Un bloque completo todavía permite que nuevos participantes marquen disponibilidad.
- Los nuevos interesados se consideran reserva potencial sin perder su disponibilidad.
- La UI da mayor visibilidad a bloques con baja cobertura.

## 6. Solicitud para participar juntos
- Un participante puede solicitar participar obligatoriamente con otro participante.
- El receptor debe confirmar o rechazar.
- La solicitud pendiente aparece destacada al ingresar a la PWA.
- También puede generar notificación push.
- La relación solo pasa a ser obligatoria después de la aceptación.
- Una relación aceptada impide publicar asignaciones incompatibles.
- Si no existe disponibilidad común, el sistema muestra el conflicto y no lo resuelve automáticamente.

## 7. Planificador manual
- Al seleccionar un bloque solo aparecen participantes disponibles para ese bloque que todavía no fueron asignados en él.
- Al asignar a un participante, desaparece inmediatamente de la lista de disponibles de ese bloque.
- Al quitar una asignación, vuelve a aparecer.
- Una misma persona no puede ser asignada dos veces en el mismo bloque.
- Los organizadores pueden formar manualmente parejas y asignarlas a puntos.
- El sistema nunca forma parejas automáticamente en V1.
- El máximo de turnos genera advertencia clara antes de excederse.
- Un organizador puede confirmar explícitamente una excepción.

## 8. Puntos
- Se pueden crear, editar, ordenar y activar/desactivar puntos.
- Un bloque puede tener una cantidad distinta de puntos activos que otro.
- El sistema soporta al menos 8 puntos por bloque sin degradar la interfaz.
- Cada punto admite dos participantes por bloque en V1.

## 9. Programa general
- El programa se genera desde las asignaciones estructuradas.
- Muestra fecha, bloques, puntos y ambos participantes de cada punto.
- Se adapta a cantidades variables de puntos y bloques.
- Existe una versión borrador claramente identificada.
- La versión publicada refleja exactamente los datos publicados.
- La impresión/PDF mantiene legibilidad, contraste y encabezados.

## 10. Publicación
- Antes de publicar, las asignaciones permanecen en estado borrador.
- La publicación realiza validaciones antes de confirmar.
- No se puede publicar una pareja obligatoria aceptada de forma incompatible.
- Al publicar, cada participante ve solo sus propias asignaciones.
- Se registra fecha de publicación.
- La publicación puede generar notificaciones a los participantes afectados.

## 11. Cambios posteriores
- Un participante puede solicitar un cambio cuando ya no puede modificar directamente una asignación publicada.
- El organizador puede aprobar, rechazar o resolver la solicitud.
- Las modificaciones posteriores al programa quedan auditables.
- Los participantes afectados reciben la información actualizada.

## 12. Notificaciones
- Existe un historial interno de notificaciones.
- Push e historial pueden originarse desde el mismo evento de dominio.
- Se soportan al menos: solicitud de pareja, respuesta, publicación, cambio de asignación, resolución de solicitud y recordatorio.
- Si el push falla, la información sigue siendo visible dentro de la PWA.

## 13. Seguridad y permisos
- Las validaciones importantes existen en backend/reglas, no solo en la interfaz.
- Los roles administrativos respetan los permisos definidos.
- Los organizadores autorizados pueden colaborar en la campaña.
- Los participantes nunca pueden acceder a vistas administrativas.
- No se recopilan datos sensibles innecesarios.

## 14. Accesibilidad y diseño
- Controles principales en PWA tienen tamaño táctil adecuado.
- Texto y estados tienen contraste suficiente.
- No se depende únicamente del color para comunicar estados.
- Las acciones destructivas o importantes requieren confirmación cuando corresponde.
- La UI respeta `DESIGN_SYSTEM.md` y `UI_COMPONENTS.md`.

## 15. Criterio global de V1
V1 puede considerarse lista cuando un flujo completo funciona de extremo a extremo:
1. se crea campaña;
2. se abren inscripciones;
3. participantes se registran y marcan disponibilidad;
4. se gestionan solicitudes de participación conjunta;
5. organizadores planifican manualmente;
6. se genera y valida el programa;
7. se publica;
8. participantes reciben y consultan su asignación;
9. se procesa al menos una solicitud de cambio posterior;
10. el sistema pasa las pruebas críticas de `TEST_PLAN.md`.
