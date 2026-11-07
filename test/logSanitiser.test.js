// test/logSanitiser.test.js - run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const { redact, maskEmail } = require('../config/logSanitiser');

test('redacts passwords and tokens in nested objects', () => {
  const out = redact({ user: 'a', password: 'Secret123', nested: { token: 'abc', jwtSecret: 'x', ok: 1 } });
  assert.strictEqual(out.password, '[REDACTED]');
  assert.strictEqual(out.nested.token, '[REDACTED]');
  assert.strictEqual(out.nested.jwtSecret, '[REDACTED]');
  assert.strictEqual(out.nested.ok, 1);
  assert.strictEqual(out.user, 'a');
});

test('redacts the Authorization header', () => {
  assert.strictEqual(redact({ authorization: 'Bearer abc' }).authorization, '[REDACTED]');
});

test('hides credentials inside MongoDB connection strings', () => {
  const out = redact('connect failed for mongodb+srv://admin:hunter2@cluster0.example.net/db');
  assert.ok(!out.includes('hunter2'));
  assert.ok(out.includes('[REDACTED]@cluster0.example.net'));
});

test('keeps error name, message and stack', () => {
  const out = redact(new Error('boom'));
  assert.strictEqual(out.name, 'Error');
  assert.strictEqual(out.message, 'boom');
  assert.ok(out.stack.includes('boom'));
});

test('masks email addresses', () => {
  assert.strictEqual(maskEmail('freelancer@test.com'), 'fr***@test.com');
  assert.strictEqual(maskEmail('not-an-email'), '[invalid]');
  assert.strictEqual(maskEmail(undefined), undefined);
});

test('stops at a safe depth instead of looping forever', () => {
  const a = {}; a.self = a;
  assert.doesNotThrow(() => redact(a));
});
