import { createWorkspaceHandlers } from '../proyectos-google-auth.js';
import { allowedRequest, PROJECTS_ORIGIN, projectsJson } from '../proyectos-session.js';
import { writesEnabled } from '../google/auth.js';
import { openProjectStore } from '../google/project-store.js';
import { createProjectWriter } from '../google/project-writer.js';
import { createProjectUploader } from '../google/project-upload.js';
import { ProjectError, canEdit, findProject, projectView, isArchived } from './catalog.js';
import { projectFailure } from './handlers.js';
import { academicInput, uploadInput, duplicateCandidates, requireDuplicateConfirmation, digest, revisionOf, operationId } from './validation.js';
import { sealUploadTicket, readUploadTicket } from './tickets.js';
import { verifiedDocument } from './documents.js';
import { safeGoogleFailure } from '../google/config.js';

async function jsonBody(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ProjectError(415, 'json_required', 'El formato de la solicitud no es válido.');
  const reader = request.body?.getReader(); if (!reader) throw new ProjectError(400, 'invalid_request', 'La solicitud está incompleta.');
  const chunks = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 1500000) { await reader.cancel(); throw new ProjectError(413, 'request_too_large', 'El fragmento supera el tamaño permitido.'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { const input = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error(); return input; }
  catch { throw new ProjectError(400, 'invalid_request', 'La solicitud no es válida.'); }
}

export function createManagementHandler({ env = process.env, requireSession = createWorkspaceHandlers({ env }).requireSession,
  storeFactory = options => openProjectStore({ env, ...options }), writerFactory = createProjectWriter, uploaderFactory = createProjectUploader, now = Date.now, onFailure = () => {} } = {}) {
  return async request => {
    if (!['GET', 'POST'].includes(request.method)) return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET, POST' });
    const access = await requireSession(request); if (access.response) return access.response;
    const identity = access.identity;
    let auditWriter;
    let operationContext;
    try {
      if (request.method === 'GET') {
        const params = new URL(request.url).searchParams;
        if (params.get('view') === 'capabilities' && [...params.keys()].length === 1) return projectsJson({ canWrite: writesEnabled(env), message: writesEnabled(env) ? '' : 'El registro de proyectos estará disponible cuando Tecnología CEDHU termine de verificar las cargas.', actor: digest(identity.sub).slice(0, 24) });
        if (identity.role !== 'ADMIN') throw new ProjectError(403, 'admin_required', 'Esta consulta está disponible para administradores.');
        if ([...params.keys()].some(key => !['view', 'page'].includes(key) || params.getAll(key).length !== 1) || params.get('view') !== 'activity') throw new ProjectError(400, 'invalid_request', 'La consulta no es válida.');
        const page = Number(params.get('page') || 1); if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new ProjectError(400, 'invalid_page', 'La página no es válida.');
        const store = await storeFactory({ write: false }); const writer = writerFactory(store);
        const events = (await writer.activity()).reverse();
        const resolved = new Set(events.filter(e => e.accion === 'INCIDENCIA_RESUELTA').map(e => { try { return JSON.parse(e.detalles).eventId; } catch { return ''; } }));
        const finished = new Set(events.filter(e => e.resultado === 'EXITO').map(e => e.id_proyecto).filter(Boolean));
        const items = events.slice((page - 1) * 30, page * 30).map(({ usuario_google_id: _sub, ...event }) => ({ ...event, needsAttention: !resolved.has(event.id_evento) && (event.resultado === 'FALLIDO' || (event.resultado === 'INICIADO' && !finished.has(event.id_proyecto))) }));
        return projectsJson({ events: items, total: events.length, page, pages: Math.max(1, Math.ceil(events.length / 30)) });
      }
      if (!allowedRequest(request, { origin: PROJECTS_ORIGIN }, true)) throw new ProjectError(403, 'csrf', 'Solicitud no permitida.');
      if (!writesEnabled(env)) throw new ProjectError(503, 'writes_disabled', 'El registro de proyectos aún no está habilitado. Comunícate con Tecnología CEDHU.');
      if (new URL(request.url).search) throw new ProjectError(400, 'invalid_request', 'La solicitud no es válida.');
      const input = await jsonBody(request);
      const store = await storeFactory({ write: true }); const writer = writerFactory(store);
      auditWriter = writer;
      const uploader = uploaderFactory(store, writer, env);
      if (input.action === 'prepare') {
        const allowed = ['action', 'academic', 'operation', 'batch', 'size', 'mime', 'name', 'sha256', 'confirmedDuplicates'];
        if (Object.keys(input).some(k => !allowed.includes(k))) throw new ProjectError(400, 'invalid_fields', 'Revisa los campos del registro.');
        const academic = academicInput(input.academic, now()); uploadInput(input);
        operationContext = { operation: input.operation, batch: input.batch || '', action: 'INCIDENCIA_IMPORTACION' };
        requireDuplicateConfirmation(duplicateCandidates(await store.projects(), academic, input.sha256, identity), input.confirmedDuplicates);
        const ticket = await uploader.prepare({ ...input, academic }, identity);
        return projectsJson({ ticket: sealUploadTicket(ticket, identity, env, now()), projectId: ticket.projectId, chunkSize: 1048576 });
      }
      if (['resume', 'status', 'chunk', 'commit'].includes(input.action)) {
        const allowed = input.action === 'chunk' ? ['action', 'ticket', 'offset', 'data'] : ['action', 'ticket'];
        if (Object.keys(input).some(k => !allowed.includes(k))) throw new ProjectError(400, 'invalid_fields', 'La solicitud de carga no es válida.');
        const ticket = readUploadTicket(input.ticket, identity, env, now());
        operationContext = { operation: ticket.operation, batch: ticket.batch || '', projectId: ticket.projectId, action: 'INCIDENCIA_IMPORTACION' };
        if (input.action === 'resume') return projectsJson({ academic: ticket.academic, sha256: ticket.sha256, projectId: ticket.projectId });
        if (input.action === 'status') return projectsJson(await uploader.state(ticket));
        if (input.action === 'chunk') return projectsJson(await uploader.chunk(ticket, input.offset, input.data));
        const operation = `create:${identity.sub}:${ticket.operation}`;
        const prior = await writer.marker('catalog', operation);
        if (prior && prior.fingerprint !== ticket.fingerprint) throw new ProjectError(409, 'operation_conflict', 'La operación ya se utilizó con otros datos.');
        if (!prior) {
          requireDuplicateConfirmation(duplicateCandidates(await store.projects(), ticket.academic, ticket.sha256, identity), ticket.confirmedDuplicates);
          const candidate = { ...ticket.academic, id_proyecto: ticket.projectId, id_pdf_drive: ticket.fileId, hash_pdf: ticket.sha256 };
          const file = await verifiedDocument(store, candidate);
          if (file.sha256Checksum !== ticket.sha256 || file.size !== ticket.size) throw new ProjectError(409, 'upload_integrity', 'No fue posible verificar la integridad del PDF. Reintenta la carga.');
          const at = new Date(now()).toISOString();
          await writer.create({ ...candidate, nombre_pdf: file.name, fecha_registro: at, registrado_por: identity.email, fecha_modificacion: at, modificado_por: identity.email, estado: 'FINALIZADO', id_lote: ticket.batch || '' }, operation, ticket.fingerprint);
        }
        await writer.audit({ operation: ticket.operation, phase: 'success', identity, action: ticket.batch ? 'RESULTADO_IMPORTACION' : 'CREACION_PROYECTO', projectId: prior?.projectId || ticket.projectId, batch: ticket.batch || '', details: { sha256: ticket.sha256, size: ticket.size }, result: 'EXITO' });
        return projectsJson({ message: 'Proyecto guardado correctamente.', projectId: prior?.projectId || ticket.projectId });
      }
      if (['edit', 'archive'].includes(input.action)) {
        const allowed = ['action', 'operation', 'id', 'revision', 'academic', 'confirmedDuplicates'];
        if (Object.keys(input).some(k => !allowed.includes(k)) || !operationId(input.operation) || !/^[a-f0-9]{64}$/.test(input.revision || '')) throw new ProjectError(400, 'invalid_request', 'Vuelve a abrir el proyecto antes de editar.');
        const projects = await store.projects(); const before = findProject(projects, input.id, identity);
        if (!canEdit(before, identity) || (input.action === 'archive' && identity.role !== 'ADMIN') || (input.action === 'edit' && isArchived(before))) throw new ProjectError(403, 'not_owner', 'No tienes permiso para modificar este proyecto.');
        operationContext = { operation: input.operation, projectId: input.id, action: 'INCIDENCIA_GESTION' };
        const academic = input.action === 'edit' ? academicInput(input.academic, now()) : {};
        if (input.action === 'edit' && (academic.anio !== before.anio || academic.grado !== before.grado)) throw new ProjectError(409, 'document_relocation_required', 'Para cambiar el año o grado y conservar la ubicación del documento, comunícate con Tecnología CEDHU. Puedes actualizar los demás campos.');
        const fingerprint = digest([input.action, input.id, input.revision, academic]);
        const operation = `mutate:${identity.sub}:${input.operation}`;
        const prior = await writer.marker('catalog', operation);
        if (prior && prior.fingerprint !== fingerprint) throw new ProjectError(409, 'operation_conflict', 'La operación ya se utilizó con otros datos.');
        if (!prior) {
          if (revisionOf(before) !== input.revision) throw new ProjectError(409, 'edit_conflict', 'Otra persona modificó este proyecto. Vuelve a abrir su ficha.');
          if (input.action === 'edit') requireDuplicateConfirmation(duplicateCandidates(projects, academic, '', identity, input.id), input.confirmedDuplicates);
          const after = { ...before, ...academic, ...(input.action === 'archive' ? { estado: 'ARCHIVADO' } : {}), fecha_modificacion: new Date(now()).toISOString(), modificado_por: identity.email };
          await writer.audit({ operation: input.operation, phase: 'start', identity, action: input.action === 'archive' ? 'ARCHIVO_PROYECTO' : 'EDICION_PROYECTO', projectId: input.id, fingerprint, details: { before: Object.fromEntries(store.config.sheets[0].headers.map(k => [k, before[k]])), after: Object.fromEntries(store.config.sheets[0].headers.map(k => [k, after[k]])) }, result: 'INICIADO' });
          await writer.update(before, after, operation, fingerprint);
        }
        await writer.audit({ operation: input.operation, phase: 'success', identity, action: input.action === 'archive' ? 'ARCHIVO_PROYECTO' : 'EDICION_PROYECTO', projectId: input.id, details: { operation: input.operation }, result: 'EXITO' });
        return projectsJson({ message: input.action === 'archive' ? 'Proyecto archivado correctamente.' : 'Información actualizada correctamente.', projectId: input.id });
      }
      if (input.action === 'resolve' && identity.role === 'ADMIN') {
        if (!operationId(input.operation) || !/^EVT-[a-f0-9]{40}$/.test(input.eventId || '') || typeof input.note !== 'string' || input.note.trim().length < 10 || input.note.length > 1000) throw new ProjectError(400, 'invalid_resolution', 'Explica cómo se resolvió la incidencia (entre 10 y 1000 caracteres).');
        const event = (await writer.activity()).find(e => e.id_evento === input.eventId);
        if (!event) throw new ProjectError(404, 'event_not_found', 'No se encontró la incidencia.');
        await writer.audit({ operation: input.operation, phase: 'resolved', identity, action: 'INCIDENCIA_RESUELTA', projectId: event.id_proyecto, batch: event.id_lote, details: { eventId: input.eventId, note: input.note.trim() }, result: 'EXITO' });
        return projectsJson({ message: 'Resolución registrada correctamente.' });
      }
      throw new ProjectError(400, 'unknown_action', 'La operación no es válida.');
    } catch (error) {
      // Injectable diagnostic sink for isolated administrative tests only. The
      // default emits nothing; it is never configured from an HTTP request.
      try { onFailure(error); } catch { /* Diagnostics cannot change access or results. */ }
      if (auditWriter && operationContext) {
        // Log only a controlled code. Google errors can contain credentials;
        // upload tickets, session URIs and request bodies are never audit data.
        const code = error instanceof ProjectError ? error.code : safeGoogleFailure(error).code;
        try { await auditWriter.audit({ ...operationContext, phase: 'failure', identity, result: 'FALLIDO', details: { code } }); } catch { /* The original operation still fails closed if audit is unavailable. */ }
      }
      return projectFailure(error);
    }
  };
}
