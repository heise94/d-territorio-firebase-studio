# D-Territorio Campañas — Flujos UX

## 1. Principios UX

La experiencia debe ser especialmente simple para participantes mayores o con poca afinidad tecnológica.

Prioridades:
- lenguaje directo;
- botones grandes;
- mínimo número de pasos;
- estados visibles;
- evitar formularios largos en una sola pantalla;
- no exigir correo electrónico;
- no pedir PIN constantemente;
- permitir instalación PWA y notificaciones.

## 2. Flujo del participante — primer ingreso

1. Abrir enlace público de la campaña.
2. Ver pantalla de bienvenida con nombre de campaña, fechas y ubicación.
3. Elegir `Inscribirme`.
4. Ingresar:
   - nombre y apellido;
   - teléfono;
   - congregación.
5. Crear/recibir PIN corto.
6. El sistema guarda sesión del dispositivo como confiable.
7. Se invita a instalar la PWA.
8. Se solicita permiso para notificaciones en un momento contextual, no inmediatamente al cargar.
9. Se continúa a disponibilidad.

## 3. Flujo de disponibilidad

La disponibilidad se presenta por día.

Cada bloque debe mostrar:
- horario;
- estado de cobertura;
- si aún necesita apoyo;
- si está casi completo;
- si está completo y la persona quedaría como reserva.

Ejemplo:

`10:00–12:00 · Se necesita apoyo · 7/16`

`14:00–16:00 · Completo · puedes quedar como reserva`

El participante puede marcar varios bloques.

Luego indica máximo de turnos deseados:
- 1;
- 2;
- 3;
- sin límite específico.

Finalmente confirma y ve resumen.

## 4. Inicio de la PWA

La pantalla Inicio debe responder rápidamente:

- ¿Estoy inscrito?
- ¿Tengo algo pendiente?
- ¿Ya fui asignado?
- ¿Cuál es mi próximo turno?

Orden de prioridad visual:
1. solicitud pendiente de participar juntos;
2. cambios importantes o alertas;
3. próxima asignación;
4. estado de disponibilidad;
5. accesos secundarios.

## 5. Solicitud de participar juntos

### Emisor
1. En inscripción o disponibilidad, elegir `Participar con otro hermano`.
2. Buscar por nombre y/o teléfono.
3. Seleccionar persona correcta.
4. Confirmar que la solicitud significa `si es aceptada, debemos ser asignados juntos`.
5. Estado queda `Pendiente de confirmación`.

### Receptor
Al abrir la PWA, la solicitud debe aparecer arriba de todo, destacada.

Ejemplo:

**Solicitud pendiente**
Juan Pérez desea participar contigo en esta campaña.

`Aceptar` `Rechazar`

También se envía notificación push.

### Resultado
- Si acepta: vínculo obligatorio confirmado.
- Si rechaza: vínculo eliminado y ambas partes reciben confirmación.
- Si no tienen bloques comunes de disponibilidad: mostrar advertencia y pedir revisar horarios.

## 6. Modificar disponibilidad

Mientras las inscripciones estén abiertas:
- acceso directo desde Inicio;
- cambios inmediatos;
- resumen antes de guardar.

Después de entrar en planificación/publicación:
- no permitir cambios silenciosos que rompan una asignación;
- ofrecer `Solicitar cambio`.

## 7. Mi programa

Una vez publicado, cada participante ve solo sus datos.

Por asignación mostrar:
- fecha;
- horario;
- punto;
- compañero/a;
- instrucciones;
- ubicación si existe;
- estado.

Debe distinguirse claramente entre disponibilidad y asignación.

## 8. Solicitar cambio

Desde una asignación publicada:
1. tocar `Solicitar cambio`;
2. seleccionar motivo general o escribir comentario opcional;
3. enviar;
4. ver estado `Pendiente`;
5. recibir notificación al resolverse.

## 9. Panel web — vista general

Dashboard sugerido:
- inscritos totales;
- cobertura por día;
- bloques completos;
- bloques con apoyo insuficiente;
- solicitudes de pareja pendientes;
- solicitudes de cambio pendientes;
- estado de publicación.

## 10. Panel web — planificación por bloque

Al elegir una fecha y bloque, mostrar:

### Columna/lista A — Disponibles
Solo personas que:
- marcaron ese bloque;
- no están asignadas en ese mismo bloque.

Cada tarjeta puede mostrar de forma secundaria:
- nombre;
- congregación;
- turnos asignados / máximo;
- vínculo obligatorio confirmado, si existe.

### Área B — Puntos/asignaciones
Cada punto tiene dos espacios de participante.

Ejemplo:

**Punto 1**
- Juan Pérez
- Ana Soto

**Punto 2**
- Vacío
- Vacío

Al asignar a una persona:
- desaparece de `Disponibles`;
- aparece en el punto;
- se actualiza cobertura.

Al quitarla:
- vuelve inmediatamente a `Disponibles`.

## 11. Reservas

En un bloque completo o con exceso de disponibilidad, debe existir una vista `Reserva`.

Los organizadores pueden:
- ver quién está disponible adicionalmente;
- promover una reserva a asignación;
- identificar rápidamente reemplazos.

## 12. Programa general

Vista optimizada para lectura e impresión.

Debe incluir:
- título;
- fecha;
- bloques horarios en filas;
- puntos en columnas;
- dos nombres por punto/bloque;
- responsables por tramo si se configuran.

Diseño:
- fondo claro;
- alto contraste;
- tipografía legible;
- colores suaves solo como apoyo;
- no depender del color para entender la tabla.

Acciones:
- vista previa;
- imprimir;
- exportar PDF;
- publicar.

## 13. Navegación PWA sugerida

Barra inferior:
- Inicio
- Disponibilidad
- Mi programa
- Avisos

`Información` puede vivir dentro de Inicio o menú secundario.

## 14. Mensajes importantes

Ejemplos de microcopy:

- `Marcar disponibilidad no significa que ya estés asignado.`
- `Este horario ya está completo. Puedes marcarlo igualmente y quedar disponible como reserva.`
- `Tu solicitud para participar junto a Ana está pendiente de confirmación.`
- `El programa todavía no ha sido publicado.`
- `Tu asignación fue actualizada.`
