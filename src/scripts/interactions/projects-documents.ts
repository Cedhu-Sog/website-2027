import { element, repositoryRequest, type AcademicProject } from './projects-catalog';

export function mountDocuments(root: HTMLElement) {
  const urls = new Set<string>(); const operations = new Set<AbortController>();
  function release() { operations.forEach(c => c.abort()); operations.clear(); urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); root.querySelectorAll('[data-pdf-viewer]').forEach(node => node.remove()); }
  root.addEventListener('project-opened', event => {
    release();
    const project = (event as CustomEvent<AcademicProject>).detail;
    const body = event.target as HTMLElement;
    if (project.canRestore) return;
    if (!project.hasDocument) { body.append(element('p', 'Este registro no tiene un documento asociado.')); return; }
    const actions = element('div', '', 'repository-actions');
    const status = element('p'); status.setAttribute('role', 'status');
    const view = element('button', 'Ver documento', 'button'); view.type = 'button';
    const download = element('button', 'Descargar PDF', 'button button--outline'); download.type = 'button';
    const cancel = element('button', 'Cancelar descarga', 'button button--outline'); cancel.type = 'button'; cancel.hidden = true;
    const controller = new AbortController(); operations.add(controller);
    cancel.addEventListener('click', () => { controller.abort(); status.textContent = 'Descarga cancelada. Vuelve a abrir la ficha para reintentar.'; });
    let busy = false;
    let prepared: { url: string; version: string; sha256: string; size: number } | undefined;
    function display(objectUrl: string, name: string, preview: boolean) {
      body.querySelectorAll('[data-pdf-viewer]').forEach(node => node.remove());
      const link = element('a', 'Guardar PDF en este dispositivo', 'button button--outline'); link.href = objectUrl; link.download = name;
      link.dataset.pdfViewer = ''; body.append(link);
      if (preview) {
        const viewer = element('iframe'); viewer.src = objectUrl; viewer.title = 'Documento: ' + project.titulo; viewer.className = 'repository-pdf'; viewer.dataset.pdfViewer = ''; body.append(viewer);
        status.textContent = 'Documento preparado. Si el visor no aparece en tu dispositivo, utiliza Guardar PDF.';
      } else { link.click(); status.textContent = 'Documento preparado para descargar. Si no comienza, utiliza Guardar PDF.'; }
    }
    async function transfer(preview: boolean) {
      if (busy) return; busy = true; view.disabled = download.disabled = true; cancel.hidden = false;
      try {
        const url = '/api/proyectos/document?id=' + encodeURIComponent(project.id_proyecto);
        const meta = await (await repositoryRequest(url, { signal: controller.signal })).json();
        if (!Number.isSafeInteger(meta.size) || meta.size < 8 || meta.size > 100 * 1024 * 1024 || meta.chunkSize !== 1048576) throw new Error('El documento supera el tamaño permitido.');
        // A fresh authorized metadata request still precedes every action.
        // Reuse bytes only while this same private detail remains open.
        if (prepared?.version === meta.version && /^[a-f0-9]{64}$/i.test(meta.sha256) && prepared.sha256 === meta.sha256 && prepared.size === meta.size) { display(prepared.url, meta.name, preview); return; }
        if (prepared) { URL.revokeObjectURL(prepared.url); urls.delete(prepared.url); prepared = undefined; }
        const chunks: ArrayBuffer[] = [];
        for (let offset = 0; offset < meta.size; offset += meta.chunkSize) {
          const part = await repositoryRequest(`${url}&offset=${offset}&version=${encodeURIComponent(meta.version)}`, { signal: controller.signal });
          const bytes = await part.arrayBuffer();
          if (bytes.byteLength !== Math.min(meta.chunkSize, meta.size - offset)) throw new Error('El documento está incompleto. Vuelve a intentarlo.');
          chunks.push(bytes); status.textContent = `Preparando documento: ${Math.round(Math.min(offset + bytes.byteLength, meta.size) / meta.size * 100)} %`;
        }
        const blob = new Blob(chunks, { type: 'application/pdf' });
        if (/^[a-f0-9]{64}$/i.test(meta.sha256)) {
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
          if (hash !== meta.sha256.toLowerCase()) throw new Error('No fue posible verificar la integridad del documento.');
        }
        if (controller.signal.aborted) return;
        const objectUrl = URL.createObjectURL(blob); urls.add(objectUrl);
        prepared = { url: objectUrl, version: meta.version, sha256: meta.sha256, size: meta.size }; display(objectUrl, meta.name, preview);
      } catch (error) { if (!controller.signal.aborted) status.textContent = (error as Error).message; }
      finally { busy = false; view.disabled = download.disabled = controller.signal.aborted; cancel.hidden = true; }
    }
    view.addEventListener('click', () => void transfer(true)); download.addEventListener('click', () => void transfer(false));
    actions.append(view, download, cancel); body.append(actions, status);
  });
  root.querySelector('[data-project-detail]')!.addEventListener('close', release);
  return { dispose: release };
}
