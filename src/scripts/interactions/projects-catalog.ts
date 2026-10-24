import { repositoryFetch } from '../utils/projects-network';
import { dateLabel, gradeLabel } from '../utils/projects-format';

export interface AcademicProject {
  id_proyecto: string; anio: string; grado: string; titulo: string; autores: string; docente_asesor: string;
  area: string; estado: string; fecha_registro: string; resumen?: string; palabras_clave?: string;
  canEdit: boolean; hasDocument: boolean;
  canRestore?: boolean;
  revision?: string;
}
interface Catalog { projects: AcademicProject[]; total: number; page: number; pageSize: number; pages: number; facets: Record<string, string[]> }
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, value = '', className = '') {
  const node = document.createElement(tag); node.textContent = value; node.className = className; return node;
}
export async function repositoryRequest(url: string, options: RequestInit = {}) {
  const response = await repositoryFetch(url, options);
  if (response.status === 401 || response.status === 403) {
    const data = await response.json();
    if (response.status === 401 || data.code === 'denegado') document.dispatchEvent(new Event('projects-access-lost'));
    throw new Error(data.message || 'No tienes permiso para realizar esta operación.');
  }
  if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'No fue posible completar la operación.'); }
  return response;
}
export function mountCatalog(host: HTMLElement, role: 'ADMIN' | 'DOCENTE') {
  const root = document.querySelector<HTMLTemplateElement>('[data-catalog-parking]')!.content.querySelector<HTMLElement>('[data-catalog]')!.cloneNode(true) as HTMLElement;
  root.hidden = false;
  host.append(root);
  const form = root.querySelector<HTMLFormElement>('[data-catalog-filters]')!;
  const status = root.querySelector<HTMLElement>('[data-catalog-status]')!;
  const results = root.querySelector<HTMLElement>('[data-catalog-results]')!;
  const pagination = root.querySelector<HTMLElement>('[data-catalog-pagination]')!;
  const previous = root.querySelector<HTMLButtonElement>('[data-page-previous]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-page-next]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-project-detail]')!;
  root.querySelector<HTMLElement>('[data-admin-filter]')!.hidden = role !== 'ADMIN';
  const toggle = root.querySelector<HTMLButtonElement>('[data-filter-toggle]')!;
  const panel = root.querySelector<HTMLElement>('[data-filter-panel]')!;
  const deletedToggle = root.querySelector<HTMLButtonElement>('[data-deleted-toggle]')!;
  deletedToggle.hidden = role !== 'ADMIN';
  let deleted = false;
  toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); });
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); } });
  let page = 1, revision = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let lastQuery = '';
  let hasResults = false;
  let controller: AbortController | undefined;
  let detailController: AbortController | undefined;
  let opener: HTMLElement | undefined;
  const lifecycle = new AbortController();
  async function detail(id: string, button: HTMLElement) {
    opener = button; detailController?.abort(); detailController = new AbortController();
    const currentDetail = detailController;
    const body = root.querySelector<HTMLElement>('[data-project-body]')!;
    body.replaceChildren(element('h2', 'Cargando ficha…')); body.firstElementChild!.id = 'project-detail-title'; dialog.showModal();
    try {
      const response = await repositoryRequest((deleted ? '/api/proyectos/manage?view=deleted-project&id=' : '/api/proyectos/project?id=') + encodeURIComponent(id), { signal: detailController.signal });
      const { project: p }: { project: AcademicProject } = await response.json();
      if (!dialog.open || currentDetail.signal.aborted) return;
      const title = element('h2', p.titulo); title.id = 'project-detail-title';
      const list = element('dl', '', 'repository-metadata');
      for (const [key, label] of Object.entries({ id_proyecto: 'Código institucional', anio: 'Año', grado: 'Grado', autores: 'Autores', docente_asesor: 'Docente asesor', area: 'Área académica', estado: 'Estado', fecha_registro: 'Fecha de registro' })) {
        const value = p[key as keyof AcademicProject] as string;
        list.append(element('dt', label), element('dd', value ? key === 'fecha_registro' ? dateLabel(value) : key === 'grado' ? gradeLabel(value) : value : 'Sin información'));
      }
      body.replaceChildren(title, list, element('h3', 'Resumen'), element('p', p.resumen || 'Sin resumen registrado.'), element('h3', 'Palabras clave'), element('p', p.palabras_clave || 'Sin palabras clave registradas.'));
      body.dispatchEvent(new CustomEvent('project-opened', { bubbles: true, detail: p }));
    } catch (error) { if (currentDetail.signal.aborted) return; body.replaceChildren(element('h2', 'No fue posible abrir la ficha'), element('p', (error as Error).message)); body.firstElementChild!.id = 'project-detail-title'; }
  }
  dialog.addEventListener('close', () => { detailController?.abort(); (opener?.isConnected ? opener : root.querySelector<HTMLElement>('#catalog-heading'))?.focus(); });
  function openLinked() {
    const linked = window.location.hash.match(/^#proyecto=([A-Za-z0-9_%.-]+)$/);
    if (!linked) return;
    try {
      root.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(other => { if (other !== dialog) other.close(); });
      void detail(decodeURIComponent(linked[1]), root.querySelector<HTMLElement>('#catalog-heading')!);
    } catch { /* Invalid fragments carry no private data. */ }
  }
  window.addEventListener('hashchange', openLinked, { signal: lifecycle.signal });
  root.addEventListener('click', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="/proyectos/#proyecto="]');
    if (link && link.target !== '_blank') { event.preventDefault(); window.history.replaceState(null, '', link.href); openLinked(); }
  });
  queueMicrotask(openLinked);
  async function load(force = false) {
    clearTimeout(debounce);
    const query = new URLSearchParams();
    new FormData(form).forEach((value, key) => { if (String(value)) query.set(key, String(value)); }); query.set('page', String(page));
    if (deleted) query.set('view', 'deleted');
    const key = query.toString();
    if (!force && key === lastQuery) return;
    lastQuery = key;
    const request = ++revision; controller?.abort(); controller = new AbortController();
    const filterCount = Array.from(new FormData(form)).filter(([name, value]) => name !== 'q' && String(value) && !(name === 'sort' && value === 'fecha')).length;
    const badge = root.querySelector<HTMLElement>('[data-filter-count]')!; badge.textContent = String(filterCount); badge.hidden = filterCount === 0;
    status.textContent = hasResults ? 'Actualizando resultados…' : 'Buscando proyectos…'; results.setAttribute('aria-busy', 'true');
    const fetchStarted = performance.now();
    try {
      const response = await repositoryRequest('/api/proyectos/catalog?' + query, { signal: controller.signal });
      const data: Catalog = await response.json(); if (request !== revision) return;
      root.dataset.fetchMs = (performance.now() - fetchStarted).toFixed(1);
      const renderStarted = performance.now();
      if (page > data.pages) { page = data.pages; void load(); return; }
      for (const key of ['anio', 'grado', 'area']) {
        const select = form.elements.namedItem(key) as HTMLSelectElement; const selected = select.value;
        select.replaceChildren(new Option('Todos', ''), ...data.facets[key].map(value => new Option(key === 'grado' ? gradeLabel(value) : value, value)));
        if (selected && !data.facets[key].includes(selected)) select.append(new Option(key === 'grado' ? gradeLabel(selected) : selected, selected));
        select.value = selected;
      }
      results.replaceChildren(...data.projects.map(p => {
        const card = element('article', '', 'repository-card');
        const title = element('h3'); const button = element('button', p.titulo, 'repository-title'); button.type = 'button'; button.addEventListener('click', () => void detail(p.id_proyecto, button)); title.append(button);
        card.append(element('p', `${p.anio} · ${gradeLabel(p.grado)} · ${p.area}`, 'eyebrow'), title, element('p', p.autores), element('p', `Asesor: ${p.docente_asesor || 'Sin información'}`, 'repository-muted'), element('span', p.estado || 'Sin estado', 'tag'));
        return card;
      }));
      hasResults = true;
      root.querySelector<HTMLElement>('[data-catalog-count]')!.textContent = `${data.total} proyecto${data.total === 1 ? '' : 's'}`;
      status.textContent = data.total ? `${data.total} proyecto${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}.` : 'No se encontraron proyectos. Prueba con otros términos o restablece los filtros.';
      pagination.hidden = data.pages <= 1; previous.disabled = page <= 1; next.disabled = page >= data.pages;
      root.querySelector<HTMLElement>('[data-page-label]')!.textContent = `Página ${page} de ${data.pages}`;
      performance.clearMeasures('cedhu:catalog-render');
      performance.measure('cedhu:catalog-render', { start: renderStarted, end: performance.now() });
      root.dataset.renderMs = (performance.now() - renderStarted).toFixed(1);
    } catch (error) { if (request !== revision) return; lastQuery = ''; status.textContent = (error as Error).message + ' Puedes volver a buscar para reintentar.'; }
    finally { if (request === revision) results.removeAttribute('aria-busy'); }
  }
  form.addEventListener('submit', event => { event.preventDefault(); page = 1; void load(); });
  form.addEventListener('input', event => {
    if ((event.target as HTMLInputElement).name !== 'q') return;
    page = 1; clearTimeout(debounce); revision++; controller?.abort(); lastQuery = '';
    status.textContent = 'Actualizando resultados…'; results.setAttribute('aria-busy', 'true');
    debounce = setTimeout(() => void load(), 350);
  });
  form.addEventListener('change', event => { if ((event.target as HTMLInputElement).name !== 'q') { page = 1; void load(); } });
  form.addEventListener('reset', event => {
    // The reset event precedes the browser's default action. Reset explicitly
    // so the next query cannot accidentally capture the old field values.
    event.preventDefault();
    form.querySelectorAll<HTMLInputElement>('input').forEach(input => { if (input.type === 'checkbox') input.checked = false; else input.value = ''; });
    form.querySelectorAll<HTMLSelectElement>('select').forEach(select => { select.value = select.name === 'sort' ? 'fecha' : ''; });
    page = 1; void load();
  });
  previous.addEventListener('click', () => { page--; void load(); }); next.addEventListener('click', () => { page++; void load(); });
  deletedToggle.addEventListener('click', () => {
    deleted = !deleted; page = 1;
    deletedToggle.setAttribute('aria-pressed', String(deleted)); deletedToggle.textContent = deleted ? 'Volver al catálogo' : 'Proyectos eliminados';
    root.querySelector<HTMLElement>('[data-catalog-title]')!.textContent = deleted ? 'Proyectos eliminados' : 'Catálogo';
    results.replaceChildren(); hasResults = false; void load();
  });
  void load();
  return { root, refresh: () => load(true), dispose() { revision++; clearTimeout(debounce); lifecycle.abort(); controller?.abort(); detailController?.abort(); if (dialog.open) dialog.close(); root.remove(); } };
}
