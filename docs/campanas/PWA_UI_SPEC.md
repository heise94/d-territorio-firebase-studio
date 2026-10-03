# D-Territorio Campañas — Especificación UI de la PWA

## 1. Objetivo

Diseñar una experiencia móvil extremadamente simple para participantes de distintas edades y niveles de manejo tecnológico.

La PWA debe sentirse como una aplicación instalada y no como un formulario web largo.

---

# 2. Principios de experiencia

- móvil primero;
- tipografía legible;
- botones grandes;
- pocas decisiones por pantalla;
- lenguaje directo;
- estados visibles;
- confirmaciones claras;
- evitar navegación profunda;
- evitar formularios largos;
- alto contraste;
- no depender solamente de colores.

---

# 3. Inicio de sesión

## Primer ingreso

1. Número de teléfono.
2. Validación/creación de PIN.
3. Confirmación de identidad.
4. Opción de confiar en este dispositivo.

Texto recomendado:

**Confiar en este teléfono**

“Así podrás entrar directamente la próxima vez sin escribir tu PIN.”

El usuario debe poder cerrar sesión desde configuración.

---

# 4. Instalación de PWA

La aplicación debe detectar cuando no está instalada y mostrar una tarjeta no invasiva.

Ejemplo:

**Instala D-Territorio Campañas**
Accede más rápido y recibe avisos importantes.

Acción:
`Instalar`

En iPhone, si la instalación automática no está disponible, mostrar instrucciones visuales simples para “Añadir a pantalla de inicio”.

No mostrar constantemente el aviso si el usuario lo descarta.

---

# 5. Notificaciones push

No solicitar permiso apenas se carga la aplicación sin contexto.

Momento recomendado:
- después del registro;
- cuando el usuario entiende para qué sirven.

Mensaje:

**¿Quieres recibir avisos de tu participación?**
Te avisaremos si recibes una solicitud, se publica tu turno o cambia una asignación.

Acción principal:
`Activar notificaciones`

---

# 6. Inicio

La pantalla Inicio cambia según el estado de la campaña.

## Prioridad 1 — Solicitud pendiente

Si existe una solicitud para participar obligatoriamente con otra persona, debe aparecer arriba de todo.

Ejemplo:

**Solicitud pendiente**

Carlos Pérez desea participar contigo.

`Aceptar`  `Rechazar`

Debe verse antes que cualquier contenido secundario.

## Prioridad 2 — Próximo turno

Si el programa está publicado:

**Tu próximo turno**

Sábado 1 de noviembre
10:00–12:00
Punto 4
Con: Juan Soto

Acciones:
- Ver punto
- Ver detalles

## Prioridad 3 — Estado de inscripción

Ejemplo:

**Tu disponibilidad está registrada**
Marcaste 4 bloques y deseas realizar hasta 2 turnos.

Acción:
`Revisar disponibilidad`

---

# 7. Disponibilidad

Agrupar por día.

Cada bloque debe mostrar:
- horario;
- estado de cobertura;
- selector;
- mensaje contextual.

Ejemplos:

**10:00–12:00**
Se necesita apoyo
`[ ] Estoy disponible`

**14:00–16:00**
Cupos principales completos
Puedes marcarte igualmente como reserva.
`[ ] Estoy disponible`

No ocultar un bloque solo porque alcanzó su capacidad principal.

---

# 8. Máximo de turnos

Después de disponibilidad:

**¿Cuántos turnos como máximo deseas realizar?**

- 1 turno
- 2 turnos
- 3 turnos
- Sin límite específico

Esta respuesta es una restricción operativa para los organizadores.

---

# 9. Participar obligatoriamente con otra persona

Sección opcional:

**¿Necesitas participar junto a otro hermano/a?**

Aclaración:
“Usa esta opción solo si necesitan ser asignados juntos.”

Flujo:
1. Buscar por nombre.
2. Mostrar coincidencias suficientes para elegir correctamente.
3. Seleccionar persona.
4. Confirmar solicitud.
5. Mostrar estado pendiente hasta que la otra persona responda.

No usar lenguaje de “preferencia”.

Estados:
- Pendiente
- Confirmada
- Rechazada
- Cancelada

---

# 10. Mi programa

## Antes de publicación

Mostrar:

**Tu programa aún está en preparación.**
Te avisaremos cuando tus asignaciones estén listas.

## Después de publicación

Cada asignación se presenta como tarjeta grande:
- fecha;
- horario;
- punto;
- compañero/a;
- instrucciones;
- ubicación si existe.

Acción secundaria:
`Solicitar cambio`

---

# 11. Solicitud de cambio

Después de programa publicado, no permitir que el usuario borre directamente una disponibilidad que ya afecta una asignación.

Flujo:
1. Seleccionar turno.
2. `Solicitar cambio`.
3. Motivo opcional/breve.
4. Confirmar.
5. Mostrar estado de solicitud.

El programa actual sigue vigente hasta que un organizador modifique la asignación.

---

# 12. Avisos

Centro de notificaciones dentro de la aplicación.

Cada aviso debe incluir:
- tipo;
- fecha;
- campaña;
- contenido;
- estado leído/no leído.

Las notificaciones push son un complemento; el historial interno es la fuente visible permanente.

---

# 13. Navegación inferior

Recomendación:

- Inicio
- Disponibilidad
- Mi programa
- Avisos

Máximo cuatro destinos principales.

Información y configuración pueden estar dentro de Inicio/perfil.

---

# 14. Estados vacíos

Evitar pantallas en blanco.

Ejemplos:

**Aún no tienes asignaciones.**
Cuando se publique el programa aparecerán aquí.

**No tienes avisos pendientes.**
Todo está al día.

---

# 15. Accesibilidad práctica

- objetivos táctiles grandes;
- evitar texto pequeño;
- evitar controles que dependan de precisión;
- confirmar acciones importantes;
- mensajes de error en lenguaje humano;
- mantener la acción principal en posición consistente;
- usar fecha completa y horario visible;
- no usar abreviaturas difíciles de interpretar.
