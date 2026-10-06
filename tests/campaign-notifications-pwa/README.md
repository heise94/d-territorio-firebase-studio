# F9 — pruebas y app QA aislada

Suite: `npm run test:campaign-notifications-pwa`, con Auth/Firestore Emulator.
Usa datos ficticios; fixture rechaza hosts/proyectos productivos. No ejecutar a la
vez que suites F2–F8: las fixtures reinician el mismo proyecto demo.

La app `pwa-preview` importa configuración next-pwa y componentes reales. Sirve
para generar/verificar el worker pese a los imports históricos de Territorios que
bloquean el build general. No es app de producción, no tiene guard visual de
autenticación y las APIs que consume mantienen su seguridad real.
No usa ignoreBuildErrors ni stubs que escondan errores del build oficial.

Preparación (desde raíz, después de npm ci; comandos macOS/Linux):

```sh
mkdir -p tests/campaign-notifications-pwa/pwa-preview/public
cp public/campanas-icon-192.png public/campanas-icon-512.png public/campanas-icon-maskable.png public/campanas.webmanifest public/campanas-offline.html tests/campaign-notifications-pwa/pwa-preview/public/
ln -s ../../../worker tests/campaign-notifications-pwa/pwa-preview/worker
```

Si el symlink ya existe, conservarlo. Desde `pwa-preview`:

```sh
../../../node_modules/.bin/next build
../../../node_modules/.bin/next start --port 3101
```

El Next dev oficial corre en 3000 con emuladores y
CAMPAIGNS_APP_ORIGIN=http://localhost:3101. APIs se reescriben al servidor oficial;
los secretos de fixture/demo se usan solo en ese proceso local, nunca en bundles.
No configurar VAPID ficticia. La app muestra estado no configurado sin credenciales.

Verificar SW generado con worker custom importado, iconos/fallback precacheados,
NetworkOnly privado antes de cachés genéricas y skipWaiting solo bajo mensaje.
Visitar primero online; detener **solo** el preview y navegar a Mi programa:
debe mostrar offline sin programa anterior. Una navegación directa a API privada
puede recibir el fallback HTML público, nunca un DTO privado cacheado; un fetch de
la API falla y no se interpreta como éxito. Reiniciar preview recupera navegación.
No sustituir `public/sw.js` del repositorio con el worker generado por esta fixture
(sus hashes/chunks pertenecen exclusivamente a la app QA).

Entrega FCM real, instalación standalone/OS e iOS físico requieren entorno/dispositivo
adecuados. El adapter prueba multidevice, retry, tokens inválidos y privacidad;
no prueba una entrega real. Ver evidencia/pendientes en PHASE_9_PWA_NOTIFICATIONS.md.
