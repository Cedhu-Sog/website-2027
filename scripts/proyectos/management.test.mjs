import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createManagementHandler } from '../../src/server/projects/management.js';
import { createProjectWriter, markerId } from '../../src/server/google/project-writer.js';
import { createDocumentHandler } from '../../src/server/projects/document-handler.js';
import { academicInput, duplicateCandidates, revisionOf, digest } from '../../src/server/projects/validation.js';
import { sealUploadTicket, readUploadTicket, validUploadUri } from '../../src/server/projects/tickets.js';
import { PROJECTS_ORIGIN, projectsJson } from '../../src/server/proyectos-session.js';
import { fixtureEnv, syntheticTeacher, academicFixture, memoryRepository, sha256, syntheticPdf } from './fixtures/repository.mjs';

const req = (input, headers = {}) => new Request(PROJECTS_ORIGIN + '/api/proyectos/manage', { method: 'POST', headers: { Origin: PROJECTS_ORIGIN, 'X-CEDHU-Projects': '1', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(input) });
function setup(env = fixtureEnv) {
  const memory = memoryRepository(); let identity = syntheticTeacher;
  const handler = createManagementHandler({ env, requireSession: async () => identity ? { identity } : { response: projectsJson({}, 401) }, storeFactory: async () => memory.store });
  async function api(input, headers) { const response = await handler(req(input, headers)); return { status: response.status, data: await response.json() }; }
  return { ...memory, api, handler, identity: value => { identity = value; } };
}
async function upload(e, bytes, extra = {}) {
  const prepared = await e.api({ action: 'prepare', operation: randomUUID(), academic: academicFixture, mime: 'application/pdf', name: 'Prueba.pdf', size: bytes.length, sha256: sha256(bytes), ...extra });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.data)); const ticket = prepared.data.ticket;
  for (let offset = 0; offset < bytes.length; offset += 1048576) {
    const chunk = await e.api({ action: 'chunk', ticket, offset, data: bytes.subarray(offset, Math.min(offset + 1048576, bytes.length)).toString('base64') }); assert.equal(chunk.status, 200, JSON.stringify(chunk.data));
    // Simulate a retransmitted fragment after the successful response was lost.
    const repeated = await e.api({ action: 'chunk', ticket, offset, data: bytes.subarray(offset, Math.min(offset + 1048576, bytes.length)).toString('base64') }); assert.equal(repeated.status, 200);
  }
  return { ticket, projectId: prepared.data.projectId };
}

test('real management/writer/uploader flow handles small, 5MB+ and 17MB+ PDF uploads and repeated/concurrent commits exactly once', async () => {
  for (const size of [1024, 5 * 1024 * 1024 + 77, 17 * 1024 * 1024 + 19]) {
    const e = setup(); const bytes = syntheticPdf(size); const { ticket } = await upload(e, bytes);
    e.loseCommitResponse();
    const commits = await Promise.all([e.api({ action: 'commit', ticket }), e.api({ action: 'commit', ticket })]);
    assert(commits.every(result => result.status === 200), JSON.stringify(commits));
    const projects = await e.store.projects(); assert.equal(projects.length, 1); assert.equal(projects[0].hash_pdf, sha256(bytes)); assert.equal(projects[0].estado, 'FINALIZADO');
    assert.equal(projects[0].registrado_por, syntheticTeacher.email); assert.equal((await e.api({ action: 'commit', ticket })).status, 200);
    assert.equal((await e.store.projects()).length, 1);
    assert(e.calls.filter(call => /upload/.test(call.url)).every(call => call.size <= 1048576));
    const document = createDocumentHandler({ requireSession: async () => ({ identity: syntheticTeacher }), storeFactory: async () => e.store });
    const response = await document(new Request(PROJECTS_ORIGIN + '/api/proyectos/document?id=' + projects[0].id_proyecto + '&offset=0&version=1'));
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(0, 1048576));
    const events = await createProjectWriter(e.store).activity(); assert.equal(events.filter(event => event.resultado === 'EXITO').length, 1);
    assert(!JSON.stringify(events).includes('upload_id')); assert(!JSON.stringify(events).includes(ticket));
  }
});

