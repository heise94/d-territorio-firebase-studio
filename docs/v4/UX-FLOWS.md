# D-TERRITORIO 4.0 — UX Flows

**Documento:** UX-FLOWS.md  
**Versión:** 0.1  
**Fecha:** 24-09-2026

---

# 1. Objetivo

Definir cómo los usuarios realizan las tareas principales del sistema.

Principios:

- pocos pasos;
- decisiones visibles;
- prevenir errores;
- preservar historial;
- no pedir información dos veces;
- automatizar documentos a partir del uso normal.

---

# 2. Flujo: onboarding de congregación

1. Crear tenant.
2. Definir nombre.
3. País/zona horaria.
4. Cantidad de grupos.
5. Configurar horarios habituales.
6. Configurar días Congregación / Grupos.
7. Crear primeros capitanes.
8. Crear casas.
9. Importar territorios.
10. Revisar mapa.
11. Confirmar configuración.

Resultado:
tenant listo para planificar.

---

# 3. Flujo: crear horario semanal base

Ajustes → Programa → Horarios.

Por cada slot:

1. elegir día;
2. elegir hora;
3. elegir tipo:
   - casa en casa;
   - rural;
   - Zoom;
4. elegir modo:
   - congregación;
   - grupos;
5. guardar.

El calendario futuro se genera desde esta plantilla.

---

# 4. Flujo: preparar semana

Programa → Semana.

1. seleccionar semana;
2. cargar slots habituales;
3. superponer feriados;
4. superponer excepciones;
5. detectar campañas activas;
6. mostrar borrador;
7. completar asignaciones;
8. validar conflictos;
9. publicar.

Estados de semana:

- borrador;
- incompleta;
- lista;
- publicada.

---

# 5. Flujo: asignación congregacional

Para un slot Congregación:

1. seleccionar capitán;
2. sistema filtra disponibilidad;
3. seleccionar casa;
4. sistema filtra casas disponibles;
5. mostrar territorios cercanos/recomendados;
6. seleccionar territorio;
7. guardar.

Recomendaciones pueden considerar:

- cercanía;
- último completado;
- ciclo abierto;
- bloqueos;
- campaña activa.

La recomendación nunca decide automáticamente.

---

# 6. Flujo: asignación por grupos

Para un slot con mode = groups:

1. cargar todos los grupos activos;
2. crear una fila/card por grupo;
3. asignar territorio por grupo;
4. opcionalmente casa/capitán si la congregación lo usa;
5. validar duplicados/conflictos;
6. guardar.

En Maquehue, sábado debe poder mostrarse como:

G1: 5 / G2: 29
G3: 22 / G4: 31

---

# 7. Flujo: cambiar solo una fecha

Desde el calendario:

1. seleccionar fecha;
2. “Modificar solo esta fecha”;
3. elegir:
   - congregación;
   - grupos;
   - sin predicación;
   - horario especial;
   - otro;
4. confirmar.

No modificar plantilla semanal.

---

# 8. Flujo: feriado

Cuando una fecha es feriado chileno:

1. mostrar badge/alerta;
2. cargar regla configurada;
3. si regla = normal, no intervenir;
4. si regla = horario especial, aplicar;
5. si regla = no programar, bloquear generación normal;
6. si regla = revisar, pedir decisión al administrador.

---

# 9. Flujo: publicar programa

Antes de publicar:

Validar:

- slots incompletos;
- capitán indisponible;
- casa indisponible;
- territorio bloqueado;
- territorio duplicado;
- grupo sin territorio;
- feriado no resuelto.

Si no hay errores críticos:

1. publicar;
2. congelar snapshots;
3. generar vista congregación;
4. permitir PNG/PDF.

---

# 10. Flujo: vista congregación

Programa → Vista congregación.

Mostrar la plantilla tradicional.

Acciones:

- Vista previa;
- Descargar PNG;
- Descargar PDF;
- Imprimir.

No mostrar elementos administrativos.

---

# 11. Flujo: capitán consulta asignación

Capitán inicia sesión.

Inicio:

- próxima salida;
- hora;
- tipo;
- casa;
- dirección;
- territorio;
- mapa;
- observaciones.

Acciones:

- Ver territorio;
- Abrir ubicación;
- Reportar salida.

---

# 12. Flujo: reportar no trabajado

Capitán → Reportar.

Seleccionar:

**No se trabajó el territorio**

Opcional:

- motivo;
- nota.

Resultado:

- registrar resultado;
- NO abrir ciclo;
- NO alterar S-13;
- mantener historial del programa.

---

# 13. Flujo: iniciar territorio

Si territorio no tiene ciclo abierto y se trabajó:

1. capitán reporta parcial o completado;
2. sistema detecta que no existe ciclo;
3. crear TerritoryCycle;
4. startedBy = capitán de esta salida;
5. startedAt = fecha real;
6. crear WorkSession.

Ese startedBy queda fijo para S-13.

---

# 14. Flujo: continuar territorio

Si existe ciclo abierto:

1. mostrar:
   - capitán que inició;
   - fecha de inicio;
   - manzanas pendientes;
2. capitán actual reporta trabajo;
3. crear nueva WorkSession;
4. NO modificar startedBy.

---

# 15. Flujo: reporte parcial

