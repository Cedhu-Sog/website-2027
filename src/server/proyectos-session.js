import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { parsePasswordHash } from './proyectos-password.js';

export const PROJECTS_ORIGIN = 'https://website-2027-seven.vercel.app';
export const SESSION_SECONDS = 8 * 60 * 60;

export function projectsConfig(env, request) {
  parsePasswordHash(env.PROYECTOS_PASSWORD_HASH);
  if (!/^[a-f0-9]{64}$/i.test(env.PROYECTOS_SESSION_SECRET || '')) throw new Error('configuration');
  const url = new URL(request.url);
  const local = env.NODE_ENV === 'development' && !env.VERCEL &&
    ['http://localhost:3000', 'http://localhost:4321'].includes(url.origin);
  return {
    origin: local ? url.origin : PROJECTS_ORIGIN,
    cookieName: local ? 'cedhu-proyectos-dev' : '__Host-cedhu-proyectos',
    secure: !local,
    passwordHash: env.PROYECTOS_PASSWORD_HASH,
    key: Buffer.from(env.PROYECTOS_SESSION_SECRET, 'hex'),
  };
}

export function privateHeaders() {
  return new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  });
}

export function projectsJson(value, status = 200, extra = {}) {
  const headers = privateHeaders();
  for (const [key, val] of Object.entries(extra)) headers.set(key, val);
  return Response.json(value, { status, headers });
}

export function sessionCookie(value, config, age = SESSION_SECONDS) {
  return `${config.cookieName}=${value}; Path=/; Max-Age=${age}; HttpOnly;${config.secure ? ' Secure;' : ''} SameSite=Strict`;
}

function signature(value, config) {
  // Rotating either environment secret invalidates all previously issued sessions.
  return createHmac('sha256', config.key).update('cedhu-proyectos-v1\0').update(config.passwordHash).update('\0').update(value).digest();
}

export function issueSession(config, now) {
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ v: 1, iat, exp: iat + SESSION_SECONDS, id: randomBytes(24).toString('base64url') })).toString('base64url');
  return `${payload}.${signature(payload, config).toString('base64url')}`;
}

function readSession(request, config, now) {
  const cookies = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${config.cookieName}=`));
  if (cookies.length !== 1) throw new Error('session');
  const token = cookies[0].slice(config.cookieName.length + 1);
  if (!/^[A-Za-z0-9_-]{1,512}\.[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('session');
  const [payload, mac] = token.split('.');
  const actual = Buffer.from(mac, 'base64url');
  if (actual.toString('base64url') !== mac || !timingSafeEqual(signature(payload, config), actual)) throw new Error('session');
  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const seconds = Math.floor(now / 1000);
  if (session.v !== 1 || !Number.isSafeInteger(session.iat) || !Number.isSafeInteger(session.exp) ||
      session.exp - session.iat !== SESSION_SECONDS || session.iat > seconds || session.exp <= seconds ||
      !/^[A-Za-z0-9_-]{32}$/.test(session.id)) throw new Error('session');
  return session;
}

export function allowedRequest(request, config, mutation = false) {
  if (new URL(request.url).origin !== config.origin) return false;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (origin && origin !== config.origin) return false;
  if (site && !['same-origin', 'none'].includes(site)) return false;
  // JSON + a custom header prevent simple cross-origin form submissions; exact
  // Origin checking and Strict cookies provide independent CSRF defenses.
  return !mutation || (origin === config.origin && request.headers.get('x-cedhu-projects') === '1');
}

/** Future private endpoints must call this BEFORE reading any private resource.
 * Return a Response immediately on failure; apply privateHeaders() to success too.
 * Authentication on the client never substitutes this server check.
 */
export function requireProjectsSession(request, { env = process.env, now = Date.now } = {}) {
  let config;
  try { config = projectsConfig(env, request); }
  catch { return projectsJson({ message: 'El acceso no está disponible temporalmente.' }, 503); }
  if (!allowedRequest(request, config)) return projectsJson({ message: 'Solicitud no permitida.' }, 403);
  try { return { session: readSession(request, config, now()), config }; }
  catch { return projectsJson({ message: 'Inicia sesión para continuar.' }, 401, { 'Set-Cookie': sessionCookie('', config, 0) }); }
}
