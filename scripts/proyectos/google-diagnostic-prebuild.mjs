import { pathToFileURL } from 'node:url';
import { diagnosticAccess } from '../../src/server/google/diagnostic-access.js';
import { googleRepositoryConfig, requireGoogleProduction } from '../../src/server/google/config.js';

export function validateDiagnosticBuild(env = process.env, now = Date.now()) {
  if (env.PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED !== 'true') return;
  // Invalid active settings must fail BEFORE a deployment can replace Production.
  // Fixed errors only: never serialize environment, credentials or library errors.
  if (!diagnosticAccess(env, now)) throw new Error('diagnostic_activation_invalid');
  try { requireGoogleProduction(env); googleRepositoryConfig(env); }
  catch { throw new Error('diagnostic_server_configuration_invalid'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { validateDiagnosticBuild(); }
  catch { console.error('FAIL: diagnostic_activation_invalid. No se publica esta configuracion.'); process.exitCode = 1; }
}
