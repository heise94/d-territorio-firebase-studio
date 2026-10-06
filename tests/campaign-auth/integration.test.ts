import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { NextRequest } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { ParticipantAuthService } from '../../src/modules/campaigns/server/auth/service';
import { tokenHash } from '../../src/modules/campaigns/server/auth/crypto';

// Never fall back to production if the emulator is missing.
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run using firebase emulators:exec (see PHASE_2_AUTH.md)');
const projectId = 'demo-campaign-auth';
const app = initializeApp({ projectId }, 'campaign-auth-tests');
const db = getFirestore(app);
let now = Date.now();
const secret = 'integration-test-only-secret-not-production';
const auth = new ParticipantAuthService(db, secret, () => now);
let environment: RulesTestEnvironment;
const registration = (phone: string, extras = {}) => ({ fullName: 'Participante de prueba', phone, pin: '1234', confirmPin: '1234', ...extras });

before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  environment = await initializeTestEnvironment({ projectId, firestore: {
    host, port: Number(port), rules: await readFile('firestore.rules', 'utf8'),
  } });
  await environment.clearFirestore();
});
after(async () => {
  await environment?.cleanup(); await db.terminate(); await deleteApp(app);
  const serverApp = getApps().find((candidate) => candidate.name === 'campaigns-server');
  if (serverApp) { await getFirestore(serverApp).terminate(); await deleteApp(serverApp); }
});

