import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { IdentityPoolClient } from 'google-auth-library';
import { authenticateGoogle, createGoogleClient, GOOGLE_READ_SCOPES } from '../../src/server/google/auth.js';
import { GOOGLE_IDENTITY, GoogleConnectionError, googleIdentityConfig, googleRepositoryConfig, safeGoogleFailure } from '../../src/server/google/config.js';
import { createGoogleDiagnosticHandler, runGoogleDiagnostic } from '../../src/server/google/diagnostic.js';
import { createGoogleRepository } from '../../src/server/google/repository.js';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';
import { validDiagnosticToken } from '../../src/server/google/diagnostic-access.js';
import { validateDiagnosticBuild } from './google-diagnostic-prebuild.mjs';

// Synthetic IDs/tokens, confirmed schema labels, no records or real service calls.
const start = Date.now();
const id = () => randomBytes(18).toString('base64url');
const env = {
  VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_OfflineFixture',
  GCP_PROJECT_ID: GOOGLE_IDENTITY.projectId, GCP_PROJECT_NUMBER: '123456789012',
  GCP_SERVICE_ACCOUNT_EMAIL: GOOGLE_IDENTITY.serviceAccount,
  GCP_WORKLOAD_IDENTITY_POOL_ID: GOOGLE_IDENTITY.pool, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: GOOGLE_IDENTITY.provider,
  PROYECTOS_DRIVE_ROOT_ID: id(), PROYECTOS_METADATA_SPREADSHEET_ID: id(), PROYECTOS_AUTH_SPREADSHEET_ID: id(), PROYECTOS_AUDIT_SPREADSHEET_ID: id(),
  PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: 'true', PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: randomBytes(32).toString('hex'),
  PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: new Date(start + 1200000).toISOString(),
};
const now = () => start;
const config = googleRepositoryConfig(env);
const payload = { iss: GOOGLE_IDENTITY.issuer, aud: GOOGLE_IDENTITY.audience, sub: GOOGLE_IDENTITY.subject,
  project_id: env.VERCEL_PROJECT_ID, environment: 'production' };

function request({ method = 'POST', headers = {}, query = '', origin = PROJECTS_ORIGIN, body } = {}) {
  return new Request(`${origin}/api/proyectos/google-diagnostic${query}`, { method,
    headers: { Authorization: `Bearer ${env.PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN}`, ...headers },
    ...(body !== undefined ? { body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) } : {}),
  });
}

test('validates every required variable, exact identity, ID uniqueness and confirmed header schema before any API call', () => {
  for (const key of Object.keys(env).filter(key => key.startsWith('GCP_') || /^PROYECTOS_(DRIVE|METADATA|AUTH|AUDIT)_/.test(key))) {
    assert.throws(() => googleRepositoryConfig({ ...env, [key]: '' }), error => error.code === 'configuration_missing' && error.variables[0] === key);
  }
  for (const [key, value] of [
    ['GCP_PROJECT_ID', 'other-project'], ['GCP_PROJECT_NUMBER', 'cedhu-repositorio'],
    ['GCP_SERVICE_ACCOUNT_EMAIL', 'other@example.com'], ['GCP_WORKLOAD_IDENTITY_POOL_ID', 'other-pool'],
    ['GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID', 'other-provider'], ['PROYECTOS_DRIVE_ROOT_ID', "id' or true"],
    ['PROYECTOS_METADATA_SPREADSHEET_ID', 'https://docs.google.com/spreadsheets/d/abc'],
    ['PROYECTOS_AUDIT_SPREADSHEET_ID', env.PROYECTOS_AUTH_SPREADSHEET_ID],
  ]) assert.throws(() => googleRepositoryConfig({ ...env, [key]: value }), GoogleConnectionError);
  assert(googleIdentityConfig(env).audience.includes(`/projects/${env.GCP_PROJECT_NUMBER}/`));
  assert.deepEqual(config.sheets.map(sheet => [sheet.tab, sheet.headers.length]), [['Proyectos', 18], ['Usuarios', 9], ['Actividad', 9]]);
  assert.equal(config.sheets[0].headers[0], 'id_proyecto');
  assert.equal(config.sheets[0].headers.at(-1), 'id_lote');
});

