import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { sealWorkspaceCookie, openWorkspaceCookie } from '../../src/server/proyectos-workspace-session.js';

test('cookies encrypt personal data, use fresh IVs and separate flow/session keys', () => {
  const key = randomBytes(32);
  const purpose = 'cedhu-google-session-v2';
  const payload = { email: 'synthetic@example.invalid', sub: '123456789012345678901', role: 'ADMIN' };
  const first = sealWorkspaceCookie(payload, key, purpose);
  const second = sealWorkspaceCookie(payload, key, purpose);
  assert.notEqual(first, second);
  assert.notEqual(first.split('.')[1], second.split('.')[1]);
  assert.deepEqual(openWorkspaceCookie(first, key, purpose), payload);
  assert.deepEqual(openWorkspaceCookie(second, key, purpose), payload);
  for (const part of first.split('.')) {
    const decoded = Buffer.from(part, 'base64url').toString('utf8');
    for (const value of Object.values(payload)) assert(!decoded.includes(value));
  }
  assert.throws(() => openWorkspaceCookie(first, key, 'cedhu-google-oauth-flow-v2'));
  assert.throws(() => openWorkspaceCookie(first, randomBytes(32), purpose));
});

test('encrypted cookies reject every tampered component, truncation, noncanonical encoding and oversized input', () => {
  const key = randomBytes(32);
  const purpose = 'cedhu-google-session-v2';
  const value = sealWorkspaceCookie({ role: 'DOCENTE' }, key, purpose);
  for (const index of [1, 2, 3]) {
    const parts = value.split('.');
    const bytes = Buffer.from(parts[index], 'base64url');
    bytes[0] ^= 1;
    parts[index] = bytes.toString('base64url');
    assert.throws(() => openWorkspaceCookie(parts.join('.'), key, purpose));
  }
  const parts = value.split('.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const tag = parts[3];
  parts[3] = tag.slice(0, -1) + alphabet[alphabet.indexOf(tag.at(-1)) + 1];
  for (const bad of [parts.join('.'), value.slice(0, -1), value + '=', 'v1.' + value.slice(3), 'a'.repeat(1801), null]) {
    assert.throws(() => openWorkspaceCookie(bad, key, purpose));
  }
});
