import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

// Server-only authenticated encryption. Derive independent keys for the OAuth
// flow and session, separate from the retired password/HMAC cookie formats.
function cookieKey(key, purpose) {
  return hkdfSync('sha256', key, 'cedhu-workspace-cookie-v2', purpose, 32);
}

export function sealWorkspaceCookie(payload, key, purpose) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cookieKey(key, purpose), iv);
  cipher.setAAD(Buffer.from('v2\0' + purpose));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return ['v2', iv.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}

export function openWorkspaceCookie(value, key, purpose) {
  if (typeof value !== 'string' || value.length > 1800 ||
      !/^v2\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/.test(value)) throw new Error('invalid_cookie');
  const parts = value.split('.').slice(1);
  const [iv, encrypted, tag] = parts.map(part => Buffer.from(part, 'base64url'));
  if ([iv, encrypted, tag].some((part, index) => part.toString('base64url') !== parts[index])) throw new Error('invalid_cookie');
  const decipher = createDecipheriv('aes-256-gcm', cookieKey(key, purpose), iv, { authTagLength: 16 });
  decipher.setAAD(Buffer.from('v2\0' + purpose));
  decipher.setAuthTag(tag);
  // Authenticate before parsing or using any plaintext.
  const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded));
}
