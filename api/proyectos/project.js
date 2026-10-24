import { createProjectHandlers } from '../../src/server/projects/handlers.js';
export default { fetch: createProjectHandlers().project };
