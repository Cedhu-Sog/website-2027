// Server only: import from api/ or other src/server/ modules, never from Astro.
export const GOOGLE_IDENTITY = Object.freeze({
  projectId: 'cedhu-repositorio',
  serviceAccount: 'cedhu-repositorio-backend@cedhu-repositorio.iam.gserviceaccount.com',
  pool: 'vercel-cedhu-prod',
  provider: 'vercel-team-cedhu',
  issuer: 'https://oidc.vercel.com/cedhu-webmasters-projects',
  audience: 'https://vercel.com/cedhu-webmasters-projects',
  subject: 'owner:cedhu-webmasters-projects:project:website-2027:environment:production',
});

// Confirmed by the repository administrators. Compare exact order and spelling;
// these are schema labels only, never project/user/activity records.
const SHEETS = [
  { key: 'catalog', variable: 'PROYECTOS_METADATA_SPREADSHEET_ID', name: 'Catalogo_Proyectos', tab: 'Proyectos', headers: [
    'id_proyecto', 'anio', 'grado', 'titulo', 'autores', 'docente_asesor', 'area', 'resumen', 'palabras_clave',
    'id_pdf_drive', 'nombre_pdf', 'hash_pdf', 'fecha_registro', 'registrado_por', 'fecha_modificacion', 'modificado_por', 'estado', 'id_lote',
  ] },
  { key: 'users', variable: 'PROYECTOS_AUTH_SPREADSHEET_ID', name: 'Usuarios_Autorizados', tab: 'Usuarios', headers: [
    'correo_institucional', 'google_id', 'nombre_completo', 'rol', 'estado', 'fecha_alta', 'registrado_por', 'ultimo_acceso', 'fecha_baja',
  ] },
  { key: 'audit', variable: 'PROYECTOS_AUDIT_SPREADSHEET_ID', name: 'Registro_Actividad', tab: 'Actividad', headers: [
    'id_evento', 'fecha_hora', 'usuario_email', 'usuario_google_id', 'accion', 'id_proyecto', 'id_lote', 'detalles', 'resultado',
  ] },
];

export class GoogleConnectionError extends Error {
  constructor(code, variables = []) {
    super(code);
    this.code = code;
    this.variables = variables;
  }
}

function required(env, name, pattern) {
  const value = env[name];
  if (typeof value !== 'string' || !value) throw new GoogleConnectionError('configuration_missing', [name]);
  if (value !== value.trim() || !pattern.test(value)) throw new GoogleConnectionError('configuration_invalid', [name]);
  return value;
}

export function googleIdentityConfig(env = process.env) {
  const fixed = {
    GCP_PROJECT_ID: GOOGLE_IDENTITY.projectId,
    GCP_SERVICE_ACCOUNT_EMAIL: GOOGLE_IDENTITY.serviceAccount,
    GCP_WORKLOAD_IDENTITY_POOL_ID: GOOGLE_IDENTITY.pool,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: GOOGLE_IDENTITY.provider,
  };
  for (const [name, expected] of Object.entries(fixed)) {
    required(env, name, /^\S+$/);
    if (env[name] !== expected) throw new GoogleConnectionError('configuration_invalid', [name]);
  }
  const projectNumber = required(env, 'GCP_PROJECT_NUMBER', /^[1-9]\d{5,19}$/);
  return Object.freeze({
    projectId: fixed.GCP_PROJECT_ID,
    serviceAccount: fixed.GCP_SERVICE_ACCOUNT_EMAIL,
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${fixed.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${fixed.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
  });
}

export function requireGoogleProduction(env = process.env) {
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'production' ||
      (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'production')) {
    throw new GoogleConnectionError('production_required');
  }
  return required(env, 'VERCEL_PROJECT_ID', /^prj_[A-Za-z0-9]+$/);
}

export function googleRepositoryConfig(env = process.env) {
  const identity = googleIdentityConfig(env);
  const idPattern = /^[A-Za-z0-9_-]{10,200}$/;
  const rootId = required(env, 'PROYECTOS_DRIVE_ROOT_ID', idPattern);
  const sheets = SHEETS.map(({ key, variable, name, tab, headers }) => ({
    key, id: required(env, variable, idPattern), name, tab, headers: [...headers],
  }));
  if (new Set([rootId, ...sheets.map(sheet => sheet.id)]).size !== 4) {
    throw new GoogleConnectionError('configuration_duplicate_ids');
  }
  return { identity, rootId, sheets };
}

// Never return a raw library error: it may carry tokens, HTTP headers and bodies.
export function safeGoogleFailure(error) {
  if (error instanceof GoogleConnectionError) return { code: error.code, ...(error.variables.length ? { variables: error.variables } : {}) };
  const status = Number(error?.response?.status);
  const reasons = error?.response?.data?.error?.details;
  if (Array.isArray(reasons) && reasons.some(item => item?.reason === 'SERVICE_DISABLED')) return { code: 'google_api_disabled' };
  if (Array.isArray(reasons) && reasons.some(item => item?.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT')) return { code: 'google_scope_insufficient' };
  if (status === 401) return { code: 'google_unauthorized' };
  if (status === 403) return { code: 'google_forbidden' };
  if (status === 404) return { code: 'google_not_found_or_inaccessible' };
  if (status === 429) return { code: 'google_rate_limited' };
  if (error?.name === 'AbortError' || error?.code === 'ETIMEDOUT') return { code: 'google_timeout' };
  return { code: 'google_unavailable' };
}
