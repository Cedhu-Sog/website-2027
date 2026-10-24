import { createHmac } from 'node:crypto';
import { digest } from '../projects/validation.js';
import { ProjectError } from '../projects/catalog.js';
import { PDF_CHUNK_BYTES, gradeFolderName, safePdfName, validPdfSignature } from '../projects/documents.js';
import { validUploadUri } from '../projects/tickets.js';

const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const FOLDER = 'application/vnd.google-apps.folder';
const FIELDS = 'id,name,mimeType,parents,driveId,trashed,size,sha256Checksum';
const queryString = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export function createProjectUploader(store, writer, env) {
  async function call(url, method = 'GET', extra = {}) {
    return store.client.request({ url, method, timeout: 15000, retry: false, maxRedirects: 0, maxContentLength: 32768, ...extra });
  }
  async function generateId() {
    const response = await call(`${DRIVE}/generateIds`, 'GET', { params: { count: 1, space: 'drive', type: 'files' } });
    const id = response.data?.ids?.[0]; if (!/^[A-Za-z0-9_-]{10,200}$/.test(id || '')) throw Error('generated_id_invalid'); return id;
  }
  async function getFile(id) {
    try { return (await call(`${DRIVE}/${id}`, 'GET', { params: { fields: FIELDS, supportsAllDrives: true } })).data; }
    catch (error) { if (Number(error?.response?.status) === 404) return null; throw error; }
  }
  function validLocation(file, parent, name, mime) {
    if (!file || file.trashed || file.driveId !== store.config.rootId || file.parents?.length !== 1 || file.parents[0] !== parent || file.name !== name || file.mimeType !== mime) throw Error('upload_location_invalid');
    return file;
  }
  async function folder(parent, name, create = false) {
    const response = await call(DRIVE, 'GET', { params: { corpora: 'drive', driveId: store.config.rootId, supportsAllDrives: true, includeItemsFromAllDrives: true,
      q: `'${parent}' in parents and trashed = false and mimeType = '${FOLDER}' and name = '${queryString(name)}'`, fields: `nextPageToken,incompleteSearch,files(${FIELDS})`, pageSize: 100 } });
    const data = response.data;
    if (!Array.isArray(data.files) || data.nextPageToken || data.incompleteSearch || data.files.length > 1) throw Error('upload_folder_ambiguous');
    if (data.files.length === 1) return validLocation(data.files[0], parent, name, FOLDER).id;
    if (!create) throw Error('upload_folder_missing');
    const operation = 'folder:' + parent + ':' + name;
    const receipt = await writer.reserve(operation, { fingerprint: digest([parent, name]), fileId: await generateId() });
    try { await call(DRIVE, 'POST', { params: { supportsAllDrives: true, fields: 'id' }, data: { id: receipt.fileId, name, mimeType: FOLDER, parents: [parent] } }); }
    catch (error) { if (Number(error?.response?.status) !== 409) throw error; }
    return validLocation(await getFile(receipt.fileId), parent, name, FOLDER).id;
  }
  async function prepare(input, identity) {
    const fingerprint = digest([input.academic, input.sha256, input.size, input.name, input.batch || '']);
    const projectId = 'CEDHU-' + createHmac('sha256', Buffer.from(env.PROYECTOS_SESSION_SECRET, 'hex')).update(identity.sub + '\0' + input.operation).digest('hex').slice(0, 32);
    const receipt = await writer.audit({ operation: input.operation, phase: 'start', identity, action: input.batch ? 'CARGA_MASIVA' : 'CREACION_PROYECTO', projectId, batch: input.batch || '',
      details: { academic: input.academic, sha256: input.sha256, size: input.size, name: input.name }, result: 'INICIADO', receipt: { fileId: await generateId(), projectId } });
    const research = await folder(store.structureRootId || store.config.rootId, '01_Investigaciones');
    const year = await folder(research, input.academic.anio, true);
    const parent = await folder(year, gradeFolderName(input.academic.grado), true);
    const name = safePdfName(`${input.academic.titulo} — ${projectId.slice(-8)}`);
    const existing = await getFile(receipt.fileId);
    const base = { ...input, fingerprint, projectId, fileId: receipt.fileId, parent, driveName: name, email: identity.email };
    if (existing) {
      validLocation(existing, parent, name, 'application/pdf');
      if (Number(existing.size) !== input.size || existing.sha256Checksum !== input.sha256) throw new ProjectError(409, 'upload_integrity', 'El archivo existente no coincide con la carga. Comunícate con Tecnología CEDHU.');
      return { ...base, completed: true, uri: null };
    }
    const response = await call('https://www.googleapis.com/upload/drive/v3/files', 'POST', { params: { uploadType: 'resumable', supportsAllDrives: true, fields: 'id' },
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'application/pdf', 'X-Upload-Content-Length': String(input.size) },
      data: { id: receipt.fileId, name, mimeType: 'application/pdf', parents: [parent], appProperties: { cedhuProject: projectId } } });
    const uri = response.headers.get('location'); if (!validUploadUri(uri)) throw Error('upload_uri_invalid');
    return { ...base, uri };
  }
  async function state(ticket) {
    if (ticket.completed) return { offset: ticket.size, complete: true };
    const response = await call(ticket.uri, 'PUT', { headers: { 'Content-Range': `bytes */${ticket.size}`, 'Content-Length': '0' }, data: Buffer.alloc(0), validateStatus: status => [200, 201, 308, 404, 410].includes(status) });
    if ([404, 410].includes(response.status)) {
      const file = await getFile(ticket.fileId);
      if (file && file.sha256Checksum === ticket.sha256 && Number(file.size) === ticket.size) return { offset: ticket.size, complete: true };
      throw new ProjectError(409, 'upload_expired', 'La carga se interrumpió. Reintenta para abrir una nueva sesión de carga.');
    }
    if ([200, 201].includes(response.status)) {
      if (response.data?.id !== ticket.fileId) throw Error('upload_result_invalid');
      return { offset: ticket.size, complete: true };
    }
    const range = response.headers.get('range');
    if (range && !/^bytes=0-\d+$/.test(range)) throw Error('upload_range_invalid');
    const offset = range ? Number(range.split('-')[1]) + 1 : 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= ticket.size || offset % (256 * 1024)) throw Error('upload_offset_invalid');
    return { offset, complete: false };
  }
  async function chunk(ticket, offset, encoded) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= ticket.size || offset % (256 * 1024) || typeof encoded !== 'string' || encoded.length > Math.ceil(PDF_CHUNK_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new ProjectError(400, 'invalid_chunk', 'El fragmento del documento no es válido.');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64') !== encoded || bytes.length !== Math.min(PDF_CHUNK_BYTES, ticket.size - offset) || (offset === 0 && !validPdfSignature(bytes))) throw new ProjectError(400, 'invalid_pdf', 'El archivo no tiene una firma PDF válida o está incompleto.');
    const current = await state(ticket); if (current.complete || current.offset > offset) return current;
    if (current.offset !== offset) throw new ProjectError(409, 'upload_offset', 'La carga se interrumpió. Reintenta para continuar desde el último fragmento confirmado.');
    const end = offset + bytes.length - 1;
    const response = await call(ticket.uri, 'PUT', { headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(bytes.length), 'Content-Range': `bytes ${offset}-${end}/${ticket.size}` }, data: bytes,
      validateStatus: status => [200, 201, 308].includes(status) });
    if ([200, 201].includes(response.status) && response.data?.id === ticket.fileId) return { offset: ticket.size, complete: true };
    if (response.status !== 308) throw Error('upload_result_invalid');
    return state(ticket);
  }
  return { prepare, state, chunk };
}
