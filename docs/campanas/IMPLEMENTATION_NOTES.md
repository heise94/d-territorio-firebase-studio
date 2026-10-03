# D-Territorio Campañas — Notas de Implementación

## 1. Objetivo técnico

Construir un módulo desacoplado pero coherente con D-Territorio, pensado para desplegarse inicialmente como subdominio:

`campanas.d-territorio.cl`

Debe poder evolucionar sin depender de valores fijos de la campaña del Cementerio Padre Las Casas.

## 2. Arquitectura sugerida

La implementación puede vivir dentro del mismo repositorio como módulo/ruta independiente o separarse más adelante si crece.

Prioridades:
- compartir identidad visual y componentes base cuando convenga;
- separar claramente dominio `campañas` del dominio `territorios`;
- evitar acoplar colecciones/tablas directamente a una sola campaña;
- mantener reglas de negocio testeables.

## 3. PWA

Requisitos mínimos:
- manifest válido;
- iconos;
- display standalone;
- service worker;
- estrategia de caché segura;
- pantalla offline básica;
- instalación guiada;
- soporte para notificaciones push donde el navegador lo permita.

No asumir que todos los navegadores permiten exactamente el mismo flujo de instalación.

## 4. Sesión de participante

Flujo sugerido:
- teléfono normalizado como identificador humano;
- PIN corto solo como factor de acceso simple;
- PIN nunca almacenado en texto plano;
- sesión persistente segura en dispositivo;
- opción de revocar sesión;
- expiración razonable y renovación silenciosa.

La UX debe evitar pedir PIN en cada apertura.

## 5. Seguridad

Aunque los datos no sean altamente confidenciales, aplicar principios básicos:
- autorización por recurso;
- un participante solo puede leer/escribir sus propios datos de participación;
- datos administrativos solo accesibles a organizadores autorizados;
- no confiar en controles de UI como única protección;
- validar todas las mutaciones en backend/reglas;
- logs para acciones relevantes.

## 6. Datos personales mínimos

Solicitar solo lo necesario:
- nombre;
- teléfono;
- congregación;
- disponibilidad;
- máximo de turnos;
- solicitudes funcionales.

Evitar recopilar:
- diagnósticos;
- condiciones médicas;
- información privada no necesaria;
- criterios que los coordinadores pueden manejar personalmente fuera de la plataforma.

## 7. Motor de cobertura

El sistema puede calcular, nunca decidir parejas.

Por bloque debe exponer:
- `available_count`;
- `assigned_count`;
- `remaining_capacity`;
- `reserve_count`;
- `active_points_count`;
- `required_slots = active_points_count * 2` cuando aplique.

La UI puede clasificar visualmente:
- necesita apoyo;
- cobertura media;
- casi completo;
- completo;
- sobrecapacidad/reserva.

Los umbrales visuales deben ser configurables o derivados, no reglas rígidas de negocio.

## 8. Planificador manual

Nunca implementar `auto-pair` en V1.

Sí implementar ayudas:
- filtro por bloque;
- búsqueda;
- contador de turnos asignados;
- advertencia por máximo de turnos;
- aviso de vínculo obligatorio;
- prevención de duplicados;
- actualización instantánea de disponibles/asignados;
- undo o eliminación fácil antes de publicar.

## 9. Vínculos obligatorios

Una solicitud aceptada debe convertirse en una restricción de validación.

Si A y B están vinculados:
- no permitir publicar A en un punto/bloque distinto de B si ambos están asignados en ese bloque;
- si uno todavía no está asignado, advertir que la pareja está incompleta;
- permitir a organizadores resolver/cancelar el vínculo solo mediante una acción explícita y auditable.

## 10. Publicación

Separar borrador de publicado.

Una asignación editada durante planificación no debe generar necesariamente notificación final inmediata.

Al publicar:
- congelar snapshot lógico o versión del programa;
- notificar a participantes asignados;
- mostrar `published_at`;
- permitir posteriores cambios versionados.

## 11. Programa general

Generar desde datos estructurados, no como imagen manual.

La tabla debe adaptarse dinámicamente a:
- cantidad de puntos;
- cantidad de bloques;
- fechas distintas;
- nombres largos.

Para PDF/impresión:
- formato horizontal cuando corresponda;
- saltos por fecha;
- repetir encabezados si hay más de una página;
- alto contraste;
- evitar colores saturados;
- prueba de impresión en blanco y negro.

## 12. Notificaciones

Diseñar una capa de eventos de dominio, por ejemplo:
- `pair_request_created`
- `pair_request_accepted`
- `pair_request_rejected`
- `program_published`
- `assignment_changed`
- `change_request_resolved`
- `turn_reminder`

La notificación push y el historial interno pueden consumir los mismos eventos.

## 13. Roles y permisos

Propuesta inicial:

### super_admin
Acceso total al módulo.

### campaign_admin
Administra campañas específicas, planificación y publicación.

### congregation_coordinator
Colabora en participantes y asignaciones de la campaña según permisos acordados.

Evitar restringir artificialmente al coordinador solo a su congregación si el trabajo real se realiza en conjunto. Los permisos deben poder adaptarse.

## 14. Estados recomendados

### Campaign
- draft
- registration_open
- planning
- published
- active
- completed

### PairRequest
- pending
- accepted
- rejected
- cancelled

### ChangeRequest
- pending
- approved
- rejected
- resolved

### Assignment
- draft
- published
- cancelled

## 15. Testing mínimo

Casos imprescindibles:
- persona disponible desaparece al ser asignada en ese bloque;
- vuelve al quitar asignación;
- no puede duplicarse en un mismo bloque;
- máximo de turnos genera advertencia;
- bloque completo permite registrar disponibilidad como reserva;
- solicitud de pareja requiere aceptación;
- pareja aceptada no puede publicarse separada accidentalmente;
- cambios post-publicación notifican correctamente;
- participante nunca puede ver datos privados de otro participante;
- programa general refleja exactamente las asignaciones publicadas.

## 16. Rendimiento y simplicidad

El volumen de usuarios será moderado, por lo que priorizar:
- simplicidad;
- mantenibilidad;
- consistencia de datos;
- UX rápida;
por sobre arquitecturas distribuidas innecesarias.

## 17. Futuro

Preparar sin implementar todavía:
- duplicar campaña de un año a otro;
- exportación Excel;
- estadísticas históricas;
- más tipos de campaña;
- múltiples ubicaciones;
- responsables por franja;
- QR de acceso a campaña;
- recordatorios configurables.
