import { normalize, ProjectError } from './catalog.js';

export const PDF_CHUNK_BYTES = 1024 * 1024;
export const PDF_MAX_BYTES = 100 * 1024 * 1024;
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const FOLDER = 'application/vnd.google-apps.folder';
const ID = /^[A-Za-z0-9_-]{10,200}$/;
const unavailable = () => new ProjectError(409, 'document_unavailable', 'El documento requiere verificación. Comunícate con Tecnología CEDHU.');
export const gradeFolderName = grade => /^grado\s/i.test(grade) ? grade : 'Grado ' + grade;
export function safePdfName(name) {
  const base = String(name).normalize('NFC').replace(/\.pdf$/i, '').replace(/[\p{C}<>:"/\\|?*]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  return (base || 'Investigacion-CEDHU') + '.pdf';
}
export function validPdfSignature(buffer) { return buffer.length >= 8 && /^%PDF-[12]\.\d/.test(buffer.subarray(0, 8).toString('ascii')); }

async function metadata(store, id) {
  if (!ID.test(id || '')) throw unavailable();
  const response = await store.client.request({ url: `${DRIVE}/${id}`, params: { supportsAllDrives: true,
    fields: 'id,name,mimeType,parents,driveId,trashed,size,version,sha256Checksum,capabilities(canDownload)' },
    method: 'GET', timeout: 6000, retry: false, maxRedirects: 0, maxContentLength: 16384 });
  const file = response.data;
  if (!file || file.id !== id || file.trashed || file.driveId !== store.config.rootId || file.parents?.length !== 1) throw unavailable();
  return file;
}

/** Follow only the catalog's PDF and verify every ancestor before reading bytes.
 * Deliberately reject legacy misplaced files instead of following Drive links.
 */
export async function verifiedDocument(store, project) {
  const file = await metadata(store, project.id_pdf_drive);
  const size = Number(file.size);
  if (file.mimeType !== 'application/pdf' || file.capabilities?.canDownload !== true || !Number.isSafeInteger(size) || size < 8 || size > PDF_MAX_BYTES || !/^\d{1,30}$/.test(file.version || '')) throw unavailable();
  const grade = await metadata(store, file.parents[0]);
  const year = await metadata(store, grade.parents[0]);
  const researches = await metadata(store, year.parents[0]);
  if ([grade, year, researches].some(folder => folder.mimeType !== FOLDER) ||
      normalize(grade.name) !== normalize(gradeFolderName(project.grado)) || year.name !== project.anio ||
      researches.name !== '01_Investigaciones' || researches.parents[0] !== (store.structureRootId || store.config.rootId)) throw unavailable();
  // Check effective permissions explicitly; never serve an accidentally public file.
  const permissions = await store.client.request({ url: `${DRIVE}/${file.id}/permissions`, params: {
    supportsAllDrives: true, fields: 'nextPageToken,permissions(type)', pageSize: 100 }, method: 'GET',
    timeout: 5000, retry: false, maxRedirects: 0, maxContentLength: 32768 });
  if (!Array.isArray(permissions.data?.permissions) || permissions.data.nextPageToken || permissions.data.permissions.some(p => p.type === 'anyone')) throw unavailable();
  if (project.hash_pdf && /^[a-f0-9]{64}$/i.test(project.hash_pdf) && file.sha256Checksum?.toLowerCase() !== project.hash_pdf.toLowerCase()) throw unavailable();
  const signature = await store.client.request({ url: `${DRIVE}/${file.id}`, params: { alt: 'media', supportsAllDrives: true },
    headers: { Range: 'bytes=0-7', 'Accept-Encoding': 'identity' }, responseType: 'arraybuffer', method: 'GET',
    timeout: 6000, retry: false, maxRedirects: 0, maxContentLength: 8 });
  if (signature.status !== 206 || !validPdfSignature(Buffer.from(signature.data))) throw unavailable();
  return { ...file, size };
}

export async function documentChunk(store, file, offset) {
  const end = Math.min(offset + PDF_CHUNK_BYTES, file.size) - 1;
  const result = await store.client.request({ url: `${DRIVE}/${file.id}`, params: { alt: 'media', supportsAllDrives: true },
    headers: { Range: `bytes=${offset}-${end}`, 'Accept-Encoding': 'identity' }, responseType: 'arraybuffer',
    method: 'GET', timeout: 12000, retry: false, maxRedirects: 0, maxContentLength: PDF_CHUNK_BYTES });
  const data = Buffer.from(result.data);
  const range = result.headers.get('content-range');
  if (result.status !== 206 || range !== `bytes ${offset}-${end}/${file.size}` || data.length !== end - offset + 1 || (offset === 0 && !validPdfSignature(data))) throw unavailable();
  return data;
}
