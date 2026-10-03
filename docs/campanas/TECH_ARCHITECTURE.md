# D-Territorio Campañas — Arquitectura Técnica Definitiva

## 1. Objetivo

Definir una arquitectura concreta para implementar `campanas.d-territorio.cl` sin mezclar la lógica de campañas con la lógica histórica de territorios.

La implementación inicial vivirá dentro del repositorio `heise94/d-territorio-firebase-studio`, reutilizando la pila existente cuando resulte conveniente.

## 2. Stack recomendado para V1

Aprovechar el stack actual del repositorio:

- Next.js 15
- React 18
- TypeScript
- Firebase
- Firestore
- Firebase Admin / backend seguro mediante Route Handlers o Server Actions cuando corresponda
- Tailwind CSS
- Radix UI
- Lucide React
- Zod
- React Hook Form
- soporte PWA existente mediante `@ducanh2912/next-pwa`

No introducir Supabase, PostgreSQL u otra base de datos en V1 salvo que aparezca una limitación real que lo justifique.

## 3. Separación de dominios

Campañas debe implementarse como un dominio separado.

Estructura sugerida:

```text
src/
  app/
    (territorios)/...
    campanas/
      ...
  features/
    campaigns/
      components/
      domain/
      services/
      repositories/
      schemas/
      hooks/
      types/
      utils/
```

Si el proyecto actual no utiliza `features/`, adaptar la idea a su estructura vigente, pero mantener una frontera clara.

Regla:

> El código del dominio campañas no debe depender de estructuras específicas de territorios salvo componentes visuales genéricos compartidos.

## 4. Subdominio

Objetivo público:

`campanas.d-territorio.cl`

Opciones válidas de despliegue:

### Opción preferida V1
La misma aplicación Next.js detecta hostname y enruta el subdominio a la experiencia Campañas.

Ventajas:
- un solo repositorio;
- un solo pipeline;
- componentes compartidos;
- menos infraestructura.

### Alternativa futura
Separar Campañas a una aplicación independiente si el módulo crece considerablemente.

La documentación funcional no debe depender de cuál alternativa se utilice.

## 5. Áreas de aplicación

### Participante / PWA
Rutas conceptuales:

```text
/
/ingresar
/registro
/inicio
/disponibilidad
/programa
/notificaciones
/informacion
/solicitudes
```

### Organización
Rutas conceptuales:

```text
/admin
/admin/campanas
/admin/campanas/[campaignId]
/admin/campanas/[campaignId]/participantes
/admin/campanas/[campaignId]/planificacion
/admin/campanas/[campaignId]/programa
/admin/campanas/[campaignId]/configuracion
/admin/campanas/[campaignId]/solicitudes
```

Las URLs finales pueden adaptarse, pero la separación participante/organización debe mantenerse.

## 6. Firestore

Colecciones sugeridas:

```text
campaigns
campaignDays
timeBlocks
congregations
campaignCongregations
participants
campaignRegistrations
availabilities
pairRequests
points
blockPoints
assignments
changeRequests
notifications
deviceSessions
pushSubscriptions
organizerUsers
organizerNotes
auditLogs
programVersions
```

Para V1 se recomienda favorecer documentos relativamente planos y consultas indexables, evitando árboles de subcolecciones excesivamente profundos.

Todos los documentos específicos de campaña deben incluir `campaignId` cuando simplifique autorización y consultas.

## 7. Identificadores

Usar IDs opacos generados por Firestore.

No usar como ID público:
- teléfono;
- nombre;
- congregación.

El teléfono normalizado será un atributo indexable, no la clave primaria.

## 8. Reglas de dominio

Las reglas críticas deben implementarse en una capa de dominio reutilizable y no solo dentro de componentes React.

Ejemplos:
- una persona no puede estar dos veces en el mismo bloque;
- una pareja obligatoria aceptada no puede publicarse separada;
- disponibilidad no equivale a asignación;
- máximo de turnos genera advertencia;
- una asignación publicada debe pertenecer a una campaña válida;
- no publicar un punto con más plazas ocupadas que las permitidas.

## 9. Operaciones críticas

Las siguientes operaciones deben ejecutarse en backend confiable o transacción Firestore cuando haya riesgo de carrera:

- creación de asignación;
- eliminación/movimiento de asignación;
- aceptación de PairRequest;
- publicación del programa;
- resolución de solicitudes de cambio;
- vinculación/revocación de DeviceSession.

No confiar únicamente en que la UI impida errores.

## 10. Estado en tiempo real

El planificador se beneficia de actualizaciones en tiempo real para trabajo colaborativo.

Recomendación:
- suscripción Firestore a asignaciones del bloque activo;
- suscripción a disponibilidad del bloque;
- actualización inmediata de listas;
- manejo de colisiones mediante transacciones y mensaje de conflicto.

Ejemplo:
Si dos organizadores intentan asignar a la misma persona simultáneamente, solo una operación debe confirmar y la otra debe recibir una respuesta explícita.

## 11. Consultas principales

Optimizar para:

1. campañas activas;
2. participantes de una campaña;
3. disponibilidad por `campaignId + timeBlockId`;
4. asignaciones por `timeBlockId`;
5. asignaciones por participante;
6. solicitudes pendientes por participante;
7. notificaciones por participante ordenadas por fecha;
8. programa general por fecha/bloque/punto;
9. solicitudes de cambio pendientes;
10. auditoría por campaña.

Crear índices Firestore según aparezcan estas consultas.

## 12. Programa publicado y versionado

Agregar entidad `ProgramVersion`.

Campos sugeridos:
- id
- campaignId
- versionNumber
- publishedAt
- publishedBy
- status
- snapshotHash opcional
- notes opcional

Las asignaciones continúan siendo datos estructurados, pero cada publicación incrementa una versión.

Esto permite distinguir:
- borrador actual;
- programa publicado v1;
- cambios posteriores v2, v3, etc.

No es obligatorio duplicar todos los documentos en cada versión en V1. Se puede guardar metadato de versión en cada Assignment publicada y/o generar snapshot lógico al publicar.

## 13. Generación PDF

El programa general debe partir de HTML/CSS de impresión.

Estrategia recomendada V1:
- vista web estructurada;
- `@media print`;
- orientación horizontal cuando corresponda;
- botón “Imprimir / Guardar como PDF”.

Evitar depender inicialmente de generación PDF compleja en servidor si el navegador entrega un resultado correcto.

Una solución de PDF server-side puede agregarse más adelante.

## 14. Offline

La PWA no necesita edición offline completa en V1.

Sí debe:
- abrir shell básico sin red;
- mostrar última información cacheada cuando sea segura;
- indicar claramente que está sin conexión;
- impedir guardar cambios que no puedan confirmarse en backend.

Nunca presentar un cambio local no sincronizado como confirmado.

## 15. Observabilidad

Registrar errores relevantes de forma consistente.

Como mínimo:
- errores de autenticación;
- fallos de asignación/transacción;
- fallos de publicación;
- fallos de notificación;
- conflictos de autorización.

No escribir PIN, tokens ni teléfonos completos en logs de diagnóstico.

## 16. Estrategia de evolución

V1 debe ser monolito modular.

No usar microservicios.

Si en el futuro D-Territorio se convierte en SaaS multi-congregación, el dominio Campañas debe poder incorporar `tenantId` o equivalente sin reescribir las reglas de negocio.
