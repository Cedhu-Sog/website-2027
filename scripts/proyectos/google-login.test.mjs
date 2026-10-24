import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_IDENTITY, googleRepositoryConfig } from '../../src/server/google/config.js';
import { authorizedWorkspaceRole, createWorkspaceHandlers, resolveWorkspaceRole } from '../../src/server/proyectos-google-auth.js';
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

function fixture({ claimChanges = {}, role = 'ADMIN', overrideEnv = {}, clock = () => Date.now(),
  signedToken = false, tamperSignature = false } = {}) {
  let auth;
  let lastVerifier;
  // The official verifier runs unchanged; only Google's certificate transport
  // is replaced with a locally generated public key. No real token or network.
  const keys = signedToken ? generateKeyPairSync('rsa', { modulusLength: 2048 }) : null;
  const verifier = signedToken ? new OAuth2Client() : null;
  if (verifier) verifier.getFederatedSignonCertsAsync = async () => ({
    certs: { fixture: keys.publicKey.export({ type: 'spki', format: 'pem' }) }, format: 'PEM',
  });
  const claims = () => ({
    sub, email, hd: domain, nonce: auth.nonce, email_verified: true,
    iss: 'https://accounts.google.com', aud: env.PROYECTOS_GOOGLE_OAUTH_CLIENT_ID,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600,
    ...claimChanges,
  });
  const factory = () => ({
    generateAuthUrl(options) {
      auth = options;
      return 'https://accounts.google.com/o/oauth2/v2/auth?state=' + encodeURIComponent(options.state);
    },
    async getToken({ code, redirect_uri, codeVerifier }) {
      assert.equal(code, 'one-time-code');
      assert.equal(redirect_uri, PROJECTS_ORIGIN + path + 'callback');
      lastVerifier = codeVerifier;
      let idToken = 'synthetic-id-token';
      if (signedToken) {
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fixture' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify(claims())).toString('base64url');
        const body = header + '.' + payload;
        const signature = sign('RSA-SHA256', Buffer.from(body), keys.privateKey);
        if (tamperSignature) signature[0] ^= 1;
        idToken = body + '.' + signature.toString('base64url');
      }
      return { tokens: { id_token: idToken } };
    },
    async verifyIdToken({ idToken, audience }) {
      assert.equal(audience, env.PROYECTOS_GOOGLE_OAUTH_CLIENT_ID);
      if (signedToken) return verifier.verifyIdToken({ idToken, audience });
      assert.equal(idToken, 'synthetic-id-token');
      return { getPayload: claims };
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

test('official ID-token verifier rejects invalid signature, audience, issuer and expiry before authorization', async () => {
  const expiredAt = Math.floor(Date.now() / 1000) - 600;
  for (const scenario of [
    { allowed: true },
    { tamperSignature: true },
    { claimChanges: { aud: 'other-client.apps.googleusercontent.com' } },
    { claimChanges: { iss: 'https://evil.invalid' } },
    { claimChanges: { iat: expiredAt - 600, exp: expiredAt } },
  ]) {
    const f = fixture({ signedToken: true, ...scenario });
    const response = await complete(f, await begin(f));
    assert.equal(response.headers.get('location'), PROJECTS_ORIGIN +
      (scenario.allowed ? '/proyectos/' : '/proyectos/?acceso=denegado'));
    if (!scenario.allowed) {
      assert(response.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
      assert.equal(await response.text(), '', 'provider errors and tokens must not reach the response');
    }
  }
});

test('ADMIN and DOCENTE sessions persist separately, expire at the exact boundary and clear on logout', async () => {
  const start = Math.floor(Date.now() / 1000) * 1000;
  for (const role of ['ADMIN', 'DOCENTE']) {
    let time = start;
    const f = fixture({ role, clock: () => time });
    const sessionCookie = cookieNamed(await complete(f, await begin(f)), '__Host-cedhu-proyectos');
    const request = cookie => new Request(PROJECTS_ORIGIN + '/api/proyectos/session', {
      headers: cookie ? { Cookie: cookie } : {},
    });
    for (const elapsed of [0, 1000, 3599999]) {
      time = start + elapsed;
      const response = await f.handler.session(request(sessionCookie));
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /no-store/);
      const data = await response.json();
      assert.equal(data.role, role);
      assert.equal(data.expiresAt, start + 3600000, 'refresh must not extend expiration');
      assert.deepEqual(Object.keys(data).sort(), ['authenticated', 'expiresAt', 'message', 'role', 'title', 'welcome']);
    }
    const closed = f.handler.logout(new Request(PROJECTS_ORIGIN + '/api/proyectos/logout', {
      method: 'POST', headers: { Origin: PROJECTS_ORIGIN, 'X-CEDHU-Projects': '1' },
    }));
    assert.equal(closed.status, 200);
    assert.match(closed.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal((await f.handler.session(request())).status, 401);
    time = start + 3600000;
    const expired = await f.handler.session(request(sessionCookie));
    assert.equal(expired.status, 401);
    assert.match(expired.headers.get('set-cookie'), /Max-Age=0/);
  }
});

function accessListClient({ account = GOOGLE_IDENTITY.serviceAccount, rows = [], transform = value => value } = {}) {
  const cfg = googleRepositoryConfig(env);
  const system = 'system_fixture_folder';
  const sheet = cfg.sheets.find(item => item.key === 'users');
  const calls = [];
  const client = {
    async getAccessToken() { return { token: 'synthetic-backend-access-token' }; },
    async request(options) {
      calls.push(options);
      assert.equal(options.method, 'GET');
      assert.equal(options.maxRedirects, 0);
      const path = decodeURIComponent(new URL(options.url).pathname);
      let data;
      if (path.endsWith('/about')) data = { user: { emailAddress: account } };
      else if (path.includes('/drives/')) data = { id: cfg.rootId, name: 'Repo Investigación' };
      else if (path.endsWith('/files')) data = { incompleteSearch: false, files:
        ['00_Sistema', '01_Investigaciones', '02_Importaciones_Temporales'].map((name, i) => ({
          id: i === 0 ? system : 'folder_fixture_' + i, name, mimeType: 'application/vnd.google-apps.folder',
          parents: [cfg.rootId], driveId: cfg.rootId, trashed: false,
        })) };
      else if (path.includes('/files/')) {
        assert(path.endsWith('/' + sheet.id), 'only the configured access list may be read');
        data = { id: sheet.id, name: sheet.name, mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [system], driveId: cfg.rootId, trashed: false };
      } else {
        assert(path.includes('/' + sheet.id), 'no personal or unrelated spreadsheet reads');
        if (path.endsWith("/values/'Usuarios'!1:1")) data = { values: [sheet.headers] };
        else if (path.endsWith("/values/'Usuarios'!A2:E")) data = { values: rows };
        else data = { sheets: [{ properties: { title: 'Usuarios', sheetType: 'GRID' } }] };
      }
      return { data: transform(data, path) };
    },
  };
  return { client, calls };
}

test('access-list reader verifies backend identity and repository membership before reading bounded rows', async () => {
  const good = [email, sub, 'Prueba sintética', 'DOCENTE', 'ACTIVO'];
  for (const scenario of [
    { rows: [good], expected: 'DOCENTE' },
    { rows: [], expected: null },
    { rows: [[email, sub, '', 'ADMIN', 'INACTIVO']], expected: null },
    { rows: [...Array.from({ length: 999 }, () => ['other@cedhu.edu.co']), good, good], expected: null },
    { rows: [good, ...Array.from({ length: 1000 }, () => []), good], expected: null },
    { account: 'personal@example.invalid', rejected: true },
    { transform: (data, path) => path.includes('/files/') ? { ...data, parents: ['wrong_folder'] } : data, rejected: true },
  ]) {
    const { client, calls } = accessListClient(scenario);
    const lookup = () => authorizedWorkspaceRole({ env, sub, email, clientFactory: () => client });
    if (scenario.rejected) {
      await assert.rejects(lookup);
      assert(!calls.some(item => item.url.includes('/values/')), 'deny before reading sheet values');
    } else assert.equal(await lookup(), scenario.expected);
    assert(calls[0].url.endsWith('/about'), 'check actual account before Drive or Sheets');
  }
});
