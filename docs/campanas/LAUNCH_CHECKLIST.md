# F11 — Checklist de lanzamiento humano

Estado: **NO-GO DEPLOY PRODUCTIVO / NO-GO LANZAMIENTO GENERAL**.
Cada casilla necesita responsable, fecha y evidencia real. Un test local no sustituye QA HTTPS/dispositivo.

## Antes de abrir inscripciones

- [ ] Proyectos staging/producción distintos, confirmados y acceso legítimo.
- [ ] HTTPS, certificado, HTTP→HTTPS y host Campañas correctos.
- [ ] Organizador activo con claim actual; segundo organizador probado.
- [ ] Campaña real revisada, inicialmente `draft`; autorización humana para abrir.
- [ ] Fechas reales revisadas.
- [ ] Bloques y zona horaria revisados.
- [ ] Cuatro congregaciones reales; ningún participante demo importado.
- [ ] Rules probadas en staging y copia de Rules productivas anterior guardada.
- [ ] Índices comprobados con flujos HTTPS; sin índices especulativos.
- [ ] Teléfono+PIN, cookie Secure/HttpOnly, sesión/logout y CSRF HTTPS comprobados.
- [ ] Android físico: instalación, standalone, persistencia, availability, programa, Avisos, offline, update SW, logout.
- [ ] iOS físico si disponible: Safari, instalación, standalone, sesión y navegación.
- [ ] FCM real subscribe/background/click/change/logout/unsubscribe, o decisión humana escrita de usar Avisos sin push.
- [ ] Backup privado verificado y restore de prueba en staging documentado.
- [ ] Monitoring, 429/5xx, alertas y responsable de soporte configurados.
- [ ] Rollback código/Rules ensayado y último rollout estable identificado.
- [ ] Auth conserva **160 registros / 240 logins / 15 minutos**; límites individuales intactos.
- [ ] Smoke HTTPS completo y carreras con dos organizadores PASS.
- [ ] Auditoría runtime HIGH/CRITICAL bloqueante resuelta y build/typecheck verdes.
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
- [ ] Impresión nativa Mac horizontal, varias páginas, nombres largos, blanco/negro: **PENDIENTE F7**.
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

- Android: **PENDING EXTERNAL — BLOCKS GENERAL LAUNCH**.
- iOS y FCM real: **PENDING EXTERNAL**.
- Tres perfiles humanos: **PENDING EXTERNAL**.
- Impresión nativa F7: **PENDIENTE**; Issue #8 abierta.
- F10-M01 reordenación manual de puntos: MEDIUM/F12, no implementado en F11.
- Presentación de warnings: LOW/F12, no implementado en F11.
- Issues #8/#11/#12 permanecen abiertas hasta revisión humana correspondiente.
