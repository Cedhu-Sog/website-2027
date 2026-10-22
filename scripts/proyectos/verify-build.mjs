import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { hashPassword } from '../../src/server/proyectos-password.js';
import { GOOGLE_IDENTITY } from '../../src/server/google/config.js';

// Real resource IDs stay in ignored local configuration or Vercel environment
// variables. Scan both public output and files eligible for Git, without ever
// printing the values. Missing local configuration is normal in CI.
let localConfiguration = {};
try { localConfiguration = parseEnv(await readFile('.env.local', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const privateNames = [
  'GCP_PROJECT_NUMBER',
  'PROYECTOS_DRIVE_ROOT_ID', 'PROYECTOS_METADATA_SPREADSHEET_ID',
  'PROYECTOS_AUTH_SPREADSHEET_ID', 'PROYECTOS_AUDIT_SPREADSHEET_ID',
  'PROYECTOS_PASSWORD_HASH', 'PROYECTOS_SESSION_SECRET',
  'PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN', 'CMS_OAUTH_COOKIE_SECRET',
  'GITHUB_OAUTH_CLIENT_SECRET', 'VERCEL_OIDC_TOKEN',
];
const privateValues = [...new Set(privateNames.flatMap(name => [localConfiguration[name], process.env[name]]).filter(value => typeof value === 'string' && value.length))];
const sourceFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
assert(!sourceFiles.includes('.env.local'), 'La configuración local debe permanecer excluida de Git.');
for (const file of sourceFiles) {
  let data;
  try { data = await readFile(file); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const value of privateValues) assert(!data.includes(Buffer.from(value)), `Valor reservado encontrado en archivo versionable: ${file}`);
}

// Build with synthetic, fresh secrets to catch accidental bundling/inlining.
// Portal secrets are overridden with fixtures; existing .env files stay untouched.
const password = randomBytes(32).toString('base64url');
const passwordHash = await hashPassword(password);
const secret = randomBytes(32).toString('hex');
const googleSettings = {
  GCP_PROJECT_ID: GOOGLE_IDENTITY.projectId,
  GCP_PROJECT_NUMBER: '987654321098',
  GCP_SERVICE_ACCOUNT_EMAIL: GOOGLE_IDENTITY.serviceAccount,
  GCP_WORKLOAD_IDENTITY_POOL_ID: GOOGLE_IDENTITY.pool,
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: GOOGLE_IDENTITY.provider,
  PROYECTOS_DRIVE_ROOT_ID: randomBytes(20).toString('base64url'),
  PROYECTOS_METADATA_SPREADSHEET_ID: randomBytes(20).toString('base64url'),
  PROYECTOS_AUTH_SPREADSHEET_ID: randomBytes(20).toString('base64url'),
  PROYECTOS_AUDIT_SPREADSHEET_ID: randomBytes(20).toString('base64url'),
  PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: randomBytes(32).toString('hex'),
  VERCEL_OIDC_TOKEN: randomBytes(48).toString('base64url'),
};
const cmsSettings = {
  CMS_OAUTH_COOKIE_SECRET: randomBytes(32).toString('hex'),
  GITHUB_OAUTH_CLIENT_SECRET: randomBytes(32).toString('base64url'),
};
assert(process.env.npm_execpath, 'Ejecuta mediante npm run check:proyectos:build.');
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, ...googleSettings, ...cmsSettings,
      PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: 'false',
      PROYECTOS_PASSWORD_HASH: passwordHash, PROYECTOS_SESSION_SECRET: secret },
  });
  child.on('error', reject);
  child.on('exit', resolve);
});
assert.equal(exitCode, 0, 'npm run build debe completar correctamente.');

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]))).flat();
}
const forbidden = [password, passwordHash, secret, ...privateValues, ...Object.keys(googleSettings), ...Object.values(googleSettings),
  ...Object.keys(cmsSettings), ...Object.values(cmsSettings),
  '@vercel/oidc', 'google-auth-library', '/api/proyectos/google-diagnostic',
  'PROYECTOS_PASSWORD_HASH', 'PROYECTOS_SESSION_SECRET',
  'Repositorio de investigación CEDHU', 'Bienvenido al repositorio institucional de proyectos de investigación.',
  'El repositorio de proyectos estará disponible próximamente.'];
let count = 0;
for (const file of await files('dist')) {
  const data = await readFile(file);
  for (const value of forbidden) assert(!data.includes(Buffer.from(value)), `Contenido reservado encontrado en ${file}`);
  count++;
}
const html = await readFile('dist/proyectos/index.html', 'utf8');
assert(html.includes('name="robots" content="noindex, nofollow"'));
assert(html.includes('data-projects-form') && html.includes('type="password"'));
assert(!/<style\b|\bstyle\s*=/.test(html), 'La CSP exige CSS externo.');
assert(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(html), 'La CSP exige scripts externos.');
for (const file of (await files('dist')).filter(file => file.endsWith('.html') && !file.startsWith('dist/proyectos/'))) {
  const page = await readFile(file, 'utf8');
  assert(!/href=["']\/proyectos\//.test(page), `Enlace público al acceso encontrado en ${file}`);
}
console.log(`PASS: ${sourceFiles.length} archivos versionables sin los valores privados configurados; .env.local excluido de Git.`);
console.log(`PASS: ${count} archivos públicos sin contraseñas, tokens, identificadores reales o sintéticos ni contenido privado; acceso sin enlaces públicos y compatible con CSP.`);
