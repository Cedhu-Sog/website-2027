// Server-only catalog rules. Drive identifiers and audit identities never leave
// this layer through the public project representations.
export class ProjectError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    Object.assign(this, { status, code, extra });
  }
}

export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const validProjectId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export const canEdit = (project, identity) => identity.role === 'ADMIN' || project.registrado_por.trim().toLowerCase() === identity.email;
export const isArchived = project => normalize(project.estado) === 'archivado';
export const isDeleted = project => normalize(project.estado) === 'eliminado';
export function ensureCurrentSession(identity, now = Date.now()) {
  if (identity.exp !== undefined && identity.exp * 1000 <= now) throw new ProjectError(401, 'sesion_vencida', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
}

export function parseProjects(rows, headers) {
  if (!Array.isArray(rows) || rows.length > 10000) throw new ProjectError(503, 'catalog_capacity', 'El catálogo requiere mantenimiento. Comunícate con Tecnología CEDHU.');
  const projects = rows.map((row, index) => ({ row, rowNumber: index + 2 })).filter(({ row }) => Array.isArray(row) && row.some(value => String(value ?? '').trim())).map(({ row, rowNumber }) => {
    if (row.length > headers.length || row.some(value => !['string', 'number', 'boolean'].includes(typeof value))) throw new Error('catalog_invalid');
    return { ...Object.fromEntries(headers.map((key, i) => [key, String(row[i] ?? '')])), rowNumber };
  });
  if (projects.some(p => !validProjectId(p.id_proyecto) || !p.titulo.trim()) || new Set(projects.map(p => p.id_proyecto)).size !== projects.length) throw new Error('catalog_ids_invalid');
  return projects;
}

export function projectView(project, identity, detail = false) {
  const keys = ['id_proyecto', 'anio', 'grado', 'titulo', 'autores', 'docente_asesor', 'area', 'estado', 'fecha_registro'];
  if (detail) keys.push('resumen', 'palabras_clave');
  return { ...Object.fromEntries(keys.map(key => [key, project[key]])), canEdit: !isDeleted(project) && canEdit(project, identity), hasDocument: !isDeleted(project) && Boolean(project.id_pdf_drive) };
}

export function findProject(projects, id, identity) {
  if (!validProjectId(id)) throw new ProjectError(400, 'invalid_id', 'El código del proyecto no es válido.');
  const project = projects.find(p => p.id_proyecto === id);
  if (!project || isDeleted(project) || (isArchived(project) && identity.role !== 'ADMIN')) throw new ProjectError(404, 'not_found', 'No se encontró el proyecto.');
  return project;
}

export function queryCatalog(projects, params, identity) {
  const allowed = ['q', 'anio', 'grado', 'area', 'sort', 'page', 'mine', 'archived', 'view'];
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1 || params.get(key).length > 200) throw new ProjectError(400, 'invalid_filter', 'Revisa los filtros de búsqueda.');
  const sort = params.get('sort') || 'fecha';
  const page = Number(params.get('page') || 1);
  const deletedView = params.get('view') === 'deleted';
  if (params.has('view') && (!deletedView || identity.role !== 'ADMIN')) throw new ProjectError(403, 'admin_required', 'Esta consulta está disponible para administradores.');
  if (!['fecha', 'anio', 'titulo'].includes(sort) || !Number.isSafeInteger(page) || page < 1 || page > 1000 ||
    ['mine', 'archived'].some(key => params.has(key) && !['0', '1'].includes(params.get(key)))) throw new ProjectError(400, 'invalid_filter', 'Revisa los filtros de búsqueda.');
  const visible = projects.filter(p => deletedView ? isDeleted(p) : !isDeleted(p) && (!isArchived(p) || (identity.role === 'ADMIN' && params.get('archived') === '1')));
  const facets = Object.fromEntries(['anio', 'grado', 'area'].map(key => [key, [...new Set(visible.map(p => p[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))]));
  const terms = normalize(params.get('q')).split(' ').filter(Boolean);
  const matches = visible.filter(p => {
    if (params.get('mine') === '1' && p.registrado_por.trim().toLowerCase() !== identity.email) return false;
    if (['anio', 'grado', 'area'].some(key => params.get(key) && p[key] !== params.get(key))) return false;
    const haystack = normalize([p.titulo, p.autores, p.resumen, p.palabras_clave].join(' '));
    return terms.every(term => haystack.includes(term));
  });
  matches.sort((a, b) => {
    const compared = sort === 'titulo' ? a.titulo.localeCompare(b.titulo, 'es') : sort === 'anio' ? Number(b.anio) - Number(a.anio) : (Date.parse(b.fecha_registro) || 0) - (Date.parse(a.fecha_registro) || 0);
    return compared || a.id_proyecto.localeCompare(b.id_proyecto);
  });
  const pageSize = 12;
  return { projects: matches.slice((page - 1) * pageSize, page * pageSize).map(p => projectView(p, identity)), total: matches.length, page, pageSize, pages: Math.max(1, Math.ceil(matches.length / pageSize)), facets };
}
