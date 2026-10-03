# D-Territorio Campañas — Programa general

## 1. Objetivo

Definir cómo el sistema transforma las asignaciones del planificador en un programa general legible, imprimible y exportable.

La referencia funcional es el formato histórico de tabla usado en campañas anteriores, pero con una presentación moderna y de alto contraste.

---

# 2. Fuente de datos

El programa general nunca se completa manualmente.

Debe construirse automáticamente desde:
- campaña;
- fechas;
- bloques horarios;
- puntos activos;
- asignaciones;
- responsables por tramo si se habilitan;
- estado de publicación.

Una modificación en el planificador debe reflejarse en la vista previa del programa.

---

# 3. Estructura

Por cada día:
- título de campaña;
- fecha completa;
- ubicación general opcional;
- tabla de programa.

Columnas:
- Horario
- Punto 1
- Punto 2
- ...
- Punto N

Filas:
- cada bloque horario configurado para ese día.

Cada celda de punto muestra:
- participante 1;
- participante 2.

Si el punto está activo pero incompleto:
- mostrar “Pendiente” o espacio claramente identificado.

Si el punto no está activo en ese bloque:
- mostrar estado neutro “No activo” o celda deshabilitada.

---

# 4. Cantidad de puntos variable

No asumir siempre 8 columnas.

La tabla debe adaptarse a los puntos realmente definidos/activos para el día.

Cuando un día tenga muchos puntos y la pantalla sea pequeña:
- permitir desplazamiento horizontal en web;
- mantener primera columna de horario fija si mejora usabilidad.

En impresión/PDF:
- usar orientación horizontal cuando sea necesario;
- ajustar tipografía sin comprometer legibilidad.

---

# 5. Responsables

El sistema puede soportar responsables por jornada o tramo horario si la campaña lo requiere.

Ejemplo:

**Responsable 08:00–14:00:** Nombre
**Responsable 14:00–20:00:** Nombre

Esta información debe ser opcional y configurable.

---

# 6. Estados

## Borrador
Debe mostrar una marca visible:

`BORRADOR — NO DISTRIBUIR`

## Publicado
Eliminar marca de borrador y mostrar:
- fecha/hora de publicación o versión;
- campaña vigente.

Si después se publica una modificación importante, el sistema puede incrementar versión:
- v1
- v2
- v3

Esto evita confusión con capturas o PDFs antiguos.

---

# 7. Diseño visual

No replicar los colores fuertes de programas históricos.

Usar:
- fondo claro;
- texto oscuro;
- encabezados bien diferenciados;
- bordes sutiles;
- espaciado suficiente;
- máximo contraste para nombres y horarios.

Los colores pueden utilizarse suavemente para distinguir días o estados, pero no deben ser necesarios para comprender la tabla.

---

# 8. Salidas

V1:
- vista web;
- vista de impresión;
- PDF.

Fase posterior:
- XLSX/Excel;
- imagen optimizada para compartir por WhatsApp si se considera útil.

---

# 9. Validación antes de publicar/exportar

El sistema debe advertir:
- parejas incompletas;
- puntos activos sin asignación;
- participante duplicado dentro del mismo bloque;
- vínculos obligatorios separados;
- asignaciones fuera de disponibilidad;
- participantes sobre su máximo de turnos.

Las advertencias no necesariamente bloquean toda exportación, pero deben mostrarse claramente antes de marcar un programa como definitivo.

---

# 10. Programa personal vs programa general

Programa general:
- accesible a organizadores;
- contiene todas las asignaciones.

Programa personal:
- visible en PWA del participante;
- muestra únicamente las asignaciones del usuario autenticado.

No exponer el programa general completo en la PWA salvo que más adelante se decida expresamente.
