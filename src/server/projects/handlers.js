import { createWorkspaceHandlers } from '../proyectos-google-auth.js';
import { projectsJson } from '../proyectos-session.js';
import { openProjectStore } from '../google/project-store.js';
import { ProjectError, queryCatalog, findProject, projectView } from './catalog.js';
import { revisionOf } from './validation.js';

export function projectFailure(error) {
  if (error instanceof ProjectError) return projectsJson({ code: error.code, message: error.message, ...error.extra }, error.status);
  // Never serialize provider errors, request configs, tokens or private rows.
  return projectsJson({ code: 'service_unavailable', message: 'No fue posible completar la operación. Inténtalo nuevamente. Comunícate con Tecnología CEDHU si el problema continúa.' }, 503);
}

export function createProjectHandlers({ requireSession = createWorkspaceHandlers().requireSession, storeFactory = openProjectStore } = {}) {
  async function catalog(request) {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = await requireSession(request);
    if (access.response) return access.response;
    try {
      const store = await storeFactory();
      return projectsJson(queryCatalog(await store.projects(), new URL(request.url).searchParams, access.identity));
    } catch (error) { return projectFailure(error); }
  }
  async function project(request) {
    if (request.method !== 'GET') return projectsJson({ message: 'Método no permitido.' }, 405, { Allow: 'GET' });
    const access = await requireSession(request);
    if (access.response) return access.response;
    try {
      const params = new URL(request.url).searchParams;
      if ([...params.keys()].some(key => key !== 'id') || params.getAll('id').length !== 1) throw new ProjectError(400, 'invalid_id', 'El código del proyecto no es válido.');
      const store = await storeFactory();
      const found = findProject(await store.projects(), params.get('id'), access.identity);
      return projectsJson({ project: { ...projectView(found, access.identity, true), revision: revisionOf(found) } });
    } catch (error) { return projectFailure(error); }
  }
  return { catalog, project };
}