1. seleccionar manzanas trabajadas;
2. mostrar manzanas pendientes;
3. agregar nota opcional;
4. guardar.

Resultado:

- ciclo sigue abierto;
- mapa = en progreso;
- S-13 conserva fecha asignado;
- fecha completado sigue vacía.

---

# 16. Flujo: completar territorio

1. seleccionar “Completado”;
2. confirmar;
3. registrar WorkSession;
4. cerrar TerritoryCycle;
5. completedAt = fecha de esta sesión;
6. completedBy = capitán actual;
7. mantener startedBy original;
8. actualizar lastCompletedAt;
9. mapa vuelve a disponible/recently completed;
10. S-13 se actualiza automáticamente.

---

# 17. Flujo: corregir reporte

Solo roles autorizados.

1. abrir historial;
2. seleccionar sesión/ciclo;
3. editar;
4. mostrar impacto:
   - S-13;
   - mapa;
   - campaña;
5. confirmar;
6. escribir AuditLog.

Cambiar startedBy debe requerir confirmación especial.

---

# 18. Flujo: crear campaña

Campañas → Nueva.

1. nombre;
2. tipo;
3. fechas;
4. color;
5. alcance:
   - todos;
   - seleccionados;
6. guardar.

El color se usa para:

- mapa campaña;
- S-13 gestión;
- badges;
- progreso.

---

# 19. Flujo: operar campaña

Campaña activa → Mapa.

Inicialmente:

- todos pendientes.

A medida que se programa/trabaja:

- pendiente;
- asignado;
- en progreso;
- completado.

Mostrar:

- porcentaje;
- total;
- completados;
- pendientes;
- mapa.

---

# 20. Flujo: S-13 automático

Reportes → S-13.

1. elegir período;
2. sistema carga territorios;
3. obtener ciclos;
4. tomar máximo 4 visibles;
5. buscar completado anterior;
6. construir filas;
7. aplicar campaña si modo gestión;
8. vista previa.

Acciones:

- Estándar;
- Gestión;
- PDF;
- Imprimir.

---

# 21. Flujo: preparar visita del superintendente

Reportes → Preparar visita.

1. seleccionar período/fecha;
2. validar ciclos;
3. generar S-13;
4. detectar inconsistencias;
5. mostrar resumen;
6. descargar PDF.

Futuro:

- programa de la semana;
- resumen de territorios;
- campañas;
- territorios antiguos.

---

# 22. Flujo: territorio desde el mapa

Territorios → Mapa.

Hover:

- código;
- estado;
- días desde completado;
- casas/manzanas.

Click:

abrir panel contextual.

Desde panel:

- Ver detalle;
- Ver historial;
- Asignar;
- Ver ciclo actual;
- Ver campañas;
- Editar.

---

# 23. Flujo: casa

Casas → Nueva/Editar.

Campos:

- familia;
- anfitrión;
- teléfono;
- dirección;
- ubicación;
- disponibilidad;
- excepciones;
- territorios cercanos.

Durante programación, mostrar solo casas compatibles con el slot o advertir excepciones.

---

# 24. Flujo: capitán y vacaciones

Capitanes → Perfil.

1. disponibilidad habitual;
2. Nueva ausencia;
3. rango de fechas;
4. motivo opcional;
5. guardar.

Al preparar programa:

- excluir o advertir según configuración.

---

# 25. Flujo: conflicto

Cuando hay conflicto:

Mostrar mensaje claro:

> Benjamín Pichinao indicó que no estará disponible el 24/09.

Acciones según severidad:

- Cambiar;
- Mantener de todos modos;
- Cancelar.

Los conflictos de seguridad/integridad pueden ser bloqueantes.

---

# 26. Flujo: importar territorios

Territorios → Importar mapa.

1. subir KML/KMZ;
2. convertir;
3. vista previa;
4. detectar polígonos;
5. mapear nombre/código;
6. validar duplicados;
7. confirmar;
8. guardar GeoJSON.

Nunca importar directamente sin preview.

---

# 27. Flujo: cambiar tenant

Futuro multi-congregación:

1. usuario abre selector;
2. muestra solo memberships activas;
3. seleccionar congregación;
4. limpiar estado/cache;
5. cargar tenant nuevo.

Nunca combinar datos de tenants.

---

# 28. Estados vacíos

Todo módulo debe tener un empty state útil.

Ejemplo Territorios:

> Aún no hay territorios. Importa tu mapa o crea el primero.

Nunca mostrar simplemente una pantalla vacía.

---

# 29. Principio de automatización

El usuario debe hacer el trabajo operativo una sola vez.

Ejemplos:

- asignar programa → genera vista congregación;
- reportar territorio → actualiza ciclo;
- cerrar ciclo → actualiza mapa;
- cerrar ciclo → actualiza S-13;
- etiquetar campaña → actualiza progreso y color.

Evitar doble digitación.

---

# 30. Principio de seguridad UX

Antes de acciones destructivas:

- explicar impacto;
- pedir confirmación;
- registrar auditoría.

No usar confirmaciones innecesarias para acciones reversibles.

---

# 31. Flujos pendientes

Definir más adelante:

- recuperación de cuenta;
- invitación de usuario;
- administración SaaS;
- facturación;
- migración Legacy;
- exportación masiva;
- respaldo/restauración;
- funcionamiento móvil.
