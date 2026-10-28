import assert from "node:assert/strict";
import test from "node:test";
import type { PlannerView } from "../../src/modules/campaigns/domain/planner";
import { organizationPlannerCandidates } from "../../src/modules/campaigns/lib/organization-planner";

const view = {
  available: [{ registrationId: "a", fullName: "María Gómez", available: true }],
  exceptions: [{ registrationId: "b", fullName: "Mario Pérez", available: false }, { registrationId: "c", fullName: "Elena Ruiz", available: false }],
} as PlannerView;

test("Las sugerencias buscan por nombre con o sin tildes y conservan disponibilidad", () => {
  assert.deepEqual(organizationPlannerCandidates(view, "").map((p) => p.registrationId), []);
  assert.deepEqual(organizationPlannerCandidates(view, "m").map((p) => p.registrationId), []);
  assert.deepEqual(organizationPlannerCandidates(view, "mari").map((p) => p.registrationId), ["a", "b"]);
  assert.deepEqual(organizationPlannerCandidates(view, "gomez").map((p) => p.registrationId), ["a"]);
  assert.equal(organizationPlannerCandidates(view, "perez")[0].available, false);
  assert.deepEqual(organizationPlannerCandidates(null, "maria"), []);
});
