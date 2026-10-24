import test from 'node:test';
import assert from 'node:assert/strict';
import { queryCatalog, parseProjects, canEdit, findProject, projectView } from '../../src/server/projects/catalog.js';
import { createProjectHandlers } from '../../src/server/projects/handlers.js';
import { createWorkspaceHandlers } from '../../src/server/proyectos-google-auth.js';
import { googleRepositoryConfig, GOOGLE_IDENTITY } from '../../src/server/google/config.js';
import { sealWorkspaceCookie } from '../../src/server/proyectos-workspace-session.js';
import { PROJECTS_ORIGIN, projectsJson } from '../../src/server/proyectos-session.js';

const teacher = { email: 'docente@example.invalid', role: 'DOCENTE', sub: '123456789012345678901' };
const admin = { ...teacher, role: 'ADMIN' };
const env = { VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_Synthetic',
  GCP_PROJECT_ID: GOOGLE_IDENTITY.projectId, GCP_PROJECT_NUMBER: '123456789012', GCP_SERVICE_ACCOUNT_EMAIL: GOOGLE_IDENTITY.serviceAccount,
  GCP_WORKLOAD_IDENTITY_POOL_ID: GOOGLE_IDENTITY.pool, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: GOOGLE_IDENTITY.provider,
  PROYECTOS_DRIVE_ROOT_ID: 'synthetic_drive_000', PROYECTOS_METADATA_SPREADSHEET_ID: 'synthetic_catalog_000',
  PROYECTOS_AUTH_SPREADSHEET_ID: 'synthetic_users_000', PROYECTOS_AUDIT_SPREADSHEET_ID: 'synthetic_audit_000',
  PROYECTOS_SESSION_SECRET: 'a'.repeat(64), PROYECTOS_GOOGLE_DOMAIN: 'example.invalid',
  PROYECTOS_GOOGLE_OAUTH_CLIENT_ID: 'synthetic.apps.googleusercontent.com', PROYECTOS_GOOGLE_OAUTH_CLIENT_SECRET: 'synthetic_secret_0000000' };
const headers = googleRepositoryConfig(env).sheets[0].headers;
const projects = Array.from({ length: 28 }, (_, i) => Object.fromEntries(headers.map(key => [key, {
  id_proyecto: 'CEDHU_' + i, anio: String(2025 + i % 2), grado: 'Grado ' + (10 + i % 2), titulo: `Investigación ${i}`,
  autores: 'María Pérez', resumen: 'Innovación y hábitat', palabras_clave: 'tecnología', area: 'Ciencias',
  registrado_por: i % 2 ? teacher.email : 'otro@example.invalid', estado: i === 27 ? 'ARCHIVADO' : 'FINALIZADO',
  fecha_registro: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`, id_pdf_drive: 'private_drive_identifier', hash_pdf: 'private_hash',
}[key] ?? ''])));
const request = (path, init) => new Request(PROJECTS_ORIGIN + '/api/proyectos/' + path, init);

test('search ignores accents/case and covers all academic fields; filters, ownership, sorting and pagination compose', () => {
  for (const term of ['INVESTIGACION', 'maria', 'HABITAT', 'tecnologia']) assert.equal(queryCatalog(projects, new URLSearchParams({ q: term }), teacher).total, 27);
  const data = queryCatalog(projects, new URLSearchParams({ anio: '2026', grado: 'Grado 11', mine: '1', sort: 'titulo' }), teacher);
  assert.equal(data.total, 13); assert.equal(data.projects.length, 12); assert.equal(data.pages, 2);
  assert.equal(queryCatalog(projects, new URLSearchParams({ page: '3' }), teacher).projects.length, 3);
  assert.equal(queryCatalog(projects, new URLSearchParams({ q: 'sin coincidencia' }), teacher).total, 0);
  assert.equal(queryCatalog(projects, new URLSearchParams({ archived: '1' }), admin).total, 28);
  assert.equal(queryCatalog(projects, new URLSearchParams({ archived: '1' }), teacher).total, 27);
  for (const query of ['page=0', 'sort=evil', 'q=a&q=b', 'fileId=x', 'q=' + 'a'.repeat(201)]) assert.throws(() => queryCatalog(projects, new URLSearchParams(query), teacher));
});

test('projection excludes internal identities and Drive identifiers; archives, ID collisions and invalid rows fail closed', () => {
  const view = projectView(projects[1], teacher, true);
  for (const key of ['registrado_por', 'modificado_por', 'id_pdf_drive', 'hash_pdf', 'id_lote']) assert(!Object.hasOwn(view, key));
  assert(canEdit(projects[1], teacher)); assert(!canEdit(projects[0], teacher)); assert(canEdit(projects[0], admin));
  assert.throws(() => findProject(projects, 'CEDHU_27', teacher), { status: 404 });
  assert.equal(findProject(projects, 'CEDHU_27', admin).estado, 'ARCHIVADO');
  assert.throws(() => findProject(projects, '../../private', teacher), { status: 400 });
  const rows = projects.map(p => headers.map(key => p[key]));
  assert.equal(parseProjects(rows, headers).length, 28);
  assert.throws(() => parseProjects([...rows, rows[0]], headers));
  assert.throws(() => parseProjects(Array.from({ length: 10001 }, () => []), headers));
});

test('private endpoints refuse unauthenticated access before reading and return no-store without leaking provider errors', async () => {
  const denied = createProjectHandlers({ requireSession: async () => ({ response: projectsJson({}, 401) }), storeFactory: () => assert.fail('private read') });
  assert.equal((await denied.catalog(request('catalog'))).status, 401);
  assert.equal((await denied.project(request('project?id=CEDHU_1'))).status, 401);
  const handlers = createProjectHandlers({ requireSession: async () => ({ identity: teacher }), storeFactory: async () => ({ projects: async () => projects }) });
  const result = await handlers.catalog(request('catalog'));
  assert.equal(result.status, 200); assert.match(result.headers.get('Cache-Control'), /no-store/);
  assert(!(await result.text()).includes('private_drive_identifier'));
  assert.equal((await handlers.project(request('project?id=CEDHU_1'))).status, 200);
  const failing = createProjectHandlers({ requireSession: async () => ({ identity: teacher }), storeFactory: () => { throw Error('secret token'); } });
  assert(!(await (await failing.catalog(request('catalog'))).text()).includes('secret token'));
});

test('real session guard denies inactive users and role changes on each catalog request', async () => {
  const now = Date.now(); let role = 'DOCENTE';
  const session = sealWorkspaceCookie({ v: 1, ...teacher, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 }, Buffer.from(env.PROYECTOS_SESSION_SECRET, 'hex'), 'cedhu-google-session-v2');
  const guard = createWorkspaceHandlers({ env, now: () => now, roleLookup: async () => role }).requireSession;
  let reads = 0;
  const handlers = createProjectHandlers({ requireSession: guard, storeFactory: async () => { reads++; return { projects: async () => projects }; } });
  const req = () => request('catalog', { headers: { cookie: '__Host-cedhu-proyectos=' + session } });
  assert.equal((await handlers.catalog(req())).status, 200); assert.equal(reads, 1);
  role = null; assert.equal((await handlers.catalog(req())).status, 403); assert.equal(reads, 1);
  role = 'ADMIN'; assert.equal((await handlers.catalog(req())).status, 403); assert.equal(reads, 1);
});
