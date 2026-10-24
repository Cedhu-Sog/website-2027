import { createWorkspaceHandlers } from '../proyectos-google-auth.js';
import { projectsJson } from '../proyectos-session.js';
import { openProjectStore } from '../google/project-store.js';
import { ProjectError, queryCatalog, findProject, projectView, ensureCurrentSession } from './catalog.js';
import { revisionOf } from './validation.js';
import { safeGoogleFailure } from '../google/config.js';
import { measuredHandler } from './timing.js';

export function projectFailure(error) {
  if (error instanceof ProjectError) return projectsJson({ code: error.code, message: error.message, ...error.extra }, error.status);
  if (safeGoogleFailure(error).code.endsWith('rate_limited')) return projectsJson({ code: 'service_busy', message: 'El repositorio está atendiendo varias consultas. Espera unos segundos y vuelve a intentarlo.' }, 503, { 'Retry-After': '30' });
  // Never serialize provider errors, request configs, tokens or private rows.
  return projectsJson({ code: 'service_unavailable', message: 'No fue posible completar la operación. Inténtalo nuevamente. Comunícate con Tecnología CEDHU si el problema continúa.' }, 503);
}

export function createProjectHandlers({ requireSession = createWorkspaceHandlers().requireSession, storeFactory = openProjectStore } = {}) {
  const catalog = measuredHandler(async (request, timing) => {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = await requireSession(request, { timing });
    if (access.response) return access.response;
    try {
      const store = await storeFactory({ context: access.googleContext, timing });
      const projects = await timing.measure('catalog', () => store.projects());
      const result = await timing.measure('search', () => queryCatalog(projects, new URL(request.url).searchParams, access.identity));
      ensureCurrentSession(access.identity);
      return projectsJson(result);
    } catch (error) { return projectFailure(error); }
  });
  const project = measuredHandler(async (request, timing) => {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = await requireSession(request, { timing });
    if (access.response) return access.response;
    try {
      const params = new URL(request.url).searchParams;
      if ([...params.keys()].some(key => key !== 'id') || params.getAll('id').length !== 1) throw new ProjectError(400, 'invalid_id', 'El código del proyecto no es válido.');
      const store = await storeFactory({ context: access.googleContext, timing });
      const found = findProject(await timing.measure('catalog', () => store.projects()), params.get('id'), access.identity);
      ensureCurrentSession(access.identity);
      return projectsJson({ project: { ...projectView(found, access.identity, true), revision: revisionOf(found) } });
    } catch (error) { return projectFailure(error); }
  });
  return { catalog, project };
}
