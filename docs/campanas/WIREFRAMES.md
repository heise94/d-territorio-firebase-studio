# D-Territorio Campañas — Wireframes textuales

## 1. Objetivo

Definir la estructura visual mínima de las pantallas principales. Estos wireframes son funcionales: indican jerarquía, zonas y acciones, no diseño final pixel-perfect.

---

# 2. PWA — Inicio

```text
┌─────────────────────────────────────┐
│ Campaña Cementerio PLC              │
│ 31 oct — 1 nov                      │
│ [Programa publicado]                │
├─────────────────────────────────────┤
│ ⚠ SOLICITUD PENDIENTE               │
│ Juan Pérez quiere participar contigo│
│ [Aceptar] [Rechazar]                │
├─────────────────────────────────────┤
│ Hola, María                         │
│                                     │
│ TU PRÓXIMO TURNO                    │
│ Sábado 1 · 10:00–12:00              │
│ Punto 4                             │
│ Con: Ana Soto                       │
│ [Ver detalle]                       │
├─────────────────────────────────────┤
│ Estado de tu participación          │
│ Disponibilidad enviada ✓            │
│ 1 de 2 turnos asignados             │
├─────────────────────────────────────┤
│ [Instalar app] / banner opcional    │
├─────────────────────────────────────┤
│ Inicio | Disponib. | Programa | 🔔  │
└─────────────────────────────────────┘
```

Prioridad:
1. Solicitudes que requieren respuesta.
2. Próximo turno.
3. Estado general.

---

# 3. PWA — Mi disponibilidad

```text
┌─────────────────────────────────────┐
│ ← Mi disponibilidad                 │
│ Selecciona todos los horarios       │
│ en que realmente puedes participar. │
├─────────────────────────────────────┤
│ VIERNES 31                          │
│                                     │
│ [✓] 08:00–10:00                     │
│     Necesita apoyo · 8/16            │
│                                     │
│ [ ] 10:00–12:00                     │
│     Cobertura media · 12/16          │
│                                     │
│ [✓] 12:00–14:00                     │
│     Completo · quedarías de reserva │
├─────────────────────────────────────┤
│ SÁBADO 1                            │
│ ...                                 │
├─────────────────────────────────────┤
│ Máximo de turnos                    │
│ [1] [2] [3] [Sin límite]            │
├─────────────────────────────────────┤
│ ¿Debes participar junto a alguien?  │
│ [Buscar hermano/a]                  │
├─────────────────────────────────────┤
│ [Guardar disponibilidad]            │
└─────────────────────────────────────┘
```

Regla: los bloques completos siguen siendo seleccionables, pero deben indicar claramente que la persona probablemente quedará como reserva.

---

# 4. PWA — Mi programa

```text
┌─────────────────────────────────────┐
│ Mi programa                         │
├─────────────────────────────────────┤
│ SÁBADO 1 NOV                        │
│                                     │
│ 10:00–12:00                         │
│ Punto 4                             │
│ Con: Ana Soto                       │
│                                     │
│ [Ver ubicación / instrucciones]     │
│ [Solicitar cambio]                  │
├─────────────────────────────────────┤
│ 16:00–18:00                         │
│ Punto 2                             │
│ Con: Pedro Díaz                     │
│ ...                                 │
└─────────────────────────────────────┘
```

No mostrar el programa completo de otros hermanos desde esta sección.

---

# 5. PWA — Solicitud para participar juntos

```text
┌─────────────────────────────────────┐
│ Solicitud pendiente                 │
│                                     │
│ Juan Pérez quiere participar        │
│ contigo durante esta campaña.       │
│                                     │
│ Horarios compatibles                │
│ • Viernes 12:00–14:00               │
│ • Sábado 10:00–12:00                │
│                                     │
│ Si aceptas, deberán ser asignados   │
│ juntos en el turno que corresponda. │
│                                     │
│ [Aceptar solicitud]                 │
│ [Rechazar]                          │
└─────────────────────────────────────┘
```

---

# 6. Panel web — Dashboard

```text
┌───────────────┬──────────────────────────────────────────────┐
│ D-Territorio  │ Campaña Cementerio PLC          [Planificar]│
│ Campañas      │ 31 oct — 1 nov · Inscripciones abiertas     │
│               ├──────────────────────────────────────────────┤
│ Resumen       │ [82 inscritos] [68 con disp.] [12 reservas] │
│ Participantes │ [Cobertura general 74%]                      │
│ Cobertura     ├──────────────────────────────────────────────┤
│ Planificación │ COBERTURA POR BLOQUE                         │
│ Programa      │                                              │
│ Solicitudes   │ 31 oct                                       │
│ Configuración │ 08–10  ███████░░  11/16 [Abrir]             │
│               │ 10–12  █████░░░░   8/16 [Abrir]             │
│               │ 12–14  ██████████ 16/16 [Completo]          │
│               │                                              │
│               │ 1 nov                                        │
│               │ ...                                          │
├───────────────┴──────────────────────────────────────────────┤
│ Alertas: 3 solicitudes pendientes · 2 bloques bajos         │
└──────────────────────────────────────────────────────────────┘
```

