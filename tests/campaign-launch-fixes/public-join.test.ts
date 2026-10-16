import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  joinShareUrl,
  selectPublicJoinCampaign,
} from "../../src/modules/campaigns/lib/public-join";

test("public join handles no open campaign and does not expose a draft", () => {
  assert.deepEqual(selectPublicJoinCampaign([]), { kind: "none" });
  assert.deepEqual(
    selectPublicJoinCampaign([{ status: "draft", name: "Borrador" }]),
    { kind: "none" },
  );
});

test("public join reveals only the name and location of one open campaign", () => {
  const state = selectPublicJoinCampaign([
    {
      status: "registration_open",
      name: "  Campaña especial  ",
      locationName: "  Cementerio municipal  ",
      id: "private-id",
      createdBy: "private-uid",
    } as Parameters<typeof selectPublicJoinCampaign>[0][number],
  ]);
  assert.deepEqual(state, {
    kind: "single",
    campaign: { name: "Campaña especial", locationName: "Cementerio municipal" },
  });
  assert.ok(!JSON.stringify(state).includes("private"));
});

test("public join does not arbitrarily choose among multiple open campaigns", () => {
  assert.deepEqual(
    selectPublicJoinCampaign([
      { status: "registration_open", name: "Primera" },
      { status: "registration_open", name: "Segunda" },
    ]),
    { kind: "multiple" },
  );
});

test("join link is canonical in production and stays in staging during review", () => {
  assert.equal(
    joinShareUrl("https://campanas.d-territorio.cl"),
    "https://campanas.d-territorio.cl/unirse",
  );
  assert.equal(
    joinShareUrl("https://campanas-production--d-territorio-campanas-prod.us-central1.hosted.app"),
    "https://campanas.d-territorio.cl/unirse",
  );
  assert.equal(
    joinShareUrl("https://campanas-staging--d-territorio-campanas-staging.us-central1.hosted.app"),
    "https://campanas-staging--d-territorio-campanas-staging.us-central1.hosted.app/unirse",
  );
  assert.equal(
    joinShareUrl("https://campanas-staging--d-territorio-campanas-staging.us-central1.hosted.app", "campaign-public-42"),
    "https://campanas-staging--d-territorio-campanas-staging.us-central1.hosted.app/unirse?campana=campaign-public-42",
  );
  assert.equal(
    joinShareUrl("https://campanas.d-territorio.cl", "campaign-public-42"),
    "https://campanas.d-territorio.cl/unirse?campana=campaign-public-42",
  );
});

test("Organización usa el enlace público de la campaña y ofrece compartir o copiar", async () => {
  const source = await readFile("src/modules/campaigns/components/organization-pwa.tsx", "utf8");
  assert.match(source, /joinShareUrl\(window\.location\.origin,campaignId\)/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /Enlace copiado/);
  assert.ok(!source.includes("Authorization:"));
});

test("public invite installs the existing campaign PWA without altering its manifest", async () => {
  const [invite, campaign] = await Promise.all([
    readFile("public/unirse.webmanifest", "utf8").then(JSON.parse),
    readFile("public/campanas.webmanifest", "utf8").then(JSON.parse),
  ]);
  assert.equal(invite.id, campaign.id);
  assert.equal(invite.start_url, campaign.start_url);
  assert.equal(invite.scope, "/");
  assert.equal(campaign.scope, "/campanas");
  assert.equal(invite.name, "Campaña exhibidores");
  assert.equal(campaign.name, "Campaña exhibidores");
  assert.equal(invite.short_name, "Exhibidores");
  assert.equal(campaign.short_name, "Exhibidores");
});
