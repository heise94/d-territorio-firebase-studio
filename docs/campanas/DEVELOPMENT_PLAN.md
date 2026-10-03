# D-Territorio Campañas — Plan de Desarrollo por Fases

## 1. Objetivo

Este documento define el orden recomendado para construir el módulo `campanas.d-territorio.cl` de forma incremental, controlada y verificable.

La IA o desarrollador debe trabajar una fase a la vez. No se recomienda implementar varias fases grandes en paralelo, porque existen dependencias funcionales importantes entre autenticación, campañas, disponibilidad, planificación y publicación.

## 2. Principios de ejecución

- La documentación de `docs/campanas/` es la fuente principal de verdad.
- No introducir comportamiento no documentado sin dejarlo explícito para revisión.
- Priorizar una V1 funcional antes de agregar automatizaciones avanzadas.
- Mantener Campañas desacoplado del dominio de Territorios aunque comparta repositorio, componentes e infraestructura.
- Toda regla de negocio importante debe ser testeable.
- La asignación de parejas es manual: nunca implementar auto-pair en V1.

---

# Fase 0 — Preparación técnica

## Objetivo

Preparar la base del módulo sin alterar el funcionamiento actual de D-Territorio.

## Entregables

- estructura de rutas/módulo Campañas;
- layout independiente pero coherente con D-Territorio;
- configuración inicial PWA;
- variables de entorno necesarias;
- namespaces/colecciones separadas para Campañas;
- componentes visuales base según `DESIGN_SYSTEM.md`;
- feature flag o ruta protegida de desarrollo si se necesita;
- entorno de desarrollo local estable.

## Criterios para cerrar fase

- D-Territorio existente sigue funcionando;
- Campañas puede abrirse como módulo independiente;
- build y typecheck pasan;
- no existen valores de campaña cementerio codificados en componentes centrales.

---

# Fase 1 — Modelo de campaña y panel de configuración

## Objetivo

Permitir crear y configurar una campaña desde el panel web.

## Alcance

Implementar:
- Campaign;
- CampaignDay;
- TimeBlock;
- Congregation;
- CampaignCongregation;
- Point;
- BlockPoint cuando corresponda;
- estados de campaña.

## Interfaz

El organizador debe poder:
- crear campaña;
- editar nombre, descripción y ubicación;
- agregar fechas;
- crear bloques horarios configurables;
- configurar capacidad objetivo;
- definir máximo de puntos;
- seleccionar congregaciones participantes;
- crear puntos ahora o más adelante;
- cambiar estado de campaña según permisos.

## Criterios para cerrar fase

- se puede crear una campaña completa sin tocar código;
- se pueden agregar dos o más días con bloques distintos;
- capacidad y cantidad de puntos son configurables;
- los estados de campaña afectan correctamente las acciones disponibles.

---

# Fase 2 — Identidad del participante y autenticación

## Objetivo

Permitir registro e ingreso simple mediante teléfono + PIN, con sesión persistente.

## Alcance

Implementar:
- Participant;
- normalización de teléfono;
- creación segura de PIN;
- almacenamiento hash del PIN;
- inicio de sesión;
- DeviceSession;
- dispositivo de confianza;
- cierre/revocación de sesión;
- recuperación/reinicio de acceso según flujo definido;
- autorización para que un participante solo vea sus propios datos.

## UX requerida

Primera vez:
1. teléfono;
2. identificación/registro;
3. PIN;
4. sesión persistente;
5. entrada a PWA.

Siguientes aperturas:
- ingresar directamente si la sesión es válida;
- pedir PIN solo cuando sea necesario.

## Criterios para cerrar fase

- un participante puede registrarse e ingresar sin correo;
- la sesión persiste al cerrar/reabrir PWA;
- otro participante no puede acceder a sus datos;
- PIN nunca se guarda en texto plano.

---

# Fase 3 — Inscripción y disponibilidad

## Objetivo

Reemplazar funcionalmente el antiguo Google Form.

## Alcance

Implementar:
- CampaignRegistration;
- Availability;
- máximo de turnos deseado;
- congregación;
- edición de disponibilidad;
- visualización de cobertura del bloque;
- concepto de bloque completo/reserva;
- mensajes de prioridad de cobertura.

