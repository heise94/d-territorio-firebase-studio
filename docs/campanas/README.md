# D-Territorio Campañas

Módulo complementario de D-Territorio para organizar campañas especiales de predicación mediante inscripción de participantes, disponibilidad por bloques, planificación manual, asignaciones y publicación del programa general.

## Propósito de esta carpeta

Esta documentación es la fuente funcional y técnica principal para desarrollar el módulo previsto para:

`campanas.d-territorio.cl`

Puede ser utilizada como contexto por una IA de desarrollo o por un desarrollador humano.

## Jerarquía documental

### Documentos normativos
Si existe una contradicción, estos documentos tienen prioridad:

1. `MASTER_SPEC.md` — reglas funcionales del producto.
2. `TECH_ARCHITECTURE.md` — arquitectura técnica elegida para V1.
3. `AUTH_SECURITY.md` — autenticación, sesiones, privacidad y seguridad.
4. `PERMISSIONS_AND_WORKFLOW.md` — roles y flujo operativo.
5. `DATA_MODEL.md` — entidades y restricciones del dominio.

### Documentos de experiencia y diseño
Deben respetar los documentos normativos:

6. `UX_FLOWS.md` — experiencia funcional.
7. `SCREEN_MAP.md` — mapa de pantallas.
8. `ADMIN_DASHBOARD.md` — panel web y planificación.
9. `PWA_UI_SPEC.md` — interfaz móvil.
10. `NOTIFICATIONS_PWA.md` — instalación PWA, push y centro de notificaciones.
11. `DESIGN_SYSTEM.md` — identidad visual.
12. `UI_COMPONENTS.md` — componentes reutilizables.
13. `WIREFRAMES.md` — wireframes principales.
14. `PROGRAM_OUTPUT.md` — programa general, impresión y PDF.

### Documentos de apoyo a implementación

15. `IMPLEMENTATION_NOTES.md` — notas técnicas, validaciones y testing.
16. `AI_HANDOFF.md` — instrucciones para una IA de desarrollo.

## Stack V1 decidido

Reutilizar la pila actual del repositorio:

- Next.js 15
- React + TypeScript
- Firebase / Firestore
- Tailwind CSS
- Radix UI
- Lucide React
- Zod
- React Hook Form
- soporte PWA existente

Campañas será un dominio separado dentro del mismo repositorio, preparado para `campanas.d-territorio.cl`.

## Primera campaña objetivo

**Campaña especial de predicación con exhibidores — Cementerio Padre Las Casas**

Participan actualmente cuatro congregaciones:

- Maquehue
- Pulmahue
- Huichahue
- Mapudungun

La solución no debe quedar amarrada a estas congregaciones, fechas, bloques horarios ni cantidad de puntos.

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
- Capacidad orientativa por bloque; inicialmente hasta 8 puntos / 16 participantes.
- Los bloques completos siguen aceptando disponibilidad como reserva.
- Solicitud para participar junto a otra persona requiere confirmación del segundo participante.
- Si se acepta, ambos deben ser asignados juntos.
- El sistema no arma parejas automáticamente.
- Al planificar un bloque, se muestran solo los disponibles aún no asignados en ese bloque.
- Al asignarlos, desaparecen de la lista de disponibles; al retirarlos, vuelven.
- Los puntos pueden definirse después de conocer la cobertura real.
- El programa general se genera automáticamente desde las asignaciones.
- La congregación es un dato secundario y no una regla de asignación.
- No se implementará en V1 administración permanente de dos participantes desde una misma cuenta.
- Los organizadores pueden colaborar simultáneamente.
- El máximo de turnos es una advertencia operativa que puede ser sobrepasada mediante confirmación explícita.
- Los datos sensibles de salud o similares no se recopilan en la plataforma.

## Regla para IA/desarrollo

Antes de implementar una funcionalidad, revisar estos documentos en el orden indicado.

Una IA no debe inventar reglas de negocio cuando ya existe una regla documentada.

Si el código existente contradice esta documentación, debe señalar la discrepancia antes de cambiar el comportamiento funcional.

Cuando una nueva decisión del usuario cambie el producto, actualizar la documentación correspondiente junto con el código.

## Estrategia V1

Construir un **monolito modular**, no microservicios.

Prioridades:
1. usabilidad;
2. seguridad básica correcta;
3. consistencia de datos;
4. planificación colaborativa rápida;
5. mantenibilidad;
6. posibilidad de evolucionar posteriormente.
