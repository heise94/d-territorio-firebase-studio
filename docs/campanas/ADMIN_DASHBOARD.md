# D-Territorio Campañas — Panel web de organización

## 1. Objetivo

Definir la experiencia principal de los hermanos encargados de organizar la campaña.

El panel debe ser visualmente atractivo, claro y rápido para trabajar durante sesiones de planificación conjunta.

No debe parecer una planilla de cálculo trasladada a la web. Debe ayudar a entender cobertura, pendientes y asignaciones de un vistazo.

---

# 2. Filosofía de diseño

El panel seguirá la línea visual de D-Territorio:
- moderno;
- espacioso;
- tarjetas con jerarquía clara;
- alto contraste;
- estados comprensibles;
- interacciones predecibles;
- densidad moderada/alta solo donde aporta productividad.

Evitar:
- colores chillones;
- tablas difíciles de leer;
- exceso de bordes;
- demasiados indicadores simultáneos;
- iconografía sin texto cuando pueda generar confusión.

---

# 3. Dashboard / Resumen

La cabecera debe mostrar:
- nombre de campaña;
- fechas;
- estado;
- ubicación;
- acción principal contextual.

Ejemplo de métricas:
- Participantes inscritos
- Bloques completos
- Bloques que necesitan apoyo
- Asignaciones realizadas
- Solicitudes pendientes

## 3.1 Cobertura rápida

Mostrar cada día como tarjeta.

Dentro de cada día, los bloques horarios aparecen con barra de cobertura y números.

Ejemplo:

`10:00–12:00   11 / 16`

Estados sugeridos:
- Necesita apoyo
- Cobertura media
- Cerca de completo
- Completo

Los colores son secundarios al texto y al número; nunca deben ser la única forma de interpretar el estado.

---

# 4. Pantalla Participantes

Debe permitir búsqueda por nombre o teléfono.

Columnas/datos sugeridos:
- nombre;
- congregación;
- teléfono;
- bloques disponibles;
- máximo de turnos;
- turnos ya asignados;
- vínculo obligatorio;
- estado.

La ficha lateral o modal del participante debe permitir ver:
- disponibilidad completa;
- asignaciones;
- solicitudes;
- vínculo obligatorio confirmado;
- notas operativas internas opcionales.

No guardar diagnósticos médicos ni información sensible innecesaria.

---

# 5. Pantalla Cobertura

Debe responder rápidamente:

> ¿En qué horarios nos falta apoyo?

Presentación recomendada:
- agrupación por día;
- tarjetas o filas por bloque;
- inscritos totales;
- capacidad objetivo;
- asignados;
- disponibles sin asignar;
- reservas.

Orden por defecto:
1. bloques con mayor déficit;
2. bloques parcialmente cubiertos;
3. bloques completos.

Debe existir vista cronológica alternativa.

---

# 6. Planificador por bloque

Esta es la pantalla crítica del producto.

## 6.1 Encabezado

Mostrar:
- fecha;
- bloque horario;
- capacidad objetivo;
- total disponibles;
- total asignados;
- total reserva;
- puntos activos.

Permitir cambiar rápidamente al bloque anterior/siguiente.

## 6.2 Estructura de escritorio

Diseño recomendado en tres columnas/paneles:

### A. Disponibles
Lista de hermanos que:
- marcaron disponibilidad en ese bloque;
- no están asignados todavía en ese bloque.

Cada tarjeta puede mostrar:
- nombre;
- congregación en texto secundario;
- turnos asignados / máximo;
- vínculo obligatorio si existe.

Cuando un hermano se asigna, desaparece inmediatamente de esta lista.

### B. Área de asignación
Contiene los puntos activos del bloque.

Ejemplo:

**Punto 1**
- Hermano A
- Hermano B

**Punto 2**
- Vacante
- Vacante

Debe permitir:
- seleccionar o arrastrar participantes;
- crear la pareja manualmente;
- mover una pareja de punto;
- liberar una asignación;
- desactivar un punto vacío.

### C. Reserva / contexto
- disponibles sobrantes;
- vínculos obligatorios pendientes;
- advertencias;
- solicitudes de cambio relacionadas.

---

# 7. Reglas del planificador

El sistema debe bloquear o advertir:
- asignación duplicada en el mismo bloque;
- separación de un vínculo obligatorio confirmado;
- superar máximo de turnos del participante;
- asignar a quien no marcó disponibilidad, salvo acción explícita del organizador con advertencia.

El sistema NO debe:
- sugerir compatibilidad humana;
- ordenar personas por supuesta conveniencia;
- formar parejas automáticamente.

---

# 8. Puntos dinámicos

El planificador no debe asumir 8 puntos activos.

El organizador puede decidir, según cobertura:
- abrir 3 puntos;
- abrir 6;
- abrir 8;
- usar distinta cantidad según día o bloque.

El sistema puede mostrar capacidad teórica:

`12 asignados = hasta 6 puntos completos`

Esto es informativo, no una decisión automática.

---

# 9. Trabajo colaborativo

La aplicación debe soportar varios organizadores trabajando en la misma campaña.

Idealmente:
- cambios visibles en tiempo real o con actualización rápida;
- indicar cuando una asignación fue modificada recientemente;
- evitar sobrescribir cambios de otro organizador;
- registrar auditoría básica de acciones importantes.

Ejemplos de auditoría:
- quién asignó;
- quién eliminó asignación;
- quién publicó programa;
- quién aprobó solicitud de cambio.

---

# 10. Publicación

Debe existir diferencia visual fuerte entre:

**Borrador** y **Publicado**.

Antes de publicar:
- los participantes no deben tomar asignaciones como definitivas.

Al publicar:
- validar conflictos;
- mostrar resumen de pendientes;
- pedir confirmación al organizador;
- activar vista personal de asignaciones;
- disparar notificaciones correspondientes.

---

# 11. Programa general

El panel debe generar una matriz general a partir de las asignaciones actuales.

No debe escribirse manualmente.

La misma fuente de datos alimenta:
- vista web;
- impresión;
- PDF;
- futuras exportaciones.

La especificación detallada vive en `PROGRAM_OUTPUT.md`.
