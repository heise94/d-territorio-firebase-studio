import assert from 'node:assert/strict';
import { test } from 'node:test';
import { participantDTO, type Participant } from '../../src/modules/campaigns/domain/participant';
import { normalizeChileanPhone, pinSchema, registrationSchema, loginSchema, changePinSchema } from '../../src/modules/campaigns/schemas/participant-auth';
import { hashPin, newSessionToken, privateKey, tokenHash, verifyPin } from '../../src/modules/campaigns/server/auth/crypto';
import { cookieOptions } from '../../src/modules/campaigns/server/auth/session';

test('Chile: formatos equivalentes e inválidos', () => {
  for (const input of ['912345678', '9 1234 5678', '+56 9 1234 5678', '+56912345678', '(9)1234-5678']) {
    assert.equal(normalizeChileanPhone(input), '+56912345678');
  }
  for (const input of ['', '123', '+54912345678', '812345678', '9abc12345', '9123456789', '56912345678']) {
    assert.throws(() => normalizeChileanPhone(input));
  }
});
test('PIN y schemas: 4–6 dígitos, confirmación, propiedades no permitidas', () => {
  for (const pin of ['1234', '123456', '0000']) assert.ok(pinSchema.safeParse(pin).success);
  for (const pin of ['123', '1234567', 'abcd', '12 34', 1234]) assert.ok(!pinSchema.safeParse(pin).success);
  assert.ok(!registrationSchema.safeParse({ phone: '912345678', pin: '1234', confirmPin: '1235', fullName: 'Ana' }).success);
  assert.ok(!loginSchema.safeParse({ phone: '912345678', pin: '1234', participantId: 'another' }).success);
  assert.ok(!changePinSchema.safeParse({ currentPin: '1234', newPin: '123456', confirmPin: '1234' }).success);
});
test('bcrypt: salt independiente, costo 12, pepper y verificación', async () => {
  const secret = 'unit-test-only-secret-not-a-production-key';
  const first = await hashPin(secret, '0000');
  const second = await hashPin(secret, '0000');
  assert.notEqual(first, second);
  assert.match(first, /^\$2[aby]\$12\$/);
  assert.ok(await verifyPin(secret, '0000', first));
  assert.ok(!await verifyPin(secret, '0001', first));
  assert.ok(!await verifyPin('different-test-secret', '0000', first));
});
test('Tokens e índices opacos, DTO sin campos sensibles', () => {
  const token = newSessionToken();
  assert.equal(token.length, 43);
  assert.notEqual(token, newSessionToken());
  assert.equal(tokenHash(token).length, 64);
  assert.notEqual(tokenHash(token), token);
  assert.notEqual(privateKey('secret', 'phone', '+56912345678'), '+56912345678');
  const dto = participantDTO({ id: 'opaque', fullName: 'Ana', active: true, pinHash: 'never-return', phoneNormalized: '+56912345678' } as Participant);
  assert.deepEqual(dto, { id: 'opaque', fullName: 'Ana', active: true });
});
test('Cookie: HttpOnly, Lax, /, expiración y Secure producción', () => {
  const previous = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: 'production' });
    const options = cookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal(options.path, '/');
    assert.ok(options.expires.getTime() > Date.now() + 29 * 86400_000);
    assert.equal(cookieOptions(new Date(0)).expires.getTime(), 0);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});
