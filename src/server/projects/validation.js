import { createHash } from 'node:crypto';
import { normalize, isArchived, ProjectError, projectView } from './catalog.js';
import { PDF_MAX_BYTES } from './documents.js';

export const ACADEMIC_FIELDS = Object.freeze({ anio: 4, grado: 40, titulo: 300, autores: 1500, docente_asesor: 200, area: 120, resumen: 6000, palabras_clave: 800 });
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const revisionOf = project => digest(Object.entries(project).filter(([key]) => key !== 'rowNumber').sort(([a], [b]) => a.localeCompare(b)));
export const operationId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

export function academicInput(input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !Object.hasOwn(ACADEMIC_FIELDS, key))) throw new ProjectError(400, 'invalid_fields', 'Revisa los campos académicos.');
  const result = {};
  for (const [key, max] of Object.entries(ACADEMIC_FIELDS)) {
    const value = input[key];
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new ProjectError(400, 'missing_fields', 'Falta completar información o un campo supera la extensión permitida.', { field: key });
    result[key] = value.normalize('NFC').trim();
  }
  if (!/^\d{4}$/.test(result.anio) || Number(result.anio) < 1900 || Number(result.anio) > new Date(now).getUTCFullYear() + 1 ||
    !/^(?:Grado )?(?:[0-9]|10|11|Transición|Jardín|Prejardín)$/i.test(result.grado)) throw new ProjectError(400, 'invalid_year_grade', 'Revisa el año y el grado del proyecto.');
  return result;
}

export function uploadInput(input) {
  if (!operationId(input.operation) || (input.batch && !operationId(input.batch)) || !Number.isSafeInteger(input.size) || input.size < 8 || input.size > PDF_MAX_BYTES ||
    input.mime !== 'application/pdf' || typeof input.name !== 'string' || input.name.length > 200 || !/\.pdf$/i.test(input.name) || /[\p{C}/\\]/u.test(input.name) || !/^[a-f0-9]{64}$/.test(input.sha256 || '')) {
    throw new ProjectError(400, 'invalid_pdf', 'Selecciona un PDF válido de hasta 100 MiB, con un nombre sin rutas ni caracteres especiales.');
  }
  if (!Array.isArray(input.confirmedDuplicates ?? []) || (input.confirmedDuplicates ?? []).length > 100 || (input.confirmedDuplicates ?? []).some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id))) throw new ProjectError(400, 'invalid_confirmation', 'Revisa la confirmación de coincidencias.');
}

export function duplicateCandidates(projects, academic, hash, identity, exclude = '') {
  return projects.filter(p => p.id_proyecto !== exclude && (!isArchived(p) || identity.role === 'ADMIN')).filter(p => {
    if (hash && p.hash_pdf.toLowerCase() === hash.toLowerCase()) return true;
    const title = normalize(p.titulo) === normalize(academic.titulo);
    const context = p.anio === academic.anio && normalize(p.grado) === normalize(academic.grado);
    const authors = normalize(p.autores) === normalize(academic.autores);
    const abstract = normalize(p.resumen).length > 80 && normalize(p.resumen) === normalize(academic.resumen);
    const keywords = normalize(p.palabras_clave).length > 10 && normalize(p.palabras_clave) === normalize(academic.palabras_clave);
    return (title && (context || authors || abstract)) || (abstract && authors && (context || keywords));
  }).map(p => ({ ...projectView(p, identity), exactPdf: Boolean(hash && p.hash_pdf.toLowerCase() === hash.toLowerCase()) }));
}

export function requireDuplicateConfirmation(candidates, confirmed = []) {
  if (candidates.some(p => !confirmed.includes(p.id_proyecto))) throw new ProjectError(409, 'possible_duplicate', 'Se encontró un posible duplicado. Revisa los proyectos existentes y confirma si deseas continuar.', { duplicates: candidates });
}
