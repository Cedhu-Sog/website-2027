import { pathToFileURL } from 'node:url';
import { requireGoogleProduction } from '../../src/server/google/config.js';
import { runGoogleDiagnostic } from '../../src/server/google/diagnostic.js';

const CHECKS = ['configuration', 'federation', 'serviceAccount', 'drive', 'structure', 'catalog', 'users', 'audit'];

/** Explicit administrative build command, never part of the normal build.
 * Uses the real Production build OIDC identity, without activating a public
 * endpoint, saving a bearer, or returning resource/identity data to the browser.
 * Domain auto-assignment MUST be disabled and verified before creating the build.
 */
export async function probeBuild({ env = process.env, diagnose = runGoogleDiagnostic } = {}) {
  requireGoogleProduction(env);
  if (env.VERCEL_PROJECT_ID !== 'prj_fiyvmDyYqGoh8eRAKlY5FYZAHC8p' ||
      env.VERCEL_GIT_COMMIT_REF !== 'feature/proyectos-workspace-entrega1' ||
      env.PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED === 'true' ||
      env.PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN || env.PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT) {
    throw new Error('build_probe_preconditions');
  }
  const result = await diagnose({ env, signal: AbortSignal.timeout(25000) });
  const checks = {};
  for (const name of CHECKS) {
    const check = result.checks?.[name];
    if (!check) continue;
    checks[name] = { ok: check.ok === true };
    if (typeof check.code === 'string' && /^[a-z_]{1,64}$/.test(check.code)) checks[name].code = check.code;
  }
  return { probe: 'google_production_build',
    ok: CHECKS.every(name => checks[name]?.ok === true), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await probeBuild();
    process.stdout.write(JSON.stringify(result) + '\n');
    if (!result.ok) process.exitCode = 1;
  } catch {
    // A provider exception can contain credentials. Emit no raw error or stack.
    process.stdout.write(JSON.stringify({ probe: 'google_production_build', ok: false, code: 'build_probe_unavailable' }) + '\n');
    process.exitCode = 1;
  }
}