test('auth client refuses local, preview and custom environments before obtaining OIDC', () => {
  for (const settings of [{ ...env, VERCEL: '' }, { ...env, VERCEL_ENV: 'preview' }, { ...env, VERCEL_ENV: 'development' },
    { ...env, VERCEL_TARGET_ENV: 'staging' }, { ...env, VERCEL_PROJECT_ID: '' }]) {
    assert.throws(() => createGoogleClient({ env: settings, getToken: () => assert.fail('must not retrieve token') }), GoogleConnectionError);
  }
});

test('installed getVercelOidcToken reads Vercel request context only when the supplier executes', async () => {
  const symbol = Symbol.for('@vercel/request-context');
  const previous = globalThis[symbol];
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.${randomBytes(32).toString('base64url')}`;
  try {
    // Emulate the runtime context, not an inbound browser-controlled token.
    const client = createGoogleClient({ env, now, verifyToken: async token => {
      assert.equal(token, jwt);
      return { payload };
    } });
    globalThis[symbol] = { get: () => ({ headers: { 'x-vercel-oidc-token': jwt } }) };
    assert.equal(await client.retrieveSubjectToken(), jwt);
  } finally {
    if (previous === undefined) delete globalThis[symbol]; else globalThis[symbol] = previous;
  }
});

test('installed IdentityPoolClient uses supplier lazily, STS audience, impersonation and only final read scopes', async () => {
  let retrievals = 0;
  const subjectToken = randomBytes(32).toString('base64url');
  const client = createGoogleClient({ env, now,
    getToken: async () => { retrievals++; return subjectToken; },
    verifyToken: async (token, options) => {
      assert.equal(token, subjectToken);
      assert.equal(options.issuer, GOOGLE_IDENTITY.issuer);
      assert.equal(options.audience, GOOGLE_IDENTITY.audience);
      assert.equal(options.subject, GOOGLE_IDENTITY.subject);
      assert.equal(options.projectId, env.VERCEL_PROJECT_ID);
      assert.equal(options.environment, 'production');
      assert.deepEqual(options.algorithms, ['RS256']);
      assert(options.requiredClaims.includes('exp'));
      return { payload };
    },
  });
  assert(client instanceof IdentityPoolClient);
  assert.equal(retrievals, 0);
  assert.equal(client.getServiceAccountEmail(), GOOGLE_IDENTITY.serviceAccount);
  // Substitute HTTP transports ONLY in this offline test; protocol generation,
  // temporary-token caching and impersonation execute in the installed SDK.
  let exchanges = 0;
  client.stsCredential.transporter.request = async options => {
    exchanges++;
    assert.equal(options.url, 'https://sts.googleapis.com/v1/token');
    assert.equal(options.method, 'POST');
    assert.equal(options.data.get('subject_token'), subjectToken);
    assert.equal(options.data.get('audience'), config.identity.audience);
    assert.equal(options.data.get('subject_token_type'), 'urn:ietf:params:oauth:token-type:jwt');
    // IAM scope is used internally only to impersonate; it is NOT the final
    // token's permission to Drive/Sheets.
    assert.equal(options.data.get('scope'), 'https://www.googleapis.com/auth/cloud-platform');
    return { data: { access_token: 'fixture-sts', expires_in: 3600 } };
  };
  client.transporter.request = async options => {
    assert.equal(options.url, `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GOOGLE_IDENTITY.serviceAccount}:generateAccessToken`);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.authorization, 'Bearer fixture-sts');
    assert.deepEqual(options.data.scope, GOOGLE_READ_SCOPES);
    assert.equal(options.data.lifetime, '600s');
    return { data: { accessToken: 'fixture-impersonated', expireTime: new Date(Date.now() + 600000).toISOString() } };
  };
  await authenticateGoogle(client);
  await authenticateGoogle(client);
  assert.equal(retrievals, 1);
  assert.equal(exchanges, 1);
});

test('rejects unverified, expired, malformed and foreign tokens, without retaining raw credential errors', async () => {
  for (const changes of [{ environment: 'preview' }, { sub: 'other' }, { iss: 'https://evil.test' }, { aud: 'other' }, { project_id: 'prj_Other' }]) {
    const client = createGoogleClient({ env, now, getToken: async () => 'fixture', verifyToken: async () => ({ payload: { ...payload, ...changes } }) });
    const code = changes.aud ? 'oidc_audience_invalid' : changes.sub ? 'oidc_subject_invalid' : 'oidc_invalid';
    await assert.rejects(() => client.retrieveSubjectToken(), error => error.code === code);
  }
  const failedVerification = createGoogleClient({ env, getToken: async () => 'fixture', verifyToken: async () => { throw new Error('fixture-expired-secret'); } });
  await assert.rejects(() => failedVerification.retrieveSubjectToken(), error => error.code === 'oidc_invalid' && !error.message.includes('secret'));
  for (const token of ['not-a-jwt', `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`]) {
    const malformed = createGoogleClient({ env, getToken: async () => token });
    await assert.rejects(() => malformed.retrieveSubjectToken(), error => error.code === 'oidc_invalid');
  }
  const unavailable = createGoogleClient({ env, getToken: async () => { throw new Error('fixture-sensitive'); } });
  await assert.rejects(() => unavailable.retrieveSubjectToken(), error => error.code === 'oidc_unavailable');
  for (const [claim, code] of [['aud', 'oidc_audience_invalid'], ['sub', 'oidc_subject_invalid']]) {
    const client = createGoogleClient({ env, getToken: async () => 'fixture', verifyToken: async () => {
      throw { code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim, message: 'sensitive', payload: { private: 'sensitive' } };
    } });
    await assert.rejects(() => client.retrieveSubjectToken(), error => error.code === code && !JSON.stringify(error).includes('sensitive'));
  }
});

test('identifies STS and IAM failures without serializing library errors or headers', async () => {
  for (const [url, expected] of [['https://sts.googleapis.com/v1/token', 'federation_exchange_failed'],
    ['https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/fixture:generateAccessToken', 'impersonation_failed']]) {
    const client = { getAccessToken: async () => { throw { message: 'sensitive', config: { url, headers: { Authorization: 'sensitive' } } }; } };
    await assert.rejects(() => authenticateGoogle(client), error => error.code === expected && !JSON.stringify(error).includes('sensitive'));
  }
});

function resourceFixture(transform = value => value) {
  const calls = [];
  const system = id();
  const folders = ['00_Sistema', '01_Investigaciones', '02_Importaciones_Temporales'].map((name, index) => ({
    id: index === 0 ? system : id(), name, mimeType: 'application/vnd.google-apps.folder', driveId: config.rootId, parents: [config.rootId], trashed: false,
  }));
  const client = { async request(options) {
    calls.push(options);
    const url = new URL(options.url);
    let data;
    if (url.pathname.endsWith('/about')) data = { user: { emailAddress: config.identity.serviceAccount } };
    else if (url.pathname.includes('/drives/')) data = { id: config.rootId, name: 'Repo Investigación' };
    else if (url.pathname.endsWith('/files')) data = { files: folders, incompleteSearch: false };
    else {
      const sheet = config.sheets.find(item => url.pathname.includes(item.id));
      assert(sheet, 'only allowlisted sheets may be requested');
      if (url.pathname.includes('/files/')) data = { id: sheet.id, name: sheet.name, mimeType: 'application/vnd.google-apps.spreadsheet', driveId: config.rootId, parents: [system], trashed: false };
      else if (url.pathname.includes('/values/')) data = { values: [sheet.headers] };
      else data = { sheets: [{ properties: { title: sheet.tab, sheetType: 'GRID' } }] };
    }
    return { data: transform(structuredClone(data), options, folders) };
  } };
  return { repository: createGoogleRepository(client, config), client, system, calls };
}

test('checks actual account, shared drive, folder membership, three tabs and exact header rows with GET only', async () => {
  const { repository, calls } = resourceFixture();
  await repository.checkServiceAccount();
  await repository.checkDrive();
  const system = await repository.checkStructure();
  for (const { key } of config.sheets) await repository.checkSheet(key, system);
  assert.equal(calls.length, 12);
  for (const options of calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.maxRedirects, 0);
    assert.equal(options.data, undefined);
  }
  const list = calls.find(item => item.url.endsWith('/files'));
  assert.equal(list.params.corpora, 'drive');
  assert.equal(list.params.driveId, config.rootId);
  assert.equal(list.params.supportsAllDrives, true);
  assert.equal(list.params.includeItemsFromAllDrives, true);
  assert(list.params.q.includes(`'${config.rootId}' in parents`));
  for (const values of calls.filter(item => item.url.includes('/values/'))) assert.match(decodeURIComponent(values.url), /\/(?:values)\/'(?:Proyectos|Usuarios|Actividad)'!1:1$/);
});

test('rejects wrong accounts/drives, missing or duplicate folders, incomplete search and paginates safely', async () => {
  for (const [action, transform, code] of [
    ['checkServiceAccount', data => ({ ...data, user: { emailAddress: 'wrong@example.test' } }), 'service_account_mismatch'],
    ['checkDrive', data => ({ ...data, name: 'Other drive' }), 'drive_mismatch'],
    ['checkStructure', data => ({ ...data, files: [] }), 'structure_mismatch'],
    ['checkStructure', data => ({ ...data, files: [...data.files, data.files[0]] }), 'structure_mismatch'],
    ['checkStructure', data => ({ ...data, incompleteSearch: true }), 'structure_incomplete'],
  ]) {
    await assert.rejects(() => resourceFixture(transform).repository[action](), error => error.code === code);
  }
  let page = 0;
  const paginated = resourceFixture((data, options) => {
    if (!options.url.endsWith('/files')) return data;
    page++;
    if (page === 1) return { files: data.files.slice(0, 1), nextPageToken: 'fixture-next' };
    assert.equal(options.params.pageToken, 'fixture-next');
    return { files: data.files.slice(1) };
  });
  assert.equal(await paginated.repository.checkStructure(), paginated.system);
  const endless = resourceFixture(data => ({ ...data, nextPageToken: 'again' }));
  await assert.rejects(() => endless.repository.checkStructure(), error => error.code === 'structure_incomplete');
  assert.equal(endless.calls.length, 10);
});

test('denies external sheets, shortcuts, trashed files and wrong parents BEFORE reading any sheet', async () => {
  for (const change of [{ driveId: id() }, { parents: [id()] }, { mimeType: 'application/vnd.google-apps.shortcut' }, { trashed: true }, { name: 'Other' }]) {
    const { repository, calls, system } = resourceFixture(data => ({ ...data, ...change }));
    await assert.rejects(() => repository.checkSheet('catalog', system), error => error.code === 'sheet_outside_repository_or_mismatch');
    assert.equal(calls.length, 1);
    assert(calls[0].url.includes('/drive/'));
  }
  const { repository, calls, system } = resourceFixture();
  await assert.rejects(() => repository.checkSheet(id(), system), error => error.code === 'sheet_not_allowed');
  assert.equal(calls.length, 0);
});

test('distinguishes Drive metadata permissions from Sheets permissions without retaining provider errors', async () => {
  for (const [service, expected] of [['/drive/v3/files/', 'drive_forbidden'], ['sheets.googleapis.com', 'sheets_forbidden']]) {
    const { repository, system } = resourceFixture((data, options) => {
      if (options.url.includes(service)) throw { response: { status: 403 }, config: { headers: { Authorization: 'sensitive' } }, message: 'sensitive' };
      return data;
    });
    await assert.rejects(() => repository.checkSheet('catalog', system), error => error.code === expected && !JSON.stringify(error).includes('sensitive'));
  }
});

test('rejects missing/non-grid tabs and empty, reordered, extra or changed headers', async () => {
  for (const values of [[], [[]], [['changed']], [[...config.sheets[0].headers].reverse()], [[...config.sheets[0].headers, 'extra']]]) {
    const { repository, system } = resourceFixture((data, options) => options.url.includes('/values/') ? { values } : data);
    await assert.rejects(() => repository.checkSheet('catalog', system), error => error.code === 'sheet_headers_mismatch');
  }
  for (const sheets of [[], [{ properties: { title: 'Other', sheetType: 'GRID' } }], [{ properties: { title: 'Proyectos', sheetType: 'OBJECT' } }]]) {
    const { repository, system, calls } = resourceFixture((data, options) => options.url.includes('sheets.googleapis.com') ? { sheets } : data);
    await assert.rejects(() => repository.checkSheet('catalog', system), error => error.code === 'sheet_tab_mismatch');
    assert.equal(calls.length, 2);
  }
});

test('diagnostic reports all sheet results safely; prerequisite failure skips downstream reads', async () => {
  const { client } = resourceFixture();
  client.getAccessToken = async () => ({ token: 'fixture' });
  const result = await runGoogleDiagnostic({ env, now, clientFactory: () => client });
  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.checks).length, 8);
  const mixed = await runGoogleDiagnostic({ env, now, clientFactory: () => client,
    repositoryFactory: () => ({ checkServiceAccount() {}, checkDrive() {}, checkStructure() { return id(); },
      checkSheet(key) { if (key === 'users') throw { response: { status: 403 }, secret: 'sensitive' }; } }) });
  assert.equal(mixed.ok, false);
  assert.deepEqual(mixed.checks.users, { ok: false, code: 'google_forbidden' });
  assert.equal(mixed.checks.audit.ok, true);
  const denied = await runGoogleDiagnostic({ env: { ...env, GCP_PROJECT_NUMBER: '' }, now,
    clientFactory: () => assert.fail('must not reach authentication') });
  assert.equal(denied.checks.configuration.code, 'configuration_missing');
  assert.equal(Object.keys(denied.checks).length, 1);
});

test('HTTP diagnostic is closed by default, in Preview, on expiry and with invalid activation settings', async () => {
  for (const changes of [{ PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: '' }, { VERCEL: '' }, { VERCEL_ENV: 'preview' },
    { VERCEL_TARGET_ENV: 'staging' }, { PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: new Date(start).toISOString() },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: 'bad' }, { PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: new Date(start + 1200001).toISOString() },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: '2026-02-30T12:00:00Z' },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: '2026-10-22T12:00:00-05:00' },
    { PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: 'weak' }]) {
    const response = await createGoogleDiagnosticHandler({ env: { ...env, ...changes }, now,
      diagnose: () => assert.fail('must not contact Google') })(request());
    assert.equal(response.status, 404);
  }
});

test('closed diagnostic emits no runtime messages or credential values', async () => {
  const messages = [];
  const original = console.info;
  console.info = message => messages.push(message);
  try {
    const handler = createGoogleDiagnosticHandler({ env: { ...env, VERCEL: '' }, now,
      diagnose: () => assert.fail('closed gate must not contact Google') });
    assert.equal((await handler(request())).status, 404);
  } finally { console.info = original; }
  assert.equal(messages.length, 0);
});

test('secret format and active prebuild reject extra characters, case, whitespace and expiration before publication', async () => {
  const fixture = 'ab'.repeat(32);
  assert.equal(validDiagnosticToken(fixture), true);
  for (const token of [undefined, null, '', fixture.slice(1), `${fixture}a`, fixture.toUpperCase(), ` ${fixture}`,
    `${fixture} `, `${fixture}\n`, `${fixture}\r\n`, `"${fixture}"`, `\ufeff${fixture}`, 'é'.repeat(64), 'g'.repeat(64)]) {
    assert.equal(validDiagnosticToken(token), false);
    const invalid = { ...env, PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: token };
    assert.throws(() => validateDiagnosticBuild(invalid, start), /diagnostic_activation_invalid/);
    assert.equal((await createGoogleDiagnosticHandler({ env: invalid, now,
      diagnose: () => assert.fail('bad format must never reach Google') })(request())).status, 404);
  }
  assert.doesNotThrow(() => validateDiagnosticBuild(env, start));
  assert.doesNotThrow(() => validateDiagnosticBuild({ PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: 'false' }, start));
  assert.throws(() => validateDiagnosticBuild(env, start + 1200000), /diagnostic_activation_invalid/);
});

test('same resident secret reaches npm through stdin without argv, environment, clipboard or newline normalization', () => {
  const route = new URL('../../src/server/google/diagnostic.js', import.meta.url).href;
  const fixture = 'ab'.repeat(32);
  for (const [input, wrongServer, expectedExit, expectedCalls] of [[fixture, false, 0, 1], [fixture, true, 1, 0],
    [`${fixture}\n`, false, 1, 0], [fixture.toUpperCase(), false, 1, 0]]) {
    const setup = `
      import assert from 'node:assert/strict';
      import { createGoogleDiagnosticHandler } from ${JSON.stringify(route)};
      let calls = 0;
      const checks = Object.fromEntries(['configuration','federation','serviceAccount','drive','structure','catalog','users','audit'].map(key=>[key,{ok:true}]));
      const handler = createGoogleDiagnosticHandler({ env: {
        VERCEL: '1', VERCEL_ENV: 'production', PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: 'true',
        PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: '${wrongServer ? 'cd' : 'ab'}'.repeat(32),
        PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: new Date(Date.now()+600000).toISOString()
      }, diagnose: async()=>{calls++; return {ok:true,checks};} });
      globalThis.fetch = (url, options) => {
        assert.equal(new URL(url).origin, 'https://website-2027-seven.vercel.app');
        assert.equal(options.redirect,'error');
        return handler(new Request(url,options));
      };
      process.on('exit',()=>assert.equal(calls,${expectedCalls}));
    `;
    const preload = `data:text/javascript,${encodeURIComponent(setup)}`;
    const throughNpm = !expectedExit;
    const npmPreload = `data:text/javascript,${encodeURIComponent(`if(process.argv[1]?.endsWith('google-check.mjs')) await import(${JSON.stringify(preload)});`)}`;
    const args = throughNpm ? [process.env.npm_execpath, 'run', 'proyectos:google:probe', '--', '--all', '--stdin-secret']
      : ['--import', preload, 'scripts/proyectos/google-check.mjs', '--production', '--all', '--stdin-secret'];
    const child = spawnSync(process.execPath, args, { input, encoding: 'utf8', timeout: 15000,
      env: throughNpm ? { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --import=${npmPreload}` } : process.env });
    assert.equal(child.status, expectedExit, child.stderr);
    assert(!child.stdout.includes(fixture) && !child.stderr.includes(fixture));
    if (!expectedExit) {
      const rows = child.stdout.split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line));
      assert.equal(rows.length,9);
      assert.equal(rows.find(row=>row.check==='credential_match').ok,true);
      assert.equal(rows.at(-1).ok,true);
    }
  }
});

