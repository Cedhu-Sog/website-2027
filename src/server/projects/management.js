import { createWorkspaceHandlers } from '../proyectos-google-auth.js';
import { allowedRequest, PROJECTS_ORIGIN, projectsJson } from '../proyectos-session.js';
import { writesEnabled } from '../google/auth.js';
import { openProjectStore } from '../google/project-store.js';
import { createProjectWriter } from '../google/project-writer.js';
import { createProjectUploader } from '../google/project-upload.js';
import { ProjectError, canEdit, findProject, isDeleted, validProjectId, projectView, ensureCurrentSession } from './catalog.js';
import { projectFailure } from './handlers.js';
import { academicInput, uploadInput, duplicateCandidates, requireDuplicateConfirmation, digest, revisionOf, operationId } from './validation.js';
import { sealUploadTicket, readUploadTicket } from './tickets.js';
import { verifiedDocument } from './documents.js';
import { safeGoogleFailure } from '../google/config.js';
import { measuredHandler } from './timing.js';

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
  return measuredHandler(async (request, timing) => {
    if (!['GET', 'POST'].includes(request.method)) return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET, POST' });
    const access = await requireSession(request, { timing }); if (access.response) return access.response;
    const identity = access.identity;
    let auditWriter;
    let operationContext;
    try {
      if (request.method === 'GET') {
        const params = new URL(request.url).searchParams;
        if (params.get('view') === 'capabilities' && [...params.keys()].length === 1) return projectsJson({ canWrite: writesEnabled(env), message: writesEnabled(env) ? '' : 'El registro de proyectos estará disponible cuando Tecnología CEDHU termine de verificar las cargas.', actor: digest(identity.sub).slice(0, 24) });
        if (identity.role !== 'ADMIN') throw new ProjectError(403, 'admin_required', 'Esta consulta está disponible para administradores.');
        if (params.get('view') === 'deleted-project') {
          if ([...params.keys()].some(k => !['view', 'id'].includes(k) || params.getAll(k).length !== 1) || !validProjectId(params.get('id'))) throw new ProjectError(400, 'invalid_id', 'El código del proyecto no es válido.');
          const store = await storeFactory({ write: false, context: access.googleContext, timing });
          const project = (await store.projects()).find(p => p.id_proyecto === params.get('id') && isDeleted(p));
          if (!project) throw new ProjectError(404, 'not_found', 'No se encontró el proyecto.');
          ensureCurrentSession(identity, now());
          return projectsJson({ project: { ...projectView(project, identity, true), revision: revisionOf(project), canRestore: true } });
        }
        if ([...params.keys()].some(key => !['view', 'page'].includes(key) || params.getAll(key).length !== 1) || params.get('view') !== 'activity') throw new ProjectError(400, 'invalid_request', 'La consulta no es válida.');
        const page = Number(params.get('page') || 1); if (!Number.isSafeInteger(page) || page < 1 || page > 1000) throw new ProjectError(400, 'invalid_page', 'La página no es válida.');
        const store = await storeFactory({ write: false, context: access.googleContext, timing }); const writer = writerFactory(store);
        const events = (await writer.activity()).reverse();
        ensureCurrentSession(identity, now());
        const resolved = new Set(events.filter(e => e.accion === 'INCIDENCIA_RESUELTA').map(e => { try { return JSON.parse(e.detalles).eventId; } catch { return ''; } }));
        const operationKey = event => { try { const operation = JSON.parse(event.detalles).operation; return typeof operation === 'string' ? event.usuario_google_id + ':' + operation : ''; } catch { return ''; } };
        const finished = new Set(events.filter(e => e.resultado === 'EXITO').map(operationKey).filter(Boolean));
        const items = events.slice((page - 1) * 30, page * 30).map(event => ({ ...Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'usuario_google_id')), needsAttention: !resolved.has(event.id_evento) && ['FALLIDO', 'INICIADO'].includes(event.resultado) && !finished.has(operationKey(event)) }));
        return projectsJson({ events: items, total: events.length, page, pages: Math.max(1, Math.ceil(events.length / 30)) });
      }
      if (!allowedRequest(request, { origin: PROJECTS_ORIGIN }, true)) throw new ProjectError(403, 'csrf', 'Solicitud no permitida.');
      if (!writesEnabled(env)) throw new ProjectError(503, 'writes_disabled', 'El registro de proyectos aún no está habilitado. Comunícate con Tecnología CEDHU.');
      if (new URL(request.url).search) throw new ProjectError(400, 'invalid_request', 'La solicitud no es válida.');
      const input = await jsonBody(request);
      const store = await storeFactory({ write: true, context: access.googleContext, timing }); const writer = writerFactory(store);
      ensureCurrentSession(identity, now());
      auditWriter = writer;
      const uploader = uploaderFactory(store, writer, env);
      if (input.action === 'prepare') {
        const allowed = ['action', 'academic', 'operation', 'batch', 'size', 'mime', 'name', 'sha256', 'confirmedDuplicates'];
        if (Object.keys(input).some(k => !allowed.includes(k))) throw new ProjectError(400, 'invalid_fields', 'Revisa los campos del registro.');
        const academic = academicInput(input.academic, now()); uploadInput(input);
        operationContext = { operation: input.operation, batch: input.batch || '', action: 'INCIDENCIA_IMPORTACION' };
        requireDuplicateConfirmation(duplicateCandidates(await store.projects(), academic, input.sha256, identity), input.confirmedDuplicates);
        const ticket = await uploader.prepare({ ...input, academic }, identity);
        ensureCurrentSession(identity, now());
        return projectsJson({ ticket: sealUploadTicket(ticket, identity, env, now()), projectId: ticket.projectId, chunkSize: 1048576 });
      }
      if (['resume', 'status', 'chunk', 'commit'].includes(input.action)) {
        const allowed = input.action === 'chunk' ? ['action', 'ticket', 'offset', 'data'] : ['action', 'ticket'];
        if (Object.keys(input).some(k => !allowed.includes(k))) throw new ProjectError(400, 'invalid_fields', 'La solicitud de carga no es válida.');
        const ticket = readUploadTicket(input.ticket, identity, env, now());
        operationContext = { operation: ticket.operation, batch: ticket.batch || '', projectId: ticket.projectId, action: 'INCIDENCIA_IMPORTACION' };
        if (input.action === 'resume') return projectsJson({ academic: ticket.academic, sha256: ticket.sha256, projectId: ticket.projectId });
        if (input.action === 'status' || input.action === 'chunk') {
          const result = input.action === 'status' ? await uploader.state(ticket) : await uploader.chunk(ticket, input.offset, input.data);
          ensureCurrentSession(identity, now()); return projectsJson(result);
        }
        const operation = `create:${identity.sub}:${ticket.operation}`;
        const prior = await writer.marker('catalog', operation);
        if (prior && prior.fingerprint !== ticket.fingerprint) throw new ProjectError(409, 'operation_conflict', 'La operación ya se utilizó con otros datos.');
        if (!prior) {
          requireDuplicateConfirmation(duplicateCandidates(await store.projects(), ticket.academic, ticket.sha256, identity), ticket.confirmedDuplicates);
          const candidate = { ...ticket.academic, id_proyecto: ticket.projectId, id_pdf_drive: ticket.fileId, hash_pdf: ticket.sha256 };
          const file = await verifiedDocument(store, candidate, { exactAcademicLocation: true });
          if (file.sha256Checksum !== ticket.sha256 || file.size !== ticket.size) throw new ProjectError(409, 'upload_integrity', 'No fue posible verificar la integridad del PDF. Reintenta la carga.');
          const at = new Date(now()).toISOString();
          ensureCurrentSession(identity, now());
          await writer.create({ ...candidate, nombre_pdf: file.name, fecha_registro: at, registrado_por: identity.email, fecha_modificacion: at, modificado_por: identity.email, estado: 'FINALIZADO', id_lote: ticket.batch || '' }, operation, ticket.fingerprint);
        }
        await writer.audit({ operation: ticket.operation, phase: 'success', identity, action: ticket.batch ? 'RESULTADO_IMPORTACION' : 'CREACION_PROYECTO', projectId: prior?.projectId || ticket.projectId, batch: ticket.batch || '', details: { sha256: ticket.sha256, size: ticket.size }, result: 'EXITO' });
        return projectsJson({ message: 'Proyecto guardado correctamente.', projectId: prior?.projectId || ticket.projectId });
      }
      if (['edit', 'archive', 'delete', 'restore'].includes(input.action)) {
        const allowed = ['action', 'operation', 'id', 'revision', ...(input.action === 'edit' ? ['academic', 'confirmedDuplicates'] : input.action === 'restore' ? ['confirmedDuplicates'] : [])];
        if (Object.keys(input).some(k => !allowed.includes(k)) || !operationId(input.operation) || !/^[a-f0-9]{64}$/.test(input.revision || '')) throw new ProjectError(400, 'invalid_request', 'Vuelve a abrir el proyecto antes de editar.');
        if (!validProjectId(input.id)) throw new ProjectError(400, 'invalid_id', 'El código del proyecto no es válido.');
        const projects = await store.projects();
        // Only mutation handlers may locate tombstones; ordinary detail and
        // document handlers always reject them, including for administrators.
        const before = ['delete', 'restore'].includes(input.action) ? projects.find(p => p.id_proyecto === input.id) : findProject(projects, input.id, identity);
        if (!before) throw new ProjectError(404, 'not_found', 'No se encontró el proyecto.');
        if (!canEdit(before, identity) || (['archive', 'restore'].includes(input.action) && identity.role !== 'ADMIN')) throw new ProjectError(403, 'not_owner', 'No tienes permiso para modificar este proyecto.');
        operationContext = { operation: input.operation, projectId: input.id, action: 'INCIDENCIA_GESTION' };
        const academic = input.action === 'edit' ? academicInput(input.academic, now()) : {};
        const fingerprint = digest([input.action, input.id, input.revision, academic]);
        const operation = `mutate:${identity.sub}:${input.operation}`;
        const prior = await writer.marker('catalog', operation);
        if (prior && prior.fingerprint !== fingerprint) throw new ProjectError(409, 'operation_conflict', 'La operación ya se utilizó con otros datos.');
        const action = { edit: 'EDICION_PROYECTO', archive: 'ARCHIVO_PROYECTO', delete: 'ELIMINACION_PROYECTO', restore: 'RESTAURACION_PROYECTO' }[input.action];
        const message = { edit: 'Información actualizada correctamente.', archive: 'Proyecto archivado correctamente.', delete: 'Proyecto eliminado correctamente. Tecnología CEDHU podrá recuperarlo.', restore: 'Proyecto restaurado correctamente.' }[input.action];
        if (!prior) {
          if (input.action === 'delete' && isDeleted(before)) return projectsJson({ message, projectId: input.id });
          if (input.action === 'restore' && !isDeleted(before)) throw new ProjectError(409, 'not_deleted', 'El proyecto ya está disponible. Vuelve a abrir el catálogo.');
          if (revisionOf(before) !== input.revision) throw new ProjectError(409, 'edit_conflict', 'Otra persona modificó este proyecto. Vuelve a abrir su ficha.');
          if (input.action === 'edit') requireDuplicateConfirmation(duplicateCandidates(projects, academic, '', identity, input.id), input.confirmedDuplicates);
          let state = before.estado;
          if (input.action === 'archive') state = 'ARCHIVADO';
          if (input.action === 'delete') state = 'ELIMINADO';
          if (input.action === 'restore') {
            const deletion = await writer.marker('catalog', `deleted:${before.id_proyecto}:${revisionOf(before)}`);
            if (!deletion || deletion.revision !== input.revision || typeof deletion.state !== 'string' || deletion.fingerprint !== digest(deletion.state) || isDeleted({ estado: deletion.state })) throw new ProjectError(409, 'recovery_verification', 'Tecnología CEDHU debe verificar el estado original antes de restaurar este proyecto.');
            requireDuplicateConfirmation(duplicateCandidates(projects, before, before.hash_pdf, identity, input.id), input.confirmedDuplicates);
            state = deletion.state;
          }
          // Keep revision identity monotonic even during rapid delete/restore
          // cycles in the same millisecond (prevents the ABA revision problem).
          const modifiedAt = Math.max(now(), (Date.parse(before.fecha_modificacion) || 0) + 1);
          const after = { ...before, ...academic, estado: state, fecha_modificacion: new Date(modifiedAt).toISOString(), modificado_por: identity.email };
          await writer.audit({ operation: input.operation, phase: 'start', identity, action, projectId: input.id, fingerprint, details: { before: Object.fromEntries(store.config.sheets[0].headers.map(k => [k, before[k]])), after: Object.fromEntries(store.config.sheets[0].headers.map(k => [k, after[k]])) }, result: 'INICIADO' });
          ensureCurrentSession(identity, now());
          await writer.update(before, after, operation, fingerprint);
        }
        await writer.audit({ operation: input.operation, phase: 'success', identity, action, projectId: input.id, details: { operation: input.operation }, result: 'EXITO' });
        return projectsJson({ message, projectId: input.id });
      }
      if (input.action === 'resolve' && identity.role === 'ADMIN') {
        if (Object.keys(input).some(key => !['action', 'operation', 'eventId', 'note'].includes(key))) throw new ProjectError(400, 'invalid_resolution', 'La resolución no es válida.');
        if (!operationId(input.operation) || !/^EVT-[a-f0-9]{40}$/.test(input.eventId || '') || typeof input.note !== 'string' || input.note.trim().length < 10 || input.note.length > 1000) throw new ProjectError(400, 'invalid_resolution', 'Explica cómo se resolvió la incidencia (entre 10 y 1000 caracteres).');
        const event = (await writer.activity()).find(e => e.id_evento === input.eventId);
        if (!event) throw new ProjectError(404, 'event_not_found', 'No se encontró la incidencia.');
        ensureCurrentSession(identity, now());
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
  });
}
