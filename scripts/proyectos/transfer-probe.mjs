import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createGoogleClient, authenticateGoogle } from '../../src/server/google/auth.js';
import { googleRepositoryConfig, requireGoogleProduction, safeGoogleFailure } from '../../src/server/google/config.js';
import { createGoogleRepository } from '../../src/server/google/repository.js';
import { parseProjects, ProjectError } from '../../src/server/projects/catalog.js';
import { createManagementHandler } from '../../src/server/projects/management.js';
import { createDocumentHandler } from '../../src/server/projects/document-handler.js';
import { createProjectWriter } from '../../src/server/google/project-writer.js';
import { revisionOf } from '../../src/server/projects/validation.js';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';
import { syntheticPdf } from './fixtures/pdf.mjs';
import { createHash } from 'node:crypto';

// Administrative, explicit one-off build command. Never in normal builds or an
// HTTP route. Run only in a --prod --skip-domain deployment after user approval.
// No private data, IDs, bearer tokens or exception objects are printed.
export async function transferProbe(env = process.env) {
  requireGoogleProduction(env);
  if (env.VERCEL_PROJECT_ID !== 'prj_fiyvmDyYqGoh8eRAKlY5FYZAHC8p' || env.PROYECTOS_ISOLATED_TRANSFER_PROBE !== 'approved-2026-10-24' || env.PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED === 'true') throw Error('isolated_probe_preconditions');
  const config = googleRepositoryConfig(env);
  const writeEnv = { ...env, PROYECTOS_WRITES_ENABLED: 'true', PROYECTOS_TRANSFER_VERIFIED: 'v1' };
  const client = createGoogleClient({ env: writeEnv, write: true }); await authenticateGoogle(client);
  const originalRequest = client.request.bind(client);
  client.request = async options => {
    try { return await originalRequest(options); }
    catch (error) {
      const url = String(options.url);
      error.probeDestination = url.includes('/developerMetadata/') ? 'sheets_marker' : url.includes(':batchUpdate') ? 'sheets_mutation' : url.includes('/upload/') ? 'drive_upload' : url.includes('/permissions') ? 'drive_permissions' : url.includes('sheets.googleapis.com') ? 'sheets_read' : 'drive_metadata';
      throw error;
    }
  };
  const repository = createGoogleRepository(client, config);
  await repository.checkServiceAccount(); await repository.checkDrive();
  const system = await repository.checkStructure();
  for (const key of ['catalog', 'users', 'audit']) await repository.checkSheet(key, system);
  const DRIVE = 'https://www.googleapis.com/drive/v3/files'; const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
  async function call(url, method, data, params) { return (await client.request({ url, method, ...(data ? { data } : {}), ...(params ? { params } : {}), timeout: 15000, retry: false, maxRedirects: 0, maxContentLength: 16 * 1024 * 1024 })).data; }
  const folders = await call(DRIVE, 'GET', null, { corpora: 'drive', driveId: config.rootId, supportsAllDrives: true, includeItemsFromAllDrives: true,
    q: `'${config.rootId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '02_Importaciones_Temporales'`, fields: 'files(id,parents,driveId,capabilities(canAddChildren)),incompleteSearch,nextPageToken' });
  if (folders.incompleteSearch || folders.nextPageToken || folders.files?.length !== 1 || folders.files[0].parents?.[0] !== config.rootId || folders.files[0].driveId !== config.rootId) throw Error('sandbox_parent_invalid');
  const permissions = { temporaryFolderWrite: folders.files[0].capabilities?.canAddChildren === true };
  for (const key of ['catalog', 'audit']) {
    const sheet = config.sheets.find(s => s.key === key);
    permissions[key + 'Write'] = (await call(`${DRIVE}/${sheet.id}`, 'GET', null, { supportsAllDrives: true, fields: 'capabilities(canEdit)' })).capabilities?.canEdit === true;
  }
  if (!permissions.temporaryFolderWrite) return { probe: 'isolated_transfer', ok: false, stage: 'permissions', code: 'sandbox_writer_required', permissions, institutionalWrites: false };
  console.log(JSON.stringify({ probe: 'isolated_transfer', stage: 'permissions', permissions, institutionalWrites: false }));
  const run = 'QA-Entregable2-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  async function createFolder(parent, name) { const file = await call(DRIVE, 'POST', { name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }, { supportsAllDrives: true, fields: 'id,parents,driveId' }); if (file.driveId !== config.rootId || file.parents?.[0] !== parent) throw Error('sandbox_create_location'); return file.id; }
  const sandbox = await createFolder(folders.files[0].id, run); const sandboxSystem = await createFolder(sandbox, '00_Sistema');
  console.log(JSON.stringify({ probe: 'isolated_transfer', stage: 'sandbox_created', run }));
  await createFolder(sandbox, '01_Investigaciones'); await createFolder(sandbox, '02_Importaciones_Temporales');
  const sheets = [];
  for (const original of config.sheets) {
    const file = await call(DRIVE, 'POST', { name: original.name, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [sandboxSystem] }, { supportsAllDrives: true, fields: 'id' });
    const metadata = await call(`${SHEETS}/${file.id}`, 'GET', null, { fields: 'sheets(properties(sheetId))' });
    const sheetId = metadata.sheets[0].properties.sheetId;
    await call(`${SHEETS}/${file.id}:batchUpdate`, 'POST', { requests: [
      { updateSheetProperties: { properties: { sheetId, title: original.tab }, fields: 'title' } },
      { updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: [{ values: original.headers.map(header => ({ userEnteredValue: { stringValue: header } })) }], fields: 'userEnteredValue' } },
    ] });
    sheets.push({ ...original, id: file.id });
  }
  const isolated = { ...config, sheets }; const isolatedEnv = { ...writeEnv, PROYECTOS_METADATA_SPREADSHEET_ID: sheets.find(s => s.key === 'catalog').id, PROYECTOS_AUTH_SPREADSHEET_ID: sheets.find(s => s.key === 'users').id, PROYECTOS_AUDIT_SPREADSHEET_ID: sheets.find(s => s.key === 'audit').id };
  const isolatedRepository = createGoogleRepository(client, isolated);
  const store = { client, config: isolated, systemId: sandboxSystem, structureRootId: sandbox, repository: isolatedRepository, projects: async () => {
    const catalog = sheets.find(s => s.key === 'catalog');
    const rows = await call(`${SHEETS}/${catalog.id}/values/${encodeURIComponent("'Proyectos'!A2:R")}`, 'GET', null, { valueRenderOption: 'UNFORMATTED_VALUE' });
    return parseProjects(rows.values ?? [], catalog.headers);
  } };
  let identity = { email: 'qa-sintetico@example.invalid', sub: '123456789012345678901', role: 'DOCENTE' };
  let lastFailure = {};
  const options = { env: isolatedEnv, requireSession: async () => ({ identity }), storeFactory: async () => store, onFailure(error) {
    const knownReasons = ['invalid', 'invalidParameter', 'badRequest', 'insufficientFilePermissions', 'notFound', 'rateLimitExceeded', 'userRateLimitExceeded', 'storageQuotaExceeded', 'domainPolicy', 'appNotAuthorizedToFile'];
    const reasons = error?.response?.data?.error?.errors?.map(item => item.reason).filter(reason => knownReasons.includes(reason));
    const internalCodes = ['write_tab_mismatch', 'write_sheet_not_allowed', 'generated_id_invalid', 'upload_location_invalid', 'upload_folder_ambiguous', 'upload_folder_missing', 'upload_uri_invalid', 'upload_result_invalid', 'upload_range_invalid', 'upload_offset_invalid'];
    lastFailure = { code: error instanceof ProjectError ? error.code : internalCodes.includes(error.message) ? error.message : error instanceof TypeError ? 'provider_response_shape' : safeGoogleFailure(error).code, status: Number(error?.response?.status) || undefined, destination: error.probeDestination, reasons };
  } };
  const management = createManagementHandler(options); const download = createDocumentHandler(options);
  async function api(input) {
    const encoded = JSON.stringify(input); if (Buffer.byteLength(encoded) > 1500000) throw Error('probe_request_limit');
    const response = await management(new Request(PROJECTS_ORIGIN + '/api/proyectos/manage', { method: 'POST', headers: { Origin: PROJECTS_ORIGIN, 'Content-Type': 'application/json', 'X-CEDHU-Projects': '1' }, body: encoded }));
    const data = await response.json();
    if (!response.ok) throw Object.assign(Error('probe_operation_failed'), { probeCode: lastFailure.code || data.code, probeStatus: lastFailure.status || response.status, probeStage: input.action, probeDestination: lastFailure.destination, probeReasons: lastFailure.reasons });
    return data;
  }
  const checks = []; const batch = randomUUID();
  for (const size of [1024, 5 * 1024 * 1024 + 77, 17 * 1024 * 1024 + 19]) {
    const pdf = syntheticPdf(size); const hash = createHash('sha256').update(pdf).digest('hex');
    const prepared = await api({ action: 'prepare', operation: randomUUID(), batch, academic: { anio: '2026', grado: '11', titulo: `Prueba sintética ${size} bytes`, autores: `Equipo QA sintético ${size}`, docente_asesor: 'Docente sintético', area: 'Prueba técnica', resumen: `Documento sintético de ${size} bytes, creado exclusivamente para comprobar cargas privadas de software; no es una investigación institucional.`, palabras_clave: 'prueba, aislamiento, transferencia' }, size, sha256: hash, mime: 'application/pdf', name: `Prueba-${size}.pdf` });
    let last;
    for (let offset = 0; offset < size; offset += 1048576) {
      const data = pdf.subarray(offset, Math.min(offset + 1048576, size)).toString('base64');
      last = await api({ action: 'chunk', ticket: prepared.ticket, offset, data });
      if (offset === 0) await api({ action: 'chunk', ticket: prepared.ticket, offset, data });
    }
    if (!last.complete) throw Error('probe_upload_incomplete');
    const committed = await api({ action: 'commit', ticket: prepared.ticket }); await api({ action: 'commit', ticket: prepared.ticket });
    const returned = [];
    const metadataResponse = await download(new Request(PROJECTS_ORIGIN + '/api/proyectos/document?id=' + committed.projectId));
    if (!metadataResponse.ok) throw Error('probe_download_metadata'); const meta = await metadataResponse.json();
    for (let offset = 0; offset < size; offset += 1048576) {
      const response = await download(new Request(PROJECTS_ORIGIN + '/api/proyectos/document?id=' + committed.projectId + '&offset=' + offset + '&version=' + meta.version));
      if (!response.ok) throw Error('probe_download_chunk'); const bytes = Buffer.from(await response.arrayBuffer()); if (bytes.length > 1048576) throw Error('probe_response_limit'); returned.push(bytes);
    }
    checks.push({ size, upload: true, retry: true, download: createHash('sha256').update(Buffer.concat(returned)).digest('hex') === hash });
    console.log(JSON.stringify({ probe: 'isolated_transfer', stage: 'file_verified', check: checks.at(-1) }));
  }
  const records = await store.projects(); if (records.length !== 3 || !checks.every(c => c.download)) throw Error('probe_integrity');
  const first = records[0]; const academic = Object.fromEntries(['anio', 'grado', 'titulo', 'autores', 'docente_asesor', 'area', 'resumen', 'palabras_clave'].map(key => [key, first[key]])); academic.titulo += ' (editado)';
  await api({ action: 'edit', operation: randomUUID(), id: first.id_proyecto, revision: revisionOf(first), academic });
  identity = { ...identity, role: 'ADMIN' }; const edited = (await store.projects()).find(p => p.id_proyecto === first.id_proyecto);
  await api({ action: 'archive', operation: randomUUID(), id: first.id_proyecto, revision: revisionOf(edited) });
  const events = await createProjectWriter(store).activity();
  return { probe: 'isolated_transfer', ok: true, run, checks, records: records.length, auditEvents: events.length, edit: true, archive: true, permissions, institutionalWrites: false, transport: 'real_google_from_isolated_build_not_function_http' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const result = await transferProbe(); console.log(JSON.stringify(result)); if (!result.ok) process.exitCode = 1; }
  catch (error) { console.log(JSON.stringify({ probe: 'isolated_transfer', ok: false, code: error.probeCode || safeGoogleFailure(error).code, status: error.probeStatus || Number(error?.response?.status) || undefined, stage: error.probeStage, destination: error.probeDestination, reasons: error.probeReasons })); process.exitCode = 1; }
}
