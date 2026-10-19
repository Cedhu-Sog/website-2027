import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const prefix = 'scrypt$131072$8$1';

export function parsePasswordHash(encoded) {
  if (typeof encoded !== 'string' || !/^scrypt\$131072\$8\$1\$[a-f0-9]{64}\$[a-f0-9]{128}$/.test(encoded)) throw new Error('configuration');
  const parts = encoded.split('$');
  return { salt: Buffer.from(parts[4], 'hex'), hash: Buffer.from(parts[5], 'hex') };
}

export async function hashPassword(password) {
  const salt = randomBytes(32);
  const hash = await derive(password, salt, 64, options);
  return `${prefix}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const { salt, hash } = parsePasswordHash(encoded);
  const candidate = await derive(password, salt, hash.length, options);
  return timingSafeEqual(candidate, hash);
}
