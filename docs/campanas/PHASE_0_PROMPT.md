# Prompt de ejecución — Fase 0

## Propósito

Este documento es el prompt operativo recomendado para iniciar el desarrollo de D-Territorio Campañas con una IA de programación (por ejemplo Codex).

Debe ejecutarse sobre la rama:

`feature/campanas-v1`

No trabajar directamente sobre `main`.

---

# Prompt

Estás trabajando en el repositorio `heise94/d-territorio-firebase-studio`.

Tu objetivo es implementar **únicamente la Fase 0 — Preparación técnica** del módulo **D-Territorio Campañas**.

Antes de modificar código:

1. Lee `docs/campanas/README.md`.
2. Lee todos los documentos normativos indicados allí, especialmente:
   - `MASTER_SPEC.md`
   - `TECH_ARCHITECTURE.md`
   - `AUTH_SECURITY.md`
   - `PERMISSIONS_AND_WORKFLOW.md`
   - `DATA_MODEL.md`
3. Lee además:
   - `DESIGN_SYSTEM.md`
   - `UI_COMPONENTS.md`
   - `SCREEN_MAP.md`
   - `WIREFRAMES.md`
   - `IMPLEMENTATION_NOTES.md`
   - `DEVELOPMENT_PLAN.md`
4. Revisa el código actual del repositorio antes de crear estructuras nuevas.
5. No cambies reglas de negocio documentadas.
6. Si existe una contradicción entre documentación y código actual, conserva el funcionamiento existente de D-Territorio y reporta la discrepancia en tu resumen final, salvo que sea necesario un cambio mínimo y claramente aislado para Campañas.

## Alcance exacto de esta fase

Preparar la base técnica de Campañas sin implementar aún la funcionalidad completa de campañas, inscripciones, autenticación por PIN, asignaciones ni notificaciones reales.

Implementar solamente lo necesario para dejar una base limpia y extensible.

### 1. Separación del dominio Campañas

Crear una estructura clara para el dominio Campañas dentro del repositorio actual.

La solución debe:
- convivir con el D-Territorio existente;
- evitar acoplar lógica de Campañas con lógica de Territorios;
- reutilizar infraestructura y componentes compartidos cuando sea conveniente;
- dejar espacio para panel administrador y PWA participante.

No crear microservicios.

### 2. Rutas base

Crear las rutas/shell necesarios para demostrar que el módulo puede funcionar como experiencia independiente.

Debe existir como mínimo una entrada para:
- experiencia administrativa de Campañas;
- experiencia participante/PWA de Campañas.

La estructura debe quedar preparada para desplegarse posteriormente en `campanas.d-territorio.cl`, pero no es necesario configurar el DNS en esta fase.

### 3. Layouts

Crear layouts base coherentes con `DESIGN_SYSTEM.md`.

Administrador:
- orientado a escritorio/tablet;
- navegación preparada para Dashboard, Participantes, Planificación, Programa y Configuración;
- no es necesario implementar esas funciones todavía.

Participante:
- mobile-first;
- navegación y shell preparados para Inicio, Disponibilidad, Mi programa, Notificaciones e Información;
- no implementar aún datos reales.

### 4. Componentes visuales base

Implementar solamente componentes suficientemente genéricos para demostrar el sistema visual, reutilizando la infraestructura actual cuando sea posible.

No crear una biblioteca paralela innecesaria si ya existen componentes equivalentes en el proyecto.

Debe respetarse:
- alto contraste;
- botones cómodos en móvil;
- tipografía y espaciado definidos;
- uso consistente de iconografía;
- estados visuales accesibles.

### 5. PWA base

Revisar el soporte PWA existente y dejar Campañas preparado para utilizarlo.

En esta fase:
- no implementar push real;
- no implementar recordatorios;
- no crear lógica de permisos de notificaciones definitiva.

Sí verificar que la arquitectura no impida posteriormente:
- manifest;
- instalación;
- service worker;
- funcionamiento standalone;
- pantalla offline básica.

### 6. Capa de dominio y tipos iniciales

Crear únicamente tipos/interfaces/esquemas base necesarios para la estructura futura, siguiendo `DATA_MODEL.md`.

No es necesario implementar toda la persistencia en esta fase.

Evitar datos hardcodeados específicos del Cementerio Padre Las Casas, salvo datos demo claramente aislados como fixtures y etiquetados como tales.

### 7. Namespacing de datos

Definir cómo se aislarán las colecciones/documentos de Campañas respecto de Territorios.

Si se crean helpers o constantes de paths, deben quedar centralizados.

No realizar migraciones destructivas ni cambiar datos existentes.

### 8. Datos demo mínimos

Solo si son necesarios para visualizar la estructura, usar fixtures ficticios y claramente identificados.

No cargar datos reales de hermanos.

### 9. Calidad

Antes de finalizar:
- ejecutar typecheck;
- ejecutar build;
- ejecutar lint/pruebas disponibles que sean relevantes;
- corregir errores provocados por esta implementación;
- comprobar que las rutas actuales de D-Territorio no se rompan.

## Fuera de alcance

NO implementar todavía:
- autenticación teléfono + PIN;
- creación real de campañas;
- inscripción de participantes;
- disponibilidad;
- PairRequest;
- planificador;
- asignaciones;
- reservas;
- programa general;
- generación PDF;
- push notifications;
- auto-pair;
- algoritmos de compatibilidad;
- datos médicos o sensibles;
- funcionalidades de Fase 1 o posteriores.

## Reglas que no debes violar

- El sistema nunca debe formar parejas automáticamente.
- La congregación no es una regla obligatoria de asignación.
- Los puntos, bloques y capacidades serán configurables; no fijarlos en código.
- Campañas debe permanecer modular y separado del dominio Territorios.
- No romper ni rediseñar el sistema D-Territorio existente como parte de esta fase.

## Entrega esperada

Al finalizar, responde con:

1. resumen de lo implementado;
2. lista de archivos creados/modificados;
3. estructura de rutas resultante;
4. decisiones técnicas tomadas;
5. comandos de validación ejecutados y su resultado;
6. cualquier discrepancia encontrada entre documentación y código;
7. pendientes explícitos para Fase 1;
8. confirmación de que no implementaste funcionalidades fuera de Fase 0.

## Criterios de aceptación de Fase 0

La fase solo puede considerarse terminada si:

- D-Territorio existente sigue funcionando;
- Campañas puede abrirse como módulo visualmente independiente;
- existen shells diferenciados para administrador y participante;
- la estructura respeta el stack existente;
- no hay reglas específicas de una sola campaña codificadas en componentes centrales;
- no se implementaron funciones de fases posteriores;
- build y typecheck pasan, salvo una limitación preexistente claramente documentada;
- el resultado queda listo para comenzar Fase 1 sin reestructuración importante.

Relacionado con GitHub Issue #1.
