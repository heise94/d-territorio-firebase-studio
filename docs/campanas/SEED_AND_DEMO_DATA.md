# D-Territorio Campañas — Datos Demo y Seed

## 1. Objetivo
Proporcionar un conjunto de datos consistente para desarrollo, pruebas manuales, demostraciones y pruebas automatizadas.

Los datos demo nunca deben mezclarse con producción.

## 2. Campaña demo
Nombre: `Campaña Cementerio PLC — DEMO`

Ubicación: Cementerio Padre Las Casas

Estado inicial sugerido: `planning`

Fechas demo:
- Día 1: 30 de octubre
- Día 2: 1 de noviembre

> Las fechas exactas del seed pueden ajustarse al año de desarrollo; no deben quedar como lógica fija del producto.

## 3. Congregaciones demo
Crear cuatro congregaciones:
- Maquehue
- Pulmahue
- Huichahue
- Mapudungun

## 4. Bloques demo
Por cada día usar inicialmente:
- 08:00–10:00
- 10:00–12:00
- 12:00–14:00
- 14:00–16:00
- 16:00–18:00
- 18:00–20:00

La finalidad es validar que los bloques son datos configurables y no constantes del código.

## 5. Puntos demo
Crear 8 puntos:
- Punto 1 — Entrada principal
- Punto 2 — Acceso norte
- Punto 3 — Acceso sur
- Punto 4 — Sector estacionamientos
- Punto 5 — Esquina principal
- Punto 6 — Acceso lateral
- Punto 7 — Sector exterior A
- Punto 8 — Sector exterior B

Los nombres son demostrativos. La implementación debe permitir renombrarlos, desactivarlos y variar cantidad por bloque.

## 6. Participantes demo
Crear al menos 32 participantes ficticios distribuidos entre las cuatro congregaciones.

Usar nombres claramente ficticios o genéricos. Ejemplo:
- Andrés Demo 01
- Beatriz Demo 02
- Carlos Demo 03
- Daniela Demo 04

No usar datos reales de hermanos en seeds versionados.

Cada participante debe tener:
- id estable;
- nombre ficticio;
- teléfono ficticio no enrutable;
- congregación;
- PIN de prueba generado mediante el mismo flujo seguro de la app;
- registro activo en la campaña.

## 7. Escenarios de disponibilidad
El seed debe incluir variedad deliberada:

### Bloque con necesidad alta
Ejemplo: 6 disponibles de 16.

### Bloque medio
Ejemplo: 10 disponibles de 16.

### Bloque casi completo
Ejemplo: 14 o 15 disponibles de 16.

### Bloque completo
16 disponibles de 16.

### Bloque con reserva
20 disponibles para capacidad 16.

Esto permite validar colores, mensajes y cálculos de cobertura.

## 8. Máximo de turnos
Distribuir participantes con:
- máximo 1;
- máximo 2;
- máximo 3;
- sin límite específico.

Crear al menos un participante que ya esté en su máximo y otro cuya próxima asignación lo excedería.

## 9. Parejas obligatorias demo
Crear escenarios:

1. `pending`: A solicita a B y B aún no responde.
2. `accepted`: C y D deben trabajar juntos.
3. `rejected`: E solicitó a F y fue rechazado.
4. conflicto: G y H tienen vínculo aceptado pero actualmente no comparten disponibilidad.

## 10. Asignaciones demo
Crear asignaciones suficientes para probar:
- punto completo con 2 participantes;
- punto incompleto con 1 participante;
- varios puntos llenos;
- participante con varios turnos;
- pareja obligatoria correctamente asignada junta;
- una situación no publicable en un seed especial de pruebas.

No incluir conflictos en el seed normal que impidan usar la demo, salvo que exista un modo/fixture específico `invalid-state`.

## 11. Reservas demo
En al menos un bloque completo deben existir 3–4 participantes disponibles no asignados para mostrar reserva potencial.

## 12. Solicitudes de cambio demo
Crear:
- 1 pendiente;
- 1 aprobada/resuelta;
- 1 rechazada.

## 13. Notificaciones demo
Crear ejemplos de:
- solicitud para participar juntos;
- solicitud aceptada;
- programa publicado;
- cambio de asignación;
- solicitud de cambio resuelta;
- recordatorio.

Incluir algunas leídas y otras no leídas.

## 14. Usuarios administrativos demo
Crear perfiles de desarrollo:
- `super_admin_demo`
- `campaign_admin_demo`
- `coordinator_maquehue_demo`
- `coordinator_pulmahue_demo`

No versionar secretos reales.

## 15. Volumen de stress demo
Debe existir un script o modo para generar:
- 150 participantes;
- 4 congregaciones;
- 3 días;
- 8 bloques por día;
- 8 puntos;
- disponibilidades aleatorias reproducibles;
- algunas parejas obligatorias;
- asignaciones parciales.

Usar seed determinista cuando sea posible para que los tests sean repetibles.

## 16. Reglas del seed
- Nunca usar datos reales.
- Nunca usar números de teléfono reales.
- Nunca almacenar PIN en texto plano aunque sea demo si el flujo normal usa hash.
- Debe poder borrarse y recrearse fácilmente.
- No ejecutar seed sobre producción por defecto.
- El entorno debe exigir una confirmación explícita o variable de entorno para cualquier seed destructivo.

## 17. Fixtures sugeridos
Separar escenarios reutilizables:
- `empty-campaign`
- `registration-open`
- `planning-partial`
- `planning-full`
- `published`
- `pair-conflict`
- `concurrency-case`
- `stress-150`

Esto facilitará pruebas de interfaz y E2E.