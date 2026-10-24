import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceRepository } from './fixtures/performance.mjs';
import { fixtureEnv, syntheticTeacher } from './fixtures/repository.mjs';
import { authorizedWorkspaceRole, createWorkspaceHandlers } from '../../src/server/proyectos-google-auth.js';
import { openProjectStore } from '../../src/server/google/project-store.js';
import { createProjectHandlers } from '../../src/server/projects/handlers.js';
import { sealWorkspaceCookie } from '../../src/server/proyectos-workspace-session.js';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';

test('request-local reuse checks structure once but reads current user roles on every request, including revocation', async () => {
  const e = performanceRepository(); let active = true;
  const env = { ...fixtureEnv, PROYECTOS_GOOGLE_DOMAIN: 'example.invalid', PROYECTOS_GOOGLE_OAUTH_CLIENT_ID: 'synthetic.apps.googleusercontent.com', PROYECTOS_GOOGLE_OAUTH_CLIENT_SECRET: 'synthetic_secret_0000000' };
  const raw = e.clientFactory;
  const clientFactory = options => {
    const client = raw(options); const request = client.request;
    client.request = async opts => {
      const result = await request(opts);
      if (!active && opts.url.includes(env.PROYECTOS_AUTH_SPREADSHEET_ID) && decodeURIComponent(opts.url).includes('A2:E')) result.data.values[0][4] = 'INACTIVO';
      return result;
    };
    return client;
  };
  const guard = createWorkspaceHandlers({ env, roleLookup: opts => authorizedWorkspaceRole({ ...opts, clientFactory }) }).requireSession;
  const handler = createProjectHandlers({ requireSession: guard, storeFactory: opts => openProjectStore({ ...opts, env, clientFactory }) }).catalog;
  const now = Math.floor(Date.now() / 1000);
  const cookie = sealWorkspaceCookie({ v: 1, ...syntheticTeacher, iat: now, exp: now + 3600 }, Buffer.from(env.PROYECTOS_SESSION_SECRET, 'hex'), 'cedhu-google-session-v2');
  const req = () => new Request(PROJECTS_ORIGIN + '/api/proyectos/catalog', { headers: { cookie: '__Host-cedhu-proyectos=' + cookie } });
  const response = await handler(req()); assert.equal(response.status, 200); assert.equal(e.calls.length, 11); assert.equal(e.authentications, 1);
  const timing = response.headers.get('X-CEDHU-Timing');
  for (const phase of ['google_auth', 'drive', 'sheets', 'authorization', 'catalog', 'search', 'server']) assert(timing.includes(phase + ';dur='));
  for (const secret of [cookie, syntheticTeacher.email, syntheticTeacher.sub, 'synthetic_catalog_000', 'Investigación']) assert(!timing.includes(secret));
  active = false;
  assert.equal((await handler(req())).status, 403);
  assert.equal(e.calls.length, 18); assert.equal(e.authentications, 2, 'no credential/context cache crosses requests');
});

test('unverified file location or service identity still fails before any academic row read', async () => {
  for (const mismatch of ['identity', 'catalog']) {
    const e = performanceRepository(); const factory = e.clientFactory;
    const clientFactory = opts => {
      const client = factory(opts); const request = client.request;
      client.request = async options => {
        const result = await request(options);
        if (mismatch === 'identity' && options.url.endsWith('/about')) result.data.user.emailAddress = 'wrong@example.invalid';
        if (mismatch === 'catalog' && options.url.includes('/drive/v3/files/' + fixtureEnv.PROYECTOS_METADATA_SPREADSHEET_ID)) result.data.parents = ['outside_synthetic'];
        return result;
      };
      return client;
    };
    const context = {};
    if (mismatch === 'identity') await assert.rejects(() => authorizedWorkspaceRole({ env: e.env, ...syntheticTeacher, clientFactory, context }));
    else {
      await authorizedWorkspaceRole({ env: e.env, ...syntheticTeacher, clientFactory, context });
      await assert.rejects(() => openProjectStore({ env: e.env, clientFactory, context }));
    }
    assert(!e.calls.some(c => c.path.includes('A2%3AR')));
  }
});
