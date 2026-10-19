import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { hashPassword } from '../../src/server/proyectos-password.js';

// Build with synthetic, fresh secrets to catch accidental bundling/inlining.
// Portal secrets are overridden with fixtures; existing .env files stay untouched.
const password = randomBytes(32).toString('base64url');
const passwordHash = await hashPassword(password);
const secret = randomBytes(32).toString('hex');
assert(process.env.npm_execpath, 'Ejecuta mediante npm run check:proyectos:build.');
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, PROYECTOS_PASSWORD_HASH: passwordHash, PROYECTOS_SESSION_SECRET: secret },
  });
  child.on('error', reject);
  child.on('exit', resolve);
});
assert.equal(exitCode, 0, 'npm run build debe completar correctamente.');

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]))).flat();
}
const forbidden = [password, passwordHash, secret, 'PROYECTOS_PASSWORD_HASH', 'PROYECTOS_SESSION_SECRET',
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
console.log(`PASS: ${count} archivos públicos sin contraseña, hash, clave ni contenido privado; acceso sin enlaces públicos y compatible con CSP.`);