El dashboard debe permitir detectar rápidamente dónde falta apoyo.

---

# 7. Panel web — Participantes

```text
┌──────────────────────────────────────────────────────────────┐
│ Participantes                                  [+ Agregar]   │
│ [Buscar...] [Congregación ▾] [Estado ▾] [Turnos ▾]         │
├──────────────────────────────────────────────────────────────┤
│ Nombre           Congregación  Disponib.  Asign.  Estado    │
│ Juan Pérez       Maquehue       4 bloques   1/2    Activo    │
│ Ana Soto         Pulmahue       2 bloques   0/1    Pendiente │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

Al abrir participante usar panel lateral, no obligar a navegar fuera si no es necesario.

---

# 8. Panel web — Planificador por bloque

Esta es la pantalla central del sistema.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ← Planificación · Sábado 1 · 10:00–12:00                   12/16 cubiertos │
├───────────────────┬──────────────────────────────────┬─────────────────────┤
│ DISPONIBLES       │ ASIGNACIONES                    │ CONTEXTO / RESERVA  │
│ 8 sin asignar     │                                  │                     │
│                   │ Punto 1                          │ Reservas            │
│ [Buscar...]       │ ┌────────────┐ ┌────────────┐    │ • Luis R.           │
│                   │ │ Juan Pérez │ │ Ana Soto   │    │ • Marta P.          │
│ □ Pedro Díaz      │ └────────────┘ └────────────┘    │                     │
│ □ María Ñanco     │                                  │ Solicitudes juntas  │
│ □ José Ruiz       │ Punto 2                          │ Juan + Ana ✓         │
│ □ Elena Silva     │ ┌────────────┐ ┌────────────┐    │                     │
│ ...               │ │ Luis Soto  │ │ VACANTE    │    │ Alertas             │
│                   │ └────────────┘ └────────────┘    │ Máx. turnos, etc.   │
│                   │                                  │                     │
│                   │ Punto 3 ...                      │                     │
├───────────────────┴──────────────────────────────────┴─────────────────────┤
│ [Guardar borrador]                                      [Cerrar bloque]    │
└────────────────────────────────────────────────────────────────────────────┘
```

Reglas:
- seleccionar un disponible y luego un slot vacío debe permitir asignar rápidamente;
- drag & drop puede existir, pero no debe ser requisito;
- al asignar, desaparece de disponibles;
- al liberar, vuelve;
- impedir duplicidad en el mismo bloque;
- vínculo conjunto confirmado debe impedir separación accidental.

---

# 9. Panel web — Programa general

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Programa general                         [Vista previa] [PDF] [Publicar] │
│ BORRADOR — NO DISTRIBUIR                                              │
├───────────┬──────────────┬──────────────┬──────────────┬───────────────┤
│ Horario   │ Punto 1      │ Punto 2      │ Punto 3      │ Punto 4 ...   │
├───────────┼──────────────┼──────────────┼──────────────┼───────────────┤
│ 08–10     │ Juan / Ana   │ Luis / Marta │ ...          │               │
│ 10–12     │ Pedro / Rosa │ ...          │              │               │
│ 12–14     │ ...          │              │              │               │
└───────────┴──────────────┴──────────────┴──────────────┴───────────────┘
```

Debe priorizar legibilidad por sobre decoración.

---

# 10. Panel web — Configuración de campaña

Secciones:
- General
- Fechas
- Bloques horarios
- Congregaciones
- Capacidad y máximo de puntos
- Inscripciones
- Notificaciones
- Publicación

Los bloques deben poder crearse, editarse, reordenarse y eliminarse antes de que exista información dependiente. Si ya existen inscripciones/asignaciones asociadas, mostrar advertencias claras antes de cambios destructivos.

---

# 11. Responsive

Panel web:
- desktop >= 1280: layout completo de 3 columnas en planificador;
- tablet: contexto/reserva puede ir en drawer lateral;
- móvil administrador: funcional pero secundario, sin intentar replicar toda la densidad del escritorio.

PWA:
- objetivo principal 360–430 px de ancho;
- contenido central con máximo cómodo;
- acciones inferiores siempre accesibles cuando corresponda.
