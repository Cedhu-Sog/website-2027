import { digest } from '../projects/validation.js';
import { ProjectError } from '../projects/catalog.js';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const cells = values => ({ values: values.map(value => ({ userEnteredValue: { stringValue: String(value ?? '') } })) });
// 31-bit, positive, deterministic IDs. A hash collision fails closed because
// marker keys/fingerprints are compared, never treated as an automatic replay.
export const markerId = value => (parseInt(digest(value).slice(0, 8), 16) & 0x7fffffff) || 1;

export function createProjectWriter(store) {
  // Per-store invocation only. Reuse structural checks already performed when
  // opening this store; never cache authorization rows or catalog contents.
  const checked = store.sheetInfo ||= new Map();
  async function sheet(key) {
    if (checked.has(key)) return checked.get(key);
    const cfg = store.config.sheets.find(s => s.key === key);
    if (!cfg || !['catalog', 'audit'].includes(key)) throw Error('write_sheet_not_allowed');
    const verified = await store.repository.checkSheet(key, store.systemId);
    let tabId = verified?.tabId;
    if (!Number.isSafeInteger(tabId)) {
      const result = await call(`${SHEETS}/${cfg.id}`, 'GET', undefined, { fields: 'sheets(properties(sheetId,title))' });
      const matches = result.data.sheets.filter(s => s.properties.title === cfg.tab);
      if (matches.length !== 1) throw Error('write_tab_mismatch');
      tabId = matches[0].properties.sheetId;
    }
    const value = { ...cfg, tabId }; checked.set(key, value); return value;
  }
  async function call(url, method, data, params) {
    return store.client.request({ url, method, ...(data ? { data } : {}), ...(params ? { params } : {}), timeout: 10000, retry: false, maxRedirects: 0, maxContentLength: 16 * 1024 * 1024 });
  }
  async function marker(key, operation) {
    const cfg = await sheet(key);
    try {
      const result = await call(`${SHEETS}/${cfg.id}/developerMetadata/${markerId(operation)}`, 'GET');
      const data = result.data;
      if (data.metadataKey !== 'cedhu:' + digest(operation)) throw new ProjectError(409, 'marker_collision', 'Se encontró un conflicto de operación. Comunícate con Tecnología CEDHU.');
      return JSON.parse(data.metadataValue);
    } catch (error) { if (Number(error?.response?.status) === 404) return null; throw error; }
  }
  async function atomic(key, operation, value, requests) {
    const cfg = await sheet(key);
    function verify(existing) {
      if (existing.fingerprint !== value.fingerprint) throw new ProjectError(409, 'operation_conflict', 'Esta operación ya se utilizó con otra información. Vuelve a abrir el registro.');
      return existing;
    }
    const existing = await marker(key, operation); if (existing) return verify(existing);
    const create = { createDeveloperMetadata: { developerMetadata: { metadataId: markerId(operation), metadataKey: 'cedhu:' + digest(operation), metadataValue: JSON.stringify(value), location: { spreadsheet: true }, visibility: 'PROJECT' } } };
    try { await call(`${SHEETS}/${cfg.id}:batchUpdate`, 'POST', { requests: [create, ...requests] }); return value; }
    catch (error) {
      // An uncertain response is never followed by an unguarded append. Reading
      // the same atomic marker resolves concurrent retries and timeouts.
      const committed = await marker(key, operation); if (committed) return verify(committed);
      throw error;
    }
  }
  async function audit({ operation, phase, identity, action, projectId = '', batch = '', details = {}, result, receipt = {}, fingerprint }) {
    const cfg = await sheet('audit');
    const key = `audit:${identity.sub}:${operation}:${phase}`;
    const value = { fingerprint: fingerprint || digest([identity.sub, operation, phase, action, projectId, batch, details]), ...receipt };
    const record = { id_evento: 'EVT-' + digest(key).slice(0, 40), fecha_hora: new Date().toISOString(), usuario_email: identity.email,
      usuario_google_id: identity.sub, accion: action, id_proyecto: projectId, id_lote: batch, detalles: JSON.stringify({ ...details, operation }), resultado: result };
    return atomic('audit', key, value, [{ appendCells: { sheetId: cfg.tabId, rows: [cells(cfg.headers.map(key => record[key]))], fields: 'userEnteredValue' } }]);
  }
  async function create(project, operation, fingerprint) {
    const cfg = await sheet('catalog');
    return atomic('catalog', operation, { fingerprint, projectId: project.id_proyecto }, [{ appendCells: { sheetId: cfg.tabId, rows: [cells(cfg.headers.map(key => project[key]))], fields: 'userEnteredValue' } }]);
  }
  async function update(before, after, operation, fingerprint) {
    const cfg = await sheet('catalog');
    if (!Number.isSafeInteger(before.rowNumber) || before.rowNumber < 2) throw Error('invalid_row');
    const revision = 'revision:' + before.id_proyecto + ':' + digest(cfg.headers.map(key => before[key]));
    const guard = { createDeveloperMetadata: { developerMetadata: { metadataId: markerId(revision), metadataKey: 'cedhu:' + digest(revision), metadataValue: JSON.stringify({ fingerprint: operation }), location: { spreadsheet: true }, visibility: 'PROJECT' } } };
    try { return await atomic('catalog', operation, { fingerprint, projectId: after.id_proyecto }, [guard, { updateCells: { range: { sheetId: cfg.tabId, startRowIndex: before.rowNumber - 1, endRowIndex: before.rowNumber, startColumnIndex: 0, endColumnIndex: cfg.headers.length }, rows: [cells(cfg.headers.map(key => after[key]))], fields: 'userEnteredValue' } }]); }
    catch (error) { if (await marker('catalog', revision)) throw new ProjectError(409, 'edit_conflict', 'Otra persona modificó este proyecto. Vuelve a abrir su ficha antes de editar.'); throw error; }
  }
  async function activity() {
    const cfg = await sheet('audit');
    const response = await call(`${SHEETS}/${cfg.id}/values/${encodeURIComponent("'Actividad'!A2:I")}`, 'GET', undefined, { valueRenderOption: 'FORMATTED_VALUE' });
    const rows = response.data.values ?? [];
    if (rows.length > 10000) throw new ProjectError(503, 'audit_capacity', 'El historial requiere mantenimiento. Comunícate con Tecnología CEDHU.');
    return rows.filter(row => row[0]).map(row => Object.fromEntries(cfg.headers.map((key, index) => [key, String(row[index] ?? '')])));
  }
  return { marker, create, update, audit, activity, reserve: (operation, value) => atomic('catalog', operation, value, []) };
}
