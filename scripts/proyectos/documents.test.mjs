import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createDocumentHandler } from '../../src/server/projects/document-handler.js';
import { PDF_CHUNK_BYTES, safePdfName } from '../../src/server/projects/documents.js';
import { projectsJson, PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';

const identity = { role: 'DOCENTE', email: 'synthetic@example.invalid' };
const project = { id_proyecto: 'synthetic_project', id_pdf_drive: 'synthetic_pdf_001', titulo: 'Proyecto sintético', anio: '2026', grado: '11', estado: 'FINALIZADO' };
function fixture(size, change = {}) {
  const pdf = Buffer.alloc(size, 32); pdf.write('%PDF-1.7'); pdf.write('%%EOF', size - 5);
  const files = {
    synthetic_pdf_001: { id: 'synthetic_pdf_001', name: 'Investigación.pdf', mimeType: 'application/pdf', parents: ['synthetic_grade_001'], size: String(size), version: '1', capabilities: { canDownload: true }, sha256Checksum: createHash('sha256').update(pdf).digest('hex') },
    synthetic_grade_001: { id: 'synthetic_grade_001', name: 'Grado 11', mimeType: 'application/vnd.google-apps.folder', parents: ['synthetic_year_001'] },
    synthetic_year_001: { id: 'synthetic_year_001', name: '2026', mimeType: 'application/vnd.google-apps.folder', parents: ['synthetic_research_001'] },
    synthetic_research_001: { id: 'synthetic_research_001', name: '01_Investigaciones', mimeType: 'application/vnd.google-apps.folder', parents: ['synthetic_drive_001'] },
  };
  let metadataReads = 0;
  const store = { config: { rootId: 'synthetic_drive_001' }, projects: async () => [project], client: { request: async options => {
    assert.equal(options.method, 'GET');
    const id = options.url.split('/').at(-1);
    if (id === 'permissions') return { data: { permissions: [{ type: change.public ? 'anyone' : 'user' }] } };
    if (options.params.alt === 'media') {
      assert(options.maxContentLength <= PDF_CHUNK_BYTES);
      const [, start, end] = options.headers.Range.match(/bytes=(\d+)-(\d+)/);
      return { status: change.ignoreRange ? 200 : 206, data: change.signature ? Buffer.alloc(Number(end) - Number(start) + 1) : pdf.subarray(Number(start), Number(end) + 1), headers: new Headers({ 'content-range': `bytes ${start}-${end}/${size}` }) };
    }
    if (id === project.id_pdf_drive) metadataReads++;
    return { data: { ...files[id], driveId: change.outside ? 'outside_drive_001' : 'synthetic_drive_001', ...(change.moved && id === 'synthetic_grade_001' ? { name: 'Grado 10' } : {}), ...(change.modified && metadataReads > 1 && id === project.id_pdf_drive ? { version: '2' } : {}) } };
  } } };
  return { store, pdf };
}
const req = query => new Request(PROJECTS_ORIGIN + '/api/proyectos/document?' + query);

test('protected PDF transfer reconstructs small, 4.5MB+ and 17MB originals in bounded responses', async () => {
  for (const size of [1024, 5 * 1024 * 1024 + 77, 17 * 1024 * 1024 + 19]) {
    const { store, pdf } = fixture(size);
    const handler = createDocumentHandler({ requireSession: async () => ({ identity }), storeFactory: async () => store });
    const metaResponse = await handler(req('id=synthetic_project'));
    assert.equal(metaResponse.status, 200); const meta = await metaResponse.json();
    assert.equal(meta.size, size); assert(!JSON.stringify(meta).includes('synthetic_pdf_001'));
    const chunks = [];
    for (let offset = 0; offset < size; offset += PDF_CHUNK_BYTES) {
      const response = await handler(req(`id=synthetic_project&offset=${offset}&version=1`));
      assert.equal(response.status, 200); assert.match(response.headers.get('Cache-Control'), /no-store/);
      const bytes = Buffer.from(await response.arrayBuffer()); assert(bytes.length <= PDF_CHUNK_BYTES); chunks.push(bytes);
    }
    assert.deepEqual(Buffer.concat(chunks), pdf);
  }
});

test('document access fails closed for anonymous, arbitrary IDs, public/misplaced files, bad signatures, ignored ranges and changed versions', async () => {
  const denied = createDocumentHandler({ requireSession: async () => ({ response: projectsJson({}, 401) }), storeFactory: () => assert.fail('private read') });
  assert.equal((await denied(req('id=synthetic_project'))).status, 401);
  for (const change of [{ public: true }, { outside: true }, { moved: true }, { signature: true }, { ignoreRange: true }, { modified: true }]) {
    const { store } = fixture(2048, change);
    const handler = createDocumentHandler({ requireSession: async () => ({ identity }), storeFactory: async () => store });
    assert.equal((await handler(req('id=synthetic_project&offset=0&version=1'))).status, 409);
  }
  const { store } = fixture(2048);
  const handler = createDocumentHandler({ requireSession: async () => ({ identity }), storeFactory: async () => store });
  for (const query of ['id=synthetic_project&fileId=outside', 'id=../../outside', 'id=missing', 'id=synthetic_project&offset=1&version=1', 'id=synthetic_project&offset=0&version=2']) assert((await handler(req(query))).status >= 400);
  assert.equal(safePdfName('../unsafe\r\n/file.pdf'), '..unsafefile.pdf');
});
