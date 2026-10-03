# D-Territorio Campañas — Biblioteca de Componentes UI

## 1. Objetivo

Definir componentes reutilizables para que la implementación mantenga consistencia entre panel web y PWA.

## 2. App Shell — Panel web

Estructura:
- sidebar izquierda;
- header superior compacto;
- área de contenido principal;
- panel lateral opcional para detalle contextual.

Sidebar sugerida:
- Resumen
- Participantes
- Cobertura
- Planificación
- Programa
- Solicitudes
- Configuración

## 3. App Shell — PWA

Navegación inferior sugerida:
- Inicio
- Disponibilidad
- Mi programa
- Notificaciones
- Más

En pantallas pequeñas, máximo 5 destinos.

## 4. CampaignHeader

Debe mostrar:
- nombre campaña;
- rango de fechas;
- estado actual;
- ubicación general;
- acción principal según rol.

## 5. CoverageCard

Props sugeridas:
- date
- timeRange
- registeredCount
- targetCapacity
- status
- reserveCount

Debe permitir entender en menos de 2 segundos si falta apoyo.

## 6. ParticipantCard

Contenido:
- nombre completo;
- congregación como texto secundario;
- teléfono ocultable/parcial según permisos;
- disponibilidad relevante;
- turnos asignados/max;
- indicador de vínculo obligatorio confirmado si aplica.

Acciones web:
- seleccionar;
- ver detalle;
- asignar;
- mover a reserva.

## 7. AssignmentCard

Contenido mínimo:
- Punto N / nombre del punto;
- Hermano A;
- Hermano B;
- estado completo/incompleto;
- acciones editar/liberar.

Si falta una persona, mostrar claramente `Falta 1 participante`.

## 8. JointRequestCard

PWA:
- nombre de quien solicita;
- campaña;
- bloques compatibles si existen;
- botones `Aceptar` y `Rechazar`;
- prominencia alta.

Web:
- estado pendiente/aceptado/rechazado;
- participantes vinculados;
- advertencias de disponibilidad incompatible.

## 9. TimeSlotSelector

PWA:
- tarjeta seleccionable grande;
- fecha + hora;
- cobertura visible;
- estado: necesita apoyo / disponible / completo-reserva;
- check visual grande.

No usar checkboxes diminutos como patrón principal.

## 10. MaxTurnsSelector

Opciones tipo segmented cards/radio grandes:
- 1 turno
- 2 turnos
- 3 turnos
- sin límite específico

## 11. PlannerAvailableList

Panel web lateral con:
- búsqueda;
- filtros secundarios;
- lista de hermanos disponibles;
- contador total;
- tarjetas seleccionables.

Un participante asignado debe desaparecer de esta lista inmediatamente.

## 12. PlannerGrid

Centro del planificador:
- filas o tarjetas por punto;
- dos slots de participante por punto;
- soporte click para asignar;
- drag & drop opcional, nunca obligatorio para completar la tarea;
- feedback inmediato al asignar o liberar.

## 13. ReservePanel

Debe mostrar:
- personas disponibles no asignadas;
- orden configurable/manual;
- acción rápida para ocupar una vacante.

No interpretar automáticamente quién debe ser reserva.

## 14. StatusBadge

Variantes:
- draft
- open
- planning
- published
- active
- completed
- pending
- accepted
- rejected
- full
- needs_support
- reserve

Siempre texto + estilo semántico.

## 15. NotificationItem

Mostrar:
- icono;
- título corto;
- texto;
- fecha/hora;
- estado leído/no leído;
- deep link a la acción relacionada.

## 16. InstallPWABanner

Debe ser discreto y cerrable.

Android:
- botón `Instalar app` cuando el navegador permita prompt nativo.

IOS:
- instrucciones simples para `Compartir > Añadir a pantalla de inicio`.

No mostrar repetidamente si el usuario lo descarta.

## 17. EmptyState

Ejemplos:
- `Aún no tienes asignaciones.`
- `No hay hermanos disponibles en este bloque.`
- `No tienes notificaciones pendientes.`

Debe incluir una acción útil cuando corresponda.

## 18. ConfirmDialog

Obligatorio para:
- publicar programa;
- eliminar asignación publicada;
- cerrar inscripciones;
- rechazar cambios con impacto importante.

## 19. Toast / feedback

Mensajes breves:
- `Disponibilidad guardada.`
- `Asignación actualizada.`
- `Solicitud enviada.`

No utilizar toast como único lugar para errores críticos.

## 20. Componentes de formularios

- TextInput
- PhoneInput Chile friendly
- PinInput 4 dígitos
- Select
- SearchCombobox
- RadioCards
- Checkbox solo cuando sea adecuado
- Textarea
- DatePicker
- TimeRangeEditor

## 21. Regla de implementación

Antes de crear un componente nuevo, revisar si el patrón ya existe. La IA de desarrollo debe favorecer composición y reutilización, evitando múltiples versiones visuales de la misma acción.
