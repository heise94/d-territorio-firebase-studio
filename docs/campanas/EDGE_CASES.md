# D-Territorio Campañas — Casos Límite y Comportamientos Esperados

Este documento describe situaciones poco frecuentes o conflictivas que la implementación debe manejar sin improvisar reglas nuevas.

## 1. Teléfono duplicado
Si una persona intenta registrarse con un teléfono ya existente:
- no crear automáticamente un segundo participante;
- ofrecer recuperar/acceder a la cuenta existente;
- permitir que un organizador revise duplicados si existe error de digitación.

## 2. PIN olvidado
- El participante debe poder iniciar un flujo de recuperación asistida.
- No revelar el PIN existente.
- El organizador puede regenerar/reiniciar acceso según procedimiento seguro definido en `AUTH_SECURITY.md`.

## 3. Cambio de teléfono o dispositivo
- La identidad del participante no depende del dispositivo.
- Se puede iniciar sesión nuevamente en otro dispositivo.
- Las sesiones anteriores pueden seguir vigentes o ser revocadas según configuración.
- Las suscripciones push son independientes por dispositivo.

## 4. Bloque que llega a capacidad máxima
- El bloque se marca completo.
- Continúa aceptando disponibilidad.
- Los nuevos interesados pasan a reserva potencial.
- No se crea una asignación automáticamente.

## 5. Bloque inicialmente completo que luego pierde personas
- Al retirarse/cancelarse una asignación, el bloque vuelve a mostrar cupo.
- Los participantes de reserva potencial siguen visibles para los organizadores.
- El sistema no promueve automáticamente a nadie.

## 6. Cambio de capacidad de un bloque ya planificado
Si se reduce la capacidad por debajo de las asignaciones existentes:
- no eliminar asignaciones automáticamente;
- mostrar conflicto visible;
- exigir resolución manual antes de publicar.

Si se aumenta capacidad:
- recalcular cobertura;
- conservar asignaciones actuales.

## 7. Participante excede su máximo de turnos
- Mostrar advertencia fuerte.
- Permitir excepción solo con confirmación explícita del organizador.
- Registrar la excepción en auditoría si está disponible.

## 8. Pareja obligatoria pendiente
Mientras B no responda:
- A y B no deben tratarse como vínculo obligatorio confirmado;
- mostrar estado `pending`;
- no bloquear planificación de forma absoluta, pero advertir si se intenta publicar una situación que deje la solicitud sin resolver cuando sea relevante.

## 9. Pareja aceptada sin disponibilidad común
- Mostrar conflicto.
- No asignar automáticamente.
- Permitir que los participantes modifiquen disponibilidad mientras esté permitido.
- Si la planificación ya está cerrada, el caso debe resolverse manualmente por los organizadores.

## 10. Pareja aceptada y solo uno es asignado
- Puede existir temporalmente en borrador con advertencia.
- No se debe permitir publicar mientras el vínculo obligatorio esté incompleto para ese bloque.

## 11. Pareja aceptada y uno cancela participación
- Marcar el vínculo como conflictivo.
- No mover al otro automáticamente.
- El organizador debe resolver si se cancela el vínculo, se cambia el bloque o se retira la asignación.

## 12. Solicitudes cruzadas o duplicadas
Si A solicita a B y B ya solicitó a A:
- evitar crear dos vínculos independientes;
- consolidar o detectar como duplicado.

No permitir múltiples vínculos obligatorios incompatibles para la misma campaña sin resolución manual.

## 13. Participante sin congregación válida
- No permitir finalizar inscripción si congregación es requisito activo de la campaña.
- Si una congregación se desactiva posteriormente, conservar históricos y solicitar corrección para nuevas acciones.

## 14. Congregación renombrada
- El cambio de nombre no debe romper registros históricos.
- Usar IDs estables.

## 15. Bloque horario modificado después de recibir disponibilidad
Cambiar hora de inicio/fin puede afectar la intención original del participante.
- Mostrar advertencia al administrador.
- Mantener disponibilidad asociada al bloque, pero marcar el cambio como relevante.
- Preferir no modificar sustancialmente bloques con inscripciones sin confirmar nuevamente.

## 16. Bloque eliminado con disponibilidades o asignaciones
- No eliminar silenciosamente.
- Exigir confirmación y resolver dependencias.
- Si existen asignaciones publicadas, bloquear eliminación directa y requerir cancelación/reprogramación.

## 17. Punto eliminado con asignaciones
- No permitir eliminación silenciosa.
- Exigir reasignar o cancelar primero.

## 18. Dos organizadores editando a la vez
- La UI debe refrescar datos y detectar conflictos razonables.
- No confiar en datos de pantalla antiguos para sobrescribir asignaciones nuevas.
- Firestore/transacciones o validaciones backend deben prevenir duplicados.

## 19. Dos organizadores intentan asignar a la misma persona simultáneamente
- Solo una operación debe resultar válida.
- La segunda recibe un mensaje claro y actualiza la lista.

## 20. Participante modifica disponibilidad mientras está siendo planificado
- Si el estado todavía permite edición, recalcular inmediatamente.
- Si una asignación ya existe y la nueva disponibilidad la contradice, generar conflicto visible, no borrar la asignación automáticamente.

## 21. Programa ya publicado y luego editado
- Todo cambio posterior debe tratarse como modificación del programa publicado.
- Actualizar la vista del participante.
- Notificar a afectados.
- Mantener trazabilidad mínima.

## 22. Participante retirado de la campaña
- Conservar registro histórico.
- Retirar o marcar como canceladas sus asignaciones mediante flujo explícito.
- No eliminar físicamente datos necesarios para auditoría.

## 23. Notificación push rechazada o no soportada
- La PWA sigue siendo completamente usable.
- Mostrar avisos dentro de la app.
- No obligar al usuario a aceptar notificaciones.

## 24. Dispositivo offline
- Mostrar última información cacheada solo cuando sea seguro hacerlo.
- Indicar claramente que puede no estar actualizada.
- No confirmar mutaciones críticas como exitosas hasta sincronizarlas realmente.

## 25. Nombres idénticos
- Las búsquedas de participantes deben mostrar contexto suficiente, por ejemplo congregación y últimos dígitos del teléfono cuando corresponda al organizador.
- Nunca usar solo el nombre como identificador técnico.

## 26. Participante intenta seleccionar una pareja todavía no inscrita
V1 recomendada:
- no crear un participante fantasma;
- informar que la persona debe estar inscrita para enviar la solicitud.
- Esta regla puede evolucionar después si se documenta explícitamente.

## 27. Más de 16 disponibles en un bloque
- No es error.
- Mostrar capacidad principal y reservas potenciales claramente.
- Todos siguen disponibles para revisión manual.

## 28. Número impar de disponibles
- No crear pareja automática.
- Mostrar la persona restante como disponible/reserva según cobertura.

## 29. Solo una persona asignada a un punto
- Permitido temporalmente en borrador con estado incompleto.
- Debe advertirse antes de publicar.
- La política final de publicación de puntos incompletos debe ser explícita; por defecto V1 debe requerir resolución o confirmación especial.

## 30. Campaña finalizada
- La información pasa a modo principalmente lectura.
- No permitir cambios ordinarios de disponibilidad/asignaciones sin reabrir o usar acción administrativa excepcional.
