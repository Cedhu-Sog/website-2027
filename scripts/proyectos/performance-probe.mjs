import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { authorizedWorkspaceRole } from '../../src/server/proyectos-google-auth.js';
import { openProjectStore } from '../../src/server/google/project-store.js';
import { createProjectHandlers } from '../../src/server/projects/handlers.js';
import { createDocumentHandler } from '../../src/server/projects/document-handler.js';
import { performanceRepository } from './fixtures/performance.mjs';
import { syntheticTeacher } from './fixtures/repository.mjs';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';

const report = { model: 'Synthetic: 20 ms per Google operation, 40 ms per authentication; not actual Google latency.', samples: [] };
for (const path of ['catalog', 'project?id=CEDHU-SYNTHETIC', 'document?id=CEDHU-SYNTHETIC', 'document?id=CEDHU-SYNTHETIC&offset=0&version=1']) {
  const values = [];
  for (let i = 0; i < 3; i++) {
    const e = performanceRepository(20);
    const requireSession = async (_request, options = {}) => {
      const googleContext = {};
      const role = await authorizedWorkspaceRole({ env: e.env, ...syntheticTeacher, clientFactory: e.clientFactory, context: googleContext, timing: options.timing });
      if (role !== 'DOCENTE') throw Error('synthetic_authorization_failed');
      return { identity: syntheticTeacher, googleContext };
    };
    const options = { requireSession, storeFactory: opts => openProjectStore({ env: e.env, clientFactory: e.clientFactory, ...opts }) };
    const handler = path.startsWith('document') ? createDocumentHandler(options) : createProjectHandlers(options)[path.split('?')[0]];
    const start = performance.now(); const response = await handler(new Request(PROJECTS_ORIGIN + '/api/proyectos/' + path));
    await response.arrayBuffer();
    if (response.status !== 200) throw Error('synthetic_request_failed_' + response.status);
    values.push({ ms: Math.round(performance.now() - start), googleOperations: e.calls.length, authentications: e.authentications });
  }
  report.samples.push({ route: path.split('?')[0] + (path.includes('offset') ? '-chunk' : ''), ...values[1], ms: values.map(v => v.ms).sort((a, b) => a - b)[1], minMs: Math.min(...values.map(v => v.ms)), maxMs: Math.max(...values.map(v => v.ms)) });
}
console.log(JSON.stringify(report, null, 2));
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
