import { timingSafeEqual } from 'node:crypto';
import { allowedRequest, PROJECTS_ORIGIN, projectsJson } from '../proyectos-session.js';
import { authenticateGoogle, createGoogleClient } from './auth.js';
import { GoogleConnectionError, googleRepositoryConfig, requireGoogleProduction, safeGoogleFailure } from './config.js';
import { createGoogleRepository } from './repository.js';
import { diagnosticAccess, validDiagnosticToken } from './diagnostic-access.js';

async function hasEmptyBody(request) {
  if (!request.body) return true;
  const reader = request.body.getReader();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('body_timeout')), 1000); });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) return true;
      if (value.byteLength) return false;
    }
  } catch { return false; }
  finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

export async function runGoogleDiagnostic({ env = process.env, now = Date.now, signal,
  clientFactory = createGoogleClient, repositoryFactory = createGoogleRepository } = {}) {
  const checks = {};
  async function check(name, action) {
    try { const result = await action(); checks[name] = { ok: true }; return result; }
    catch (error) { checks[name] = { ok: false, ...safeGoogleFailure(error) }; throw error; }
  }
  try {
    const config = await check('configuration', () => { requireGoogleProduction(env); return googleRepositoryConfig(env); });
    const client = await check('federation', async () => {
      const value = clientFactory({ env, now, signal });
      await authenticateGoogle(value);
      return value;
    });
    const repository = repositoryFactory(client, config, { signal });
    await check('serviceAccount', () => repository.checkServiceAccount());
    await check('drive', () => repository.checkDrive());
    const systemFolderId = await check('structure', () => repository.checkStructure());
    // Report all three read failures independently, without returning values.
    await Promise.allSettled(config.sheets.map(sheet => check(sheet.key, () => repository.checkSheet(sheet.key, systemFolderId))));
  } catch { /* Failures are represented solely by safe diagnostic codes. */ }
  return { ok: Object.keys(checks).length === 8 && Object.values(checks).every(value => value.ok), checks };
}

/** Independent administrator capability, NOT the shared portal password.
 * Disabled unless all gates pass, including a short absolute expiry. Retire the
 * route and protect/delete old deployment URLs after the approved test.
 */
export function createGoogleDiagnosticHandler({ env = process.env, now = Date.now, diagnose = runGoogleDiagnostic,
  timeoutMs = 25000 } = {}) {
  let active = false;
  return async function googleDiagnostic(request) {
    const access = diagnosticAccess(env, now());
    if (!access) return projectsJson({ code: 'not_found' }, 404);
    const { token, expiresAt } = access;
    if (request.method !== 'POST') return projectsJson({ code: 'method_not_allowed' }, 405, { Allow: 'POST' });
    if (!allowedRequest(request, { origin: PROJECTS_ORIGIN })) return projectsJson({ code: 'forbidden' }, 403);
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ') || !validDiagnosticToken(authorization.slice(7)) ||
        !timingSafeEqual(Buffer.from(authorization.slice(7), 'hex'), Buffer.from(token, 'hex'))) {
      return projectsJson({ code: 'unauthorized' }, 401);
    }
    // No request body/query parameters are accepted, even for administrators.
    if (new URL(request.url).search || request.headers.has('content-encoding') ||
        (request.headers.has('content-length') && request.headers.get('content-length') !== '0') || !await hasEmptyBody(request)) {
      return projectsJson({ code: 'invalid_request' }, 400);
    }
    // Body validation can await a stream; never start Google after the deadline.
    if (now() >= expiresAt) return projectsJson({ code: 'not_found' }, 404);
    if (active) return projectsJson({ code: 'busy' }, 429, { 'Retry-After': '10' });
    active = true;
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new GoogleConnectionError('google_timeout')); }, Math.min(timeoutMs, expiresAt - now()));
      });
      const result = await Promise.race([diagnose({ env, now, signal: controller.signal }), timeout]);
      return projectsJson(result, result.ok ? 200 : 503);
    } catch (error) { return projectsJson({ ok: false, ...safeGoogleFailure(error) }, 503); }
    finally { clearTimeout(timer); controller.abort(); active = false; }
  };
}
