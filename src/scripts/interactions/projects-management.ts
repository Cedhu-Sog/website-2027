import { element, repositoryRequest, type AcademicProject } from './projects-catalog';
import { repositoryFetch } from '../utils/projects-network';
import { dateLabel, gradeLabel, actionLabel, resultLabel } from '../utils/projects-format';

type Academic = Record<string, string>;
type Row = { file: File; root: HTMLElement; fields: HTMLFieldSetElement; status: HTMLElement; progress: HTMLProgressElement; review: HTMLElement; operation: string; ticket?: string; hash?: string; state: 'pending' | 'success' | 'failed'; confirmed: string[]; storageKey?: string; snapshot?: string };
class ManagementError extends Error { code = ''; duplicates: AcademicProject[] = []; }
const names = ['anio', 'grado', 'titulo', 'autores', 'docente_asesor', 'area', 'resumen', 'palabras_clave'];
const labels = ['Año', 'Grado', 'Título', 'Autores', 'Docente asesor', 'Área académica', 'Resumen', 'Palabras clave'];

export function mountManagement(root: HTMLElement, role: 'ADMIN' | 'DOCENTE', refresh: () => Promise<void>, capabilities?: { canWrite: boolean; actor: string }) {
  const query = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const controller = new AbortController(); let alive = true; let canWrite = capabilities?.canWrite === true; let actor = capabilities?.actor || ''; let running = false; let stopping = false;
  const dialog = query<HTMLDialogElement>('[data-management-dialog]');
  const editDialog = query<HTMLDialogElement>('[data-edit-dialog]');
  const activityDialog = query<HTMLDialogElement>('[data-activity-dialog]');
  const deleteDialog = query<HTMLDialogElement>('[data-delete-dialog]');
  const deleteConfirm = query<HTMLButtonElement>('[data-delete-confirm]');
  let deleting: AcademicProject | undefined; let deleteOperation = ''; let deleteBusy = false;
  query('[data-delete-cancel]').addEventListener('click', () => deleteDialog.close());
  deleteDialog.addEventListener('cancel', event => { if (deleteBusy) event.preventDefault(); });
  deleteConfirm.addEventListener('click', async () => {
    if (!deleting || deleteBusy) return;
    deleteBusy = true; deleteConfirm.disabled = true; query<HTMLButtonElement>('[data-delete-cancel]').disabled = true;
    try {
      const result = await api({ action: 'delete', operation: deleteOperation, id: deleting.id_proyecto, revision: deleting.revision });
      query('[data-management-status]').textContent = result.message; deleteDialog.close(); query('#catalog-heading').focus(); await refresh();
    } catch (error) { if (alive) query('[data-delete-status]').textContent = (error as Error).message; }
    finally { deleteBusy = false; deleteConfirm.disabled = false; query<HTMLButtonElement>('[data-delete-cancel]').disabled = false; }
  });
  deleteDialog.addEventListener('close', () => { if (alive) query('#catalog-heading').focus(); });
  const form = query<HTMLFormElement>('[data-upload-form]'); const files = query<HTMLInputElement>('[data-upload-files]');
  const rowsHost = query<HTMLElement>('[data-upload-rows]'); const summary = query<HTMLElement>('[data-import-summary]');
  const importButton = query<HTMLButtonElement>('[data-import]'); const reviewButton = query<HTMLButtonElement>('[data-review]'); const correctButton = query<HTMLButtonElement>('[data-correct]');
  const register = query<HTMLButtonElement>('[data-register]'); const bulk = query<HTMLButtonElement>('[data-bulk]');
  const activityButton = query<HTMLButtonElement>('[data-activity]'); activityButton.hidden = role !== 'ADMIN';
  const template = query<HTMLTemplateElement>('[data-academic-template]');
  let rows: Row[] = []; let batch = ''; let selectedProject: AcademicProject | undefined; let editAcademic: Academic; let editOperation = ''; let editConfirmed: string[] = []; let editBusy = false; let opener: HTMLElement | undefined;
  async function api(input: object) {
    const response = await repositoryFetch('/api/proyectos/manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CEDHU-Projects': '1' },
      credentials: 'same-origin', cache: 'no-store', redirect: 'error', body: JSON.stringify(input), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || data.code === 'denegado') document.dispatchEvent(new Event('projects-access-lost'));
      const error = new ManagementError(data.message || 'No fue posible guardar el proyecto.'); error.code = data.code || ''; error.duplicates = data.duplicates || []; throw error;
    }
    if (!alive) throw new Error('La sesión se cerró.'); return data;
  }
  function academic(fields: HTMLElement): Academic {
    return Object.fromEntries(names.map(name => [name, fields.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`)!.value.trim()]));
  }
  function fill(fields: HTMLElement, values: Academic) {
    for (const name of names) {
      const input = fields.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
      if (input instanceof HTMLSelectElement && values[name] && !Array.from(input.options).some(option => option.value === values[name])) input.append(new Option(values[name], values[name]));
      input.value = values[name] || '';
    }
  }
  function newFields() { return (template.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLFieldSetElement; }
  function preview(values: Academic) { const list = element('dl', '', 'repository-metadata'); names.forEach((name, i) => list.append(element('dt', labels[i]), element('dd', name === 'grado' ? gradeLabel(values[name]) : values[name]))); return list; }
  function closeToFocus(target: HTMLDialogElement) { target.addEventListener('close', () => (opener?.isConnected && !opener.closest('dialog:not([open])') ? opener : query('#catalog-heading')).focus()); }
  [dialog, editDialog, activityDialog].forEach(closeToFocus);
  function open(multiple: boolean, button: HTMLElement) {
    opener = button;
    if (running) { dialog.showModal(); return; }
    rows = []; rowsHost.replaceChildren(); files.value = ''; files.multiple = multiple; batch = multiple ? crypto.randomUUID() : '';
    query('[data-management-dialog] h2').textContent = multiple ? 'Subir varios proyectos' : 'Registrar proyecto';
    summary.textContent = ''; query('[data-resume-message]').textContent = ''; importButton.hidden = correctButton.hidden = true; reviewButton.hidden = false; files.disabled = false;
    dialog.showModal();
  }
  register.addEventListener('click', () => open(false, register)); bulk.addEventListener('click', () => open(true, bulk));
  files.addEventListener('change', () => {
    const selected = Array.from(files.files || []);
    if (selected.length > 30 || selected.some(file => file.size < 8 || file.size > 100 * 1024 * 1024 || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf'))) { summary.textContent = 'Selecciona hasta 30 documentos PDF, de hasta 100 MiB cada uno.'; files.value = ''; return; }
    rowsHost.replaceChildren(); importButton.hidden = correctButton.hidden = true; reviewButton.hidden = false;
    rows = selected.map(file => {
      const article = element('article', '', 'repository-import-row'); const title = element('h3', file.name); const fields = newFields();
      fill(fields, { titulo: file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '), anio: String(new Date().getFullYear()) });
      const status = element('p', 'Pendiente de revisión.'); status.setAttribute('role', 'status');
      const progress = element('progress'); progress.max = 100; progress.value = 0; progress.setAttribute('aria-label', 'Avance de ' + file.name); progress.hidden = true;
      const review = element('section'); review.hidden = true; article.append(title, fields, review, progress, status); rowsHost.append(article);
      return { file, root: article, fields, status, progress, review, operation: crypto.randomUUID(), state: 'pending', confirmed: [] };
    });
    summary.textContent = `${rows.length} documento${rows.length === 1 ? '' : 's'} seleccionado${rows.length === 1 ? '' : 's'}. Completa y revisa cada registro.`;
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!rows.length || !form.reportValidity()) return;
    rows.forEach(row => { row.review.replaceChildren(preview(academic(row.fields))); row.review.hidden = false; row.fields.hidden = true; });
    reviewButton.hidden = true; importButton.hidden = correctButton.hidden = false; files.disabled = true; importButton.disabled = !canWrite;
    summary.textContent = 'Revisa la información. Solo se guardarán los registros que confirmes con el botón de guardar.';
    importButton.focus();
  });
  correctButton.addEventListener('click', () => { rows.filter(row => row.state !== 'success').forEach(row => { row.fields.hidden = false; row.review.hidden = true; }); importButton.hidden = correctButton.hidden = true; reviewButton.hidden = false; files.disabled = rows.some(row => row.ticket || row.state === 'success'); });
  query('[data-cancel-import]').addEventListener('click', () => { stopping = true; summary.textContent = 'Se detendrá al terminar el archivo actual. Los registros ya guardados se conservarán.'; });
  function remember(row: Row) { if (row.storageKey && row.ticket) { try { sessionStorage.setItem(row.storageKey, JSON.stringify({ ticket: row.ticket, operation: row.operation, batch })); } catch { row.status.textContent = 'El navegador no permite conservar el progreso. Mantén esta página abierta durante la carga.'; } } }
  async function hashFile(file: File) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join(''); }
  async function base64(blob: Blob) { const bytes = new Uint8Array(await blob.arrayBuffer()); let text = ''; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(text); }
  function duplicateNotice(host: HTMLElement, error: ManagementError, confirmed: (ids: string[]) => void) {
    host.querySelector('[data-duplicates]')?.remove();
    const box = element('section', '', 'note'); box.dataset.duplicates = '';
    box.append(element('h3', 'Se encontró un posible duplicado'), element('p', 'Revisa las coincidencias. Puedes continuar si se trata de una investigación distinta.'));
    error.duplicates.forEach(p => { const link = element('a', `${p.titulo} · ${p.anio} · ${p.grado}${(p as AcademicProject & { exactPdf?: boolean }).exactPdf ? ' · PDF idéntico' : ''}`); link.href = '/proyectos/#proyecto=' + encodeURIComponent(p.id_proyecto); link.target = '_blank'; link.rel = 'noopener'; box.append(link, element('br')); });
    const label = element('label'); const checkbox = element('input'); checkbox.type = 'checkbox'; label.append(checkbox, document.createTextNode(' He revisado estas coincidencias y confirmo que deseo continuar.')); box.append(label);
    checkbox.addEventListener('change', () => confirmed(checkbox.checked ? error.duplicates.map(p => p.id_proyecto) : [])); host.append(box);
  }
  async function upload(row: Row) {
    row.hash ??= await hashFile(row.file); row.storageKey = `cedhu-upload:${actor}:${row.hash}:${row.file.size}`;
    const values = academic(row.fields); const snapshot = JSON.stringify(values);
    if (row.ticket && row.snapshot && row.snapshot !== snapshot) { row.operation = crypto.randomUUID(); row.ticket = undefined; row.confirmed = []; }
    if (!row.ticket) {
      // Only encrypted, identity-bound upload tickets are stored. Neither PDF
      // bytes nor academic metadata are persisted in browser storage.
      let stored;
      try { stored = JSON.parse(sessionStorage.getItem(row.storageKey) || 'null'); } catch { stored = null; }
      if (stored && !row.snapshot) {
        const restored = await api({ action: 'resume', ticket: stored.ticket });
        if (restored.sha256 === row.hash) { row.ticket = stored.ticket; row.operation = stored.operation; batch = stored.batch || batch; fill(row.fields, restored.academic); row.review.replaceChildren(preview(restored.academic)); row.snapshot = JSON.stringify(restored.academic); throw new Error('Se recuperó una carga anterior con su información original. Revisa los datos recuperados y pulsa reintentar.'); }
      }
    }
    if (!row.ticket) {
      const prepared = await api({ action: 'prepare', academic: values, name: row.file.name, mime: 'application/pdf', size: row.file.size, sha256: row.hash, operation: row.operation, batch, confirmedDuplicates: row.confirmed });
      row.ticket = prepared.ticket; row.snapshot = snapshot; remember(row);
    }
    let state = await api({ action: 'status', ticket: row.ticket }); row.progress.hidden = false;
    while (!state.complete) {
      if (controller.signal.aborted) throw new Error('La sesión se cerró.');
      const offset = state.offset;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset >= row.file.size) throw new Error('No fue posible continuar la carga.');
      state = await api({ action: 'chunk', ticket: row.ticket, offset, data: await base64(row.file.slice(offset, Math.min(offset + 1048576, row.file.size))) });
      if (!state.complete && state.offset <= offset) throw new Error('No se confirmó el avance de la carga. Reintenta.');
      row.progress.value = Math.round(state.offset / row.file.size * 100); row.status.textContent = `Subiendo documento: ${row.progress.value} %`;
    }
    const result = await api({ action: 'commit', ticket: row.ticket }); row.state = 'success'; row.progress.value = 100;
    if (row.storageKey) sessionStorage.removeItem(row.storageKey);
    row.root.querySelector('[data-duplicates]')?.remove(); row.status.replaceChildren(document.createTextNode(result.message + ' '));
    const link = element('a', 'Consultar proyecto'); link.href = '/proyectos/#proyecto=' + encodeURIComponent(result.projectId); row.status.append(link); row.fields.disabled = true;
  }
  importButton.addEventListener('click', async () => {
    if (running || !canWrite) return; running = true; stopping = false; importButton.disabled = correctButton.disabled = true; query('[data-cancel-import]').hidden = false;
    rows.forEach(row => { row.fields.disabled = true; });
    for (const row of rows.filter(r => r.state !== 'success')) {
      if (stopping || !alive) break;
      row.status.textContent = 'Comprobando documento…';
      try { await upload(row); }
      catch (error) {
        if (!alive) break; row.state = 'failed'; row.status.textContent = (error as Error).message;
        if (error instanceof ManagementError && error.code === 'possible_duplicate') duplicateNotice(row.root, error, ids => { row.confirmed = ids; if (row.ticket) { row.ticket = undefined; if (row.storageKey) sessionStorage.removeItem(row.storageKey); } });
        if (error instanceof ManagementError && error.code === 'upload_expired') { row.ticket = undefined; if (row.storageKey) sessionStorage.removeItem(row.storageKey); }
      }
    }
    if (!alive) return; running = false; importButton.disabled = correctButton.disabled = false; query('[data-cancel-import]').hidden = true;
    const success = rows.filter(r => r.state === 'success').length, failed = rows.filter(r => r.state === 'failed').length;
    summary.textContent = `${success} guardados · ${failed} fallidos · ${rows.length - success - failed} pendientes. Los registros guardados no se repetirán.`;
    importButton.textContent = 'Reintentar fallidos y continuar pendientes'; importButton.hidden = success === rows.length; correctButton.hidden = success === rows.length;
    rows.filter(row => row.state !== 'success').forEach(row => { row.fields.disabled = false; }); if (success) await refresh();
  });
  root.addEventListener('project-opened', event => {
    const p = (event as CustomEvent<AcademicProject>).detail; const body = event.target as HTMLElement;
    if (p.canRestore && role === 'ADMIN' && canWrite) {
      const restore = element('button', 'Restaurar proyecto', 'button'); restore.type = 'button';
      const status = element('p'); status.setAttribute('role', 'status');
      const operation = crypto.randomUUID(); let confirmed: string[] = [];
      restore.addEventListener('click', async () => {
        restore.disabled = true;
        try {
          const result = await api({ action: 'restore', operation, id: p.id_proyecto, revision: p.revision, confirmedDuplicates: confirmed });
          query<HTMLDialogElement>('[data-project-detail]').close(); query('[data-management-status]').textContent = result.message; query('#catalog-heading').focus(); await refresh();
        } catch (error) {
          if (!alive) return; status.textContent = (error as Error).message; restore.disabled = false;
          if (error instanceof ManagementError && error.code === 'possible_duplicate') duplicateNotice(body, error, ids => { confirmed = ids; });
        }
      });
      body.append(restore, status); return;
    }
    if (!p.canEdit || !canWrite) return;
    const actions = element('div', '', 'repository-actions');
    const edit = element('button', 'Editar información', 'button button--outline'); edit.type = 'button';
    edit.addEventListener('click', () => {
      selectedProject = p; editOperation = crypto.randomUUID(); editConfirmed = []; opener = edit;
      query<HTMLDialogElement>('[data-project-detail]').close();
      const fields = newFields(); fill(fields, p as unknown as Academic); query('[data-edit-fields]').replaceChildren(fields);
      query('[data-edit-form]').hidden = false; query('[data-edit-review]').hidden = true; query('[data-edit-save]').hidden = true; query('[data-edit-correct]').hidden = true; query('[data-edit-status]').textContent = ''; editDialog.showModal();
    }); actions.append(edit);
    const remove = element('button', 'Eliminar proyecto', 'button repository-danger'); remove.type = 'button';
    remove.addEventListener('click', () => {
      deleting = p; deleteOperation = crypto.randomUUID(); query('[data-delete-name]').textContent = p.titulo; query('[data-delete-status]').textContent = '';
      query<HTMLDialogElement>('[data-project-detail]').close(); deleteDialog.showModal(); query('[data-delete-cancel]').focus();
    }); actions.append(remove);
    if (role === 'ADMIN' && p.estado.toUpperCase() !== 'ARCHIVADO') {
      const archive = element('button', 'Archivar proyecto', 'button button--outline'); archive.type = 'button';
      archive.addEventListener('click', async () => {
        if (!window.confirm('¿Archivar este proyecto? Se conservarán el documento y su historial.')) return; archive.disabled = true;
        try { const result = await api({ action: 'archive', operation: crypto.randomUUID(), id: p.id_proyecto, revision: p.revision }); query<HTMLDialogElement>('[data-project-detail]').close(); query('[data-management-status]').textContent = result.message; query('#catalog-heading').focus(); await refresh(); }
        catch (error) { body.append(element('p', (error as Error).message)); archive.disabled = false; }
      }); actions.append(archive);
    }
    body.append(actions);
  });
  query<HTMLFormElement>('[data-edit-form]').addEventListener('submit', event => {
    event.preventDefault(); editAcademic = academic(query('[data-edit-fields]')); query('[data-edit-review]').replaceChildren(preview(editAcademic)); query('[data-edit-form]').hidden = true; query('[data-edit-review]').hidden = false; query('[data-edit-save]').hidden = false; query('[data-edit-correct]').hidden = false;
    query('[data-edit-save]').focus();
  });
  query('[data-edit-correct]').addEventListener('click', () => { query('[data-edit-form]').hidden = false; query('[data-edit-review]').hidden = true; query('[data-edit-save]').hidden = true; query('[data-edit-correct]').hidden = true; });
  query<HTMLButtonElement>('[data-edit-save]').addEventListener('click', async () => {
    if (!selectedProject || editBusy) return; editBusy = true;
    try { const result = await api({ action: 'edit', operation: editOperation, id: selectedProject.id_proyecto, revision: selectedProject.revision, academic: editAcademic, confirmedDuplicates: editConfirmed }); query('[data-edit-status]').textContent = result.message; query('[data-edit-save]').hidden = true; query('[data-edit-correct]').hidden = true; await refresh(); }
    catch (error) { query('[data-edit-status]').textContent = (error as Error).message; if (error instanceof ManagementError && error.code === 'possible_duplicate') duplicateNotice(query('[data-edit-review]'), error, ids => { editConfirmed = ids; }); }
    finally { editBusy = false; }
  });
  let activityPage = 1;
  async function activity() {
    const status = query('[data-activity-status]'); status.textContent = 'Consultando historial…';
    try {
      const data = await (await repositoryRequest('/api/proyectos/manage?view=activity&page=' + activityPage, { signal: controller.signal })).json();
      if (!alive) return; query('[data-activity-results]').replaceChildren(...data.events.map((event: Record<string, string | boolean>) => {
        const article = element('article', '', 'repository-import-row'); article.append(element('h3', actionLabel(String(event.accion))), element('p', `${dateLabel(String(event.fecha_hora), true)} · ${event.usuario_email} · ${resultLabel(String(event.resultado))}`), element('p', String(event.id_proyecto || event.id_lote || '')));
        const details = element('details'); details.append(element('summary', 'Ver detalles'), element('pre', String(event.detalles))); article.append(details);
        if (event.needsAttention && canWrite) {
          const label = element('label', 'Cómo se resolvió la incidencia'); const note = element('textarea'); note.maxLength = 1000; note.minLength = 10; label.append(note);
          const resolve = element('button', 'Registrar resolución', 'button button--outline'); resolve.type = 'button';
          resolve.addEventListener('click', async () => { resolve.disabled = true; try { await api({ action: 'resolve', operation: crypto.randomUUID(), eventId: event.id_evento, note: note.value }); await activity(); } catch (error) { status.textContent = (error as Error).message; resolve.disabled = false; } }); article.append(label, resolve);
        }
        return article;
      }));
      status.textContent = `${data.total} operaciones · página ${data.page} de ${data.pages}`; query<HTMLButtonElement>('[data-activity-previous]').disabled = activityPage <= 1; query<HTMLButtonElement>('[data-activity-next]').disabled = activityPage >= data.pages;
    } catch (error) { if (alive) status.textContent = (error as Error).message; }
  }
  activityButton.addEventListener('click', () => { opener = activityButton; activityPage = 1; activityDialog.showModal(); void activity(); });
  query('[data-activity-previous]').addEventListener('click', () => { activityPage--; void activity(); }); query('[data-activity-next]').addEventListener('click', () => { activityPage++; void activity(); });
  if (!capabilities) void repositoryRequest('/api/proyectos/manage?view=capabilities', { signal: controller.signal }).then(response => response.json()).then(data => {
    if (!alive) return; canWrite = data.canWrite === true; actor = data.actor; register.disabled = bulk.disabled = !canWrite; query('[data-management-status]').textContent = data.message;
  }).catch(error => { if (alive) { register.disabled = bulk.disabled = true; query('[data-management-status]').textContent = error.message; } });
  register.disabled = bulk.disabled = !canWrite;
  return { dispose() { alive = false; controller.abort(); [dialog, editDialog, activityDialog, deleteDialog].forEach(d => { if (d.open) d.close(); }); } };
}