test('accepts the exact 20-minute boundary and UTC seconds; the same deployment closes at its absolute expiry', async () => {
  let time = start;
  let calls = 0;
  const handler = createGoogleDiagnosticHandler({ env, now: () => time, diagnose: async () => { calls++; return { ok: true }; } });
  assert.equal((await handler(request())).status, 200);
  time = start + 1200000 - 1;
  assert.equal((await handler(request())).status, 200);
  time++;
  assert.equal((await handler(request())).status, 404);
  time++;
  assert.equal((await handler(request())).status, 404);
  assert.equal(calls, 2);
  const seconds = createGoogleDiagnosticHandler({ env: { ...env,
    PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: new Date(start + 600000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }, now, diagnose: async () => ({ ok: true }) });
  assert.equal((await seconds(request())).status, 200);
  const normalizedInvalidDate = createGoogleDiagnosticHandler({ env: { ...env,
    PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: '2026-02-30T12:00:00Z',
  }, now: () => Date.parse('2026-03-02T11:50:00Z'), diagnose: () => assert.fail('invalid calendar date') });
  assert.equal((await normalizedInvalidDate(request())).status, 404);
});

test('does not contact Google if expiry passes while validating the request body', async () => {
  let time = start;
  const body = new ReadableStream({ pull(controller) { time = start + 1200000; controller.close(); } });
  const handler = createGoogleDiagnosticHandler({ env, now: () => time, diagnose: () => assert.fail('expired during body validation') });
  assert.equal((await handler(request({ body }))).status, 404);
});

test('requires independent admin bearer, correct origin/method, and forbids arbitrary query/body IDs', async () => {
  const handler = createGoogleDiagnosticHandler({ env, now, diagnose: () => assert.fail('must not contact Google') });
  for (const [options, status] of [
    [{ headers: { Authorization: '' } }, 401], [{ headers: { Authorization: `Bearer ${randomBytes(32).toString('hex')}` } }, 401],
    [{ headers: { Authorization: '', Cookie: '__Host-cedhu-proyectos=shared-session' } }, 401],
    [{ method: 'GET' }, 405], [{ method: 'OPTIONS' }, 405], [{ origin: 'https://other.test' }, 403],
    [{ headers: { Origin: 'https://other.test' } }, 403], [{ headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    [{ query: `?id=${id()}` }, 400], [{ body: JSON.stringify({ id: id() }) }, 400], [{ body: '{}' }, 400],
    [{ headers: { 'Content-Length': '12' } }, 400], [{ headers: { 'Content-Encoding': 'gzip' } }, 400],
  ]) assert.equal((await handler(request(options))).status, status);
});

test('success, failures and timeout never expose raw data; empty Web Standard streams work; responses forbid CDN/browser caching', async () => {
  const good = createGoogleDiagnosticHandler({ env, now, diagnose: async () => ({ ok: true, checks: {} }) });
  const emptyStream = new ReadableStream({ start(controller) { controller.close(); } });
  const responses = [await good(request()), await good(request({ body: emptyStream })), await good(request({ method: 'GET' })),
    await good(request({ headers: { Authorization: '' } })),
    await createGoogleDiagnosticHandler({ env: {}, now })(request()),
    await createGoogleDiagnosticHandler({ env, now, diagnose: async () => { throw new Error('sensitive'); } })(request()),
    await createGoogleDiagnosticHandler({ env, now, timeoutMs: 5, diagnose: () => new Promise(() => {}) })(request())];
  assert.deepEqual(responses.map(item => item.status), [200, 200, 405, 401, 404, 503, 503]);
  for (const response of responses) {
    for (const header of ['Cache-Control', 'CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) assert(response.headers.get(header).includes('no-store'));
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    const text = await response.text();
    for (const value of [env.PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN, env.PROYECTOS_AUTH_SPREADSHEET_ID, config.sheets[0].headers[0], 'sensitive']) assert(!text.includes(value));
  }
});

test('limits concurrent diagnostics per instance and releases the guard after completion', async () => {
  let finish;
  const handler = createGoogleDiagnosticHandler({ env, now, diagnose: () => new Promise(resolve => { finish = resolve; }) });
  const first = handler(request());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await handler(request())).status, 429);
  finish({ ok: true, checks: {} });
  assert.equal((await first).status, 200);
});

test('safe errors distinguish configuration, APIs, scopes, permissions and hidden resources without raw content', () => {
  for (const [error, code] of [[{ response: { status: 401 } }, 'google_unauthorized'], [{ response: { status: 404 } }, 'google_not_found_or_inaccessible'],
    [{ response: { status: 429 } }, 'google_rate_limited'], [{ response: { data: { error: { details: [{ reason: 'SERVICE_DISABLED' }] } } } }, 'google_api_disabled'],
    [{ response: { data: { error: { details: [{ reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' }] } } } }, 'google_scope_insufficient']]) {
    assert.deepEqual(safeGoogleFailure({ ...error, message: 'sensitive', headers: { authorization: 'sensitive' } }), { code });
  }
});

test('administrator CLI negative mode uses hidden input and never invokes Google; it stops at the first unexpected gate', () => {
  // The actual CLI executes in a child with a simulated TTY and in-process HTTP
  // handler. No real token, network, terminal capture or Workspace call is used.
  const routeUrl = new URL('../../src/server/google/diagnostic.js', import.meta.url).href;
  for (const disabled of [false, true]) {
    const setup = `
      import assert from 'node:assert/strict';
      import { createGoogleDiagnosticHandler } from ${JSON.stringify(routeUrl)};
      const token = 'ab'.repeat(32);
      const handler = createGoogleDiagnosticHandler({ env: {
        VERCEL: '1', VERCEL_ENV: 'production', PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED: ${JSON.stringify(disabled ? 'false' : 'true')},
        PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN: token,
        PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT: new Date(Date.now() + 600000).toISOString(),
      }, diagnose: () => assert.fail('negative mode must never invoke Google') });
      Object.defineProperty(process.stdin, 'isTTY', { value: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true });
      process.stdin.setRawMode = () => {};
      globalThis.fetch = async (url, options) => {
        assert.equal(new URL(url).origin, 'https://website-2027-seven.vercel.app');
        assert.equal(options.redirect, 'error');
        return handler(new Request(url, options));
      };
      setImmediate(() => {
        process.stdin.emit('keypress', token, {});
        process.stdin.emit('keypress', '\\r', { name: 'return' });
      });
    `;
    const child = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(setup)}`,
      'scripts/proyectos/google-check.mjs', '--production', '--negative'], { encoding: 'utf8', timeout: 15000 });
    assert.equal(child.status, disabled ? 1 : 0, child.stderr);
    assert(!child.stdout.includes('ab'.repeat(32)));
    const rows = child.stdout.split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line));
    assert.equal(rows.length, disabled ? 1 : 8);
    assert(rows.every(row => row.ok === !disabled));
  }
});

test('new Web Standard function coexists with SSG/CMS and server imports do not enter frontend sources', async () => {
  const route = await import('../../api/proyectos/google-diagnostic.js');
  assert.equal(typeof route.default.fetch, 'function');
  assert.equal((await route.default.fetch(request())).status, 404);
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(vercel.functions['api/proyectos/google-diagnostic.js'].maxDuration, 30);
  assert.equal(vercel.functions['api/proyectos/*.js'].maxDuration, 15);
  assert.equal(vercel.functions['api/cms/*.js'].maxDuration, 30);
  assert.match(await readFile('astro.config.mjs', 'utf8'), /output:\s*'static'/);
  async function audit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await audit(path);
      else if (/\.(astro|[cm]?[jt]s)$/.test(path)) {
        assert(!/(?:server\/google|@vercel\/oidc|google-auth-library|GCP_|PROYECTOS_GOOGLE_)/.test(await readFile(path, 'utf8')), `Server boundary violation: ${path}`);
      }
    }
  }
  for (const path of ['src/pages', 'src/layouts', 'src/components', 'src/scripts', 'src/lib']) await audit(path);
});
