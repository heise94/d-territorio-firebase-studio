# D-TERRITORIO 4.0 — Documento Maestro

**Versión:** 0.1  
**Estado:** Borrador funcional inicial  
**Fecha:** 24-09-2026  
**Objetivo:** Fuente única de verdad para diseño, desarrollo, migración y validación de D-TERRITORIO 4.0.

---

## 1. Visión del producto

D-TERRITORIO 4.0 será una plataforma web SaaS multi-congregación para administrar territorios de predicación, programa semanal/mensual, capitanes, casas de salida, campañas, historial territorial y generación automática del registro S-13.

La aplicación debe permitir que cada congregación trabaje con su propia información de manera completamente aislada.

El sistema debe ser moderno para quien administra, pero conservar formatos familiares para la congregación, especialmente el programa de predicación que se comparte por WhatsApp o PDF.

### Principio central

> Modernizar la administración sin obligar a la congregación a reaprender los documentos y rutinas que ya funcionan.

---

## 2. Modelo SaaS / multi-tenant

### 2.1 Tenant

Cada congregación será un **tenant** independiente.

Ejemplos:

- Congregación Maquehue
- Congregación Padre Las Casas
- Congregación X

Cada tenant tendrá sus propios:

- usuarios;
- capitanes;
- territorios;
- mapas;
- casas de salida;
- grupos de predicación;
- programa;
- campañas;
- ciclos territoriales;
- reportes;
- S-13;
- configuraciones;
- feriados/excepciones personalizadas.

### 2.2 Aislamiento obligatorio

Un usuario perteneciente a una congregación:

- nunca debe poder consultar datos de otra congregación;
- nunca debe poder modificar datos de otra congregación;
- no debe recibir IDs, resultados de búsqueda, estadísticas ni archivos de otros tenants;
- no debe poder acceder cambiando manualmente una URL o ID.

Este aislamiento debe aplicarse en la base de datos y reglas de seguridad, no solo ocultando elementos en la interfaz.

### 2.3 Estructura conceptual

Base propuesta:

```
congregations/{congregationId}
  members/
  captains/
  territories/
  territoryCycles/
  workSessions/
  houses/
  preachingGroups/
  schedules/
  assignments/
  campaigns/
  calendarExceptions/
  settings/
```

Los datos territoriales siempre deben vivir bajo el identificador de la congregación.

### 2.4 Usuarios y membresías

Un usuario puede:

- pertenecer a una sola congregación inicialmente;
- potencialmente pertenecer a varias congregaciones en el futuro;
- tener un rol diferente en cada congregación.

La membresía debe vincular:

- userId;
- congregationId;
- role;
- status;
- permisos adicionales, si corresponde.

### 2.5 Autenticación

Versión inicial:

- Firebase Authentication;
- acceso mediante invitación;
- ninguna congregación puede autoasignarse acceso a otra;
- el alta de usuarios debe verificar la membresía antes de permitir acceso a datos.

La arquitectura debe quedar preparada para evolucionar a Google Cloud Identity Platform multi-tenancy si el crecimiento del SaaS lo justifica.

---

## 3. Roles iniciales

### 3.1 Administrador SaaS

Rol de plataforma, no de congregación.

Puede:

- crear congregaciones;
- activar/desactivar tenants;
- revisar estado técnico;
- administrar suscripción futura;
- ayudar con recuperación/configuración.

No debe consultar ordinariamente información sensible de las congregaciones desde la interfaz del producto.

### 3.2 Administrador de congregación

Administra:

- configuración general;
- usuarios;
- capitanes;
- casas;
- territorios;
- grupos;
- campañas;
- programa;
- reportes;
- S-13.

### 3.3 Encargado de territorios

Rol operativo principal.

Puede:

- administrar territorios;
- preparar programa;
- asignar capitanes, casas y territorios;
- revisar reportes;
- cerrar o corregir ciclos;
- generar S-13;
- administrar campañas.

### 3.4 Capitán

Puede:

