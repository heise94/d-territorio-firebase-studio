# D-Territorio Campañas — PWA y Notificaciones

## 1. Objetivo

Entregar una PWA simple, instalable y confiable, especialmente en teléfonos Android, sin perjudicar a usuarios de iPhone.

## 2. Instalación

La PWA debe incluir:
- web manifest;
- nombre corto y largo;
- iconos apropiados;
- `display: standalone`;
- color de tema;
- pantalla/shell offline básica.

La interfaz debe detectar cuando la instalación puede sugerirse y mostrar una tarjeta no invasiva.

### Android
Cuando el navegador exponga el flujo de instalación, mostrar botón:

`Instalar aplicación`

### iPhone/iPad
Mostrar instrucciones visuales breves cuando no exista botón nativo:

`Compartir → Añadir a pantalla de inicio`

No mostrar permanentemente la guía después de que el usuario la descarte.

## 3. Inicio rápido

Cuando exista sesión válida:
- abrir directamente `Inicio`;
- mostrar próximo turno o estado de inscripción;
- mostrar solicitudes pendientes prioritarias;
- no pedir PIN de nuevo.

## 4. Push notifications

Las notificaciones push deben ser opcionales y solicitar permiso solo después de que el usuario comprenda el beneficio.

No pedir permiso inmediatamente en la primera carga sin contexto.

Momento sugerido:
- después del registro exitoso o desde una tarjeta en Inicio.

Texto UX:

`Activa las notificaciones para recibir avisos sobre solicitudes, asignaciones y cambios importantes.`

## 5. Tecnología

Aprovechar Firebase cuando sea conveniente.

Opción preferida:
- Firebase Cloud Messaging para entrega push compatible;
- service worker PWA;
- almacenamiento de suscripción/device token vinculado al Participant.

La implementación final debe confirmar compatibilidad del navegador y manejar gracefully cuando push no esté disponible.

## 6. Eventos notificables V1

### Prioridad alta
- `pair_request_created`
- `program_published`
- `assignment_changed`
- `change_request_resolved`

### Prioridad media
- `pair_request_accepted`
- `pair_request_rejected`
- `turn_reminder`

## 7. Centro de notificaciones

Toda notificación relevante debe persistirse en el historial interno aunque el push falle.

Campos mínimos:
- title
- body
- type
- createdAt
- readAt
- targetRoute opcional
- metadata mínima

La PWA tendrá una pantalla `Notificaciones`.

## 8. Solicitud para participar juntos

Caso especialmente importante.

Cuando A solicita participar con B:
1. se crea PairRequest pending;
2. se genera Notification para B;
3. se intenta push;
4. al abrir la PWA, B debe ver una tarjeta destacada antes del contenido normal;
5. B acepta o rechaza;
6. resultado se refleja inmediatamente a A y administradores.

No depender exclusivamente del push para obtener respuesta.

## 9. Programa publicado

Cuando se publica programa:
- generar notificación interna a participantes afectados;
- enviar push si está habilitado;
- incluir fecha y horario resumido;
- la notificación abre `Mi programa`.

Si un participante tiene varios turnos, no saturar con una notificación por cada celda si puede resumirse en una sola publicación.

## 10. Cambios posteriores

Si un organizador modifica una asignación ya publicada:
- comparar estado previo y nuevo;
- notificar únicamente a participantes afectados;
- indicar claramente que hubo cambio;
- mostrar la nueva asignación como fuente de verdad.

Ejemplo:

`Tu asignación del sábado 10:00–12:00 fue actualizada. Revisa tu programa.`

## 11. Recordatorios

V1 puede soportar recordatorio configurable previo al turno.

Propuesta inicial:
- recordatorio el día anterior;
- evitar múltiples recordatorios innecesarios;
- nunca notificar si la asignación fue cancelada.

Si programar tareas automáticas agrega complejidad excesiva, esta función puede quedar como V1.1 sin bloquear lanzamiento.

## 12. Estado de permisos

La PWA debe mostrar estado entendible:
- Notificaciones activadas
- Notificaciones desactivadas
- No disponibles en este navegador

No culpar al usuario si el navegador no ofrece soporte.

## 13. Caché y offline

Cachear:
- shell de aplicación;
- assets visuales;
- información pública de campaña razonable;
- última vista de programa personal cuando sea seguro.

No cachear de manera que otro usuario del mismo navegador pueda ver información después de cerrar sesión.

Al cerrar sesión, limpiar datos privados cacheados cuando corresponda.

## 14. Actualizaciones de PWA

Cuando haya nueva versión del service worker:
- evitar bucles de recarga;
- mostrar aviso discreto cuando sea necesario;
- ofrecer `Actualizar`.

## 15. Criterios de aceptación

- instalable en Android compatible;
- guía funcional en iOS;
- sesión persiste después de cerrar/abrir PWA;
- notificaciones internas funcionan aunque push esté desactivado;
- solicitud de pareja aparece destacada al ingresar;
- cambios de programa llegan a afectados;
- la app maneja modo offline sin presentar datos falsamente sincronizados.
