import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { createGoogleClient, authenticateGoogle } from './google/auth.js';
import { googleRepositoryConfig, requireGoogleProduction } from './google/config.js';
import { createGoogleRepository } from './google/repository.js';
import { PROJECTS_ORIGIN, privateHeaders, projectsJson } from './proyectos-session.js';

// Server-only. The password-based entry points are deliberately retired when
// Workspace authentication is deployed. Nothing private enters Astro's dist/.
const SESSION_NAME = '__Host-cedhu-proyectos';
const FLOW_NAME = '__Host-cedhu-google-flow';
const SESSION_SECONDS = 3600;
const FLOW_SECONDS = 600;
const CALLBACK = PROJECTS_ORIGIN + '/api/proyectos/google/callback';
const SCOPES = 'openid email profile';

function settings(env) {
  requireGoogleProduction(env);
  const key = env.PROYECTOS_SESSION_SECRET;
  const clientId = env.PROYECTOS_GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.PROYECTOS_GOOGLE_OAUTH_CLIENT_SECRET;
  const domain = env.PROYECTOS_GOOGLE_DOMAIN;
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key) ||
      typeof clientId !== 'string' || !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
      typeof clientSecret !== 'string' || clientSecret.length < 16 ||
      typeof domain !== 'string' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain) ||
      domain === 'gmail.com') throw new Error('workspace_configuration');
  googleRepositoryConfig(env);
  return { key: Buffer.from(key, 'hex'), clientId, clientSecret, domain };
}

function cookie(name, value, age, sameSite) {
  return name + '=' + value + '; Path=/; Max-Age=' + age +
    '; HttpOnly; Secure; SameSite=' + sameSite;
}
const clearFlow = () => cookie(FLOW_NAME, '', 0, 'Lax');
const clearSession = () => cookie(SESSION_NAME, '', 0, 'Strict');

function signed(payload, key, purpose) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', key).update(purpose).update('\0').update(body).digest('base64url');
  return body + '.' + mac;
}
function unsign(value, key, purpose) {
  if (typeof value !== 'string' || value.length > 1800 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)) throw new Error('invalid_cookie');
  const [body, mac] = value.split('.');
  const expected = createHmac('sha256', key).update(purpose).update('\0').update(body).digest();
  const actual = Buffer.from(mac, 'base64url');
  if (actual.length !== expected.length || actual.toString('base64url') !== mac ||
      !timingSafeEqual(actual, expected)) throw new Error('invalid_cookie');
  const decoded = Buffer.from(body, 'base64url').toString('utf8');
  if (Buffer.from(decoded).toString('base64url') !== body) {
    // Base64 of UTF-8 bytes is checked to reject noncanonical encoding.
    throw new Error('invalid_cookie');
  }
  return JSON.parse(decoded);
}
function cookieValue(request, name) {
  const entries = (request.headers.get('cookie') || '').split(';').map(v => v.trim())
    .filter(v => v.startsWith(name + '='));
  if (entries.length !== 1) throw new Error('cookie_missing');
  return entries[0].slice(name.length + 1);
}
function redirect(location, cookies = []) {
  const headers = privateHeaders();
  headers.set('Location', location);
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
}
function fixedOrigin(request) {
  const u = new URL(request.url);
  return u.origin === PROJECTS_ORIGIN && !u.username && !u.password;
}
function validEmail(email, domain) {
  return typeof email === 'string' && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+$/.test(email) && email === email.toLowerCase() &&
    email.endsWith('@' + domain);
}
function localSession(request, cfg, now) {
  const data = unsign(cookieValue(request, SESSION_NAME), cfg.key, 'cedhu-google-session-v1');
  const time = Math.floor(now() / 1000);
  if (data.v !== 1 || !Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp) ||
      data.exp - data.iat !== SESSION_SECONDS || data.iat > time || data.exp <= time ||
      typeof data.sub !== 'string' || !/^\d{10,30}$/.test(data.sub) ||
      !validEmail(data.email, cfg.domain) || !['ADMIN', 'DOCENTE'].includes(data.role)) throw new Error('invalid_session');
  return data;
}

