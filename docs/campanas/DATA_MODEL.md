# D-Territorio Campañas — Modelo de Datos Propuesto

> Documento conceptual. No obliga a usar una base de datos específica, pero define las entidades que la implementación debe respetar.

## 1. Campaign

Representa una campaña.

Campos sugeridos:
- id
- name
- description
- location_name
- location_details
- status
- registration_open_at
- registration_close_at
- published_at
- created_at
- updated_at
- max_points_default
- default_capacity_per_block

## 2. CampaignDay

Representa cada fecha de la campaña.

Campos:
- id
- campaign_id
- date
- label
- max_points_override opcional
- active

## 3. TimeBlock

Bloques horarios configurables por día.

Campos:
- id
- campaign_day_id
- start_time
- end_time
- label opcional
- capacity_override opcional
- active
- sort_order

La capacidad efectiva puede derivarse de:
`puntos activos x 2`
o ser configurada manualmente.

## 4. Congregation

Campos:
- id
- name
- active

Relación con campañas mediante `CampaignCongregation`.

## 5. CampaignCongregation

Campos:
- id
- campaign_id
- congregation_id
- coordinator_user_id opcional

## 6. Participant

Identidad del participante.

Campos sugeridos:
- id
- full_name
- phone_normalized
- congregation_id
- pin_hash / auth_reference
- active
- created_at
- updated_at

No almacenar correo como requisito.

No almacenar información médica, diagnósticos ni perfiles sensibles para decidir parejas.

## 7. CampaignRegistration

Inscripción de una persona en una campaña específica.

Campos:
- id
- campaign_id
- participant_id
- max_turns
- registration_status
- notes_from_participant opcional
- created_at
- updated_at

Estados sugeridos:
- active
- withdrawn
- cancelled

## 8. Availability

Disponibilidad por bloque.

Campos:
- id
- registration_id
- time_block_id
- available boolean
- created_at
- updated_at

Una disponibilidad no equivale a una asignación.

## 9. PairRequest

Solicitud para participar obligatoriamente con otra persona.

Campos:
- id
- campaign_id
- requester_registration_id
- recipient_registration_id
- status
- created_at
- responded_at

Estados:
- pending
- accepted
- rejected
- cancelled

Reglas:
- no puede existir vínculo obligatorio definitivo sin aceptación del receptor;
- si accepted, la planificación debe impedir separar a ambos en una asignación incompatible;
- si no comparten disponibilidad, mostrar conflicto, no resolver automáticamente.

## 10. Point

Punto físico de predicación.

Campos:
- id
- campaign_id
- name
- description
- location_text
- map_url opcional
- image_url opcional
- active
- sort_order

Los puntos pueden definirse después de recibir inscripciones.

## 11. BlockPoint

Permite activar/desactivar puntos por bloque.

Campos:
- id
- time_block_id
- point_id
- active

Esto permite que un mismo día tenga, por ejemplo, 8 puntos en un bloque y 5 en otro.

## 12. Assignment

Asignación final/manual de una persona a un punto y bloque.

Campos:
- id
- campaign_id
- time_block_id
- point_id
- registration_id
- slot_number (1 o 2)
- status
- created_by
- created_at
- updated_at

Estados sugeridos:
- draft
- published
- cancelled

Restricciones importantes:
- una persona no puede tener dos asignaciones en el mismo bloque;
- un punto admite máximo 2 participantes por bloque, salvo configuración futura explícita;
- si existe PairRequest accepted, ambos deben estar en el mismo time_block_id y point_id cuando sean asignados.

## 13. Reserve

Puede implementarse explícitamente o derivarse.

Opción preferida para V1: derivar reserva como participante que:
- tiene Availability=true;
- no tiene Assignment en ese bloque;
- el bloque ya alcanzó su capacidad principal o el organizador lo marca manualmente.

Si se necesita persistencia:
- id
- registration_id
- time_block_id
- priority/order opcional

## 14. ChangeRequest

Solicitud posterior del participante.

Campos:
- id
- assignment_id
- registration_id
- reason opcional
- status
- organizer_response opcional
- created_at
- resolved_at

Estados:
- pending
- approved
- rejected
- resolved

## 15. Notification

Historial visible dentro de la PWA.

Campos:
- id
- participant_id
- campaign_id
- type
- title
- body
- read_at
- created_at
- metadata

## 16. PushSubscription / DeviceSession

Separar identidad, sesión de dispositivo y suscripción push.

### DeviceSession
- id
- participant_id
- refresh/session token seguro
- device_label opcional
- created_at
- last_seen_at
- revoked_at

### PushSubscription
- id
- participant_id
- endpoint
- keys / provider reference
- created_at
- revoked_at

## 17. OrganizerUser

Usuarios administrativos.

Campos:
- id
- name
- auth_provider
- congregation_id opcional
- role
- active

Roles sugeridos:
- super_admin
- campaign_admin
- congregation_coordinator

## 18. OrganizerNote

Notas internas operativas, no sensibles.

Campos:
- id
- campaign_id
- registration_id opcional
- assignment_id opcional
- content
- created_by
- created_at

Usar solo para observaciones operativas breves. Evitar almacenar salud, diagnósticos, edad sensible u otros datos innecesarios.

## 19. AuditLog

Recomendado para acciones relevantes:
- creación/eliminación de asignaciones;
- publicación del programa;
- cambios de disponibilidad después de planificación;
- resolución de solicitudes;
- cambios de configuración.

Campos:
- id
- actor_id
- campaign_id
- action
- entity_type
- entity_id
- payload mínimo
- created_at

## 20. Consultas clave que el modelo debe soportar

1. Participantes disponibles para un bloque y no asignados.
2. Cobertura actual de cada bloque.
3. Número de turnos asignados vs máximo declarado.
4. Solicitudes de pareja pendientes.
5. Vínculos obligatorios aceptados.
6. Reservas potenciales por bloque.
7. Programa general por fecha, punto y horario.
8. Próxima asignación de un participante.
9. Solicitudes de cambio pendientes.
10. Historial de notificaciones por participante.
