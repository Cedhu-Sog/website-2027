import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createProjectsHandlers } from '../../src/server/proyectos-auth.js';
import { hashPassword } from '../../src/server/proyectos-password.js';
import { issueSession, PROJECTS_ORIGIN, projectsConfig, requireProjectsSession, SESSION_SECONDS } from '../../src/server/proyectos-session.js';

// Disposable fixtures: no real password, secret, external API or storage.
const password = randomBytes(24).toString('base64url');
const env = { PROYECTOS_PASSWORD_HASH: await hashPassword(password), PROYECTOS_SESSION_SECRET: randomBytes(32).toString('hex') };
const start = Date.now();
function request(route, { method = route === 'session' ? 'GET' : 'POST', body = route === 'login' ? { password } : {}, cookie, headers = {}, origin = PROJECTS_ORIGIN } = {}) {
  return new Request(`${origin}/api/proyectos/${route}`, {
    method,
    headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json', 'X-CEDHU-Projects': '1' } : {}),
      ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}
async function login(handlers = createProjectsHandlers({ env })) {
  const response = await handlers.login(request('login'));
  assert.equal(response.status, 200);
  return { response, cookie: response.headers.get('set-cookie').split(';')[0] };
}
const config = projectsConfig(env, request('session'));
const fixtureCookie = `__Host-cedhu-proyectos=${issueSession(config, start)}`;

test('correct password creates a fresh secure session and exposes private content only through protected endpoint', async () => {
  const handlers = createProjectsHandlers({ env });
  const first = await login(handlers);
  const second = await login(handlers);
  assert.notEqual(first.cookie, second.cookie);
  assert.match(first.response.headers.get('set-cookie'), /^__Host-cedhu-proyectos=.+; Path=\/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict$/);
  assert(!first.response.headers.get('set-cookie').includes('Domain='));
  assert(!first.cookie.includes(password));
  const response = handlers.session(request('session', { cookie: first.cookie }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.title, 'Repositorio de investigación CEDHU');
  assert.equal(data.message, 'El repositorio de proyectos estará disponible próximamente.');
  assert(data.expiresAt <= Date.now() + SESSION_SECONDS * 1000);
});

test('incorrect password never issues a cookie or private content', async () => {
  const response = await createProjectsHandlers({ env }).login(request('login', { body: { password: 'wrong-password' } }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(await response.json(), { message: 'Contraseña incorrecta. Intenta nuevamente.' });
});

test('missing, malformed, duplicate and tampered cookies reject private data', async () => {
  const handlers = createProjectsHandlers({ env });
  const [name, value] = fixtureCookie.split('=');
  const [payload, mac] = value.split('.');
  const cases = [undefined, `${name}=nope`, `${name}=${payload}.${mac[0] === 'a' ? 'b' : 'a'}${mac.slice(1)}`,
    `${name}=e30.${mac}`, `${fixtureCookie}; ${fixtureCookie}`, `${fixtureCookie}=`];
  for (const cookie of cases) {
    const response = handlers.session(request('session', { cookie }));
    assert.equal(response.status, 401);
    assert(!JSON.stringify(await response.json()).includes('Repositorio de investigación CEDHU'));
    assert(requireProjectsSession(request('session', { cookie }), { env }) instanceof Response);
  }
});

test('expiry is checked on the server including exact boundary and future-issued cookies', () => {
  for (const now of [() => start + SESSION_SECONDS * 1000, () => start + (SESSION_SECONDS + 1) * 1000, () => start - 2000]) {
    assert.equal(createProjectsHandlers({ env, now }).session(request('session', { cookie: fixtureCookie })).status, 401);
  }
});

test('logout deletes exactly the same cookie and subsequent browser access fails', async () => {
  const handlers = createProjectsHandlers({ env });
  let browserCookie = fixtureCookie;
  assert.equal(handlers.session(request('session', { cookie: browserCookie })).status, 200);
  const response = await handlers.logout(request('logout', { cookie: browserCookie }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), '__Host-cedhu-proyectos=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  // Model the browser applying Set-Cookie. Stateless logout is not a denylist.
  browserCookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal(handlers.session(request('session', { cookie: browserCookie })).status, 401);
});

test('missing/malformed settings fail closed for every route without leaking secrets', async () => {
  for (const settings of [{}, { ...env, PROYECTOS_PASSWORD_HASH: '' }, { ...env, PROYECTOS_SESSION_SECRET: '' },
    { ...env, PROYECTOS_PASSWORD_HASH: 'sha256$fake' }, { ...env, PROYECTOS_SESSION_SECRET: 'weak' }]) {
    const handlers = createProjectsHandlers({ env: settings });
    for (const route of ['login', 'session', 'logout']) {
      const response = await handlers[route](request(route, { cookie: fixtureCookie }));
      assert.equal(response.status, 503);
      const text = await response.text();
      assert(!text.includes(password) && !text.includes(env.PROYECTOS_SESSION_SECRET) && !text.includes(env.PROYECTOS_PASSWORD_HASH));
    }
  }
});

test('rotating either secret invalidates old sessions', async () => {
  for (const settings of [{ ...env, PROYECTOS_SESSION_SECRET: randomBytes(32).toString('hex') }, { ...env, PROYECTOS_PASSWORD_HASH: await hashPassword(password) }]) {
    assert.equal(createProjectsHandlers({ env: settings }).session(request('session', { cookie: fixtureCookie })).status, 401);
  }
});

test('rejects CSRF, missing origin/header, forged forwarded host and foreign deployment origins', async () => {
  const handlers = createProjectsHandlers({ env });
  const badHeaders = [{ Origin: 'https://evil.test' }, { Origin: 'null' }, { Origin: '' }, { 'X-CEDHU-Projects': '' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' }];
  for (const route of ['login', 'logout']) {
    for (const headers of badHeaders) assert.equal((await handlers[route](request(route, { headers, cookie: fixtureCookie }))).status, 403);
    assert.equal((await handlers[route](request(route, { origin: 'https://evil.test', headers: { 'X-Forwarded-Host': new URL(PROJECTS_ORIGIN).host, Origin: PROJECTS_ORIGIN } }))).status, 403);
  }
  assert.equal(handlers.session(request('session', { cookie: fixtureCookie, headers: { Origin: 'https://evil.test' } })).status, 403);
});

test('validates methods, media type, JSON schema, UTF-8 and body sizes before scrypt', async () => {
  const handlers = createProjectsHandlers({ env });
  for (const route of ['login', 'session', 'logout']) {
    const response = await handlers[route](request(route, { method: route === 'session' ? 'POST' : 'GET' }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), route === 'session' ? 'GET' : 'POST');
  }
  for (const [options, expected] of [
    [{ body: 'not-json' }, 400], [{ body: '[]' }, 400], [{ body: 'null' }, 400], [{ body: { password: 1 } }, 400],
    [{ body: { password, extra: 'field' } }, 400], [{ body: { password: '' } }, 400], [{ body: { password: 'é'.repeat(300) } }, 400],
    [{ body: ' '.repeat(2049) }, 413], [{ headers: { 'Content-Length': '9999' } }, 413],
    [{ headers: { 'Content-Type': 'text/plain' } }, 415], [{ headers: { 'Content-Encoding': 'gzip' } }, 415],
  ]) assert.equal((await handlers.login(request('login', options))).status, expected);
  const invalidUtf8 = new Request(`${PROJECTS_ORIGIN}/api/proyectos/login`, { method: 'POST', headers: { Origin: PROJECTS_ORIGIN, 'Content-Type': 'application/json', 'X-CEDHU-Projects': '1' }, body: Buffer.from([0xff]) });
  assert.equal((await handlers.login(invalidUtf8)).status, 400);
  assert.equal((await handlers.logout(request('logout', { body: { extra: true } }))).status, 400);
});

test('counts actual streamed bytes even without Content-Length', async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(1024));
      controller.enqueue(new Uint8Array(1025));
      controller.close();
    },
  });
  const req = new Request(`${PROJECTS_ORIGIN}/api/proyectos/login`, {
    method: 'POST', duplex: 'half', body,
    headers: { Origin: PROJECTS_ORIGIN, 'Content-Type': 'application/json', 'X-CEDHU-Projects': '1' },
  });
  assert.equal((await createProjectsHandlers({ env }).login(req)).status, 413);
});

test('limits concurrent scrypt resource use per instance, without claiming a distributed rate limit', async () => {
  const handlers = createProjectsHandlers({ env });
  const responses = await Promise.all(Array.from({ length: 3 }, () => handlers.login(request('login'))));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 200, 429]);
  assert.equal(responses.find(response => response.status === 429).headers.get('retry-after'), '10');
});

test('all success and failure responses prohibit caching and cross-origin data sharing', async () => {
  const handlers = createProjectsHandlers({ env });
  const responses = [handlers.session(request('session')), handlers.session(request('session', { cookie: fixtureCookie })),
    await handlers.logout(request('logout')), await handlers.login(request('login', { body: {} }))];
  for (const response of responses) {
    for (const header of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control']) assert(response.headers.get(header).includes('no-store'));
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
  }
});

test('local HTTP exception is available only in explicit non-Vercel development', async () => {
  const req = request('login', { origin: 'http://localhost:3000' });
  const response = await createProjectsHandlers({ env: { ...env, NODE_ENV: 'development' } }).login(req);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /^cedhu-proyectos-dev=/);
  assert(!response.headers.get('set-cookie').includes('Secure'));
  for (const settings of [{ ...env, NODE_ENV: 'production' }, { ...env, NODE_ENV: 'development', VERCEL: '1' }]) {
    assert.equal(createProjectsHandlers({ env: settings }).session(request('session', { origin: 'http://localhost:3000' })).status, 403);
  }
});

test('Vercel has three executable Web Standard entry points, isolated from CMS', async () => {
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(vercel.functions['api/proyectos/*.js'].maxDuration, 15);
  for (const route of ['login', 'session', 'logout']) {
    const module = await import(`../../api/proyectos/${route}.js`);
    assert.equal(typeof module.default.fetch, 'function');
  }
  for (const path of ['/proyectos/:path*', '/api/proyectos/:path*']) {
    const rule = vercel.headers.find(rule => rule.source === path);
    assert(rule.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store')));
  }
  const pageHeaders = vercel.headers.find(rule => rule.source === '/proyectos/:path*').headers;
  assert(pageHeaders.some(header => header.key === 'Content-Security-Policy' && header.value.includes("frame-ancestors 'none'")));
});
