export interface AcademicProject {
  id_proyecto: string; anio: string; grado: string; titulo: string; autores: string; docente_asesor: string;
  area: string; estado: string; fecha_registro: string; resumen?: string; palabras_clave?: string;
  canEdit: boolean; hasDocument: boolean;
}
interface Catalog { projects: AcademicProject[]; total: number; page: number; pageSize: number; pages: number; facets: Record<string, string[]> }
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, value = '', className = '') {
  const node = document.createElement(tag); node.textContent = value; node.className = className; return node;
}
export async function repositoryRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', ...options,
    signal: options.signal ?? AbortSignal.timeout(55000) });
  if (response.status === 401 || response.status === 403) {
    const data = await response.json();
    if (response.status === 401 || data.code === 'denegado') document.dispatchEvent(new Event('projects-access-lost'));
    throw new Error(data.message || 'No tienes permiso para realizar esta operación.');
  }
  if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'No fue posible completar la operación.'); }
  return response;
}
export function mountCatalog(host: HTMLElement, role: 'ADMIN' | 'DOCENTE') {
  const root = document.querySelector<HTMLElement>('[data-catalog]')!.cloneNode(true) as HTMLElement;
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
  let page = 1, revision = 0;
  let controller: AbortController | undefined;
  let detailController: AbortController | undefined;
  let opener: HTMLElement | undefined;
  async function detail(id: string, button: HTMLElement) {
    opener = button; detailController?.abort(); detailController = new AbortController();
    const body = root.querySelector<HTMLElement>('[data-project-body]')!;
    body.replaceChildren(element('h2', 'Cargando ficha…')); body.firstElementChild!.id = 'project-detail-title'; dialog.showModal();
    try {
      const response = await repositoryRequest('/api/proyectos/project?id=' + encodeURIComponent(id), { signal: detailController.signal });
      const { project: p }: { project: AcademicProject } = await response.json();
      if (!dialog.open) return;
      const title = element('h2', p.titulo); title.id = 'project-detail-title';
      const list = element('dl', '', 'repository-metadata');
      for (const [key, label] of Object.entries({ id_proyecto: 'Código institucional', anio: 'Año', grado: 'Grado', autores: 'Autores', docente_asesor: 'Docente asesor', area: 'Área académica', estado: 'Estado', fecha_registro: 'Fecha de registro' })) {
        list.append(element('dt', label), element('dd', p[key as keyof AcademicProject] as string || 'Sin información'));
      }
      body.replaceChildren(title, list, element('h3', 'Resumen'), element('p', p.resumen || 'Sin resumen registrado.'), element('h3', 'Palabras clave'), element('p', p.palabras_clave || 'Sin palabras clave registradas.'));
      body.dispatchEvent(new CustomEvent('project-opened', { bubbles: true, detail: p }));
    } catch (error) { if (detailController?.signal.aborted) return; body.replaceChildren(element('h2', 'No fue posible abrir la ficha'), element('p', (error as Error).message)); body.firstElementChild!.id = 'project-detail-title'; }
  }
  dialog.addEventListener('close', () => { detailController?.abort(); opener?.focus(); });
  async function load() {
    const request = ++revision; controller?.abort(); controller = new AbortController();
    const query = new URLSearchParams();
    new FormData(form).forEach((value, key) => { if (String(value)) query.set(key, String(value)); }); query.set('page', String(page));
    status.textContent = 'Buscando proyectos…'; results.setAttribute('aria-busy', 'true'); pagination.hidden = true;
    try {
      const response = await repositoryRequest('/api/proyectos/catalog?' + query, { signal: controller.signal });
      const data: Catalog = await response.json(); if (request !== revision) return;
      if (page > data.pages) { page = data.pages; void load(); return; }
      for (const key of ['anio', 'grado', 'area']) {
        const select = form.elements.namedItem(key) as HTMLSelectElement; const selected = select.value;
        select.replaceChildren(new Option('Todos', ''), ...data.facets[key].map(value => new Option(value, value)));
        select.value = selected;
      }
      results.replaceChildren(...data.projects.map(p => {
        const card = element('article', '', 'repository-card');
        const title = element('h3'); const button = element('button', p.titulo, 'repository-title'); button.type = 'button'; button.addEventListener('click', () => void detail(p.id_proyecto, button)); title.append(button);
        card.append(element('p', `${p.anio} · ${p.grado} · ${p.area}`, 'eyebrow'), title, element('p', p.autores), element('p', `Asesor: ${p.docente_asesor || 'Sin información'}`, 'repository-muted'), element('span', p.estado || 'Sin estado', 'tag'));
        return card;
      }));
      status.textContent = data.total ? `${data.total} proyecto${data.total === 1 ? '' : 's'} encontrado${data.total === 1 ? '' : 's'}.` : 'No se encontraron proyectos. Prueba con otros términos o limpia los filtros.';
      pagination.hidden = data.pages <= 1; previous.disabled = page <= 1; next.disabled = page >= data.pages;
      root.querySelector<HTMLElement>('[data-page-label]')!.textContent = `Página ${page} de ${data.pages}`;
    } catch (error) { if (request !== revision) return; results.replaceChildren(); status.textContent = (error as Error).message + ' Puedes volver a buscar para reintentar.'; }
    finally { if (request === revision) results.removeAttribute('aria-busy'); }
  }
  form.addEventListener('submit', event => { event.preventDefault(); page = 1; void load(); });
  form.addEventListener('reset', () => { page = 1; queueMicrotask(() => void load()); });
  previous.addEventListener('click', () => { page--; void load(); }); next.addEventListener('click', () => { page++; void load(); });
  void load();
  return { root, refresh: load, dispose() { revision++; controller?.abort(); detailController?.abort(); if (dialog.open) dialog.close(); root.remove(); } };
}
