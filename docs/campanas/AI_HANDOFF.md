# D-Territorio Campañas — Guía para IA de Desarrollo

Este documento indica cómo debe comportarse una IA que implemente o modifique el módulo Campañas.

## 1. Fuente de verdad

Antes de programar, leer en este orden:
1. `docs/campanas/MASTER_SPEC.md`
2. `docs/campanas/UX_FLOWS.md`
3. `docs/campanas/DATA_MODEL.md`
4. `docs/campanas/IMPLEMENTATION_NOTES.md`

Si existe contradicción:
- priorizar `MASTER_SPEC.md` para reglas funcionales;
- priorizar `UX_FLOWS.md` para experiencia de usuario;
- usar `DATA_MODEL.md` como propuesta adaptable, no como esquema inmutable.

## 2. No inventar reglas de negocio

No asumir:
- horarios fijos;
- 8 puntos siempre activos;
- 16 personas siempre necesarias;
- congregaciones fijas;
- fechas fijas;
- asignación automática de parejas.

Todo debe ser configurable cuando la documentación así lo indique.

## 3. Regla crítica: no formar parejas automáticamente

Está prohibido implementar lógica que decida quién debe trabajar con quién.

La aplicación solo debe:
- mostrar disponibilidad;
- validar conflictos;
- mostrar vínculos obligatorios confirmados;
- permitir que organizadores creen manualmente las asignaciones.

## 4. Regla crítica: disponibilidad no es asignación

Nunca tratar una disponibilidad marcada como turno confirmado.

Estados visuales y textos deben mantener esta separación.

## 5. Parejas obligatorias

Si un participante solicita trabajar con otro:
- requiere confirmación del segundo;
- una vez aceptado, el vínculo es obligatorio para las asignaciones correspondientes;
- la UI administrativa debe hacerlo visible;
- no separar accidentalmente a la pareja.

## 6. Participantes mayores / baja alfabetización digital

Diseñar la PWA pensando en:
- teléfono móvil;
- botones grandes;
- frases breves;
- pocas decisiones por pantalla;
- sesión persistente;
- teléfono + PIN;
- mínima fricción.

No introducir login por correo como requisito sin una decisión explícita de producto.

## 7. Privacidad

Un participante solo debe acceder a:
- sus datos;
- su disponibilidad;
- sus solicitudes;
- sus asignaciones;
- su compañero/a cuando exista una asignación publicada;
- información general de campaña.

No exponer directorios completos de participantes en la PWA.

## 8. Panel organizador

Priorizar productividad:
- cobertura clara;
- filtros rápidos;
- planificación por bloque;
- lista de disponibles dinámica;
- puntos visibles;
- advertencias, no decisiones automáticas.

## 9. Programa general

Debe generarse desde datos del sistema y servir como reemplazo moderno de la planilla manual histórica.

No depender de una plantilla rígida con 8 columnas.

## 10. Diseño

Mantener coherencia visual con D-Territorio, pero adaptar la PWA a una experiencia móvil más simple.

Evitar:
- colores saturados como única señal de estado;
- texto pequeño;
- tablas horizontales en móvil;
- menús complejos;
- flujos ocultos.

## 11. Desarrollo incremental recomendado

Orden recomendado:

### Fase 1 — Fundación
- campaña configurable;
- días/bloques;
- congregaciones;
- participantes;
- autenticación teléfono + PIN;
- PWA base.

### Fase 2 — Inscripción
- formulario;
- disponibilidad;
- máximo de turnos;
- cobertura;
- reserva.

### Fase 3 — Participar juntos
- búsqueda;
- solicitud;
- confirmación;
- notificación;
- validaciones.

### Fase 4 — Planificador
- disponibles por bloque;
- puntos;
- asignación manual;
- prevención de duplicados;
- límites de turnos;
- reservas.

### Fase 5 — Publicación
- programa personal;
- programa general;
- publicación;
- PDF/impresión;
- notificaciones.

### Fase 6 — Cambios y cierre
- solicitudes de cambio;
- recordatorios;
- estado en curso;
- campaña finalizada.

## 12. Antes de hacer cambios importantes

Si una petición nueva altera alguna de estas reglas:
- autenticación;
- formación de parejas;
- privacidad;
- estados de campaña;
- modelo de disponibilidad;
- publicación;
actualizar primero la documentación correspondiente o incluir el cambio documental en el mismo commit.

## 13. Criterio de aceptación general

La implementación es correcta si permite que los organizadores trabajen como antes con formulario + planilla, pero con:
- menos trabajo manual repetitivo;
- menos errores;
- mejor visualización de cobertura;
- acceso personal para cada participante;
- planificación colaborativa;
- programa general generado automáticamente.
