import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createOAuthHandlers } from '../../src/server/cms-oauth.js';

// Test fixtures are isolated from deployed environment and never call GitHub.
const origin = 'https://cms.example.test';
const env = { CMS_ORIGIN: origin, GITHUB_OAUTH_CLIENT_ID: 'test-client', GITHUB_OAUTH_CLIENT_SECRET: 'test-secret', CMS_OAUTH_COOKIE_SECRET: 'a'.repeat(64) };
const startPath = '/api/cms/auth?provider=github&site_id=cms.example.test&scope=repo';
function request(url, extra = {}) { return { method: 'GET', url, headers: { host: 'cms.example.test', ...extra } }; }
function response() {
  return { statusCode: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key] = value; }, end(body = '') { this.body = body; } };
}
async function start(handlers) {
  const res = response();
  await handlers.auth(request(startPath), res);
  assert.equal(res.statusCode, 302);
  return { cookie: res.headers['Set-Cookie'].split(';')[0], state: new URL(res.headers.Location).searchParams.get('state'), res };
}
function github({ push = true, login = 'editor', scope = 'public_repo', repository = 'Cedhu-Sog/website-2027', fail = false } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (fail) throw new Error('upstream unavailable');
    if (url.includes('/login/oauth/access_token')) return Response.json({ access_token: 'isolated-session-token', scope });
    if (url.includes('/repos/')) return Response.json({ full_name: repository, permissions: { push } });
    if (url.endsWith('/user')) return Response.json({ login });
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    throw new Error('unexpected request');
  };
  return { calls, fetcher };
}

test('fails closed when secrets are missing and permits only GET', async () => {
  const res = response();
  await createOAuthHandlers({ env: {} }).auth(request(startPath), res);
  assert.equal(res.statusCode, 503);
  assert(!res.body.includes('test-secret'));
  const post = response();
  await createOAuthHandlers({ env }).auth({ ...request(startPath), method: 'POST' }, post);
  assert.equal(post.statusCode, 405);
});

test('rejects insecure origins, malformed cookie keys, attacker host/origin/referrer/site/provider', async () => {
  for (const badEnv of [{ ...env, CMS_ORIGIN: 'http://cms.example.test' }, { ...env, CMS_ORIGIN: origin + '/' }, { ...env, CMS_OAUTH_COOKIE_SECRET: 'weak' }]) {
    const res = response(); await createOAuthHandlers({ env: badEnv }).auth(request(startPath), res); assert.equal(res.statusCode, 503);
  }
  const handlers = createOAuthHandlers({ env });
  for (const req of [request(startPath, { host: 'evil.test' }), request(startPath, { origin: 'https://evil.test' }), request(startPath, { referer: 'https://evil.test/admin/' }), request(startPath.replace('cms.example.test', 'evil.test')), request(startPath.replace('provider=github', 'provider=gitlab'))]) {
    const res = response(); await handlers.auth(req, res); assert.equal(res.statusCode, 403);
  }
});

test('pins repository scope and callback; uses fresh state, encrypted secure cookie and PKCE', async () => {
  const handlers = createOAuthHandlers({ env });
  const first = await start(handlers); const second = await start(handlers);
  assert.notEqual(first.state, second.state);
  const url = new URL(first.res.headers.Location);
  assert.equal(url.searchParams.get('scope'), 'public_repo');
  assert.equal(url.searchParams.get('redirect_uri'), origin + '/api/cms/callback');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge').length, 43);
  assert.match(first.res.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/);
  assert(!first.cookie.includes(first.state));
  assert(!first.res.headers.Location.includes(env.GITHUB_OAUTH_CLIENT_SECRET));
});

