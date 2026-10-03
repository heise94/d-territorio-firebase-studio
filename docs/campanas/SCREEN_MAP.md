# D-Territorio Campañas — Mapa de pantallas y navegación

## 1. Objetivo

Definir la arquitectura de información del módulo Campañas antes del desarrollo visual y técnico.

Este documento describe qué pantallas existen, cómo se conectan y qué acciones principales debe poder realizar cada tipo de usuario.

---

# 2. Áreas del producto

El módulo se divide en dos experiencias:

1. **Panel web de organización** — escritorio/tablet, mayor densidad de información.
2. **PWA de participantes** — móvil primero, navegación simple y accesible.

---

# 3. Mapa del panel web

## 3.1 Nivel global

- Inicio / selector de campaña
- Campañas
- Configuración global
- Gestión de organizadores

## 3.2 Dentro de una campaña

### Resumen
Pantalla inicial de campaña con:
- estado actual;
- inscritos totales;
- cobertura general;
- bloques incompletos;
- solicitudes pendientes;
- cambios pendientes;
- accesos rápidos.

### Participantes
- listado general;
- búsqueda;
- filtro por congregación;
- filtro por estado;
- ficha del participante;
- disponibilidad;
- turnos asignados;
- máximo de turnos;
- vínculo obligatorio confirmado o pendiente;
- notas operativas internas si se habilitan.

### Cobertura
Vista de todos los días y bloques con indicadores de:
- inscritos;
- capacidad objetivo;
- asignados;
- disponibles sin asignar;
- reservas;
- bloque completo/incompleto.

### Planificación
Pantalla de trabajo principal.

Ruta sugerida:
`Campaña > Planificación > Día > Bloque`

Contenido del bloque:
- lista de disponibles;
- lista de asignados;
- reservas;
- puntos activos;
- creación manual de parejas;
- asignación manual de pareja a punto;
- alertas y conflictos.

### Puntos
- crear punto;
- editar punto;
- activar/desactivar por día o bloque;
- nombre;
- ubicación;
- instrucciones;
- imagen opcional.

### Solicitudes
Agrupa:
- solicitudes de participación conjunta;
- solicitudes de cambio posteriores;
- pendientes de confirmación.

### Programa general
- vista previa;
- versión borrador;
- versión publicada;
- imprimir;
- exportar PDF;
- futura exportación Excel.

### Notificaciones
- mensajes enviados;
- envíos pendientes;
- notificaciones automáticas;
- historial básico.

### Configuración de campaña
- nombre;
- descripción;
- ubicación general;
- fechas;
- bloques horarios;
- congregaciones;
- capacidad objetivo;
- máximo de puntos;
- estado;
- permisos de organizadores.

---

# 4. Navegación propuesta del panel web

Barra lateral persistente:

1. Resumen
2. Participantes
3. Cobertura
4. Planificación
5. Puntos
6. Solicitudes
7. Programa
8. Notificaciones
9. Configuración

Encabezado superior:
- nombre de campaña activa;
- estado;
- selector de campaña;
- usuario organizador;
- acción contextual principal.

---

# 5. Mapa de la PWA

## 5.1 Primer ingreso

- Bienvenida
- Teléfono
- PIN / creación o validación
- Confirmación de identidad
- Permitir dispositivo de confianza
- Invitación a instalar PWA
- Solicitud de permisos de notificación en momento adecuado

## 5.2 Navegación principal

Barra inferior recomendada:

1. **Inicio**
2. **Disponibilidad**
3. **Mi programa**
4. **Avisos**

La sección Información puede abrirse desde Inicio o menú secundario.

## 5.3 Inicio

Debe priorizar, en este orden:

1. solicitudes urgentes pendientes;
2. próxima asignación publicada;
3. estado de inscripción;
4. resumen de disponibilidad;
5. avisos importantes;
6. acceso a información de campaña.

## 5.4 Disponibilidad

- días de campaña;
- bloques configurados;
- estado visual de cobertura;
- selección múltiple;
- máximo de turnos deseados;
- opción para solicitar participación obligatoria con otro hermano;
- guardar cambios.

## 5.5 Solicitud de participar juntos

Flujo:
- buscar participante;
- seleccionar persona correcta;
- indicar bloque(s) en que desean participar juntos, si corresponde;
- confirmar solicitud;
- estado Pendiente;
- notificación al segundo participante.

Al segundo participante debe aparecer una tarjeta destacada en Inicio:

**Solicitud pendiente**
`Nombre` desea participar contigo.

Acciones:
- Aceptar
- Rechazar

## 5.6 Mi programa

Si no está publicado:
- mensaje claro: “Tu programa aún no ha sido publicado”.

Si está publicado:
- próxima asignación destacada;
- lista cronológica;
- día;
- bloque;
- punto;
- compañero/a;
- instrucciones;
- acción “Solicitar cambio” cuando corresponda.

## 5.7 Avisos

Historial de:
- solicitud para participar juntos;
- aceptación/rechazo;
- programa publicado;
- nueva asignación;
- cambio de asignación;
- recordatorio;
- resolución de solicitud de cambio.

---

# 6. Estados de interfaz según etapa de campaña

## Borrador
Participantes no acceden todavía a inscripción pública.

## Inscripciones abiertas
PWA prioriza disponibilidad y registro.

## Planificación
Disponibilidad puede quedar bloqueada o limitada según configuración.

## Programa publicado
PWA prioriza asignaciones y solicitudes de cambio.

## Campaña en curso
PWA prioriza próxima asignación, ubicación e instrucciones.

## Finalizada
PWA pasa a modo consulta histórica si se desea conservar acceso.

---

# 7. Regla de navegación

Ninguna acción frecuente debe requerir más de tres pasos desde Inicio.

En móvil, evitar menús profundos.

En escritorio, priorizar navegación lateral estable y contexto visible.
