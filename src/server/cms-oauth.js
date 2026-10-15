import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const repository = 'Cedhu-Sog/website-2027';
const cookieName = '__Secure-cedhu-cms-oauth';
const cookiePath = '/api/cms';
const lifetime = 600;

function settings(env) {
  const origin = new URL(env.CMS_ORIGIN || '');
  if (origin.protocol !== 'https:' || origin.origin !== env.CMS_ORIGIN || origin.username || origin.password) throw new Error('configuration');
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET || !/^[a-f0-9]{64}$/i.test(env.CMS_OAUTH_COOKIE_SECRET || '')) throw new Error('configuration');
  return { origin, clientId: env.GITHUB_OAUTH_CLIENT_ID, clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET, key: Buffer.from(env.CMS_OAUTH_COOKIE_SECRET, 'hex') };
}

function seal(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function unseal(value, key) {
  const bytes = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}

function headers(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

function cookie(value, age) {
  return `${cookieName}=${value}; Path=${cookiePath}; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
}

function fail(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

function requestUrl(req, origin) {
  // Never derive the redirect URI or allowed origin from forwarded headers/query strings.
  if (req.headers.host !== origin.host) throw new Error('origin');
  return new URL(req.url, origin);
}

/** Native Decap popup protocol. Only its opener at the configured origin receives a token. */
function complete(res, origin, result, success) {
  const nonce = randomBytes(24).toString('base64');
  const message = `authorization:github:${success ? 'success' : 'error'}:${JSON.stringify(result)}`;
  const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Acceso al CEDHU</title></head><body><p>Regresa al panel del CEDHU. Si esta ventana no se cierra, ciérrala e intenta acceder de nuevo.</p><script nonce="${nonce}">
const origin = ${json(origin)};
const opener = window.opener;
function receive(event) {
  if (event.origin !== origin || event.source !== opener || event.data !== 'authorizing:github') return;
  window.removeEventListener('message', receive);
  opener.postMessage(${json(message)}, origin);
  window.close();
}
if (opener) { window.addEventListener('message', receive); opener.postMessage('authorizing:github', origin); }
</script></body></html>`);
}

/** Dependency injection is used only by local security tests; deployed routes use real GitHub. */
export function createOAuthHandlers({ env = process.env, fetcher = fetch, now = Date.now } = {}) {
  async function auth(req, res) {
    headers(res);
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return fail(res, 405, 'Método no permitido.'); }
    let config;
    try { config = settings(env); } catch { return fail(res, 503, 'El acceso al CMS requiere configuración del servidor. Consulta la guía de administración.'); }
    try {
      const url = requestUrl(req, config.origin);
      if (req.headers.origin && req.headers.origin !== config.origin.origin) throw new Error('origin');
      if (req.headers.referer && new URL(req.headers.referer).origin !== config.origin.origin) throw new Error('origin');
      if (url.searchParams.get('provider') !== 'github' || url.searchParams.get('site_id') !== config.origin.hostname) throw new Error('origin');
      const state = randomBytes(32).toString('base64url');
      const verifier = randomBytes(32).toString('base64url');
      res.setHeader('Set-Cookie', cookie(seal({ state, verifier, expiresAt: now() + lifetime * 1000 }, config.key), lifetime));
      const target = new URL('https://github.com/login/oauth/authorize');
      target.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: `${config.origin.origin}/api/cms/callback`, scope: 'public_repo', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
      res.statusCode = 302;
      res.setHeader('Location', target.href);
      res.end();
    } catch { return fail(res, 403, 'Origen de acceso no permitido. Abre el panel desde su dirección oficial.'); }
  }

  async function callback(req, res) {
    headers(res);
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return fail(res, 405, 'Método no permitido.'); }
    let config;
    try { config = settings(env); } catch { return fail(res, 503, 'El acceso al CMS requiere configuración del servidor.'); }
    res.setHeader('Set-Cookie', cookie('', 0));
    let session;
    let url;
    try {
      url = requestUrl(req, config.origin);
      const raw = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
      if (!raw) throw new Error('state');
      session = unseal(raw, config.key);
      const state = url.searchParams.get('state') || '';
      if (!session.state || state.length !== session.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(session.state)) || session.expiresAt < now()) throw new Error('state');
    } catch { return fail(res, 403, 'La solicitud de acceso es inválida o venció. Vuelve a iniciar sesión.'); }
    if (url.searchParams.has('error')) return complete(res, config.origin.origin, { message: 'La autorización de GitHub fue cancelada.' }, false);
    const code = url.searchParams.get('code');
    if (!code || code.length > 512) return fail(res, 400, 'Falta el código de autorización.');
    try {
      const tokenResponse = await fetcher('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: `${config.origin.origin}/api/cms/callback`, code_verifier: session.verifier }),
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
      if (!tokenResponse.ok) throw new Error('github');
      const token = await tokenResponse.json();
      if (!token.access_token || token.error || !String(token.scope).split(/[ ,]+/).includes('public_repo')) throw new Error('github');
      const options = { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(10000), redirect: 'error' };
      const [repoResponse, userResponse] = await Promise.all([
        fetcher(`https://api.github.com/repos/${repository}`, options), fetcher('https://api.github.com/user', options),
      ]);
      if (!repoResponse.ok || !userResponse.ok) throw new Error('permissions');
      const repo = await repoResponse.json();
      const user = await userResponse.json();
      const allowedUsers = (env.CMS_GITHUB_ALLOWED_USERS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if (repo.full_name?.toLowerCase() !== repository.toLowerCase() || !repo.permissions?.push || (allowedUsers.length && !allowedUsers.includes(user.login?.toLowerCase()))) {
        // Revoke a newly issued token that cannot be used by the CMS.
        await fetcher(`https://api.github.com/applications/${config.clientId}/token`, {
          method: 'DELETE', headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token.access_token }), signal: AbortSignal.timeout(10000), redirect: 'error',
        }).catch(() => {});
        return complete(res, config.origin.origin, { message: 'Tu cuenta no está autorizada para editar el repositorio del CEDHU.' }, false);
      }
      return complete(res, config.origin.origin, { token: token.access_token, provider: 'github' }, true);
    } catch { return complete(res, config.origin.origin, { message: 'No fue posible verificar el acceso con GitHub. Contacta al responsable del sitio.' }, false); }
  }
  return { auth, callback };
}
