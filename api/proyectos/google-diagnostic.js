import { createGoogleDiagnosticHandler } from '../../src/server/google/diagnostic.js';

// No token retrieval at module scope: Vercel establishes context per invocation.
export default { fetch: createGoogleDiagnosticHandler() };
