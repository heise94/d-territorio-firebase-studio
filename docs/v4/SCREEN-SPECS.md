# D-TERRITORIO 4.0 — Screen Specifications

**Documento:** SCREEN-SPECS.md  
**Versión:** 0.1  
**Fecha:** 24-09-2026

---

# 1. Objetivo

Definir las pantallas principales de D-TERRITORIO 4.0, su propósito, contenido y estructura visual.

Todas deben respetar:

- UI-DESIGN-SYSTEM.md;
- concepto Spatial OS;
- UX-FLOWS.md;
- reglas funcionales del documento maestro.

---

# 2. Inicio / Centro de Control

## Propósito

Dar una visión inmediata de la operación territorial.

## Layout

### Cabecera
- saludo;
- congregación;
- fecha;
- búsqueda global.

### KPIs
- total territorios;
- disponibles;
- en curso;
- completados recientemente;
- campaña activa.

### Mapa resumido
- territorios con color por estado;
- selector de vista:
  - Estado;
  - Antigüedad;
  - Campaña.

### Próximas salidas
- fecha;
- hora;
- capitán;
- casa;
- territorio.

### Alertas
- capitanes ausentes;
- casas no disponibles;
- feriados;
- territorios antiguos.

---

# 3. Territorios / Spatial OS

Pantalla estrella del producto.

## Layout

### Top
- título;
- métricas;
- filtros.

### Centro
Mapa grande.

### Derecha
Panel contextual del territorio seleccionado.

### Inferior
Cards de territorios.

## Acciones
- ver detalle;
- historial;
- asignar;
- editar;
- bloquear;
- ver campañas.

---

# 4. Detalle de Territorio

## Contenido

- código;
- tipo;
- mapa;
- imagen tradicional;
- manzanas;
- casas aprox.;
- estado;
- última fecha completado;
- ciclo abierto;
- casa(s) cercana(s);
- campañas;
- historial.

## Tabs

- Resumen
- Ciclo actual
- Historial
- Campañas
- Configuración

---

# 5. Programa

## Vista semanal

Calendario horizontal/vertical premium.

Cada día contiene slots.

Card de slot:

- hora;
- tipo;
- capitán;
- casa;
- territorio;
- estado;
- campaña opcional.

## Controles

- semana anterior/siguiente;
- hoy;
- vista semanal/mensual;
- publicar;
- vista congregación;
- generar PNG/PDF.

## Estado visual

- completo;
- incompleto;
- conflicto;
- publicado.

---

# 6. Editor de asignación

Drawer o modal grande.

Campos:

1. fecha/hora;
2. tipo predicación;
3. organización:
   - congregación;
   - grupos;
4. capitán;
5. casa;
6. territorio;
7. campaña;
8. notas.

Mostrar recomendaciones contextualizadas.

---

# 7. Programa por Grupos

Cuando mode = groups:

Mostrar grid de grupos.

Cada card:

- grupo;
- territorio;
- capitán opcional;
- casa opcional;
- estado.

Debe ser posible completar rápidamente los 4 grupos de Maquehue.

---

# 8. Vista Congregación

Vista previa exacta del documento que recibirá la congregación.

No incluir sidebar ni controles administrativos dentro del documento.

Acciones externas:

- Descargar PNG
- Descargar PDF
- Imprimir

---

# 9. Capitanes

## Vista principal

Grid/lista de capitanes.

Cada card:

- nombre;
- estado;
- próxima disponibilidad;
- próxima ausencia;
- próximas asignaciones.

## Filtros

- activo;
- disponible esta semana;
- ausente;
- búsqueda.

---

# 10. Detalle de Capitán

Tabs:

- Resumen
- Disponibilidad
- Ausencias
- Asignaciones
- Historial

Calendario pequeño para excepciones.

---

# 11. Casas

## Vista

Lista + mapa opcional.

Card:

- familia;
- dirección;
- teléfono según permiso;
- disponibilidad;
- territorios cercanos;
- estado.

---