/** Resolve permission from the confirmed Sheets schema; duplicates fail closed.
 * Keep this pure so access-control edge cases can be tested without Google.
 */
export function resolveWorkspaceRole(rows, { sub, email } = {}) {
  if (!Array.isArray(rows) || rows.length > 1000 ||
      typeof email !== 'string' || typeof sub !== 'string' ||
      !/^\d{10,30}$/.test(sub)) return null;
  const matches = rows.filter(row => Array.isArray(row) && typeof row[0] === 'string' &&
    row[0].trim().toLowerCase() === email);
  if (matches.length !== 1) return null;
  const row = matches[0];
  const boundSub = String(row[1] ?? '').trim();
  const role = String(row[3] ?? '').trim().toUpperCase();
  const status = String(row[4] ?? '').trim().toUpperCase();
  if ((boundSub && boundSub !== sub) || !['ADMIN', 'DOCENTE'].includes(role) ||
      status !== 'ACTIVO') return null;
  return role;
}

export async function authorizedWorkspaceRole({ env = process.env, sub, email, signal } = {}) {
  // The same WIF identity as Phase B reads only the institutional access list.
  // Check the file belongs to the approved shared drive before reading its rows.
  const cfg = googleRepositoryConfig(env);
  const client = createGoogleClient({ env, signal });
  await authenticateGoogle(client);
  const repository = createGoogleRepository(client, cfg, { signal });
  await repository.checkDrive();
  const systemId = await repository.checkStructure();
  await repository.checkSheet('users', systemId);
  const sheet = cfg.sheets.find(item => item.key === 'users');
  const result = await client.request({
    url: 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.id +
      '/values/' + encodeURIComponent("'Usuarios'!A2:E1001"),
    params: { majorDimension: 'ROWS', valueRenderOption: 'FORMATTED_VALUE' },
    method: 'GET', timeout: 5000, retry: false, signal, maxRedirects: 0, maxContentLength: 262144,
  });
  const rows = result.data?.values;
  if (!Array.isArray(rows)) throw new Error('users_sheet_unavailable');
  return resolveWorkspaceRole(rows, { sub, email });
}

