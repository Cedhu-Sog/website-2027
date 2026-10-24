import { createHash } from 'node:crypto';
import { GOOGLE_IDENTITY, googleRepositoryConfig } from '../../../src/server/google/config.js';
import { parseProjects } from '../../../src/server/projects/catalog.js';
export { syntheticPdf } from './pdf.mjs';

// No network, real resource IDs, Google identities or persistent private files.
export const fixtureEnv = {
  VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: 'prj_Synthetic', GCP_PROJECT_ID: GOOGLE_IDENTITY.projectId,
  GCP_PROJECT_NUMBER: '123456789012', GCP_SERVICE_ACCOUNT_EMAIL: GOOGLE_IDENTITY.serviceAccount,
  GCP_WORKLOAD_IDENTITY_POOL_ID: GOOGLE_IDENTITY.pool, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: GOOGLE_IDENTITY.provider,
  PROYECTOS_DRIVE_ROOT_ID: 'synthetic_drive_000', PROYECTOS_METADATA_SPREADSHEET_ID: 'synthetic_catalog_000',
  PROYECTOS_AUTH_SPREADSHEET_ID: 'synthetic_users_000', PROYECTOS_AUDIT_SPREADSHEET_ID: 'synthetic_audit_000',
  PROYECTOS_SESSION_SECRET: 'b'.repeat(64), PROYECTOS_WRITES_ENABLED: 'true', PROYECTOS_TRANSFER_VERIFIED: 'v1',
};
export const syntheticTeacher = { role: 'DOCENTE', email: 'docente@example.invalid', sub: '123456789012345678901' };
export const academicFixture = { anio: '2026', grado: '11', titulo: 'Investigación sintética', autores: 'Estudiante de prueba', docente_asesor: 'Docente de prueba', area: 'Ciencias', resumen: 'Resumen académico elaborado exclusivamente para una prueba sintética de software.', palabras_clave: 'prueba, ciencia' };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function providerError(status) { const error = new Error('synthetic_provider_failure'); error.response = { status }; return error; }

export function memoryRepository() {
  const config = googleRepositoryConfig(fixtureEnv);
  let sequence = 0;
  const files = new Map([['synthetic_research_000', { id: 'synthetic_research_000', name: '01_Investigaciones', parents: [config.rootId], mimeType: 'application/vnd.google-apps.folder', driveId: config.rootId }]]);
  const data = Object.fromEntries(config.sheets.map((s, index) => [s.id, { ...s, tabId: index + 1, rows: [], markers: new Map() }]));
  const sessions = new Map(); const calls = []; let loseNextCommit = false;
  const response = (body, status = 200, headers = {}) => ({ data: body, status, headers: new Headers(headers) });
  async function request(options) {
    calls.push({ url: options.url, method: options.method, size: Buffer.isBuffer(options.data) ? options.data.length : JSON.stringify(options.data || '').length });
    const url = new URL(options.url); const path = url.pathname; const params = options.params || {};
    if (url.hostname === 'sheets.googleapis.com') {
      const id = path.split('/')[3].replace(':batchUpdate', ''); const sheet = data[id]; if (!sheet) throw providerError(404);
      if (path.includes('/developerMetadata/')) { const marker = sheet.markers.get(Number(path.split('/').at(-1))); if (!marker) throw providerError(404); return response(structuredClone(marker)); }
      if (path.endsWith(':batchUpdate')) {
        const copy = structuredClone(sheet);
        for (const item of options.data.requests) {
          if (item.createDeveloperMetadata) { const marker = item.createDeveloperMetadata.developerMetadata; if (copy.markers.has(marker.metadataId)) throw providerError(400); copy.markers.set(marker.metadataId, marker); }
          else if (item.appendCells) { for (const row of item.appendCells.rows) copy.rows.push(row.values.map(cell => cell.userEnteredValue.stringValue)); }
          else if (item.updateCells) { const range = item.updateCells.range; copy.rows[range.startRowIndex - 1] = item.updateCells.rows[0].values.map(cell => cell.userEnteredValue.stringValue); }
          else throw Error('unhandled_sheets_request');
        }
        sheet.rows = copy.rows; sheet.markers = copy.markers;
        if (loseNextCommit && options.data.requests.some(item => item.appendCells || item.updateCells) && sheet.key === 'catalog') { loseNextCommit = false; throw providerError(503); }
        return response({ replies: [] });
      }
      if (path.includes('/values/')) return response({ values: sheet.rows });
      return response({ sheets: [{ properties: { title: sheet.tab, sheetId: sheet.tabId } }] });
    }
    if (path.includes('/upload/')) {
      if (options.method === 'POST') {
        const id = options.data.id; if (files.has(id)) throw providerError(409);
        const upload = 'synthetic_upload_session_' + ++sequence; const uri = `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=${upload}`;
        sessions.set(upload, { id, metadata: options.data, chunks: [], size: Number(options.headers['X-Upload-Content-Length']), offset: 0 });
        return response({}, 200, { location: uri });
      }
      const session = sessions.get(url.searchParams.get('upload_id')); if (!session) throw providerError(404);
      if (options.headers['Content-Range'].startsWith('bytes */')) return session.offset === session.size ? response({ id: session.id }) : response({}, 308, session.offset ? { range: `bytes=0-${session.offset - 1}` } : {});
      const [, start, end, total] = options.headers['Content-Range'].match(/bytes (\d+)-(\d+)\/(\d+)/);
      if (Number(start) !== session.offset || Number(total) !== session.size || options.data.length !== Number(end) - Number(start) + 1) throw providerError(400);
      session.chunks.push(Buffer.from(options.data)); session.offset += options.data.length;
      if (session.offset === session.size) {
        const bytes = Buffer.concat(session.chunks);
        files.set(session.id, { ...session.metadata, driveId: config.rootId, size: String(bytes.length), version: '1', sha256Checksum: sha256(bytes), capabilities: { canDownload: true }, bytes });
        return response({ id: session.id });
      }
      return response({}, 308, { range: `bytes=0-${session.offset - 1}` });
    }
    if (path.endsWith('/generateIds')) return response({ ids: ['synthetic_generated_' + String(++sequence).padStart(6, '0')] });
    if (path.endsWith('/permissions')) return response({ permissions: [{ type: 'user' }] });
    if (path.endsWith('/files')) {
      if (options.method === 'POST') { if (files.has(options.data.id)) throw providerError(409); files.set(options.data.id, { ...options.data, driveId: config.rootId }); return response({ id: options.data.id }); }
      const parent = params.q.match(/^'([^']+)' in parents/)?.[1]; const name = params.q.match(/name = '([^']+)'/)?.[1];
      return response({ files: [...files.values()].filter(file => file.parents?.includes(parent) && file.name === name && !file.trashed) });
    }
    const file = files.get(path.split('/').at(-1)); if (!file) throw providerError(404);
    if (params.alt === 'media') {
      const [, start, end] = options.headers.Range.match(/bytes=(\d+)-(\d+)/); return response(file.bytes.subarray(Number(start), Number(end) + 1), 206, { 'content-range': `bytes ${start}-${end}/${file.size}` });
    }
    return response({ ...file, bytes: undefined });
  }
  const store = { config, systemId: 'synthetic_system_000', client: { request }, repository: { checkSheet: async () => {} }, projects: async () => parseProjects(data[config.sheets[0].id].rows, config.sheets[0].headers) };
  return { store, files, data, sessions, calls, loseCommitResponse() { loseNextCommit = true; } };
}
