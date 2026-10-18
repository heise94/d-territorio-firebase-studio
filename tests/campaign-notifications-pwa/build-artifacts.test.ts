import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// Run after npm run build. Inspect the actual deployable output, not source patterns.
test("SW generado precarga sólo dos recursos públicos y cambia en cada build", async () => {
  const source = await readFile("public/sw.js", "utf8");
  const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
  const entries = [...source.matchAll(/\{url:"([^"]+)",revision:"([^"]+)"/g)];
  assert.deepEqual(entries.map((row) => row[1]).sort(), ["/campanas-icon-192.png", "/campanas-offline.html"]);
  assert.equal(entries.find((row) => row[1] === "/campanas-offline.html")?.[2], buildId);
  assert.doesNotMatch(source, /campanas-icon-source\.png/);
});
test("páginas de entrada se generan estáticas; páginas privadas siguen validando sesión en el servidor", async () => {
  const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
  for (const route of ["/unirse", "/campanas/bienvenida", "/campanas/ingresar", "/campanas/registro"])
    assert.ok(manifest.routes[route], `${route} debe generarse antes de servir solicitudes`);
  assert.equal(manifest.routes["/campanas"], undefined);
  assert.equal(manifest.routes["/api/campanas/auth/session"], undefined);
  const html = await readFile(".next/server/app/campanas/bienvenida.html", "utf8");
  assert.doesNotMatch(html, /fonts\.googleapis\.com|pinHash|tokenHash|phoneNormalized/);
  assert.match(html, /Crear mi cuenta/);
});