# 12. Detalle de Casa

- familia;
- anfitrión;
- teléfono;
- dirección;
- mapa;
- disponibilidad semanal;
- excepciones;
- territorios cercanos;
- historial de uso.

---

# 13. Campañas

## Lista

Cada campaña:

- nombre;
- fechas;
- color;
- progreso;
- estado.

## CTA

Nueva campaña.

---

# 14. Detalle de Campaña

### Cabecera
- nombre;
- fecha;
- color;
- progreso.

### Mapa
Todo territorio en contexto de campaña.

### KPIs
- pendientes;
- asignados;
- en progreso;
- completados.

### Inferior
Lista de territorios y estado.

---

# 15. Reportes / S-13

## Cabecera

- período;
- modo:
  - estándar;
  - gestión;
- campaña/leyenda.

## Centro

Vista previa del S-13.

## Panel lateral opcional

- inconsistencias;
- ciclos abiertos;
- datos faltantes.

## Acciones

- Descargar PDF;
- Imprimir;
- Preparar visita.

---

# 16. Preparar visita

Wizard corto.

1. período;
2. validar datos;
3. revisar alertas;
4. previsualizar S-13;
5. exportar.

Futuro:
paquete complementario.

---

# 17. Historial territorial

Vista cronológica.

Filtros:

- territorio;
- capitán;
- fecha;
- campaña;
- resultado.

Timeline:

- ciclo iniciado;
- parcial;
- continuación;
- completado.

---

# 18. Configuración

Secciones:

- General
- Horarios
- Días Congregación/Grupos
- Grupos
- Tipos de predicación
- Feriados
- Campañas
- Plantilla programa
- S-13
- Usuarios y permisos
- Integraciones
- Importación de mapas

---

# 19. Configuración de horarios

Editor semanal.

Por día:

- agregar hora;
- tipo;
- modo.

Debe ser muy visual.

Ejemplo:

Lunes
10:30 Casa en casa · Congregación
16:00 Casa en casa · Congregación

Sábado
10:30 Casa en casa · Grupos

---

# 20. Feriados y excepciones

Calendario anual.

Distinguir:

- feriados oficiales;
- eventos congregacionales;
- excepciones manuales.

Al seleccionar:

- normal;
- horario especial;
- no programar;
- modo especial.

---

# 21. Usuarios

Visible solo con permiso.

Lista:

- nombre;
- email;
- rol;
- estado;
- último acceso opcional.

Acciones:

- invitar;
- cambiar rol;
- suspender;
- revocar.

---

# 22. Administración SaaS

Aplicación/sección separada.

Pantallas:

- tenants;
- estado;
- plan futuro;
- soporte;
- auditoría plataforma.

Nunca mezclarla con la navegación congregacional ordinaria.

---

# 23. Estados de carga

Usar skeletons consistentes.

Mapa:
- skeleton geográfico/panel.

Cards:
- skeleton rectangular.

Evitar spinners gigantes cuando pueda mostrarse estructura.

---

# 24. Error states

Mensajes claros.

Ejemplo:

> No pudimos cargar los territorios. Tus datos no se han modificado.

Acciones:
- Reintentar;
- volver.

---

# 25. Empty states

Siempre proporcionar siguiente acción.

Ejemplo:

> Aún no hay casas de salida.
> Agrega la primera para comenzar a crear el programa.

CTA:
**Añadir casa**

---

# 26. Responsive

V1 prioriza web/desktop.

No diseñar móvil todavía salvo evitar decisiones que imposibiliten futura adaptación.

Desktop target inicial:

- 1366x768;
- 1440x900;
- 1920x1080.

El contenido debe escalar elegantemente.

---

# 27. Orden de mockups

Crear primero:

1. Territorios — aprobado/base;
2. Centro de Control;
3. Programa semanal;
4. Editor de asignación;
5. Capitanes;
6. Casas;
7. Campañas;
8. S-13;
9. Configuración.

Cada nuevo mockup debe compararse con Territorios para validar consistencia.
