import { verifyPassword } from './proyectos-password.js';
import { allowedRequest, issueSession, projectsConfig, projectsJson, requireProjectsSession, sessionCookie } from './proyectos-session.js';

const BODY_LIMIT = 2048;

class InvalidBody extends Error {
  constructor(status) { super('request'); this.status = status; }
}

async function jsonBody(request) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) throw new InvalidBody(415);
  if (request.headers.has('content-encoding') && request.headers.get('content-encoding') !== 'identity') throw new InvalidBody(415);
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) throw new InvalidBody(413);
  if (!request.body) throw new InvalidBody(400);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new InvalidBody(408)), 5000); });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) throw new InvalidBody(413);
      chunks.push(Buffer.from(value));
    }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidBody(400);
    return value;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error instanceof InvalidBody ? error : new InvalidBody(400);
  } finally { clearTimeout(timer); }
}

export function createProjectsHandlers({ env = process.env, now = Date.now } = {}) {
  // Resource guard ONLY for concurrent scrypt work in this function instance.
  // Distributed brute-force prevention must be configured in Vercel Firewall.
  let activeVerifications = 0;

  async function mutate(request, action) {
    if (request.method !== 'POST') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'POST' });
    let config;
    try { config = projectsConfig(env, request); }
    catch { return projectsJson({ message: 'El acceso no está disponible temporalmente.' }, 503); }
    if (!allowedRequest(request, config, true)) return projectsJson({ message: 'Solicitud no permitida.' }, 403);
    let body;
    try { body = await jsonBody(request); }
    catch (error) { return projectsJson({ message: 'La solicitud no es válida. Intenta nuevamente.' }, error.status || 400); }
    return action(body, config);
  }

  function login(request) {
    return mutate(request, async (body, config) => {
      if (Object.keys(body).length !== 1 || typeof body.password !== 'string' || !body.password.length || Buffer.byteLength(body.password) > 512) {
        return projectsJson({ message: 'Escribe una contraseña válida.' }, 400);
      }
      if (activeVerifications >= 2) return projectsJson({ message: 'Espera un momento antes de intentar nuevamente.' }, 429, { 'Retry-After': '10' });
      activeVerifications++;
      try {
        if (!await verifyPassword(body.password, config.passwordHash)) return projectsJson({ message: 'Contraseña incorrecta. Intenta nuevamente.' }, 401);
        return projectsJson({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(issueSession(config, now()), config) });
      } catch { return projectsJson({ message: 'El acceso no está disponible temporalmente.' }, 503); }
      finally { activeVerifications--; }
    });
  }

  function session(request) {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = requireProjectsSession(request, { env, now });
    if (access instanceof Response) return access;
    // This initial private content is delivered ONLY after server authentication.
    return projectsJson({
      authenticated: true,
      expiresAt: access.session.exp * 1000,
      title: 'Repositorio de investigación CEDHU',
      welcome: 'Bienvenido al repositorio institucional de proyectos de investigación.',
      message: 'El repositorio de proyectos estará disponible próximamente.',
    });
  }

  function logout(request) {
    return mutate(request, (body, config) => {
      if (Object.keys(body).length) return projectsJson({ message: 'La solicitud no es válida.' }, 400);
      return projectsJson({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie('', config, 0) });
    });
  }

  return { login, session, logout };
}
