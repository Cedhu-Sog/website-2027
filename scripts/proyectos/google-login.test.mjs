import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { GOOGLE_IDENTITY } from '../../src/server/google/config.js';
import { createWorkspaceHandlers, resolveWorkspaceRole } from '../../src/server/proyectos-google-auth.js';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';
import legacy from '../../api/proyectos/login.js';

const domain = 'cedhu.edu.co';
const sub = '123456789012345678901';
const email = 'docente.prueba@cedhu.edu.co';
const env = {
  VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_Fixture123456',
  PROYECTOS_SESSION_SECRET: randomBytes(32).toString('hex'),
  PROYECTOS_GOOGLE_OAUTH_CLIENT_ID: '1234567890-example.apps.googleusercontent.com',
  PROYECTOS_GOOGLE_OAUTH_CLIENT_SECRET: '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dentials',
  PROYECTOS_GOOGLE_DOMAIN: domain,
  GCP_PROJECT_ID: GOOGLE_IDENTITY.projectId,
  GCP_PROJECT_NUMBER: '123456789012',
  GCP_SERVICE_ACCOUNT_EMAIL: GOOGLE_IDENTITY.serviceAccount,
  GCP_WORKLOAD_IDENTITY_POOL_ID: GOOGLE_IDENTITY.pool,
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: GOOGLE_IDENTITY.provider,
  PROYECTOS_DRIVE_ROOT_ID: 'aaaaaaaaaaaaaaaaaaaa',
  PROYECTOS_METADATA_SPREADSHEET_ID: 'bbbbbbbbbbbbbbbbbbbb',
  PROYECTOS_AUTH_SPREADSHEET_ID: 'cccccccccccccccccccc',
  PROYECTOS_AUDIT_SPREADSHEET_ID: 'dddddddddddddddddddd',
};
const path = '/api/proyectos/google/';
const cookieNamed = (response, name) => {
  const values = response.headers.getSetCookie();
  const item = values.find(item => item.startsWith(name + '='));
  assert(item, 'expected cookie ' + name);
  return item.split(';')[0];
};
const req = (route, opts = {}) => new Request(PROJECTS_ORIGIN + path + route + (opts.query || ''), {
  method: opts.method || 'GET', headers: {
    ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    ...(opts.headers || {}),
  },
});

function fixture({ claimChanges = {}, role = 'ADMIN', overrideEnv = {}, clock = () => Date.now() } = {}) {
  let auth;
  let lastVerifier;
  const factory = () => ({
    generateAuthUrl(options) {
      auth = options;
      return 'https://accounts.google.com/o/oauth2/v2/auth?state=' + encodeURIComponent(options.state);
    },
    async getToken({ code, redirect_uri, codeVerifier }) {
      assert.equal(code, 'one-time-code');
      assert.equal(redirect_uri, PROJECTS_ORIGIN + path + 'callback');
      lastVerifier = codeVerifier;
      return { tokens: { id_token: 'synthetic-id-token' } };
    },
    async verifyIdToken({ idToken, audience }) {
      assert.equal(idToken, 'synthetic-id-token');
      assert.equal(audience, env.PROYECTOS_GOOGLE_OAUTH_CLIENT_ID);
      return { getPayload: () => ({
        sub, email, hd: domain, nonce: auth.nonce, email_verified: true, ...claimChanges,
      }) };
    },
  });
  let currentRole = role;
  const handler = createWorkspaceHandlers({
    env: { ...env, ...overrideEnv }, now: clock,
    oauthFactory: factory, roleLookup: async () => currentRole,
  });
  return {
    handler, get auth() { return auth; }, setRole: next => { currentRole = next; },
    get lastVerifier() { return lastVerifier; },
  };
}
async function begin(f) {
  const response = await f.handler.start(req('start'));
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location'), /^https:\/\/accounts\.google\.com\//);
  assert.equal(response.headers.get('cache-control').includes('no-store'), true);
  const flowCookie = cookieNamed(response, '__Host-cedhu-google-flow');
  return flowCookie;
}
async function complete(f, flowCookie, state = f.auth.state) {
  return f.handler.callback(req('callback', {
    query: '?code=one-time-code&state=' + encodeURIComponent(state), cookie: flowCookie,
  }));
}

