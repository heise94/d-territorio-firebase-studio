import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignInformationSchema,
  pointSchema,
} from "../src/modules/campaigns/schemas/campaign-schemas";
import { cleanFirestorePayload } from "../src/modules/campaigns/lib/firestore-payload";
import { deleteField, Timestamp } from "firebase/firestore";

test("Información permite enlaces opcionales vacíos, incluso espacios", () => {
  const value = campaignInformationSchema.parse({
    generalMapUrl: "",
    pickup: { mapUrl: "  " },
    returnInfo: { mapUrl: "" },
  });
  assert.equal(value.generalMapUrl, undefined);
  assert.equal(value.pickup?.mapUrl, undefined);
  assert.equal(value.returnInfo?.mapUrl, undefined);
});
test("Punto permite mapUrl vacío sin perder valores false", () => {
  const value = pointSchema.parse({
    name: "Punto ficticio",
    mapUrl: "",
    active: false,
  });
  assert.equal(value.mapUrl, undefined);
  assert.equal(value.active, false);
});
test("Enlaces válidos HTTPS se conservan; HTTP y texto inválido se rechazan", () => {
  assert.equal(
    pointSchema.parse({
      name: "Punto",
      mapUrl: "https://maps.google.com/?q=Temuco",
    }).mapUrl,
    "https://maps.google.com/?q=Temuco",
  );
  for (const mapUrl of [
    "http://example.test",
    "no-es-url",
    "javascript:alert(1)",
  ]) {
    assert.equal(
      pointSchema.safeParse({ name: "Punto", mapUrl }).success,
      false,
    );
  }
});
test("Guardar contactos preserva permisos independientes de llamada y WhatsApp", () => {
  const value = campaignInformationSchema.parse({
    contacts: [
      {
        name: "Ficticio",
        phone: "+56940009999",
        allowCall: false,
        allowWhatsApp: true,
      },
    ],
  });
  assert.ok(value.contacts);
  assert.equal(value.contacts[0].allowCall, false);
  assert.equal(value.contacts[0].allowWhatsApp, true);
});
test("Payload elimina undefined anidado y conserva 0, false, null y sentinels", () => {
  const timestamp = Timestamp.now();
  const deleted = deleteField();
  const payload = cleanFirestorePayload({
    zero: 0,
    disabled: false,
    empty: "",
    nullable: null,
    timestamp,
    deleted,
    pickup: { location: "Bodega", mapUrl: undefined },
    contacts: [{ name: "Ficticio", role: undefined, allowCall: false }],
  });
  assert.deepEqual(payload.pickup, { location: "Bodega" });
  assert.deepEqual(payload.contacts, [{ name: "Ficticio", allowCall: false }]);
  assert.equal(payload.zero, 0);
  assert.equal(payload.disabled, false);
  assert.equal(payload.empty, "");
  assert.equal(payload.nullable, null);
  assert.equal(payload.timestamp, timestamp);
  assert.equal(payload.deleted, deleted);
});
