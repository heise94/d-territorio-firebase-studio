# F11 — Checklist de lanzamiento humano

Estado vigente F11F: **F11 TÉCNICA APROBADA / NO-GO LANZAMIENTO GENERAL**.
Producción ya desplegada, vacía y estable; no autoriza apertura real.
Cada casilla necesita responsable, fecha y evidencia real. Un test local no sustituye QA HTTPS/dispositivo.

Evidencia técnica: F11C/F11D/F11E; readback de preparación F11F 2026-10-10.
Detalle: `PHASE_11F_HUMAN_PILOT.md`. QA Android físico en curso: instalación y
persistencia de sesión PASS reportados por usuario; no acredita el flujo completo.

## Antes de abrir inscripciones

- [x] Proyectos staging/producción distintos, confirmados y acceso legítimo (F11C/F11F).
- [x] HTTPS, certificado, HTTP→HTTPS y host Campañas correctos (F11D/F11E; health F11F 200).
- [x] Organizadores ficticios staging activos con claim actual; dos probados (F11F).
- [ ] Organizador de campaña real y responsable operativo confirmados antes de apertura.
- [ ] Campaña real revisada, inicialmente `draft`; autorización humana para abrir.
- [ ] Fechas reales revisadas.
- [ ] Bloques y zona horaria revisados.
- [ ] Cuatro congregaciones reales; ningún participante demo importado.
- [x] Rules probadas en staging y copia de Rules productivas anterior guardada (F11C/F11E).
- [x] Índices comprobados con flujos HTTPS; sin índices especulativos (F11C).
- [x] Teléfono+PIN, cookie Secure/HttpOnly, sesión/logout y CSRF HTTPS comprobados (F11E Mac).
- [ ] Android físico: instalación, standalone, persistencia, availability, programa, Avisos, offline, update SW, logout.
- [ ] iOS físico si disponible: Safari, instalación, standalone, sesión y navegación.
- [x] FCM real subscribe/background/click/logout/unsubscribe en Mac (F11D/F11E); NO acredita móviles.
- [ ] Push/fallback usable comprobado durante piloto físico Android/iOS y cambios de programa.
- [x] Backup privado verificado y restore de prueba en staging documentado (F11C; backups activos F11F).
- [x] Monitoring 429/5xx y alertas configurados (4 métricas/4 políticas por entorno, F11F).
- [ ] Responsable de soporte y ventanas operativas confirmados para apertura real.
- [ ] Rollback código/Rules ensayado y último rollout estable identificado.
- [x] Auth conserva **160 registros / 240 logins / 15 minutos**; límites individuales intactos (F10/F11E, sin cambios F11F).
- [x] Smoke HTTPS completo y carreras con dos organizadores PASS (F11C; contexto nuevo F11F 200).
- [x] Auditoría runtime HIGH/CRITICAL bloqueante resuelta y build/typecheck verdes (baseline F11E).
- [ ] Piloto humano con tres perfiles: tecnológico, básico y adulto mayor/WhatsApp.

## Antes de publicar programa

- [ ] Blockers = 0.
- [ ] Vínculos accepted correctos; nunca rotos automáticamente.
- [ ] Duplicados = 0 y slots válidos.
- [ ] Cobertura revisada.
- [ ] Puntos finales revisados.
- [ ] Horarios y zona horaria finales revisados.
- [ ] Programa general revisado visualmente.
- [ ] PDF de versión actual y PDF histórico reproducibles desde sus snapshots.
- [x] Impresión nativa Mac horizontal, varias páginas, nombres largos, blanco/negro: **PASS F11E**; Issue #8 CLOSED tras revisión humana.
- [ ] Notifications preparadas y fallback Avisos probado.
- [ ] Responsable autoriza publicación explícitamente.

## Apertura gradual y seguimiento

A: staging sintético → B: organizadores internos → C: grupo pequeño real voluntario
→ D: corregir bugs → E: cuatro congregaciones. No saltar A→E.
Durante 24–48 h observar conteos agregados de altas, 429, 5xx, sesiones fallidas,
baja cobertura, push failures y solicitudes de cambio; recoger problemas de soporte
sin información sensible adicional. Definir responsable, ventanas de revisión y
criterio de pausar apertura antes de iniciar C. No abrir automáticamente desde scripts.

## Pendientes externos

- Android: **EN CURSO — BLOCKS GENERAL LAUNCH** hasta completar flujo crítico.
  Xiaomi 21081111RG/Android 14: instalación y persistencia confirmadas por usuario.
- iOS físico: NOT EXECUTED, fuera de esta continuación a petición del usuario.
  Push Android aún pendiente. FCM/display/click Mac ya PASS; no extrapolar.
- Tres perfiles humanos: **PENDING EXTERNAL**.
- Impresión nativa F7: **PASS**; Issue #8 cerrada (verificado F11F).
- F10-M01 reordenación manual de puntos: MEDIUM/F12, no implementado en F11.
- Presentación de warnings: LOW/F12, no implementado en F11.
- Issues #11/#12 permanecen abiertas hasta revisión humana correspondiente; sin cierre automático.
- Piloto F11F staging preparado con tres identidades ficticias; eventos físicos/humanos, análisis y cleanup pendientes.