- consultar sus asignaciones;
- indicar disponibilidad o ausencias;
- consultar información necesaria de su salida;
- reportar lo ocurrido;
- iniciar, continuar o completar un territorio según su asignación.

### 3.5 Solo lectura

Para usuarios autorizados a consultar programa, mapas o informes sin modificarlos.

> Los roles y permisos deben diseñarse de forma configurable. No asumir que todas las congregaciones trabajarán exactamente igual.

---

## 4. Módulos principales

1. Centro de Control
2. Territorios / Spatial OS
3. Programa de predicación
4. Capitanes
5. Casas de salida
6. Grupos de predicación
7. Campañas
8. Reporte de trabajo territorial
9. Historial territorial
10. S-13
11. Calendario / feriados / excepciones
12. Configuración
13. Administración SaaS

---

# 5. Centro de Control

Pantalla inicial para administración.

Debe mostrar, como mínimo:

- mapa territorial;
- total de territorios;
- territorios disponibles;
- territorios asignados;
- territorios en curso;
- territorios recientemente completados;
- territorios con mayor antigüedad;
- programa de los próximos días;
- alertas de disponibilidad;
- campaña activa;
- progreso de campaña.

El mapa será protagonista de la interfaz.

---

# 6. Territorios — Spatial OS

## 6.1 Vistas

El módulo debe ofrecer:

- **Mapa**
- **Tarjetas**
- **Lista**

La vista principal recomendada será Mapa.

## 6.2 Datos básicos

Cada territorio podrá contener:

- ID interno;
- número/código;
- nombre opcional;
- tipo;
- clasificación operativa;
- polígono geográfico;
- mapa/imágen tradicional;
- cantidad de manzanas;
- casas aproximadas;
- observaciones;
- advertencias;
- estado;
- casas de salida cercanas;
- fecha del último ciclo completado;
- historial completo;
- activo/inactivo.

## 6.3 Tipo de territorio

Inicialmente:

- residencial urbano;
- rural;
- empresarial;
- otro.

Debe ser extensible.

La cantidad de ciclos no debe interpretarse automáticamente como problema. Por ejemplo, un territorio empresarial puede tener naturalmente menos ciclos durante un mismo período.

## 6.4 Estados visuales

Ejemplo:

- neutral/disponible;
- asignado;
- en curso/parcial;
- completado recientemente;
- bloqueado.

Los colores deben depender del modo visual seleccionado.

## 6.5 Hover / selección

Al pasar el cursor:

- número;
- última fecha completado;
- estado;
- casas aproximadas;
- manzanas;
- casa cercana;
- días desde último completado.

Al hacer clic se abrirá un panel lateral con detalle completo.

---

# 7. Programa de predicación

## 7.1 Objetivo

Permitir preparar la predicación semanal o mensual de manera rápida, flexible y visual.

## 7.2 Horarios configurables

Los horarios NO deben estar escritos directamente en código.

Ejemplo:

```
Lunes:
- 10:30
- 16:00

Martes:
- 10:30
...
```

El administrador debe poder agregar, eliminar o modificar horarios.

## 7.3 Modalidad organizativa por día

Cada día de la semana debe poder configurarse como:

- Congregación
- Por grupos

Configuración inicial de Maquehue:

- Lunes: Congregación
- Martes: Congregación
- Miércoles: Congregación
- Jueves: Congregación
- Viernes: Congregación
- Sábado: Por grupos
- Domingo: Congregación

Esto debe ser completamente editable.

Si en el futuro el jueves pasa a "Por grupos", el programa debe adaptarse sin cambiar código.

## 7.4 Excepciones por fecha

La configuración semanal es una plantilla, no una restricción.

Debe poder indicarse:

- solo esta fecha será congregacional;
- solo esta fecha será por grupos;
- no habrá predicación;
- horario especial;
- campaña;
- visita especial;
- asamblea;
- feriado;
- otro.

## 7.5 Tipos de predicación

Inicialmente:

- casa en casa;
- rural;
- Zoom.

Debe ser posible agregar tipos en el futuro.

### Casa en casa

Puede requerir:

- hora;
- capitán;
- casa de salida;
- territorio.