test('upload sessions enforce subject, expiry, institutional context, URI allowlist, MIME, size, signature, offsets and server integrity', async () => {
  const e = setup(); const bytes = syntheticPdf(2048);
  const input = { action: 'prepare', operation: randomUUID(), academic: academicFixture, mime: 'application/pdf', name: 'Prueba.pdf', size: bytes.length, sha256: sha256(bytes) };
  for (const changed of [{ mime: 'text/html' }, { size: 101 * 1024 * 1024 }, { name: '../prueba.pdf' }, { sha256: 'invalid' }, { academic: { ...academicFixture, registrado_por: 'fake' } }]) assert.equal((await e.api({ ...input, ...changed })).status, 400);
  const result = await e.api(input); const ticket = result.data.ticket;
  assert.equal((await e.api({ action: 'chunk', ticket, offset: 0, data: Buffer.alloc(2048).toString('base64') })).status, 400);
  assert.equal((await e.api({ action: 'chunk', ticket, offset: 1, data: bytes.toString('base64') })).status, 400);
  assert((await e.api({ action: 'commit', ticket })).status >= 400); assert.equal((await e.store.projects()).length, 0);
  e.identity({ ...syntheticTeacher, sub: '987654321098765432109' }); assert.equal((await e.api({ action: 'status', ticket })).status, 409);
  for (const uri of ['https://evil.invalid/upload?upload_id=abcdefghijk', 'https://www.googleapis.com/drive/v3/files?uploadType=resumable&upload_id=abcdefghijk', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abcdefghijk&upload_id=duplicated123']) assert(!validUploadUri(uri));
  assert(validUploadUri('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abcdefghijk%3D%3D&provider_parameter=opaque'));
  const now = Date.now(); const sealed = sealUploadTicket({ uri: null, completed: true }, syntheticTeacher, fixtureEnv, now);
  assert.throws(() => readUploadTicket(sealed, syntheticTeacher, { ...fixtureEnv, PROYECTOS_METADATA_SPREADSHEET_ID: 'other_synthetic_catalog' }, now));
  assert.throws(() => readUploadTicket(sealed, syntheticTeacher, fixtureEnv, now + 86400000));
});

test('teachers edit their own records; administrator edits/archives; stale revisions, retries and injected identity fields cannot corrupt originals', async () => {
  const e = setup(); const { ticket } = await upload(e, syntheticPdf(1024)); await e.api({ action: 'commit', ticket });
  const before = (await e.store.projects())[0]; const revision = revisionOf(before);
  const edit = { action: 'edit', operation: randomUUID(), id: before.id_proyecto, revision, academic: { ...academicFixture, titulo: '=Proyecto actualizado', anio: '2025', grado: '10' }, confirmedDuplicates: [] };
  e.identity({ ...syntheticTeacher, email: 'otra@example.invalid', sub: '987654321098765432109' }); assert.equal((await e.api(edit)).status, 403);
  e.identity(syntheticTeacher); assert.equal((await e.api({ ...edit, academic: { ...edit.academic, id_proyecto: 'evil' } })).status, 400);
  assert.equal((await e.api(edit)).status, 200); assert.equal((await e.api(edit)).status, 200);
  const after = (await e.store.projects())[0]; assert.equal(after.titulo, '=Proyecto actualizado');
  assert.equal(after.anio, '2025'); assert.equal(after.grado, '10');
  const document = createDocumentHandler({ requireSession: async () => ({ identity: syntheticTeacher }), storeFactory: async () => e.store });
  assert.equal((await document(new Request(PROJECTS_ORIGIN + '/api/proyectos/document?id=' + after.id_proyecto))).status, 200);
  for (const key of ['id_proyecto', 'fecha_registro', 'registrado_por', 'id_pdf_drive', 'hash_pdf']) assert.equal(after[key], before[key]);
  assert.equal((await e.api({ ...edit, operation: randomUUID() })).status, 409);
  const archive = { action: 'archive', operation: randomUUID(), id: after.id_proyecto, revision: revisionOf(after) };
  assert.equal((await e.api(archive)).status, 403);
  e.identity({ ...syntheticTeacher, role: 'ADMIN' }); assert.equal((await e.api(archive)).status, 200); assert.equal((await e.store.projects())[0].estado, 'ARCHIVADO');
  assert.equal(e.files.has(before.id_pdf_drive), true);
  const events = await createProjectWriter(e.store).activity(); const intent = events.find(event => event.accion === 'EDICION_PROYECTO' && event.resultado === 'INICIADO');
  assert.equal(JSON.parse(intent.detalles).before.titulo, before.titulo); assert.equal(JSON.parse(intent.detalles).after.titulo, '=Proyecto actualizado');
});

test('significant duplicates require explicit confirmation and interrupted batch items can retry without repeating successful records', async () => {
  const e = setup(); const bytes = syntheticPdf(1024); const batch = randomUUID();
  const first = await upload(e, bytes, { batch }); await e.api({ action: 'commit', ticket: first.ticket });
  const prepare = { action: 'prepare', operation: randomUUID(), batch, academic: academicFixture, name: 'Prueba2.pdf', size: bytes.length, mime: 'application/pdf', sha256: sha256(bytes) };
  const warning = await e.api(prepare); assert.equal(warning.status, 409); assert.equal(warning.data.duplicates[0].exactPdf, true);
  const confirmed = await e.api({ ...prepare, confirmedDuplicates: [first.projectId] }); assert.equal(confirmed.status, 200);
  const ticket = confirmed.data.ticket;
  assert.equal((await e.api({ action: 'chunk', ticket, offset: 0, data: bytes.toString('base64') })).status, 200);
  assert.equal((await e.api({ action: 'status', ticket })).data.complete, true);
  assert.equal((await e.api({ action: 'commit', ticket })).status, 200); assert.equal((await e.api({ action: 'commit', ticket })).status, 200);
  assert.equal((await e.store.projects()).length, 2); assert((await e.store.projects()).every(p => p.id_lote === batch));
  const different = { ...academicFixture, autores: 'Otro equipo', anio: '2025', resumen: 'Otro resumen académico', palabras_clave: 'Otros términos' };
  assert.equal(duplicateCandidates(await e.store.projects(), different, '', syntheticTeacher).length, 0);
});

test('writes fail closed while disabled or unauthenticated; CSRF, oversized bodies and non-admin activity are rejected', async () => {
  const e = setup({ ...fixtureEnv, PROYECTOS_WRITES_ENABLED: 'false' }); assert.equal((await e.api({ action: 'prepare' })).status, 503);
  e.identity(null); assert.equal((await e.api({ action: 'prepare' })).status, 401);
  const active = setup(); assert.equal((await active.api({ action: 'prepare' }, { Origin: 'https://outside.invalid' })).status, 403);
  assert.equal((await active.api({ action: 'prepare' }, { 'X-CEDHU-Projects': '' })).status, 403);
  assert.equal((await active.api({ action: 'prepare', padding: 'x'.repeat(1500001) })).status, 413);
  assert.equal((await active.handler(new Request(PROJECTS_ORIGIN + '/api/proyectos/manage?view=activity'))).status, 403);
  active.identity({ ...syntheticTeacher, role: 'ADMIN' }); assert.equal((await active.handler(new Request(PROJECTS_ORIGIN + '/api/proyectos/manage?view=activity'))).status, 200);
});

test('atomic Sheets markers reject semantic reuse, resolve lost responses and serialize concurrent updates without formula evaluation', async () => {
  const e = memoryRepository(); const writer = createProjectWriter(e.store); const project = Object.fromEntries(e.store.config.sheets[0].headers.map(key => [key, academicFixture[key] || '']));
  Object.assign(project, { id_proyecto: 'CEDHU-synthetic', estado: 'FINALIZADO', registrado_por: syntheticTeacher.email, titulo: '=1+1' });
  await writer.create(project, 'create-synthetic', digest('first'));
  await assert.rejects(writer.create(project, 'create-synthetic', digest('different')), { code: 'operation_conflict' });
  const before = (await e.store.projects())[0];
  const results = await Promise.allSettled([writer.update(before, { ...before, titulo: 'Primera edición' }, 'edit-1', digest('edit-1')), writer.update(before, { ...before, titulo: 'Segunda edición' }, 'edit-2', digest('edit-2'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal((await e.store.projects()).length, 1);
  assert.equal(typeof markerId('operation'), 'number');
  assert.throws(() => academicInput({ ...academicFixture, anio: '3000' }));
});
