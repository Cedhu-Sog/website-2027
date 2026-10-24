import { projectsJson } from '../../src/server/proyectos-session.js';
// The shared-password access is retired. Legacy cookies cannot authorize Workspace.
export default { fetch: () => projectsJson({ message: 'Utiliza tu cuenta institucional de Google.' }, 410) };