### Rural

Puede requerir:

- hora;
- capitán;
- punto de encuentro;
- uno o varios territorios;
- observaciones.

### Zoom

Puede requerir:

- hora;
- capitán;
- enlace/datos adicionales.

## 7.6 Programa por grupos

Cuando un horario/día sea "Por grupos", el sistema generará una asignación por cada grupo activo.

Ejemplo:

- G1 → territorio 5
- G2 → territorio 29
- G3 → territorio 22
- G4 → territorio 31

La cantidad de grupos debe ser configurable.

---

# 8. Programa compartido con la congregación

La interfaz administrativa será moderna, pero el documento compartido debe conservar el estilo tradicional utilizado actualmente por Congregación Maquehue.

Debe poder generar:

- PNG de alta resolución;
- PDF;
- impresión.

Columnas:

- Fecha
- Hora
- Encargado
- Familia
- Dirección
- Territorios

Características:

- agrupación por semanas;
- colores de semana;
- sábados/grupos mostrados en formato compacto;
- días sin predicación en bloque destacado;
- tipografía grande y legible;
- vista previa antes de exportar.

Plantilla inicial:

**Clásico Maquehue**

La plataforma debe quedar preparada para que cada tenant pueda disponer de su propia plantilla en el futuro.

---

# 9. Capitanes

Cada capitán tendrá:

- nombre;
- contacto;
- estado activo/inactivo;
- disponibilidad habitual por horarios;
- períodos de ausencia;
- vacaciones;
- indisponibilidades puntuales;
- historial de asignaciones.

Deben existir dos conceptos separados:

1. disponibilidad habitual;
2. excepciones por rango de fechas o fecha específica.

El programa debe advertir conflictos.

---

# 10. Casas de salida

Cada casa podrá contener:

- familia/anfitrión;
- dirección;
- teléfono;
- coordenadas;
- disponibilidad habitual;
- ausencias/excepciones;
- notas;
- estado activo/inactivo;
- territorios cercanos.

Una casa puede asociarse a múltiples territorios.

A futuro la proximidad puede calcularse geográficamente.

---

# 11. Grupos de predicación

Los grupos existen, pero NO son el centro de toda la arquitectura.

Se utilizan principalmente cuando un día/horario se configura como **Por grupos**.

Cada grupo tendrá:

- número/nombre;
- activo/inactivo;
- orden;
- configuración opcional.

La cantidad de grupos debe ser editable.

---

# 12. Calendario chileno

El sistema debe mostrar los feriados oficiales de Chile.

Cada congregación define qué impacto tiene un feriado en su programa.

Opciones:

- horario normal;
- horario especial;
- no programar;
- preguntar al preparar ese año.

Debe existir soporte adicional para:

- Fiestas Patrias;
- Año Nuevo;
- Navidad;
- asambleas;
- visita del superintendente;
- eventos locales;
- excepciones propias de la congregación.

No asumir que un feriado legal significa automáticamente "sin predicación".

---

# 13. Ciclo territorial

Este concepto es fundamental.

Un **ciclo territorial** comienza cuando un territorio realmente comienza a trabajarse y termina cuando el territorio se completa.

## 13.1 No confundir programa con ciclo

Programar un territorio NO debe abrir automáticamente un ciclo.

Ejemplo:

- U-12 estaba programado;
- llovió;
- no hubo predicación.

Resultado:

- el programa conserva la asignación;
- el territorio no abre ciclo;
- el S-13 no cambia.

## 13.2 Inicio del ciclo

Cuando se reporta que el territorio efectivamente comenzó a trabajarse:

- se crea el ciclo;
- se registra la fecha de inicio;
- se registra el capitán que inició.

### Regla S-13 fundamental

> **"Asignado a" es siempre el capitán que inició el ciclo.**

Ese nombre queda fijo aunque otros capitanes continúen o completen posteriormente el territorio.

## 13.3 Continuaciones

Cada trabajo posterior se guarda como una sesión independiente.

Ejemplo:

