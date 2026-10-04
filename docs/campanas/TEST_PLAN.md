# D-Territorio Campañas — Plan de Pruebas V1

## 1. Objetivo
Validar que V1 sea funcional, segura, consistente y usable antes de abrirla a las cuatro congregaciones.

## 2. Niveles de prueba

### 2.1 Unitarias
Priorizar reglas puras:
- cálculo de cobertura;
- capacidad efectiva;
- conteo de turnos;
- validación de máximo de turnos;
- estados de PairRequest;
- validación de pareja obligatoria;
- filtros de disponibles;
- validaciones de publicación.

### 2.2 Integración
Validar:
- Firestore/reglas;
- creación y actualización de inscripciones;
- sesiones;
- transacciones de asignación;
- notificaciones e historial;
- publicación.

### 2.3 End-to-end
Simular flujos reales desde navegador/PWA.

## 3. Flujo crítico completo
Caso obligatorio antes de producción:
1. administrador crea campaña;
2. configura 2 días y varios bloques;
3. abre inscripciones;
4. participante A se registra;
5. participante B se registra;
6. ambos marcan disponibilidad;
7. A solicita participar con B;
8. B acepta;
9. administrador abre planificación;
10. crea puntos;
11. asigna A+B al mismo punto;
12. completa otras parejas manualmente;
13. genera programa borrador;
14. publica;
15. A y B ven sus asignaciones;
16. reciben notificación si está habilitada;
17. A solicita cambio;
18. organizador resuelve;
19. programa e información personal quedan actualizados.

## 4. Pruebas de autenticación
- teléfono inexistente;
- teléfono existente;
- PIN correcto;
- PIN incorrecto;
- múltiples intentos fallidos;
- sesión persistente;
- sesión revocada;
- cambio de dispositivo;
- cierre de sesión;
- participante no accede a rutas admin.

## 5. Pruebas de inscripción
- inscripción completa;
- campos obligatorios vacíos;
- teléfono con distintos formatos chilenos;
- congregación inválida;
- edición mientras inscripciones abiertas;
- edición bloqueada o transformada en solicitud cuando corresponde.

## 6. Disponibilidad y cobertura
- 0 disponibles;
- 1 disponible;
- capacidad parcial;
- 15/16;
- 16/16;
- 17+ disponibles;
- reducción de capacidad;
- aumento de capacidad;
- bloque sin puntos definidos;
- bloque con puntos activos variables.

## 7. Parejas obligatorias
- solicitud creada;
- aceptación;
- rechazo;
- cancelación;
- solicitud duplicada;
- solicitud cruzada;
- sin horario común;
- solo uno asignado;
- ambos asignados en distinto punto: debe fallar validación;
- ambos correctamente asignados juntos.

## 8. Planificador
- disponibles correctos por bloque;
- asignar persona;
- desaparece de disponibles;
- quitar asignación;
- reaparece;
- doble asignación simultánea impedida;
- máximo de turnos advertido;
- excepción confirmada;
- punto lleno;
- punto incompleto;
- cambio de punto;
- dos organizadores trabajando simultáneamente.

## 9. Publicación
- publicar programa válido;
- impedir publicación con conflictos críticos;
- borrador claramente marcado;
- `published_at` registrado;
- participante ve solo programa propio;
- programa general coincide con asignaciones;
- cambio post-publicación actualiza versión/información.

## 10. PWA
Probar al menos:
- Android Chrome;
- iPhone Safari/PWA cuando sea posible;
- navegador móvil sin instalación;
- escritorio Chrome/Edge para compatibilidad básica.

Validar:
- manifest;
- iconos;
- standalone;
- instalación;
- actualización del service worker;
- sesión persistente;
- navegación inferior;
- offline básico.

## 11. Notificaciones
- permiso aceptado;
- permiso rechazado;
- navegador sin soporte;
- solicitud de pareja;
- respuesta;
- programa publicado;
- asignación modificada;
- solicitud de cambio resuelta;
- recordatorio;
- push fallido pero historial interno disponible.

## 12. Seguridad y autorización
Casos obligatorios:
- participante intenta leer otro participant_id;
- participante intenta modificar asignación directamente;
- participante intenta acceder a colección/admin route;
- coordinador sin permiso intenta cambiar configuración global;
- payload manipulado desde cliente;
- PIN nunca aparece en consultas o logs en texto plano.

## 13. Rendimiento
Con datos demo ampliados:
- 4 congregaciones;
- 150 participantes;
- 2–3 días;
- 8 puntos;
- 8 bloques por día;
- muchas disponibilidades.

Objetivo: navegación y filtros deben sentirse inmediatos en condiciones normales de red.

## 14. Accesibilidad/usabilidad
Realizar prueba manual con enfoque en usuario mayor:
- tamaño de texto;
- botones táctiles;
- contraste;
- comprensión de 'Disponible' vs 'Asignado';
- proceso de ingreso;
- instalación PWA;
- solicitud pendiente destacada.

Idealmente hacer piloto con 3 perfiles:
- usuario habituado a tecnología;
- usuario de uso básico de smartphone;
- adulto mayor que usa principalmente WhatsApp.

## 15. Impresión/PDF
- 4 puntos;
- 8 puntos;
- nombres largos;
- varios bloques;
- más de una página;
- impresión color;
- impresión blanco y negro;
- orientación horizontal.

## 16. Regresión
Antes de cada publicación importante volver a probar al menos:
- acceso;
- disponibilidad;
- pair request;
- asignación/desasignación;
- publicación;
- programa personal;
- programa general;
- permisos.

## 17. Severidad de errores
### Bloqueante
- pérdida/corrupción de asignaciones;
- acceso a datos ajenos;
- duplicación de persona en mismo bloque;
- publicación incorrecta;
- pareja obligatoria publicada separada.

### Alta
- disponibilidad incorrecta;
- notificaciones críticas con datos erróneos;
- sesión inutilizable;
- PDF/programa con asignaciones incorrectas.

### Media
- errores visuales que no alteran datos;
- instalación PWA poco clara;
- filtros secundarios.

### Baja
- detalles cosméticos.

## 18. Criterio de salida a producción
No deben existir errores bloqueantes ni altos abiertos relacionados con el flujo principal. Los criterios de `ACCEPTANCE_CRITERIA.md` deben estar cumplidos y el flujo E2E crítico debe aprobarse al menos una vez en móvil real.