import { createProjectsHandlers } from '../../src/server/proyectos-auth.js';
export default { fetch: createProjectsHandlers().session };
