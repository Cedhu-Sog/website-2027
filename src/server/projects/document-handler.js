import { createWorkspaceHandlers } from '../proyectos-google-auth.js';
import { projectsJson, privateHeaders } from '../proyectos-session.js';
import { openProjectStore } from '../google/project-store.js';
import { findProject, ProjectError, ensureCurrentSession } from './catalog.js';
import { projectFailure } from './handlers.js';
import { verifiedDocument, documentChunk, PDF_CHUNK_BYTES, safePdfName } from './documents.js';
import { measuredHandler } from './timing.js';

export function createDocumentHandler({ requireSession = createWorkspaceHandlers().requireSession, storeFactory = openProjectStore, onFailure = () => {} } = {}) {
  return measuredHandler(async (request, timing) => {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = await requireSession(request, { timing }); if (access.response) return access.response;
    try {
      const params = new URL(request.url).searchParams;
      if (params.getAll('id').length !== 1 || [...params.keys()].some(k => !['id', 'offset', 'version'].includes(k) || params.getAll(k).length !== 1)) throw new ProjectError(400, 'invalid_document', 'Solicitud de documento no válida.');
      const store = await storeFactory({ context: access.googleContext, timing });
      const project = findProject(await timing.measure('catalog', () => store.projects()), params.get('id'), access.identity);
      const file = await timing.measure('document_verify', () => verifiedDocument(store, project));
      ensureCurrentSession(access.identity);
      if (!params.has('offset')) {
        findProject(await timing.measure('catalog', () => store.projects()), params.get('id'), access.identity);
        ensureCurrentSession(access.identity);
        return projectsJson({ size: file.size, version: file.version, name: safePdfName(file.name), chunkSize: PDF_CHUNK_BYTES, sha256: file.sha256Checksum || '' });
      }
      const offset = Number(params.get('offset'));
      if (!/^\d+$/.test(params.get('offset')) || !Number.isSafeInteger(offset) || offset < 0 || offset >= file.size || offset % PDF_CHUNK_BYTES || params.get('version') !== file.version) throw new ProjectError(409, 'document_changed', 'El documento ha cambiado. Vuelve a abrirlo.');
      const data = await timing.measure('document_bytes', () => documentChunk(store, file, offset));
      // Re-read metadata to detect concurrent replacement during the range read.
      const current = await timing.measure('document_verify', () => verifiedDocument(store, project, { verifySignature: false }));
      if (current.version !== file.version) throw new ProjectError(409, 'document_changed', 'El documento ha cambiado. Vuelve a abrirlo.');
      // Do not complete an in-flight chunk after its catalog record was deleted.
      findProject(await timing.measure('catalog', () => store.projects()), params.get('id'), access.identity);
      ensureCurrentSession(access.identity);
      const headers = privateHeaders();
      headers.set('Content-Type', 'application/octet-stream'); headers.set('Content-Length', String(data.length));
      return new Response(data, { headers });
    } catch (error) { try { onFailure(error); } catch { /* No diagnostic changes the response. */ } return projectFailure(error); }
  });
}
