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

### Documentos de construcción y calidad

15. `IMPLEMENTATION_NOTES.md` — notas técnicas y validaciones.
16. `AI_HANDOFF.md` — instrucciones para una IA de desarrollo.
17. `DEVELOPMENT_PLAN.md` — plan de construcción por fases, dependencias y criterios para avanzar.
18. `ACCEPTANCE_CRITERIA.md` — definición verificable de cuándo cada capacidad está terminada.
19. `EDGE_CASES.md` — casos límite y comportamiento esperado.
20. `TEST_PLAN.md` — estrategia de pruebas unitarias, integración, E2E, PWA y seguridad.
21. `SEED_AND_DEMO_DATA.md` — datos ficticios, fixtures y escenarios para desarrollo/pruebas.
22. `DEPLOYMENT_GUIDE.md` — entornos, subdominio, Firebase, PWA y checklist de producción.
23. `DECISIONS_LOG.md` — registro de decisiones ya acordadas y plantilla para futuras decisiones.
24. `PHASE_0_PROMPT.md` — prompt operativo para iniciar el desarrollo de la Fase 0 en `feature/campanas-v1`.

## Orden mínimo recomendado para una IA antes de programar

Leer primero:
1. `MASTER_SPEC.md`
2. `TECH_ARCHITECTURE.md`
3. `DATA_MODEL.md`
4. `AUTH_SECURITY.md`
5. `PERMISSIONS_AND_WORKFLOW.md`
6. `DEVELOPMENT_PLAN.md`
7. los documentos UX/UI relacionados con la fase que vaya a implementar
8. `ACCEPTANCE_CRITERIA.md`
9. `EDGE_CASES.md`
10. `TEST_PLAN.md`

Para iniciar la Fase 0, utilizar además `PHASE_0_PROMPT.md` como instrucción operativa.

No es necesario cargar todos los documentos visuales en cada tarea, pero las reglas normativas sí deben conservarse.

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

Cuando una nueva decisión cambie el producto, actualizar la documentación correspondiente y registrar la decisión en `DECISIONS_LOG.md`.

Para ejecutar el desarrollo, avanzar por fases según `DEVELOPMENT_PLAN.md` y no saltar a la fase siguiente hasta cumplir los criterios de cierre de la actual y los criterios relacionados de `ACCEPTANCE_CRITERIA.md`.

## Estrategia V1

Construir un **monolito modular**, no microservicios.

Prioridades:
1. usabilidad;
2. seguridad básica correcta;
3. consistencia de datos;
4. planificación colaborativa rápida;
5. mantenibilidad;
6. posibilidad de evolucionar posteriormente.

## Estado documental

Con estos 24 documentos, la definición de producto, UX, arquitectura, implementación, calidad, despliegue y arranque de desarrollo de V1 se considera prácticamente cerrada. Las nuevas decisiones deben ser incrementales y registrarse sin reabrir reglas ya aceptadas salvo necesidad real.