```
U-22

02/05 - Benjamín inicia
16/05 - Carlos continúa
30/05 - Diego continúa
26/06 - Víctor completa
```

El ciclo mantiene:

```
startedBy = Benjamín
assignedDate = 02/05
completedDate = 26/06
```

## 13.4 Trabajo parcial

Debe poder registrarse:

- manzanas trabajadas;
- manzanas pendientes;
- notas;
- si se trabajó parcialmente;
- si no se trabajó.

El ciclo permanece abierto hasta que se marque como completado.

---

# 14. Sesiones de trabajo

Cada ocasión en que un territorio se trabaja debe generar un registro independiente.

Campos conceptuales:

- tenantId/congregationId;
- territoryId;
- cycleId;
- assignmentId;
- date;
- captainId;
- captainNameSnapshot;
- status;
- blocksWorked;
- blocksPending;
- notes;
- campaignId opcional;
- createdBy;
- timestamps.

Esto permite mantener historial completo aunque el S-13 solo muestre una parte.

---

# 15. S-13 — Registro de Asignación de Territorio

El S-13 es un módulo crítico y debe tratarse como documento prioritario.

El PDF utilizado por Congregación Maquehue será la referencia funcional y visual inicial.

## 15.1 Generación automática

El usuario NO debe rellenar manualmente el S-13.

El documento se genera desde:

- ciclos territoriales;
- capitán que inició cada ciclo;
- fecha de inicio;
- fecha de completado;
- campaña relacionada.

## 15.2 "Asignado a"

Siempre corresponde al **capitán que inició el ciclo**.

No debe cambiar aunque otro capitán:

- continúe;
- trabaje parcialmente;
- termine el territorio.

## 15.3 Máximo cuatro ciclos visibles

Para el informe utilizado actualmente por Maquehue:

- mostrar máximo los últimos 4 ciclos del período seleccionado;
- si existen 2, mostrar 2;
- si existen 3, mostrar 3;
- si existen más de 4, mostrar solo los 4 más recientes.

Los demás ciclos NO se eliminan de la base de datos.

## 15.4 Última fecha en que se completó

Debe mostrar la fecha de completado inmediatamente anterior al primer ciclo mostrado en las cuatro columnas.

Ejemplo:

```
Historial:
28 enero
7 marzo
2 abril
23 mayo
11 julio
```

S-13:

```
Última fecha completado: 28 enero

Ciclo 1: 7 marzo
Ciclo 2: 2 abril
Ciclo 3: 21-23 mayo
Ciclo 4: 11 julio
```

## 15.5 Ciclos abiertos

Si un ciclo todavía no ha terminado:

- conservar fecha asignada;
- conservar capitán inicial;
- fecha completada permanece vacía hasta cierre;
- definir en la fase de implementación si el informe oficial a exportar debe incluir ciclos abiertos según la práctica adoptada por la congregación.

## 15.6 Año de servicio / período

Debe permitir seleccionar el período del informe.

El sistema conservará todo el historial sin limitarlo al PDF generado.

## 15.7 Campañas en S-13

Cada campaña puede tener un color de identificación.

Cuando un ciclo corresponde a una campaña, el S-13 de gestión puede colorear:

- nombre del capitán;
- fecha asignada;
- fecha completada.

Debe existir leyenda de colores.

Se deben soportar dos salidas:

- **S-13 estándar:** presentación conservadora, sin color especial cuando sea necesario.
- **S-13 de gestión:** incluye colores de campaña.

## 15.8 Visita del superintendente

Función:

**Preparar visita**

Debe permitir generar rápidamente:

- S-13 actualizado;
- PDF listo para imprimir;
- eventualmente resumen territorial complementario.

---

# 16. Campañas

Cada campaña tendrá:

- nombre;
- tipo;
- fecha inicio;
- fecha término;
- color;
- estado;
- notas;
- territorios incluidos opcionalmente.

Ejemplos:

- campaña de estudios bíblicos;
- invitación a asamblea;
- invitación a Conmemoración.

## 16.1 Vista campaña en mapa

Al seleccionar una campaña, el mapa cambia de contexto.

