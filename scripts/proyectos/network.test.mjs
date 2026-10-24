import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('../../src/scripts/utils/projects-network.ts', import.meta.url), 'utf8')).replace('export async function', 'async function') + '\nglobalThis.run = repositoryFetch;';
function environment(statuses, abort) {
  const calls = []; const delays = [];
  const context = { AbortSignal, DOMException, clearTimeout() {}, setTimeout(fn, delay) { delays.push(delay); queueMicrotask(() => { if (abort) abort.abort(); else fn(); }); return 1; },
    fetch: async (url, options) => { calls.push({ url, options }); return Response.json({}, { status: statuses.shift(), headers: { 'Retry-After': '300' } }); } };
  vm.runInNewContext(source, context); return { run: context.run, calls, delays };
}
test('temporary failures retry identical operation-keyed writes with bounded delays', async () => {
  const e = environment([503, 200]); const body = JSON.stringify({ action: 'commit', operation: 'synthetic' });
  assert.equal((await e.run('/api/proyectos/manage', { method: 'POST', body })).status, 200);
  assert.equal(e.calls.length, 2); assert.equal(e.delays[0], 30000); assert(e.calls.every(call => call.options.body === body && call.options.cache === 'no-store' && call.options.redirect === 'error'));
});
test('permission/validation failures do not retry and service failures stop after three attempts', async () => {
  for (const status of [400, 401, 403, 409]) { const e = environment([status]); assert.equal((await e.run('/api/proyectos/catalog')).status, status); assert.equal(e.calls.length, 1); }
  const e = environment([503, 503, 503]); assert.equal((await e.run('/api/proyectos/catalog')).status, 503); assert.equal(e.calls.length, 3); assert.equal(e.delays.length, 2);
});
test('closing the private area aborts a pending retry before another request', async () => {
  const abort = new AbortController(); const e = environment([503, 200], abort);
  await assert.rejects(e.run('/api/proyectos/catalog', { signal: abort.signal }), { name: 'AbortError' }); assert.equal(e.calls.length, 1);
});