export function createWorkspaceHandlers({ env = process.env, now = Date.now,
  oauthFactory = config => new OAuth2Client(config.clientId, config.clientSecret, CALLBACK),
  roleLookup = authorizedWorkspaceRole, nonceBytes = size => randomBytes(size) } = {}) {
  function configured() {
    try { return settings(env); } catch { return null; }
  }
  async function start(request) {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const cfg = configured();
    if (!cfg) return projectsJson({ message: 'Acceso institucional no disponible.' }, 503);
    if (!fixedOrigin(request) || new URL(request.url).search) return projectsJson({ message: 'Solicitud no permitida.' }, 403);
    const state = nonceBytes(32).toString('base64url');
    const nonce = nonceBytes(32).toString('base64url');
    const verifier = nonceBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const issued = Math.floor(now() / 1000);
    const flow = signed({ v: 1, state, nonce, verifier, iat: issued, exp: issued + FLOW_SECONDS }, cfg.key, 'cedhu-google-oauth-flow-v1');
    const url = oauthFactory(cfg).generateAuthUrl({
      access_type: 'online', prompt: 'select_account', response_type: 'code',
      scope: SCOPES, state, nonce, hd: cfg.domain, code_challenge: challenge,
      code_challenge_method: 'S256', redirect_uri: CALLBACK,
    });
    return redirect(url, [cookie(FLOW_NAME, flow, FLOW_SECONDS, 'Lax')]);
  }

  async function callback(request) {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const cfg = configured();
    if (!cfg) return projectsJson({ message: 'Acceso institucional no disponible.' }, 503);
    if (!fixedOrigin(request)) return projectsJson({ message: 'Solicitud no permitida.' }, 403);
    const denied = () => redirect(PROJECTS_ORIGIN + '/proyectos/?acceso=denegado', [clearFlow(), clearSession()]);
    try {
      const query = new URL(request.url).searchParams;
      const code = query.get('code');
      const state = query.get('state');
      if (query.has('error') || !code || code.length > 2048 || !state || query.getAll('state').length !== 1 ||
          query.getAll('code').length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(state)) return denied();
      const flow = unsign(cookieValue(request, FLOW_NAME), cfg.key, 'cedhu-google-oauth-flow-v1');
      const at = Math.floor(now() / 1000);
      if (flow.v !== 1 || !Number.isSafeInteger(flow.iat) || !Number.isSafeInteger(flow.exp) ||
          flow.exp - flow.iat !== FLOW_SECONDS || flow.iat > at || flow.exp <= at ||
          flow.state !== state || !/^[A-Za-z0-9_-]{43}$/.test(flow.nonce) ||
          !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier)) return denied();
      const oauth = oauthFactory(cfg);
      const exchanged = await oauth.getToken({ code, redirect_uri: CALLBACK, codeVerifier: flow.verifier });
      const idToken = exchanged.tokens?.id_token;
      if (typeof idToken !== 'string') return denied();
      const ticket = await oauth.verifyIdToken({ idToken, audience: cfg.clientId });
      const claims = ticket.getPayload();
      if (claims?.nonce !== flow.nonce || claims?.hd !== cfg.domain ||
          claims?.email_verified !== true || !/^\d{10,30}$/.test(claims.sub || '') ||
          !validEmail(claims.email, cfg.domain)) return denied();
      const role = await roleLookup({ env, sub: claims.sub, email: claims.email });
      if (!['ADMIN', 'DOCENTE'].includes(role)) return denied();
      const session = signed({ v: 1, sub: claims.sub, email: claims.email, role, iat: at,
        exp: at + SESSION_SECONDS }, cfg.key, 'cedhu-google-session-v1');
      return redirect(PROJECTS_ORIGIN + '/proyectos/', [
        clearFlow(), cookie(SESSION_NAME, session, SESSION_SECONDS, 'Strict'),
      ]);
    } catch {
      // OAuth errors and provider responses never leave the server.
      return denied();
    }
  }
  async function requireSession(request) {
    const cfg = configured();
    if (!cfg) return { response: projectsJson({ message: 'Acceso institucional no disponible.' }, 503) };
    if (!fixedOrigin(request)) return { response: projectsJson({ message: 'Solicitud no permitida.' }, 403) };
    let data;
    try { data = localSession(request, cfg, now); }
    catch { return { response: projectsJson({ message: 'Inicia sesión para continuar.' }, 401, { 'Set-Cookie': clearSession() }) }; }
    try {
      const activeRole = await roleLookup({ env, sub: data.sub, email: data.email });
      // Revocation or role changes take effect on the next private API request.
      if (activeRole !== data.role) return { response: projectsJson({ message: 'Acceso no autorizado.' }, 403, { 'Set-Cookie': clearSession() }) };
      return { identity: data };
    } catch {
      // No cached authorization in the event Google Workspace is unavailable.
      return { response: projectsJson({ message: 'No fue posible comprobar la autorización.' }, 503) };
    }
  }
  async function session(request) {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = await requireSession(request);
    if (access.response) return access.response;
    return projectsJson({
      authenticated: true, expiresAt: access.identity.exp * 1000, role: access.identity.role,
      title: 'Repositorio de investigación CEDHU',
      welcome: 'Bienvenido al repositorio institucional.',
      message: 'Tu cuenta institucional está autorizada. El catálogo estará disponible en la siguiente entrega.',
    });
  }
  function logout(request) {
    if (request.method !== 'POST') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'POST' });
    const cfg = configured();
    if (!cfg) return projectsJson({ message: 'Acceso institucional no disponible.' }, 503);
    if (!fixedOrigin(request) || request.headers.get('origin') !== PROJECTS_ORIGIN ||
        request.headers.get('x-cedhu-projects') !== '1' ||
        !['same-origin', 'none', null].includes(request.headers.get('sec-fetch-site'))) {
      return projectsJson({ message: 'Solicitud no permitida.' }, 403);
    }
    return projectsJson({ authenticated: false }, 200, { 'Set-Cookie': clearSession() });
  }
  return { start, callback, requireSession, session, logout };
}