test('Registro atómico, unicidad concurrente, hash/DTO y congregación activa', async () => {
  await db.collection('congregations').doc('active-congregation').set({ name: 'Activa', active: true });
  await db.collection('congregations').doc('inactive-congregation').set({ name: 'Inactiva', active: false });
  assert.deepEqual(await auth.congregations(), [{ id: 'active-congregation', name: 'Activa' }]);
  await assert.rejects(auth.register(registration('912345670', { congregationId: 'inactive-congregation' })));
  await assert.rejects(auth.register(registration('912345671', { congregationId: 'arbitrary' })));
  const results = await Promise.allSettled([
    auth.register(registration('912345678', { congregationId: 'active-congregation' })),
    auth.register(registration('+56 9 1234 5678', { congregationId: 'active-congregation' })),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const successful = results.find((result) => result.status === 'fulfilled');
  assert.ok(successful?.status === 'fulfilled');
  const { token, participant } = successful.value;
  assert.notEqual(participant.id, '+56912345678');
  assert.ok(!JSON.stringify(participant).includes('Hash'));
  const stored = (await db.collection('participants').doc(participant.id).get()).data()!;
  assert.match(stored.pinHash, /^\$2[aby]\$12\$/);
  assert.notEqual(stored.pinHash, '1234');
  assert.equal(stored.phoneNormalized, '+56912345678');
  const session = (await db.collection('deviceSessions').doc(tokenHash(token)).get()).data()!;
  assert.equal(session.tokenHash, tokenHash(token));
  assert.ok(!JSON.stringify(session).includes(token));
  assert.deepEqual((await auth.current(token))?.participant, participant);
});

test('Login correcto, incorrecto, inexistente, inactivo y protección distribuida', async () => {
  const created = await auth.register(registration('912345679'));
  const logged = await auth.login({ phone: '912345679', pin: '1234' });
  assert.equal(logged.participant.id, created.participant.id);
  await assert.rejects(auth.login({ phone: '912345679', pin: '1235' }), /No pudimos iniciar sesión/);
  await assert.rejects(auth.login({ phone: '999999999', pin: '1235' }), /No pudimos iniciar sesión/);
  await db.collection('participants').doc(created.participant.id).update({ active: false });
  await assert.rejects(auth.login({ phone: '912345679', pin: '1234' }), /No pudimos iniciar sesión/);
  assert.equal(await auth.current(logged.token), null);
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(auth.login({ phone: '912345679', pin: '1235' }));
  await assert.rejects(auth.login({ phone: '912345679', pin: '1234' }), /varios intentos/);
  const otherInstance = new ParticipantAuthService(db, secret, () => now);
  await assert.rejects(otherInstance.login({ phone: '912345679', pin: '1234' }), /varios intentos/);
  now += 16 * 60_000;
  await db.collection('participants').doc(created.participant.id).update({ active: true });
  assert.equal((await auth.login({ phone: '912345679', pin: '1234' })).participant.id, created.participant.id);
});

test('Persistencia, renovación limitada, expiración, logout y revocación total', async () => {
  const first = await auth.register(registration('912345680'));
  const second = await auth.login({ phone: '912345680', pin: '1234' });
  assert.ok(await auth.current(first.token));
  const sessionRef = db.collection('deviceSessions').doc(tokenHash(first.token));
  const originalLastSeen = (await sessionRef.get()).data()!.lastSeenAt.toMillis();
  await auth.current(first.token, true);
  assert.equal((await sessionRef.get()).data()!.lastSeenAt.toMillis(), originalLastSeen);
  now += 61 * 60_000;
  const renewed = await auth.current(first.token, true);
  assert.equal((await sessionRef.get()).data()!.lastSeenAt.toMillis(), now);
  assert.equal(renewed?.expiresAt, now + 30 * 86400_000);
  await sessionRef.update({ expiresAt: Timestamp.fromMillis(now - 1) });
  assert.equal(await auth.current(first.token), null);
  await auth.logout(second.token);
  assert.equal(await auth.current(second.token), null);
  assert.ok((await db.collection('deviceSessions').doc(tokenHash(second.token)).get()).data()!.revokedAt);
  const third = await auth.login({ phone: '912345680', pin: '1234' });
  await auth.revokeAll(first.participant.id);
  assert.equal(await auth.current(third.token), null);
});

test('Cambio/reset de PIN invalidan todas las sesiones y el PIN anterior', async () => {
  const first = await auth.register(registration('912345681'));
  const second = await auth.login({ phone: '912345681', pin: '1234' });
  await assert.rejects(auth.changePin(first.token, { currentPin: '9999', newPin: '456789', confirmPin: '456789' }));
  await auth.changePin(first.token, { currentPin: '1234', newPin: '456789', confirmPin: '456789' });
  assert.equal(await auth.current(first.token), null);
  assert.equal(await auth.current(second.token), null);
  await assert.rejects(auth.login({ phone: '912345681', pin: '1234' }));
  const changed = await auth.login({ phone: '912345681', pin: '456789' });
  await auth.resetPin({ participantId: first.participant.id, newPin: '0000' }, 'verified-organizer');
  assert.equal(await auth.current(changed.token), null);
  assert.ok(await auth.login({ phone: '912345681', pin: '0000' }));
  for (let attempt = 0; attempt < 4; attempt++) await assert.rejects(auth.changePin('invalid', { currentPin: '0000', newPin: '0000', confirmPin: '0000' }));
});

test('Aislamiento: token A solo retorna A; cliente anónimo/autenticado/admin no lee secretos', async () => {
  const a = await auth.register(registration('912345682'));
  const b = await auth.register(registration('912345683'));
  const identity = await auth.current(a.token);
  assert.equal(identity?.participant.id, a.participant.id);
  assert.notEqual(identity?.participant.id, b.participant.id);
  assert.equal(await auth.current(a.token + 'forged'), null);
  await assert.rejects(auth.login({ phone: '912345682', pin: '1234', participantId: b.participant.id }));
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('participant-a'), environment.authenticatedContext('organizer', { campaign_admin: true })]) {
    const client = context.firestore();
    for (const name of ['participants', 'deviceSessions', 'campaignParticipantPhones', 'campaignAuthLimits', 'auditLogs']) {
      await assertFails(getDocs(collection(client, name)));
      await assertFails(setDoc(doc(client, name, 'injected'), { active: true }));
    }
    await assertFails(getDoc(doc(client, 'participants', b.participant.id)));
    await assertFails(getDoc(doc(client, 'deviceSessions', tokenHash(b.token))));
  }
  const admin = environment.authenticatedContext('organizer', { campaign_admin: true }).firestore();
  await assertSucceeds(setDoc(doc(admin, 'campaigns', 'phase1-preserved'), { name: 'Fase 1' }));
  const ordinary = environment.authenticatedContext('ordinary').firestore();
  await assertFails(getDoc(doc(ordinary, 'campaigns', 'phase1-preserved')));
});

