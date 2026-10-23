// Shared only by the temporary server handler and administrative Node tools.
// Do not trim, normalize, decode or silently repair administrator credentials.
export function validDiagnosticToken(value) {
  return typeof value === 'string' && value.length === 64 && !/[^a-f0-9]/.test(value);
}

export function diagnosticAccess(env, currentTime) {
  const expiry = env.PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT || '';
  const expiresAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(expiry) ? Date.parse(expiry) : NaN;
  const canonical = expiry.includes('.') ? expiry : expiry.replace('Z', '.000Z');
  if (env.PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED !== 'true' || env.VERCEL !== '1' || env.VERCEL_ENV !== 'production' ||
      (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'production') ||
      !Number.isFinite(expiresAt) || new Date(expiresAt).toISOString() !== canonical ||
      expiresAt <= currentTime || expiresAt - currentTime > 20 * 60 * 1000 ||
      !validDiagnosticToken(env.PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN)) return null;
  return { token: env.PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN, expiresAt };
}