Estados sugeridos:

- pendiente;
- asignado;
- en progreso;
- completado.

El progreso de la campaña es independiente del estado operativo normal.

No borrar historial normal al iniciar una campaña.

---

# 17. Reglas del mapa

El mismo territorio puede tener diferentes colores según la vista:

### Vista estado
- disponible;
- asignado;
- en curso;
- completado.

### Vista antigüedad
- recientes;
- intermedios;
- antiguos.

### Vista campaña
- pendiente;
- asignado;
- parcial;
- completado.

### Vista grupos
- color por grupo cuando corresponda.

---

# 18. Conflictos y validaciones

Antes de publicar un programa, el sistema debe advertir:

- capitán no disponible;
- capitán de vacaciones;
- casa no disponible;
- territorio bloqueado;
- territorio ya asignado en conflicto;
- horario inválido;
- día marcado como "sin predicación";
- asignación por grupos incompleta;
- datos faltantes.

Advertir no siempre significa bloquear. Algunas situaciones deben poder confirmarse manualmente por un administrador.

---

# 19. Seguridad y privacidad

D-TERRITORIO manejará información potencialmente sensible:

- nombres;
- teléfonos;
- direcciones;
- disponibilidades;
- información territorial.

Principios:

1. mínimo acceso necesario;
2. aislamiento estricto por tenant;
3. reglas Firestore por membresía;
4. operaciones administrativas críticas preferentemente desde backend seguro;
5. auditoría de cambios relevantes;
6. no confiar en filtros del frontend para seguridad;
7. no exponer datos de una congregación en búsquedas globales;
8. respaldos;
9. exportación controlada;
10. eliminación/desactivación de acceso inmediata.

La V4 NO debe reutilizar las reglas demasiado abiertas del sistema 2025.

---

# 20. Arquitectura técnica inicial

Propuesta inicial, sujeta a validación técnica antes de implementación:

- Next.js
- TypeScript
- React
- Tailwind CSS
- ShadCN / Radix
- Firebase Authentication
- Cloud Firestore
- Firebase/Google Cloud hosting
- Google Maps JavaScript API
- GeoJSON/polígonos territoriales
- PWA en fase posterior si aporta valor

### Multi-tenant de datos

Ruta recomendada:

```
/congregations/{congregationId}/...
```

Las reglas deben verificar que el usuario tenga una membresía activa en el tenant solicitado.

### Multi-tenant de autenticación

La primera versión puede utilizar Firebase Auth con membresías de aplicación.

Debe mantenerse abierta la posibilidad de migrar a Google Cloud Identity Platform multi-tenancy para silos de autenticación por tenant si el producto escala.

---

# 21. Diseño visual

Nombre conceptual:

**Spatial OS**

Características:

- mapa como protagonista;
- sidebar oscuro y contraíble;
- superficies claras;
- verde/teal como identidad;
- Geist/Inter como tipografía;
- panel contextual lateral;
- microinteracciones;
- mapas con polígonos dinámicos;
- experiencia premium sin excesos visuales.

El "wow" debe provenir de la claridad y respuesta del sistema, no de efectos decorativos innecesarios.

---

# 22. Estrategia de migración desde D-TERRITORIO 2025

El sistema 2025 se considera **Legacy**.

No se modificará destructivamente durante la construcción de V4.

Datos candidatos a migrar:

- territorios;
- mapas;
- casas;
- capitanes/usuarios;
- disponibilidad;
- asignaciones históricas;
- historial territorial útil.

Elementos que NO se migrarán automáticamente sin revisión:

- relaciones antiguas basadas en grupos;
- permisos inseguros;
- estructuras duplicadas;
- datos cuyo significado no sea inequívoco.

La migración será mediante script auditable.

---

# 23. Fases de desarrollo

## Fase 0 — Especificación

- documento maestro;
- reglas S-13;
- modelo de datos;
- mapas de navegación;
- mockups.

## Fase 1 — Fundación SaaS

- tenant;
- autenticación;
- membresías;
- roles;
- seguridad;
- diseño global.