test('OAuth start only permits configured Vercel Production and redirects with PKCE and nonce', async () => {
  const f = fixture();
  const flowCookie = await begin(f);
  assert.match(flowCookie, /^__Host-cedhu-google-flow=/);
  assert.equal(f.auth.response_type, 'code');
  assert.equal(f.auth.scope, 'openid email profile');
  assert.equal(f.auth.hd, domain);
  assert.equal(f.auth.code_challenge_method, 'S256');
  assert.match(f.auth.code_challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.match(f.auth.nonce, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(f.auth.redirect_uri, PROJECTS_ORIGIN + path + 'callback');
  assert.equal((await complete(f, flowCookie)).status, 302);
  assert.equal(createHash('sha256').update(f.lastVerifier).digest('base64url'), f.auth.code_challenge);
});

test('authenticated session requires authorization list and returns only role and public labels', async () => {
  const f = fixture();
  const response = await complete(f, await begin(f));
  assert.equal(response.headers.get('location'), PROJECTS_ORIGIN + '/proyectos/');
  const sessionCookie = cookieNamed(response, '__Host-cedhu-proyectos');
  assert.match(response.headers.getSetCookie().join(' '), /HttpOnly; Secure; SameSite=Strict/);
  const sessionReq = new Request(PROJECTS_ORIGIN + '/api/proyectos/session', { headers: { Cookie: sessionCookie } });
  const access = await f.handler.session(sessionReq);
  assert.equal(access.status, 200);
  const body = await access.json();
  assert.equal(body.role, 'ADMIN');
  assert.equal(body.authenticated, true);
  assert.equal(body.email, undefined);
  assert.equal(body.sub, undefined);
  f.setRole('DOCENTE');
  const revoked = await f.handler.session(sessionReq);
  assert.equal(revoked.status, 403, 'role change invalidates old session without a timer window');
  f.setRole(null);
  assert.equal((await f.handler.session(sessionReq)).status, 403);
});

test('OAuth state is bound to short-lived secure cookie, and rejects tampering', async () => {
  const f = fixture();
  const stateCookie = await begin(f);
  for (const altered of [undefined, stateCookie + 'x']) {
    const response = await complete(f, altered);
    assert.equal(response.headers.get('location'), PROJECTS_ORIGIN + '/proyectos/?acceso=denegado');
    assert.equal(response.headers.getSetCookie().some(item => item.startsWith('__Host-cedhu-proyectos=;')), true);
  }
  assert.match((await complete(f, stateCookie, 'A'.repeat(43))).headers.get('location'), /acceso=denegado/);
});

test('Google identity checks reject outsider email, wrong hd, unverified email, wrong nonce, or unlisted user', async () => {
  for (const scenario of [
    { claimChanges: { hd: 'otro.edu.co' } },
    { claimChanges: { email: 'alguien@gmail.com' } },
    { claimChanges: { email_verified: false } },
    { claimChanges: { nonce: 'invalid' } },
    { claimChanges: { sub: 'invalid' } },
    { role: null },
  ]) {
    const f = fixture(scenario);
    const response = await complete(f, await begin(f));
    assert.equal(response.headers.get('location'), PROJECTS_ORIGIN + '/proyectos/?acceso=denegado');
  }
});

test('missing cloud/OAuth configuration fails closed and legacy password endpoint cannot login', async () => {
  for (const changes of [
    { VERCEL_ENV: 'preview' }, { VERCEL: undefined },
    { PROYECTOS_GOOGLE_OAUTH_CLIENT_SECRET: '' },
    { PROYECTOS_GOOGLE_DOMAIN: 'gmail.com' },
    { PROYECTOS_SESSION_SECRET: undefined },
  ]) assert.equal((await fixture({ overrideEnv: changes }).handler.start(req('start'))).status, 503);
  assert.equal((await legacy.fetch(new Request(PROJECTS_ORIGIN + '/api/proyectos/login', { method: 'POST' }))).status, 410);
});

test('callback denies forged origin, missing state and replay after flow expiration', async () => {
  const f = fixture();
  await begin(f);
  assert.equal((await f.handler.callback(new Request('https://evil.invalid' + path + 'callback'))).status, 403);
  const missingState = await f.handler.callback(req('callback', { query: '?code=one-time-code' }));
  assert.match(missingState.headers.get('location'), /acceso=denegado/);
  const clockValue = Date.now();
  let time = clockValue;
  const expired = fixture({ clock: () => time });
  const cookie = await begin(expired);
  time += 601_000;
  const r = await complete(expired, cookie);
  assert.match(r.headers.get('location'), /acceso=denegado/);
});

test('logout enforces same-origin POST and clears Google session cookie', async () => {
  const f = fixture();
  const endpoint = PROJECTS_ORIGIN + '/api/proyectos/logout';
  const unsafe = new Request(endpoint, { method: 'POST' });
  assert.equal(f.handler.logout(unsafe).status, 403);
  const allowed = new Request(endpoint, { method: 'POST',
    headers: { Origin: PROJECTS_ORIGIN, 'X-CEDHU-Projects': '1', 'Sec-Fetch-Site': 'same-origin' } });
  const r = f.handler.logout(allowed);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie'), /^__Host-cedhu-proyectos=; Path=\/; Max-Age=0/);
});

test('authorized user sheet enforces exact Google subject, unique email, active status and role', () => {
  const account = { sub, email };
  const good = [email, sub, 'Docente Prueba', 'ADMIN', 'ACTIVO'];
  assert.equal(resolveWorkspaceRole([good], account), 'ADMIN');
  assert.equal(resolveWorkspaceRole([[email.toUpperCase(), sub, '', 'DOCENTE', 'activo']], account), 'DOCENTE');
  for (const rows of [
    [], [good, good], [[email, '987654321012345678901', '', 'ADMIN', 'ACTIVO']],
    [[email, sub, '', 'ESTUDIANTE', 'ACTIVO']],
    [[email, sub, '', 'ADMIN', 'INACTIVO']],
    [[email, sub, '', 'ADMIN', '']],
    Array.from({ length: 1001 }, () => good),
  ]) assert.equal(resolveWorkspaceRole(rows, account), null);
});