## Reglas

- disponibilidad no equivale a asignación;
- bloques completos siguen permitiendo marcar disponibilidad;
- al llenarse un bloque, mostrar que probablemente quedará como reserva;
- destacar bloques que aún requieren apoyo;
- máximo de turnos debe quedar guardado por inscripción.

## Criterios para cerrar fase

- la campaña puede recibir inscripciones reales;
- el organizador ve conteos por bloque;
- los participantes pueden modificar disponibilidad mientras el estado lo permita;
- un bloque lleno no bloquea nuevas disponibilidades.

---

# Fase 4 — Solicitudes para participar juntos

## Objetivo

Implementar la única lógica de pareja iniciada por participantes.

## Alcance

Implementar PairRequest:
- buscar/seleccionar al segundo participante;
- solicitud pendiente;
- notificación interna;
- tarjeta destacada al entrar a la PWA;
- aceptar;
- rechazar;
- cancelar cuando corresponda;
- validación de disponibilidad compatible;
- vínculo obligatorio tras aceptación.

## Reglas

- no existe categoría de "preferencia";
- una solicitud aceptada significa que deben ser asignados juntos;
- el sistema no forma automáticamente la pareja;
- si no existe disponibilidad compartida, mostrar conflicto.

## Criterios para cerrar fase

- la solicitud aparece inmediatamente para el receptor;
- aceptar genera vínculo obligatorio;
- rechazar no genera vínculo;
- el planificador puede identificar claramente vínculos aceptados.

---

# Fase 5 — Panel de participantes y cobertura

## Objetivo

Dar a los organizadores una vista operativa completa antes de empezar a asignar.

## Alcance

Implementar:
- listado de inscritos;
- búsqueda;
- filtro por congregación;
- filtro por día/bloque;
- cobertura por bloque;
- cantidad de disponibles;
- cantidad asignada;
- reservas potenciales;
- máximo de turnos;
- solicitudes de pareja pendientes/aceptadas;
- ficha simple del participante.

## Criterios para cerrar fase

- el organizador puede entender el estado completo de la campaña sin exportar a Excel;
- se detectan bloques con baja cobertura;
- los vínculos obligatorios son visibles sin dominar visualmente la interfaz.

---

# Fase 6 — Planificador manual

## Objetivo

Construir la pantalla central de trabajo de los encargados.

## Layout base

`Disponibles | Asignaciones por punto | Contexto / Reserva`

## Comportamiento obligatorio

Al seleccionar un bloque:
- mostrar solo participantes disponibles para ese bloque;
- excluir automáticamente a quienes ya estén asignados en ese bloque;
- permitir crear manualmente una pareja;
- asignarla a un punto;
- impedir duplicados;
- mostrar advertencia por máximo de turnos;
- mostrar vínculo obligatorio;
- al eliminar asignación, devolver participante a disponibles;
- actualizar contadores inmediatamente.

## Alcance de datos

Implementar Assignment y las validaciones necesarias.

## No implementar

- auto-pair;
- algoritmo de compatibilidad personal;
- ranking de participantes.

## Criterios para cerrar fase

- una campaña completa puede planificarse sin usar Excel;
- no es posible asignar accidentalmente a una persona dos veces en el mismo bloque;
- los vínculos obligatorios no pueden publicarse separados;
- la interacción es suficientemente rápida para trabajo colaborativo.

---

# Fase 7 — Programa general y publicación

## Objetivo

Transformar la planificación en un programa oficial y distribuible.

## Alcance

Implementar:
- vista general por fecha;
- filas por bloque;
- columnas por punto;
- dos participantes por punto;
- estado Borrador;
- validaciones previas;
- publicación;
- timestamp/versionado;
- vista publicada para participantes;
- impresión;
- PDF.

## Reglas

Antes de publicar validar al menos:
- duplicados;
- parejas obligatorias incompletas;
- puntos con un solo participante cuando no sea intencional;
- asignaciones inválidas;
- conflictos de disponibilidad;
- advertencias de máximo de turnos.

## Criterios para cerrar fase

- el programa histórico en tabla puede generarse desde el sistema;
- el PDF es legible, incluso en blanco y negro;
- cada participante ve solo su programa personal;
- la versión publicada coincide exactamente con las asignaciones oficiales.