## Fase 2 — Territorios / Spatial OS

- importación de polígonos;
- mapa;
- tarjetas;
- lista;
- detalle territorial.

## Fase 3 — Capitanes y casas

- disponibilidad;
- excepciones;
- relaciones geográficas.

## Fase 4 — Programa

- calendario;
- horarios;
- congregación/grupos;
- feriados;
- exportación "Clásico Maquehue".

## Fase 5 — Ciclos y reportes

- inicio;
- parcial;
- continuidad;
- cierre;
- historial.

## Fase 6 — S-13

- cálculo automático;
- PDF;
- últimos cuatro ciclos;
- campañas;
- preparación para visita.

## Fase 7 — Campañas

- seguimiento visual;
- progreso;
- mapas;
- reportes.

## Fase 8 — Migración

- importar datos Legacy;
- validación;
- puesta en producción.

---

# 24. Principios para Codex / agentes de desarrollo

1. Este documento es la fuente funcional principal.
2. No inventar reglas de negocio que no estén documentadas.
3. No avanzar a otra fase sin validar la anterior.
4. No alterar reglas S-13 sin decisión explícita.
5. Mantener aislamiento multi-tenant desde el primer commit.
6. Toda consulta de datos debe estar correctamente acotada al tenant.
7. Seguridad no puede depender exclusivamente del cliente.
8. Preferir componentes reutilizables.
9. No replicar deuda técnica del sistema Legacy.
10. Registrar decisiones relevantes en un Decision Log.

---

# 25. Decisiones confirmadas hasta versión 0.1

- V4 será SaaS multi-tenant.
- Una congregación no puede ver datos de otra.
- Maquehue será el tenant inicial/piloto.
- Spatial OS será la dirección visual.
- El mapa será central.
- Los sábados de Maquehue funcionan actualmente por 4 grupos.
- Los días por grupo deben ser configurables.
- Los horarios deben ser configurables.
- El programa compartido conservará el estilo tradicional de Maquehue.
- El calendario debe mostrar feriados chilenos.
- El impacto de cada feriado debe configurarlo la congregación.
- El S-13 se genera automáticamente.
- "Asignado a" es el capitán que inicia el ciclo.
- El nombre inicial no cambia si otros capitanes continúan o completan.
- Programa y trabajo real son entidades distintas.
- Un ciclo solo se abre cuando realmente comienza el trabajo territorial.
- El informe S-13 usado por Maquehue muestra como máximo los últimos 4 ciclos.
- Territorios empresariales pueden tener menos ciclos sin considerarse error.
- Campañas pueden identificarse por color en el S-13 de gestión.
- El historial completo se conserva aunque el PDF solo muestre 4 ciclos.
- El proyecto 2025 se conserva como Legacy.

---

# 26. Decisiones pendientes

- Nombre comercial definitivo: D-TERRITORIO vs otra marca SaaS.
- Modelo futuro de suscripción/licenciamiento.
- Si una persona podrá pertenecer a múltiples congregaciones desde V1.
- Política exacta de ciclos abiertos en el PDF S-13.
- Plantillas adicionales de programa por congregación.
- Estrategia definitiva de autenticación multi-tenant.
- Método final de importación desde Google My Maps.
- Retención y eliminación de datos.
- Política de respaldos.
- Requisitos legales y de privacidad aplicables antes de ofrecer el SaaS públicamente.

---

## Decision Log

### 2026-09-24 — Inicio de D-TERRITORIO 4.0
Se decide reconstruir el producto como una nueva arquitectura SaaS multi-tenant, conservando D-TERRITORIO 2025 como sistema Legacy y fuente de migración.

### 2026-09-24 — Regla S-13
"Asignado a" corresponde al capitán que realmente inicia el ciclo territorial. Ese nombre permanece asociado al ciclo aunque otros capitanes lo continúen o completen.

### 2026-09-24 — Programa congregacional
La experiencia administrativa será moderna, pero el programa exportado para la congregación conservará un formato familiar y legible, inicialmente basado en la plantilla actual de Maquehue.
