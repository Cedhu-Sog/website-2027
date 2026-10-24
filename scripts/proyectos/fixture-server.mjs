import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fixtureEnv, syntheticTeacher, academicFixture, memoryRepository } from './fixtures/repository.mjs';
import { createManagementHandler } from '../../src/server/projects/management.js';
import { createProjectHandlers } from '../../src/server/projects/handlers.js';
import { createDocumentHandler } from '../../src/server/projects/document-handler.js';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';

// Explicit loopback-only, synthetic UI harness. Never imported by api/ or the
// application. It cannot use real Google configuration or credentials.
if (!process.argv.includes('--synthetic-ui') || process.env.VERCEL) throw Error('synthetic_ui_requires_explicit_local_execution');
const memory = memoryRepository(); let signedIn = true;
const identity = { ...syntheticTeacher, role: 'ADMIN' };
const requireSession = async () => signedIn ? { identity } : { response: Response.json({ code: 'sin_sesion' }, { status: 401 }) };
const options = { env: fixtureEnv, requireSession, storeFactory: async () => memory.store };
const management = createManagementHandler(options); const projects = createProjectHandlers(options); const document = createDocumentHandler(options);
const catalog = memory.data[fixtureEnv.PROYECTOS_METADATA_SPREADSHEET_ID];
catalog.rows.push(...Array.from({ length: 26 }, (_, index) => memory.store.config.sheets[0].headers.map(key => ({
  ...academicFixture, id_proyecto: 'CEDHU-QA-' + index, titulo: ['Agua y memoria: nuestra cuenca', 'Huertas escolares y comunidad', 'Tecnología al servicio del aprendizaje'][index % 3] + ' ' + (index + 1),
  anio: String(2025 + index % 2), grado: String(10 + index % 2), area: ['Ciencias naturales', 'Ciencias sociales'][index % 2],
  estado: 'FINALIZADO', registrado_por: identity.email, fecha_registro: '2026-10-24T12:00:00Z',
}[key] || ''))));
const dist = resolve('dist');
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, 'http://127.0.0.1:4322'); let response;
    if (url.pathname.startsWith('/api/proyectos/')) {
      const buffers = []; for await (const bytes of incoming) { buffers.push(bytes); if (buffers.reduce((n, b) => n + b.length, 0) > 1600000) throw Error('fixture_request_limit'); }
      const headers = new Headers(incoming.headers); headers.set('origin', PROJECTS_ORIGIN);
      const request = new Request(PROJECTS_ORIGIN + url.pathname + url.search, { method: incoming.method, headers, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Buffer.concat(buffers) }) });
      if (url.pathname.endsWith('/session')) response = signedIn ? Response.json({ authenticated: true, expiresAt: Date.now() + 3600000, role: identity.role, title: 'Repositorio de investigación CEDHU', welcome: 'Entorno local · datos exclusivamente sintéticos', message: 'Prueba de interfaz' }) : Response.json({ code: 'sin_sesion' }, { status: 401 });
      else if (url.pathname.endsWith('/logout')) { signedIn = false; response = Response.json({ authenticated: false }); }
      else if (url.pathname.endsWith('/catalog')) response = await projects.catalog(request);
      else if (url.pathname.endsWith('/project')) response = await projects.project(request);
      else if (url.pathname.endsWith('/manage')) response = await management(request);
      else if (url.pathname.endsWith('/document')) response = await document(request);
      else response = new Response('', { status: 404 });
    } else {
      const path = resolve(dist, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
      if (!path.startsWith(dist + sep)) throw Error('invalid_fixture_path');
      const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon' }[extname(path)] || 'application/octet-stream';
      response = new Response(await readFile(path), { headers: { 'Content-Type': type } });
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(404); outgoing.end('Synthetic fixture: recurso no disponible'); }
});
server.listen(4322, '127.0.0.1', () => console.log('Synthetic UI only: http://127.0.0.1:4322/proyectos/'));