test('rejects missing, altered, expired state/cookies before contacting GitHub', async () => {
  const mock = github(); let clock = 0;
  const handlers = createOAuthHandlers({ env, fetcher: mock.fetcher, now: () => clock });
  const { cookie, state } = await start(handlers);
  const url = `/api/cms/callback?state=${state}&code=single-use-code`;
  for (const req of [request(url), request(url.replace(state, 'wrong'), { cookie }), request(url, { cookie: cookie.slice(0, -5) + 'xxxxx' }), request(url, { cookie, host: 'evil.test' })]) {
    const res = response(); await handlers.callback(req, res); assert.equal(res.statusCode, 403);
    assert.match(res.headers['Set-Cookie'], /Max-Age=0/);
  }
  clock = 601000;
  const expired = response(); await handlers.callback(request(url, { cookie }), expired);
  assert.equal(expired.statusCode, 403); assert.equal(mock.calls.length, 0);
});

test('handles cancellation without exchanging a token', async () => {
  const mock = github(); const handlers = createOAuthHandlers({ env, fetcher: mock.fetcher });
  const { cookie, state } = await start(handlers); const res = response();
  await handlers.callback(request(`/api/cms/callback?state=${state}&error=access_denied`, { cookie }), res);
  assert(res.body.includes('authorization:github:error:')); assert.equal(mock.calls.length, 0);
});

test('checks write permission and optional account allowlist, revoking rejected tokens', async () => {
  for (const options of [{ push: false }, { login: 'unlisted' }, { repository: 'other/repository' }]) {
    const mock = github(options); const handlers = createOAuthHandlers({ env: { ...env, CMS_GITHUB_ALLOWED_USERS: 'editor' }, fetcher: mock.fetcher });
    const { cookie, state } = await start(handlers); const res = response();
    await handlers.callback(request(`/api/cms/callback?state=${state}&code=single-use-code`, { cookie }), res);
    assert(res.body.includes('authorization:github:error:')); assert(!res.body.includes('isolated-session-token'));
    assert(mock.calls.some(call => call.options.method === 'DELETE'));
  }
});

test('does not deliver tokens on GitHub failure or incorrect scopes', async () => {
  for (const options of [{ fail: true }, { scope: 'read:user' }]) {
    const mock = github(options); const handlers = createOAuthHandlers({ env, fetcher: mock.fetcher });
    const { cookie, state } = await start(handlers); const res = response();
    await handlers.callback(request(`/api/cms/callback?state=${state}&code=single-use-code`, { cookie }), res);
    assert(res.body.includes('authorization:github:error:')); assert(!res.body.includes('isolated-session-token'));
  }
});

test('successful exchange uses PKCE and exact Decap popup handshake with origin AND source checks', async () => {
  const mock = github(); const handlers = createOAuthHandlers({ env, fetcher: mock.fetcher });
  const { cookie, state } = await start(handlers); const res = response();
  await handlers.callback(request(`/api/cms/callback?state=${state}&code=single-use-code`, { cookie }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store, max-age=0');
  assert(res.headers['Content-Security-Policy'].includes("script-src 'nonce-"));
  assert(!res.body.includes('test-secret'));
  assert.equal(mock.calls[0].options.body.get('client_secret'), 'test-secret');
  assert.equal(mock.calls[0].options.body.get('code_verifier').length, 43);
  const messages = []; let listener;
  const opener = { postMessage: (message, target) => messages.push({ message, target }) };
  const window = { opener, addEventListener: (_, callback) => { listener = callback; }, removeEventListener() {}, close() {} };
  vm.runInNewContext(res.body.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1], { window });
  assert.deepEqual(messages, [{ message: 'authorizing:github', target: origin }]);
  listener({ origin: 'https://evil.test', source: opener, data: 'authorizing:github' });
  listener({ origin, source: {}, data: 'authorizing:github' });
  assert.equal(messages.length, 1);
  listener({ origin, source: opener, data: 'authorizing:github' });
  assert.equal(messages.length, 2); assert.equal(messages[1].target, origin);
  assert(messages[1].message.startsWith('authorization:github:success:'));
});
