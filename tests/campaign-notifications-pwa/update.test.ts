import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = process.cwd();
const read = (path: string) => readFile(`${root}/${path}`, "utf8");

test("la versión de la PWA proviene de una única fuente", async () => {
  const version = await read("src/modules/campaigns/lib/app-version.ts");
  const page = await read("src/app/campanas/page.tsx");
  assert.match(version, /NEXT_PUBLIC_APP_VERSION/);
  assert.match(page, /APP_VERSION_LABEL/);
  assert.doesNotMatch(page, /v1\.0\.3/);
});

test("el actualizador usa modal propio y mensajes humanos", async () => {
  const source = await read("src/modules/campaigns/components/campaign-pwa.tsx");
  assert.match(source, /Nueva versión disponible/);
  assert.match(source, /Actualizar ahora/);
  assert.match(source, /Ahora no/);
  assert.match(source, /registration\.update\(\)/);
  assert.match(source, /SKIP_WAITING/);
  assert.doesNotMatch(source, /window\.confirm|window\.alert/);
});

test("el footer ofrece comprobación manual y fallback de error", async () => {
  const footer = await read("src/modules/campaigns/components/campaign-update-footer.tsx");
  const source = await read("src/modules/campaigns/components/campaign-pwa.tsx");
  assert.match(footer, /Buscar actualización/);
  assert.match(footer, /Buscando actualización…/);
  assert.match(source, /Estás usando la última versión/);
  assert.match(source, /No pudimos buscar actualizaciones/);
});
