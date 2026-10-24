import test from 'node:test';
import assert from 'node:assert/strict';
import { probeBuild } from './google-build-probe.mjs';

const env = { VERCEL: '1', VERCEL_ENV: 'production',
  VERCEL_PROJECT_ID: 'prj_fiyvmDyYqGoh8eRAKlY5FYZAHC8p',
  VERCEL_GIT_COMMIT_REF: 'feature/proyectos-workspace-entrega1',
  PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: 'false' };
const names = ['configuration', 'federation', 'serviceAccount', 'drive', 'structure', 'catalog', 'users', 'audit'];

test('administrative build probe refuses Preview, another project/branch and an activated HTTP diagnostic before network', async () => {
  for (const override of [
    { VERCEL_ENV: 'preview' }, { VERCEL: '' }, { VERCEL_TARGET_ENV: 'staging' },
    { VERCEL_PROJECT_ID: 'prj_Other' }, { VERCEL_GIT_COMMIT_REF: 'master' },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: 'true' },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: 'synthetic-secret' },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: 'synthetic-expiry' },
  ]) await assert.rejects(() => probeBuild({ env: { ...env, ...override },
    diagnose: () => assert.fail('must not contact Google') }));
});

test('build probe reports only known boolean checks and safe codes; missing/failed checks never pass', async () => {
  const checks = Object.fromEntries(names.map(name => [name, { ok: true, token: 'synthetic-private-value' }]));
  const run = data => probeBuild({ env, diagnose: async ({ signal }) => {
    assert(signal instanceof AbortSignal);
    return { ...data, token: 'synthetic-private-value' };
  } });
  const good = await run({ checks: { ...checks, unknown: { ok: true } } });
  assert.equal(good.ok, true);
  assert.deepEqual(Object.keys(good.checks), names);
  assert(!JSON.stringify(good).includes('synthetic-private-value'));
  assert.equal((await run({ checks: { configuration: { ok: true } } })).ok, false);
  const failed = await run({ checks: { ...checks, federation: { ok: false, code: 'federation_exchange_failed', response: 'synthetic-private-value' } } });
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.checks.federation, { ok: false, code: 'federation_exchange_failed' });
});
