# D-Territorio Campañas — Sistema Visual

## 1. Objetivo

Definir una identidad visual consistente, clara y accesible para el módulo Campañas, evitando que el desarrollo improvise colores, tamaños, estados o componentes.

El diseño debe sentirse relacionado con D-Territorio, pero optimizado para dos contextos distintos:

- **Panel web de organización**: mayor densidad de información, foco en productividad y planificación.
- **PWA de participantes**: simplicidad, legibilidad, acciones grandes y experiencia móvil predecible.

## 2. Principios de diseño

1. Claridad antes que decoración.
2. Alto contraste y legibilidad.
3. Estados comprensibles sin depender solo del color.
4. Acciones primarias obvias.
5. Jerarquía visual consistente.
6. Evitar menús escondidos cuando una acción frecuente puede estar visible.
7. Diseñar para usuarios mayores sin hacer que la interfaz se sienta anticuada.
8. Minimizar carga cognitiva.

## 3. Tipografía

### Fuente principal
Usar **Inter** como primera opción.

Fallback:
`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Escala sugerida
- Display / título campaña: 32–40 px, 700.
- H1: 28–32 px, 700.
- H2: 22–24 px, 650–700.
- H3: 18–20 px, 600.
- Texto base web: 15–16 px.
- Texto base PWA: 16–18 px.
- Texto auxiliar: 13–14 px.
- Botón PWA: mínimo 16 px, peso 600.

Nunca usar texto crítico menor a 14 px.

## 4. Paleta base

La interfaz debe usar una paleta sobria con acento azul-verde, evitando saturación excesiva.

### Tokens sugeridos
- `--bg`: #F7F9FC
- `--surface`: #FFFFFF
- `--surface-muted`: #F1F5F9
- `--border`: #E2E8F0
- `--text`: #0F172A
- `--text-muted`: #64748B
- `--primary`: #0F766E
- `--primary-hover`: #115E59
- `--primary-soft`: #CCFBF1
- `--info`: #2563EB
- `--info-soft`: #DBEAFE
- `--success`: #15803D
- `--success-soft`: #DCFCE7
- `--warning`: #B45309
- `--warning-soft`: #FEF3C7
- `--danger`: #B91C1C
- `--danger-soft`: #FEE2E2

El color principal puede evolucionar si D-Territorio adopta tokens globales, pero estos valores sirven como referencia inicial.

## 5. Estados semánticos

Nunca comunicar un estado solo con color. Combinar color + icono + texto.

### Bloques horarios
- Necesita apoyo: advertencia visible + contador.
- Cobertura media: neutral/informativo.
- Completo: éxito + texto `Completo`.
- Reserva disponible: estado secundario explícito.

### Solicitudes
- Pendiente: warning.
- Aceptada: success.
- Rechazada: neutral/danger suave según contexto.

### Campaña
- Borrador: gris.
- Inscripciones abiertas: azul.
- Planificación: ámbar.
- Programa publicado: verde.
- En curso: turquesa/azul.
- Finalizada: gris oscuro.

## 6. Espaciado

Usar escala de 4 px:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Reglas:
- Tarjetas: padding 20–24 px web, 16–20 px móvil.
- Secciones web: separación 24–32 px.
- Secciones PWA: 20–24 px.
- Controles táctiles: altura mínima 48 px.

## 7. Bordes y profundidad

### Radius
- Chips: 999 px.
- Botones: 12 px.
- Tarjetas: 16 px.
- Paneles grandes: 18–20 px.

### Sombras
Usar sombras sutiles. La jerarquía debe venir principalmente de fondo, borde y espaciado.

Ejemplo:
`0 8px 24px rgba(15, 23, 42, 0.06)`

## 8. Botones

### Primario
- Fondo `primary`.
- Texto blanco.
- Uso: guardar, confirmar, publicar, aceptar.

### Secundario
- Fondo blanco/surface.
- Borde visible.
- Texto oscuro.

### Destructivo
- Fondo danger o danger-soft según criticidad.
- Confirmación antes de acciones irreversibles.

### PWA
Botones importantes deben ocupar ancho completo cuando la acción sea única o principal.

## 9. Tarjetas

### Tarjeta de bloque horario
Debe mostrar:
- horario;
- contador de inscritos/capacidad;
- estado textual;
- indicador de necesidad de apoyo;
- acción principal clara.

### Tarjeta de asignación personal
Debe mostrar:
- fecha;
- bloque;
- punto;
- compañero/a;
- acceso a instrucciones.

### Tarjeta de solicitud pendiente
Debe ir por encima del contenido habitual cuando requiere respuesta rápida.

## 10. Tablas

Las tablas se usarán solo en panel web.

Reglas:
- encabezado sticky cuando sea útil;
- filas de 48–56 px;
- zebra muy suave o separación por borde;
- acciones al final de fila;
- no usar colores saturados como fondo de celdas;
- usar chips/badges para estados.

## 11. Iconografía

Preferir **Lucide Icons**.

Iconos sugeridos:
- calendario: `CalendarDays`
- horario: `Clock3`
- punto: `MapPin`
- participante: `UserRound`
- pareja: `UsersRound`
- solicitud conjunta: `Link2`
- notificaciones: `Bell`
- reserva: `CircleDashed`
- publicado: `BadgeCheck`
- advertencia: `TriangleAlert`
- editar: `Pencil`
- instalar PWA: `Download`

Los iconos deben acompañar texto, no reemplazarlo en acciones críticas.

## 12. Accesibilidad

- Contraste WCAG AA mínimo.
- Focus visible en teclado.
- No depender solo de hover.
- Botones móviles mínimo 44x44 px; objetivo 48 px.
- Etiquetas explícitas en formularios.
- Mensajes de error en lenguaje humano.
- Respetar `prefers-reduced-motion`.
- No usar animaciones largas ni decorativas en flujos críticos.

## 13. Diferencias web vs PWA

### Panel web
- Sidebar o navegación lateral persistente.
- Más información por pantalla.
- Tablas, paneles, filtros, planificador de varias columnas.
- Acciones de edición visibles.

### PWA
- Navegación inferior o estructura simple de 4–5 destinos.
- Una acción principal por pantalla.
- Tarjetas grandes.
- Texto mayor.
- Sin tablas densas.
- Alertas y solicitudes pendientes arriba de todo.

## 14. Motion

Usar transiciones breves de 120–200 ms.

Permitido:
- hover suave;
- apertura de panel lateral;
- feedback de selección;
- confirmación visual al guardar.

Evitar:
- animaciones decorativas largas;
- rebotes;
- transiciones que retrasen el trabajo.

## 15. Regla final

El sistema debe sentirse moderno y cuidado, pero nunca debe sacrificar comprensión por estética.
