# D-Territorio Campañas — Especificación Maestra

## 1. Objetivo

Crear un módulo complementario de D-Territorio, pensado inicialmente para `campanas.d-territorio.cl`, que permita organizar campañas especiales de predicación mediante inscripción de participantes, disponibilidad por bloques, planificación manual de parejas, asignación a puntos y publicación del programa general.

La primera campaña objetivo es la campaña con exhibidores en el Cementerio Padre Las Casas.

## 2. Principio de funcionamiento

El sistema debe facilitar la organización, pero no decidir por los organizadores.

El sistema sí puede:
- recopilar disponibilidad;
- mostrar cobertura por horario;
- detectar conflictos;
- mostrar participantes disponibles por bloque;
- ocultar de la lista de disponibles a quienes ya fueron asignados en ese bloque;
- gestionar solicitudes obligatorias de participación conjunta;
- generar el programa general.

El sistema NO debe:
- formar parejas automáticamente;
- decidir compatibilidades personales;
- inferir edad, sexo, salud u otras condiciones personales;
- reemplazar el criterio de los hermanos responsables.

## 3. Usuarios

### 3.1 Participante
Puede:
- registrarse;
- ingresar con teléfono y PIN;
- mantener sesión en un dispositivo de confianza;
- instalar la PWA;
- recibir notificaciones;
- marcar disponibilidad;
- indicar máximo de turnos deseados;
- solicitar participar obligatoriamente con otro hermano;
- aceptar o rechazar una solicitud recibida;
- modificar disponibilidad mientras esté permitido;
- ver sus asignaciones publicadas;
- solicitar cambios posteriores.

### 3.2 Organizador
Puede:
- crear/configurar campañas;
- administrar fechas y bloques horarios;
- revisar inscritos;
- revisar cobertura;
- abrir bloques de planificación;
- seleccionar manualmente parejas;
- asignar parejas a puntos;
- gestionar reservas;
- publicar programa;
- revisar solicitudes de cambio;
- generar programa general.

### 3.3 Encargados por congregación
La campaña podrá contar con un hermano encargado por cada congregación participante. Todos podrán colaborar en la planificación según permisos definidos por administración.

## 4. Campaña configurable

Una campaña debe tener:
- nombre;
- descripción;
- ubicación general;
- fechas;
- bloques horarios configurables;
- congregaciones participantes configurables;
- máximo de puntos por día;
- capacidad objetivo por bloque;
- estado de campaña.

Nada de esto debe quedar fijo en código.

## 5. Estados de campaña

Estados propuestos:
1. Borrador
2. Inscripciones abiertas
3. Planificación
4. Programa publicado
5. Campaña en curso
6. Finalizada

El comportamiento de la PWA y del panel administrativo debe depender del estado.

## 6. Disponibilidad y cobertura

Para la campaña inicial se considera un máximo histórico de 8 puntos por día.

Cada punto requiere 2 participantes por bloque.

Por lo tanto, un bloque puede tener hasta 16 participantes principales.

La capacidad debe ser configurable por campaña o bloque.

Ejemplo:
- 8 puntos = 16 participantes;
- 6 puntos = 12 participantes;
- 5 puntos = 10 participantes.

El sistema no debe asumir que siempre se abrirán los 8 puntos.

La cantidad final de puntos activos se decidirá después según el apoyo disponible.

## 7. Comportamiento cuando un bloque se llena

Cuando un bloque alcanza su capacidad principal:
- debe mostrarse visualmente como completo;
- el hermano todavía puede marcar disponibilidad;
- debe advertirse que probablemente quedará como reserva;
- los nuevos interesados pasan conceptualmente a reserva para ese bloque.

El objetivo es seguir captando reemplazos sin desalentar la inscripción en bloques con menor cobertura.

La PWA debe destacar más los bloques donde se necesita apoyo.

## 8. Máximo de turnos por participante

Durante la inscripción el participante podrá indicar cuántos turnos desea realizar como máximo.

Opciones configurables sugeridas:
- 1 turno;
- 2 turnos;
- 3 turnos;
- sin límite específico.

El panel debe mostrar claramente cuántos turnos tiene asignados cada participante y advertir si se intenta superar su máximo.

## 9. Participar obligatoriamente con otro hermano

Esta función no es una preferencia. Si se confirma, ambos deben ser asignados juntos.

Flujo:
1. Participante A busca/indica al participante B.
2. Se crea una solicitud pendiente.
3. Participante B recibe notificación.
4. Al ingresar a la PWA, la solicitud pendiente debe mostrarse de forma destacada.
5. B puede aceptar o rechazar.
6. Solo al aceptar pasa a ser un vínculo obligatorio confirmado.

Si todavía no existen bloques de disponibilidad compatibles, el sistema debe advertirlo.

El vínculo no debe significar que la plataforma forma automáticamente la pareja; solo obliga a que los organizadores no los separen al asignar.

## 10. Congregaciones