test('Límites de registro/cambio/reset y contadores concurrentes compartidos', async () => {
  const registered = await auth.register(registration('912345684'));
  for (let attempt = 0; attempt < 5; attempt++) {
    await assert.rejects(auth.changePin(registered.token, { currentPin: '9999', newPin: '0000', confirmPin: '0000' }), /No pudimos iniciar/);
  }
  await assert.rejects(auth.changePin(registered.token, { currentPin: '1234', newPin: '0000', confirmPin: '0000' }), /varios intentos/);
  for (let attempt = 0; attempt < 4; attempt++) await assert.rejects(auth.register(registration('912345684')), /No pudimos crear/);
  await assert.rejects(auth.register(registration('912345684')), /varios intentos/);
  for (let attempt = 0; attempt < 5; attempt++) await auth.resetPin({ participantId: registered.participant.id, newPin: '0000' }, 'reset-limit-organizer');
  await assert.rejects(auth.resetPin({ participantId: registered.participant.id, newPin: '1234' }, 'reset-limit-organizer'), /varios intentos/);
  const outcomes = await Promise.allSettled(Array.from({ length: 3 }, () => auth.limit('concurrent-test', 'opaque-key', 2)));
  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 2);
});

test('Route Handlers: cookie real, DTO seguro, CSRF, sesión persistente y logout', async () => {
  process.env.FIREBASE_ADMIN_PROJECT_ID = projectId;
  process.env.CAMPAIGNS_AUTH_SECRET = secret;
  process.env.CAMPAIGNS_APP_ORIGIN = 'http://localhost:3000';
  const { POST, GET } = await import('../../src/app/api/campanas/auth/[action]/route');
  const invoke = (action: string, body: unknown, cookie = '', origin = 'http://localhost:3000') => POST(new NextRequest(`http://localhost:3000/api/campanas/auth/${action}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ action }) });
  const rejected = await invoke('register', registration('912345685'), '', 'https://attacker.invalid');
  assert.equal(rejected.status, 403);
  const created = await invoke('register', registration('912345685'));
  assert.equal(created.status, 200);
  const serialized = await created.text();
  assert.ok(!/pinHash|tokenHash|phoneNormalized|token"/.test(serialized));
  const setCookie = created.headers.get('set-cookie')!;
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Path=\//i);
  assert.match(setCookie, /Expires=/i);
  assert.equal(created.headers.get('cache-control'), 'private, no-store');
  const cookie = setCookie.split(';')[0];
  const current = await GET(new NextRequest('http://localhost:3000/api/campanas/auth/session', { headers: { cookie } }), { params: Promise.resolve({ action: 'session' }) });
  assert.equal(current.status, 200);
  const protectedIdentity = await current.json();
  assert.equal(protectedIdentity.participant.fullName, 'Participante de prueba');
  assert.equal((await invoke('login', { phone: '912345685', pin: '1234', participantId: 'another' })).status, 401);
  const logout = await invoke('logout', {}, cookie);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/i);
  const invalid = await GET(new NextRequest('http://localhost:3000/api/campanas/auth/session', { headers: { cookie } }), { params: Promise.resolve({ action: 'session' }) });
  assert.equal(invalid.status, 401);
  assert.equal((await invoke('login', { phone: '912345685', pin: '1234' })).status, 200);
  assert.equal((await GET(new NextRequest('http://localhost:3000/api/campanas/auth/participants'), { params: Promise.resolve({ action: 'participants' }) })).status, 404);
});
