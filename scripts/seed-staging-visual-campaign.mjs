#!/usr/bin/env node
/** Idempotent, staging-only visual fixture. Never run against production. */
import { createHmac, createHash, randomInt } from "node:crypto";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const globalModules = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
const firebaseCliAuth = require(join(globalModules, "firebase-tools", "lib", "auth.js"));
const cliConfig = require(join(homedir(), ".config", "configstore", "firebase-tools.json"));

const project = "d-territorio-campanas-staging";
const campaignId = "staging-smoke-f717";
const fixture = "visual-demo-20261015";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
if ([...args].some((arg) => !["--apply", "--confirm-staging"].includes(arg)))
  throw new Error("Unknown argument");
if (!args.has("--confirm-staging")) throw new Error("Explicit staging confirmation required");
if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_PROJECT_ID !== project)
  throw new Error("Firebase environment does not point to staging");
if (project.includes("prod")) throw new Error("Production project rejected");

const root = `projects/${project}/databases/(default)/documents`;
const base = `https://firestore.googleapis.com/v1/${root}`;
let token;
async function accessToken() {
  if (!token) token = (await firebaseCliAuth.getAccessToken(cliConfig.tokens.refresh_token, [])).access_token;
  return token;
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${body.error?.message ?? "API error"}`);
  return body;
}
function decode(value) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decode);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decode(item)]));
  throw new Error("Unknown Firestore value");
}
function encode(value, key = "") {
  if (value === null) return { nullValue: null };
  if ((key === "createdAt" || key === "updatedAt") && typeof value === "string") return { timestampValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map((item) => encode(item)) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([nestedKey, item]) => [nestedKey, encode(item, nestedKey)])) } };
  throw new Error("Unsupported Firestore value");
}
async function list(name) {
  const result = [];
  let pageToken;
  do {
    const url = new URL(`${base}/${name}`);
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await api(url);
    result.push(...(page.documents ?? []).map((doc) => ({ id: doc.name.split("/").at(-1), ...Object.fromEntries(Object.entries(doc.fields ?? {}).map(([key, value]) => [key, decode(value)])) })));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return result;
}
const docName = (collection, id) => `${root}/${collection}/${id}`;
const shaId = (...parts) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const hmacId = (secret, purpose, value) => createHmac("sha256", secret).update(`${purpose}:${value}`).digest("hex");
const now = new Date().toISOString();
const writes = [];
function upsert(collection, id, fields, existing, { allowExisting = false } = {}) {
  const old = existing.get(id);
  if (old && !allowExisting && old.fixtureTag !== fixture) throw new Error(`Unowned ID collision: ${collection}/${id}`);
  const changed = Object.entries(fields).some(([key, value]) => key !== "updatedAt" && !isDeepStrictEqual(old?.[key], value));
  if (!changed) return;
  writes.push({
    update: { name: docName(collection, id), fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encode(value, key)])) },
    updateMask: { fieldPaths: Object.keys(fields) },
    currentDocument: { exists: Boolean(old) },
  });
}
async function secretValue(name) {
  const result = await api(`https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${name}/versions/latest:access`, { method: "GET" });
  return Buffer.from(result.payload.data, "base64").toString("utf8");
}

async function main() {
  const names = ["campaigns", "congregations", "campaignCongregations", "campaignDays", "timeBlocks", "points", "blockPoints", "participants", "campaignParticipantPhones", "campaignRegistrations", "availabilities", "campaignTeams"];
  const data = Object.fromEntries(await Promise.all(names.map(async (name) => [name, new Map((await list(name)).map((row) => [row.id, row]))])));
  const campaign = data.campaigns.get(campaignId);
  if (!campaign || campaign.fixtureTag !== "staging-smoke-f717") throw new Error("Expected staging-owned campaign not found");
  const team = data.campaignTeams.get(campaignId);
  const organizerRegistrationId = team?.primaryRegistrationId;
  const organizerRegistration = data.campaignRegistrations.get(organizerRegistrationId);
  if (!organizerRegistration || organizerRegistration.campaignId !== campaignId || organizerRegistration.registrationStatus !== "active")
    throw new Error("Existing organizer registration is missing");
  const organizer = data.participants.get(organizerRegistration.participantId);
  if (!organizer?.active || !organizer.pinHash) throw new Error("Existing organizer account is unavailable");

  upsert("campaigns", campaignId, {
    name: "Campaña Cementerio Padre Las Casas",
    description: "Jornadas de apoyo en el Cementerio Padre Las Casas.",
    locationName: "Cementerio Padre Las Casas",
    locationDetails: "Padre Las Casas, Región de La Araucanía",
    information: {
      intro: "Consulta aquí los puntos de apoyo y las indicaciones para la jornada.",
      generalMapUrl: "https://maps.google.com/?q=Cementerio+Padre+Las+Casas",
      pickup: { location: "Acceso principal", schedule: "Antes del primer turno", instructions: "Consulta al equipo de campaña al llegar." },
      returnInfo: { location: "Acceso principal", schedule: "Después del último turno", instructions: "Devuelve el exhibidor al equipo de campaña." },
      contacts: [],
      notes: [{ title: "Llega con anticipación", body: "Revisa tu punto y horario antes de comenzar." }],
    },
    defaultCapacityPerBlock: 16,
    maxPointsDefault: 8,
    status: "registration_open",
    updatedAt: now,
  }, data.campaigns, { allowExisting: true });

  const congregationRows = [
    ["staging-smoke-f717-cong-0", "Maquehue"],
    ["staging-smoke-f717-cong-1", "Huichahue"],
    ["visual-demo-pulmahue", "Pulmahue"],
    ["visual-demo-mapudungun", "Mapudungun"],
  ];
  for (const [id, name] of congregationRows) {
    const duplicate = [...data.congregations.values()].find((row) => row.id !== id && row.name?.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    if (duplicate) throw new Error(`Existing congregation named ${name} uses a different ID`);
    upsert("congregations", id, { name, active: true, ...(data.congregations.has(id) ? {} : { fixtureTag: fixture, createdAt: now }), updatedAt: now }, data.congregations, { allowExisting: id.startsWith("staging-smoke-f717") });
    upsert("campaignCongregations", id, { campaignId, congregationId: id, ...(data.campaignCongregations.has(id) ? {} : { fixtureTag: fixture }) }, data.campaignCongregations, { allowExisting: id.startsWith("staging-smoke-f717") });
  }

  const dayDates = ["2026-10-31", "2026-11-01"];
  const blockIds = [];
  for (const [dayIndex, date] of dayDates.entries()) {
    const dayId = `${fixture}-day-${dayIndex + 1}`;
    upsert("campaignDays", dayId, { campaignId, date, label: dayIndex === 0 ? "Sábado 31 de octubre" : "Domingo 1 de noviembre", sortOrder: dayIndex, active: true, fixtureTag: fixture }, data.campaignDays);
    for (let blockIndex = 0; blockIndex < 6; blockIndex++) {
      const hour = 8 + blockIndex * 2;
      const id = `${fixture}-block-${dayIndex + 1}-${blockIndex + 1}`;
      blockIds.push(id);
      upsert("timeBlocks", id, { campaignId, campaignDayId: dayId, startTime: `${String(hour).padStart(2, "0")}:00`, endTime: `${String(hour + 2).padStart(2, "0")}:00`, sortOrder: dayIndex * 6 + blockIndex, active: true, fixtureTag: fixture }, data.timeBlocks);
    }
  }

  const pointIds = [];
  for (let index = 0; index < 8; index++) {
    const id = index < 2 ? `staging-smoke-f717-point-${index}` : `${fixture}-point-${index + 1}`;
    pointIds.push(id);
    upsert("points", id, { campaignId, name: `Punto ${index + 1}`, description: `Punto de apoyo ${index + 1}`, locationText: `Sector ${index + 1}`, minParticipants: 2, maxParticipants: 2, active: true, sortOrder: index, ...(index >= 2 ? { fixtureTag: fixture } : {}) }, data.points, { allowExisting: index < 2 });
  }
  for (const blockId of blockIds) for (const pointId of pointIds) {
    const id = shaId(blockId, pointId);
    upsert("blockPoints", id, { campaignId, timeBlockId: blockId, pointId, active: true, fixtureTag: fixture, updatedAt: now }, data.blockPoints);
  }

  const existingNames = [
    ["P7BMDlDj3H7MqdrGdQTm", "Tomás Navarro"],
    ["Xv9hhcLntZnCw2lKQjbR", "María González"],
    ["sZSM0bExCVpQmvFxKLWe", "Daniel Soto"],
    ["2yZnfo9wJAAPU4xHPWDW", "Camila Muñoz"],
    ["staging-smoke-f717-0-approved", "Felipe Rojas"],
    ["staging-smoke-f717-0-not_approved", "Carolina Pérez"],
    ["staging-smoke-f717-0-pending", "Matías Silva"],
    ["staging-smoke-f717-1-approved", "Fernanda Díaz"],
    ["staging-smoke-f717-1-not_approved", "Andrés Contreras"],
    ["staging-smoke-f717-1-pending", "Daniela Sepúlveda"],
  ];
  for (const [id, fullName] of existingNames) {
    if (!data.participants.has(id)) throw new Error(`Expected staging participant ${id} missing`);
    upsert("participants", id, { fullName, updatedAt: now }, data.participants, { allowExisting: true });
  }

  const newNames = ["Pablo Martínez", "Catalina Flores", "Sebastián Torres", "Natalia Morales", "Diego Fuentes", "Valentina Herrera", "Nicolás Reyes", "Francisca Salazar"];
  const secret = apply ? await secretValue("CAMPAIGNS_AUTH_SECRET") : null;
  const demoRegistrationIds = existingNames.map(([id]) => {
    const row = [...data.campaignRegistrations.values()].find((item) => item.campaignId === campaignId && item.participantId === id);
    if (!row) throw new Error(`Expected registration for ${id} missing`);
    return row.id;
  });
  for (const [index, fullName] of newNames.entries()) {
    const id = `${fixture}-participant-${index + 1}`;
    const phone = `+5694001${String(index + 1).padStart(4, "0")}`;
    const congregationId = congregationRows[index % congregationRows.length][0];
    const existing = data.participants.get(id);
    if (existing && (existing.phoneNormalized !== phone || existing.fixtureTag !== fixture)) throw new Error(`Participant ID collision: ${id}`);
    const phoneOwner = [...data.participants.values()].find((row) => row.phoneNormalized === phone && row.id !== id);
    if (phoneOwner) throw new Error(`Phone collision for demo participant ${index + 1}`);
    const pinHash = existing?.pinHash ?? (apply ? await bcrypt.hash(createHmac("sha256", secret).update(`pin:${String(randomInt(100000, 1000000))}`).digest("hex"), 12) : "DRY_RUN_HASH");
    upsert("participants", id, { id, fullName, phoneNormalized: phone, congregationId, pinHash, sessionVersion: 0, active: true, fixtureTag: fixture, ...(existing ? {} : { createdAt: now }), updatedAt: now }, data.participants);
    if (apply) {
      const phoneIndexId = hmacId(secret, "phone", phone);
      const phoneIndex = data.campaignParticipantPhones.get(phoneIndexId);
      if (phoneIndex && phoneIndex.participantId !== id) throw new Error(`Phone index collision for demo participant ${index + 1}`);
      upsert("campaignParticipantPhones", phoneIndexId, { participantId: id, fixtureTag: fixture }, data.campaignParticipantPhones);
    }
    const regId = shaId(campaignId, id);
    demoRegistrationIds.push(regId);
    upsert("campaignRegistrations", regId, { id: regId, campaignId, participantId: id, congregationId, maxTurns: 2, registrationStatus: "active", fixtureTag: fixture, ...(data.campaignRegistrations.has(regId) ? {} : { createdAt: now }), updatedAt: now }, data.campaignRegistrations);
  }
  // Deliberate coverage examples: 16, 15, 14, 13, 12, 8, 7, 4 and varied others.
  const desiredCounts = [16, 15, 14, 13, 12, 8, 7, 4, 18, 10, 6, 16];
  for (const [blockIndex, blockId] of blockIds.entries()) {
    for (const [index, regId] of demoRegistrationIds.entries()) {
      if (index >= desiredCounts[blockIndex]) continue;
      const id = shaId(regId, blockId);
      upsert("availabilities", id, { campaignId, registrationId: regId, timeBlockId: blockId, available: true, fixtureTag: fixture, ...(data.availabilities.has(id) ? {} : { createdAt: now }), updatedAt: now }, data.availabilities);
    }
  }

  console.log(JSON.stringify({ project, apply, campaignId, existingOrganizerPreserved: true, days: 2, blocks: blockIds.length, points: pointIds.length, blockPoints: blockIds.length * pointIds.length, participantsDemo: demoRegistrationIds.length, desiredCounts, writes: writes.length }));
  if (!apply) return;
  for (let index = 0; index < writes.length; index += 400) await api(`https://firestore.googleapis.com/v1/${root}:commit`, { method: "POST", body: JSON.stringify({ writes: writes.slice(index, index + 400) }) });
  console.log("STAGING_SEED_APPLIED");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
