import { setTimeout as pause } from 'node:timers/promises';
import { memoryRepository, fixtureEnv, syntheticTeacher, academicFixture, syntheticPdf, sha256 } from './repository.mjs';
import { GOOGLE_IDENTITY } from '../../../src/server/google/config.js';

// A bounded, repeatable network model, never a measurement of Google's latency.
export function performanceRepository(latency = 0) {
  const memory = memoryRepository(); const { config } = memory.store;
  const folder = 'application/vnd.google-apps.folder'; const calls = []; let authentications = 0;
  const roots = ['00_Sistema', '01_Investigaciones', '02_Importaciones_Temporales'].map((name, i) => ({ id: ['synthetic_system_000', 'synthetic_research_000', 'synthetic_temporary_000'][i], name, mimeType: folder, parents: [config.rootId], driveId: config.rootId }));
  const bytes = syntheticPdf(1048576 + 7);
  memory.files.set('synthetic_grade_000', { id: 'synthetic_grade_000', name: 'Grado 11', mimeType: folder, parents: ['synthetic_year_000'], driveId: config.rootId });
  memory.files.set('synthetic_year_000', { id: 'synthetic_year_000', name: '2026', mimeType: folder, parents: ['synthetic_research_000'], driveId: config.rootId });
  memory.files.set('synthetic_pdf_000', { id: 'synthetic_pdf_000', name: 'Sintético.pdf', mimeType: 'application/pdf', parents: ['synthetic_grade_000'], driveId: config.rootId, size: String(bytes.length), version: '1', sha256Checksum: sha256(bytes), capabilities: { canDownload: true }, bytes });
  const p = { ...academicFixture, id_proyecto: 'CEDHU-SYNTHETIC', id_pdf_drive: 'synthetic_pdf_000', hash_pdf: sha256(bytes), estado: 'FINALIZADO', registrado_por: syntheticTeacher.email };
  memory.data[config.sheets[0].id].rows.push(config.sheets[0].headers.map(k => p[k] || ''));
  async function request(options) {
    calls.push({ service: options.url.includes('sheets.googleapis.com') ? 'sheets' : 'drive', path: new URL(options.url).pathname.replace(/synthetic_[^/]+/g, ':id') });
    if (latency) await pause(latency);
    const url = new URL(options.url); const params = options.params || {}; const data = value => ({ data: value, status: 200, headers: new Headers() });
    if (url.pathname.endsWith('/about')) return data({ user: { emailAddress: GOOGLE_IDENTITY.serviceAccount } });
    if (url.pathname.includes('/drives/')) return data({ id: config.rootId, name: 'Repo Investigación' });
    if (url.pathname.endsWith('/files') && params.q?.includes('00_Sistema')) return data({ files: roots });
    const sheet = config.sheets.find(s => url.pathname.includes(s.id));
    if (sheet && url.hostname === 'www.googleapis.com') return data({ id: sheet.id, name: sheet.name, mimeType: 'application/vnd.google-apps.spreadsheet', parents: ['synthetic_system_000'], driveId: config.rootId });
    if (sheet && !url.pathname.includes('/values/')) return data({ sheets: [{ properties: { title: sheet.tab, sheetId: config.sheets.indexOf(sheet) + 1, sheetType: 'GRID' } }] });
    if (sheet && decodeURIComponent(url.pathname).endsWith('!1:1')) return data({ values: [sheet.headers] });
    if (sheet?.key === 'users') return data({ values: [[syntheticTeacher.email, syntheticTeacher.sub, 'Docente sintético', 'DOCENTE', 'ACTIVO']] });
    return memory.store.client.request(options);
  }
  const clientFactory = () => ({ request, async getAccessToken() { authentications++; if (latency) await pause(latency * 2); return { token: 'synthetic-only' }; } });
  return { ...memory, clientFactory, calls, get authentications() { return authentications; }, env: fixtureEnv };
}