Inicialmente:
- Maquehue
- Pulmahue
- Huichahue
- Mapudungun

La congregación es un dato secundario de cada participante.

No es una regla obligatoria mezclar congregaciones. Sin embargo, los organizadores pueden considerarlo manualmente al formar parejas.

El sistema no debe destacar visualmente combinaciones entre congregaciones como objetivo principal.

## 11. Planificación manual por bloque

Al abrir un bloque horario, el sistema debe mostrar dos áreas principales:

### Disponibles
Participantes que:
- marcaron disponibilidad para ese bloque;
- aún no fueron asignados en ese bloque.

### Asignados
Participantes que ya forman parte de una pareja/punto en ese bloque.

En cuanto un participante queda asignado, debe desaparecer de la lista de disponibles de ese bloque.

Si se elimina su asignación, debe volver automáticamente a disponibles.

Debe impedirse asignar a una misma persona dos veces en el mismo bloque.

## 12. Puntos

Los puntos no necesariamente se definen antes de recibir las inscripciones.

El sistema debe permitir:
- definir hasta un máximo configurable por campaña;
- activar una cantidad distinta de puntos por día o bloque;
- nombrarlos;
- agregar descripción;
- agregar ubicación/instrucciones;
- opcionalmente agregar imagen o referencia visual.

Para la campaña inicial el máximo esperado es 8 puntos por día.

## 13. Reservas

Cada bloque debe poder mostrar participantes de reserva.

Las reservas son personas disponibles para ese horario pero que no fueron incluidas en la capacidad principal o no fueron asignadas.

Los organizadores deben poder utilizar rápidamente una reserva cuando se libera una asignación.

## 14. Programa publicado

Una vez que la organización esté lista, los responsables podrán publicar el programa.

Antes de publicar:
- las asignaciones se consideran borrador;
- los participantes no deben asumir que son definitivas.

Después de publicar:
- cada participante ve solo sus propias asignaciones;
- puede ver día, bloque, punto, compañero/a e instrucciones;
- puede solicitar cambios si ya no puede participar.

## 15. Programa general

El panel web debe generar automáticamente una vista general similar al programa histórico usado en campañas anteriores.

Estructura esperada:
- título de campaña;
- fecha;
- columnas por punto;
- filas por bloque horario;
- dos participantes por celda/punto;
- responsables por tramo si la campaña los utiliza;
- puntos inactivos o vacíos claramente diferenciados.

Debe ser legible y de alto contraste.

Salidas deseadas:
- vista web;
- impresión;
- PDF;
- posible exportación a Excel en una fase posterior.

## 16. Autenticación de participantes

La experiencia debe ser simple para hermanos mayores.

Sistema propuesto:
- número de teléfono;
- PIN corto;
- sesión persistente en dispositivo de confianza.

El PIN no debería pedirse cada vez si la sesión sigue vigente.

No se requiere correo electrónico para participantes.

## 17. PWA

La PWA debe:
- ser instalable;
- funcionar especialmente bien en Android;
- mostrar instrucciones claras de instalación en iPhone cuando sea necesario;
- admitir notificaciones push;
- recordar sesión;
- tener navegación simple y predecible.

Secciones sugeridas:
- Inicio
- Mi disponibilidad
- Mi programa
- Notificaciones
- Información

## 18. Notificaciones

Casos de uso:
- solicitud para participar junto a otro hermano;
- solicitud aceptada/rechazada;
- programa publicado;
- nueva asignación;
- cambio de asignación;
- recordatorio previo al turno;
- solicitud de cambio aprobada/rechazada.

Las notificaciones deben indicar claramente a qué campaña y turno corresponden.

## 19. Cambios de disponibilidad

Mientras las inscripciones estén abiertas:
- el participante puede editar su disponibilidad libremente.

Cuando la campaña pase a planificación avanzada o programa publicado:
- los cambios que afecten asignaciones deben transformarse en una solicitud de cambio;
- los organizadores deciden cómo resolverlos.

## 20. Diseño

El diseño debe ser:
- moderno;
- visualmente atractivo;
- claro;
- predecible;
- de alto contraste;
- accesible para usuarios mayores;
- consistente con el ecosistema D-Territorio.

El panel web puede ser más denso y orientado a productividad.

La PWA debe priorizar:
- botones grandes;
- pocos pasos;
- mensajes claros;
- estados fáciles de reconocer;
- mínimo uso de menús escondidos.

## 21. Fuera de alcance de la V1

No incluir inicialmente:
- múltiples participantes administrados desde una misma cuenta;
- formación automática de parejas;
- perfiles médicos o información sensible;
- ranking de participantes;
- algoritmos que decidan compatibilidad personal;
- asignación completamente automática.

## 22. Criterio rector para futuras funciones

Toda función nueva debe responder a una pregunta:

> ¿Ayuda a los hermanos encargados a organizar mejor la campaña sin quitarles el control humano de las decisiones?

Si la respuesta es no, probablemente no pertenece a este módulo.