---

# Fase 8 — Cambios posteriores y reservas

## Objetivo

Gestionar cambios sin desordenar la planificación publicada.

## Alcance

Implementar:
- ChangeRequest;
- solicitud desde PWA;
- aprobación/rechazo;
- reemplazo mediante reserva;
- historial básico de cambios;
- actualización versionada del programa;
- notificación al participante afectado.

## Criterios para cerrar fase

- un hermano no modifica unilateralmente una asignación publicada;
- los organizadores pueden resolver cambios rápidamente;
- una persona liberada vuelve correctamente al estado correspondiente;
- las reservas pueden localizarse fácilmente por bloque.

---

# Fase 9 — Notificaciones y PWA completa

## Objetivo

Completar la experiencia móvil instalada.

## Alcance

Implementar:
- manifest e iconos definitivos;
- instalación PWA;
- service worker;
- pantalla offline básica;
- PushSubscription;
- centro de notificaciones;
- eventos de dominio;
- push para eventos importantes;
- recordatorios previos a turnos.

## Eventos mínimos

- pair_request_created;
- pair_request_accepted;
- pair_request_rejected;
- program_published;
- assignment_changed;
- change_request_resolved;
- turn_reminder.

## Criterios para cerrar fase

- PWA se instala correctamente en Android compatible;
- existe guía para iPhone cuando corresponda;
- las notificaciones internas funcionan incluso sin push;
- los push no exponen información innecesaria.

---

# Fase 10 — Pruebas integrales y campaña piloto

## Objetivo

Validar el sistema con datos similares a una campaña real antes de producción.

## Escenario mínimo de prueba

- 4 congregaciones;
- 2 o 3 días;
- múltiples bloques configurables;
- hasta 8 puntos;
- al menos 40–80 participantes ficticios;
- bloques incompletos;
- bloques completos;
- reservas;
- solicitudes de pareja;
- cambios posteriores;
- publicación y re-publicación.

## Pruebas

- funcionales;
- permisos;
- responsive;
- PWA;
- sesiones;
- notificaciones;
- programa/PDF;
- reglas de asignación;
- concurrencia básica entre organizadores.

## Criterios para cerrar fase

- no existen errores críticos conocidos;
- organizadores pueden completar una campaña de prueba sin usar herramientas externas;
- flujo móvil puede ser realizado por un usuario poco tecnológico;
- todos los criterios definidos en `ACCEPTANCE_CRITERIA.md` pasan.

---

# Fase 11 — Despliegue y lanzamiento

## Objetivo

Poner la V1 en producción de forma segura.

## Alcance

- subdominio `campanas.d-territorio.cl`;
- configuración de hosting;
- variables de entorno;
- reglas de Firestore/seguridad;
- índices necesarios;
- dominio/HTTPS;
- monitoreo básico;
- backup/exportación según posibilidades del stack;
- datos reales de campaña;
- cuentas de organizadores;
- checklist de lanzamiento.

## Criterios para cerrar fase

- producción separada de desarrollo;
- subdominio funciona con HTTPS;
- permisos verificados;
- campaña puede abrir inscripciones;
- existe procedimiento básico para volver atrás ante un fallo.

---

# Fase 12 — Mejoras posteriores a V1

No bloquear el lanzamiento esperando estas funciones.

Candidatas:
- duplicar campaña anual;
- exportar a Excel;
- estadísticas históricas;
- QR de acceso;
- múltiples ubicaciones;
- responsables por tramo;
- plantillas de campaña;
- analítica básica de cobertura;
- mejoras de accesibilidad;
- recordatorios configurables.

---

# Orden recomendado para una IA

Una IA debe recibir una fase por vez.

Prompt recomendado de inicio:

> Lee primero toda la documentación normativa de `docs/campanas/`. Implementa únicamente la Fase N de `DEVELOPMENT_PLAN.md`. No avances a la fase siguiente. Antes de modificar código, identifica las reglas funcionales que afectan esta fase. Al terminar, ejecuta build/typecheck/pruebas aplicables y entrega un resumen de archivos modificados, decisiones tomadas y pendientes.

Esto reduce la probabilidad de que la IA improvise arquitectura o adelante funcionalidades fuera de alcance.
