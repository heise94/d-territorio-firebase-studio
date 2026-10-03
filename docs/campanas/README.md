# D-Territorio Campañas

Módulo complementario de D-Territorio para organizar campañas especiales de predicación mediante inscripción de participantes, disponibilidad por bloques, planificación manual, asignaciones y publicación del programa general.

## Propósito de esta carpeta

Esta documentación es la fuente funcional principal para desarrollar el módulo previsto para:

`campanas.d-territorio.cl`

Puede ser utilizada como contexto por una IA de desarrollo o por un desarrollador humano.

## Orden de lectura recomendado

### 1. Producto y reglas
1. `MASTER_SPEC.md` — visión, alcance y reglas funcionales.
2. `UX_FLOWS.md` — experiencia funcional del participante y del panel organizador.
3. `SCREEN_MAP.md` — mapa completo de pantallas y navegación.

### 2. Diseño de interfaz
4. `ADMIN_DASHBOARD.md` — estructura del panel web y del planificador manual.
5. `PWA_UI_SPEC.md` — interfaz móvil, instalación PWA, sesión y notificaciones.
6. `PROGRAM_OUTPUT.md` — generación del programa general, impresión y PDF.

### 3. Arquitectura e implementación
7. `DATA_MODEL.md` — entidades, relaciones y restricciones propuestas.
8. `IMPLEMENTATION_NOTES.md` — arquitectura, seguridad, PWA, publicación y testing.
9. `AI_HANDOFF.md` — instrucciones específicas para una IA que implemente el módulo.

## Primera campaña objetivo

**Campaña especial de predicación con exhibidores — Cementerio Padre Las Casas**

Participan actualmente cuatro congregaciones:

- Maquehue
- Pulmahue
- Huichahue
- Mapudungun

Sin embargo, la solución no debe quedar amarrada a estas congregaciones, fechas, bloques horarios ni cantidad de puntos.

## Principio rector

El sistema **organiza y guía**, pero **no toma decisiones humanas sobre quién trabaja con quién**.

Las parejas y asignaciones finales son realizadas manualmente por los hermanos encargados de la campaña.

## Decisiones funcionales ya cerradas

- PWA para participantes y panel web para organización.
- Acceso de participantes mediante teléfono + PIN.
- Sesión persistente en dispositivo de confianza.
- PWA instalable y con notificaciones push.
- Bloques horarios configurables.
- Máximo de turnos configurable por participante.
- Capacidad orientativa por bloque; actualmente hasta 8 puntos / 16 participantes.
- Los bloques completos siguen aceptando disponibilidad como reserva.
- Solicitud para participar junto a otra persona requiere confirmación del segundo participante.
- Si se acepta, la pareja debe ser asignada junta.
- El sistema no arma parejas automáticamente.
- Al planificar un bloque, se muestran solo los disponibles aún no asignados en ese bloque.
- Al asignarlos, desaparecen de la lista de disponibles; al retirarlos, vuelven.
- Los puntos pueden definirse después de conocer la cobertura real.
- El programa general se genera automáticamente desde las asignaciones.
- La congregación es un dato secundario y no una regla de asignación.
- No se implementará en V1 administración permanente de dos participantes desde una misma cuenta.

## Regla para IA/desarrollo

Antes de implementar una funcionalidad, revisar primero estos documentos.

Si el código contradice una regla documentada, la IA no debe “inventar” un comportamiento nuevo. Debe conservar la regla documentada o dejar explícita la discrepancia para revisión humana.

## Regla para futuras modificaciones

Cuando una nueva decisión cambie el comportamiento del producto, actualizar primero o junto con el código los documentos de esta carpeta. La documentación debe mantenerse como fuente de verdad del módulo.
