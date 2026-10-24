import { sealWorkspaceCookie, openWorkspaceCookie } from '../proyectos-workspace-session.js';
import { ProjectError } from './catalog.js';
import { digest } from './validation.js';

const PURPOSE = 'cedhu-project-upload-v1';
export function ticketContext(env) {
  return digest([env.PROYECTOS_DRIVE_ROOT_ID, env.PROYECTOS_METADATA_SPREADSHEET_ID, env.PROYECTOS_AUDIT_SPREADSHEET_ID]);
}
export function sealUploadTicket(data, identity, env, now = Date.now()) {
  return sealWorkspaceCookie({ ...data, sub: identity.sub, context: ticketContext(env), exp: now + 24 * 60 * 60 * 1000 }, Buffer.from(env.PROYECTOS_SESSION_SECRET, 'hex'), PURPOSE);
}
export function readUploadTicket(value, identity, env, now = Date.now()) {
  try {
    const data = openWorkspaceCookie(value, Buffer.from(env.PROYECTOS_SESSION_SECRET, 'hex'), PURPOSE, 32768);
    if (data.sub !== identity.sub || data.context !== ticketContext(env) || !Number.isSafeInteger(data.exp) || data.exp <= now || data.exp > now + 24 * 60 * 60 * 1000 || !(validUploadUri(data.uri) || (data.completed === true && data.uri === null))) throw Error('ticket');
    return data;
  } catch { throw new ProjectError(409, 'upload_expired', 'La carga ha vencido o pertenece a otra sesión. Selecciona nuevamente el documento.'); }
}
export function validUploadUri(value) {
  try {
    const url = new URL(value);
    const uploadId = url.searchParams.get('upload_id') || '';
    // Google owns this opaque query string. Do not reconstruct it or assume
    // base64url without padding. SSRF protection comes from the exact HTTPS
    // origin/path, authenticated encryption and disabled redirects.
    return url.origin === 'https://www.googleapis.com' && url.pathname === '/upload/drive/v3/files' && !url.username && !url.password && !url.hash &&
      (url.searchParams.get('uploadType') === 'resumable' || url.searchParams.get('upload_protocol') === 'resumable') &&
      uploadId.length >= 10 && uploadId.length <= 4096 && /^[\x21-\x7e]+$/.test(uploadId) &&
      [...url.searchParams.keys()].every(key => url.searchParams.getAll(key).length === 1);
  } catch { return false; }
}
