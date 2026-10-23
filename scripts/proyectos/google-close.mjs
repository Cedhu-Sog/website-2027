import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';
import { dirname, delimiter, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const state = resolve(root, '.vercel/phase-b-2');
const manifestPath = resolve(state, 'closure.json');
const baseline = '18d6047d80da48c6d1d3161cd4185a5f2853db42';
const existing = ['package.json', 'vercel.json', 'scripts/proyectos/google-check.mjs', 'scripts/proyectos/google.test.mjs'];
const temporary = ['api/proyectos/google-diagnostic.js', 'src/server/google/diagnostic.js', 'src/server/google/diagnostic-access.js',
  'scripts/proyectos/google-diagnostic-prebuild.mjs', 'scripts/proyectos/google-session.ps1', 'scripts/proyectos/google-close.mjs'];
const paths = [...existing, ...temporary];
const hash = data => data === null ? null : createHash('sha256').update(data).digest('hex');
const target = path => { const value = resolve(root, path); assert(value.startsWith(root + sep)); return value; };
async function contents(path) { try { return await readFile(target(path)); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function put(path, data) {
  if (data === null) await unlink(target(path)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  else await writeFile(target(path), data);
}

const mode = process.argv[2];
assert.equal(process.argv.length, 3);
assert(['--prepare', '--check', '--self-test', '--apply'].includes(mode));
if (mode === '--prepare') {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), baseline);
  await mkdir(state, { recursive: true });
  const files = [];
  for (const path of paths) {
    const active = await contents(path);
    assert(active, `Missing prepared component: ${path}`);
    const closed = existing.includes(path) ? execFileSync('git', ['show', `${baseline}:${path}`], { cwd: root }) : null;
    files.push({ path, activeHash: hash(active), closedHash: hash(closed), closed: closed?.toString('base64') ?? null });
  }
  await writeFile(manifestPath, JSON.stringify({ baseline, preparedAt: new Date().toISOString(), files }, null, 2) + '\n');
  console.log('PASS: exact closed baseline prepared for ten explicit paths; no reset, push or deployment.');
} else {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.baseline, baseline);
  assert.deepEqual(manifest.files.map(file => file.path), paths);
  for (const file of manifest.files) {
    assert.equal(hash(file.closed === null ? null : Buffer.from(file.closed, 'base64')), file.closedHash);
    const current = hash(await contents(file.path));
    assert(current === file.activeHash || current === file.closedHash, `Changed after preparation; preserve and review: ${file.path}`);
  }
  if (mode === '--check') console.log('PASS: prepared closure matches every current component.');
  else {
    if (mode === '--apply') {
      const control = JSON.parse((await readFile(resolve(state, 'control.json'), 'utf8')).replace(/^\uFEFF/, ''));
      assert(control.phase === 'B2' && control.closed === true && control.ready === false);
    }
    const active = new Map(await Promise.all(paths.map(async path => [path, await contents(path)])));
    try {
      for (const file of manifest.files) await put(file.path, file.closed === null ? null : Buffer.from(file.closed, 'base64'));
      for (const file of manifest.files) assert.equal(hash(await contents(file.path)), file.closedHash);
      if (mode === '--self-test') {
        const nodeDir = dirname(process.execPath);
        const npm = resolve(nodeDir, 'node_modules/npm/bin/npm-cli.js');
        const run = spawnSync(process.execPath, [npm, 'run', 'test:proyectos:google'], { cwd: root, encoding: 'utf8', timeout: 30000,
          env: { ...process.env, PATH: `${nodeDir}${delimiter}${process.env.PATH}` } });
        await writeFile(resolve(state, 'closure-tests.log'), (run.stdout || '') + (run.stderr || ''));
        assert.equal(run.status, 0);
        assert.match(run.stdout, /# tests 13\b/);
        assert.match(run.stdout, /# fail 0\b/);
        console.log('PASS: exact closed files verified; 13/13 baseline tests; restoring prepared activation files.');
      } else console.log('PASS: diagnostic retired locally; publish this clean closure and verify Production.');
    } finally {
      if (mode === '--self-test') for (const [path, data] of active) await put(path, data);
    }
    if (mode === '--self-test') for (const file of manifest.files) assert.equal(hash(await contents(file.path)), file.activeHash);
  }
}
