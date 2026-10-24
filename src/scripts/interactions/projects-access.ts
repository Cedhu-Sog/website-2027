export {};

interface WorkspaceSession {
  authenticated: true;
  expiresAt: number;
  role: 'ADMIN' | 'DOCENTE';
  title: string;
  welcome: string;
  message: string;
}

const root = document.querySelector<HTMLElement>('[data-projects-access]');
if (root) initialize(root);

function initialize(root: HTMLElement) {
  const login = root.querySelector<HTMLElement>('[data-projects-login]')!;
  const status = root.querySelector<HTMLElement>('[data-projects-status]')!;
  const privateArea = root.querySelector<HTMLElement>('[data-projects-private]')!;
  const title = root.querySelector<HTMLHeadingElement>('#projects-title')!;
  const originalTitle = title.textContent;
  let generation = 0;
  let authenticated = false;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let closing = false;

  function message(value: string, isError = false) {
    status.textContent = value;
    status.dataset.error = String(isError);
  }
  function clear() {
    if (expiry) clearTimeout(expiry);
    expiry = undefined;
    privateArea.replaceChildren();
    title.textContent = originalTitle;
    login.hidden = false;
    authenticated = false;
  }
  function text<K extends keyof HTMLElementTagNameMap>(tag: K, value: string, className = '') {
    const node = document.createElement(tag);
    node.textContent = value;
    node.className = className;
    return node;
  }
  async function fetchSession() {
    return fetch('/api/proyectos/session', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
      redirect: 'error', headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
  }
  async function refresh() {
    const request = ++generation;
    const previous = authenticated;
    clear();
    message('Comprobando cuenta institucional…');
    try {
      const result = await fetchSession();
      if (request !== generation) return;
      if (result.status === 401 || result.status === 403) {
        message(previous ? 'La sesión ha finalizado. Ingresa de nuevo con Google.' : '', previous);
        return;
      }
      if (!result.ok) { message('La conexión institucional no está disponible temporalmente.', true); return; }
      const data: WorkspaceSession = await result.json();
      if (request !== generation) return;
      if (data.authenticated !== true || !['ADMIN', 'DOCENTE'].includes(data.role) ||
          !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now() ||
          ![data.title, data.welcome, data.message].every(value => typeof value === 'string')) throw new Error('session');
      authenticated = true;
      login.hidden = true;
      title.textContent = data.title;
      const section = text('section', '', 'projects-private');
      const badge = text('p', 'Sesión institucional · ' + (data.role === 'ADMIN' ? 'Administrador' : 'Docente'), 'projects-private__status');
      const detail = text('section', '', 'projects-private__empty');
      detail.append(text('p', data.message));
      const logout = text('button', 'Cerrar sesión', 'button button--outline');
      logout.type = 'button';
      logout.addEventListener('click', () => void closeSession(logout));
      section.append(badge, text('p', data.welcome), detail, logout);
      privateArea.append(section);
      message('Cuenta institucional verificada.');
      expiry = setTimeout(() => { generation++; clear(); message('La sesión ha expirado.', true); },
        Math.max(0, data.expiresAt - Date.now()));
    } catch {
      if (request === generation) message('No fue posible comprobar tu acceso.', true);
    }
  }
  async function closeSession(button: HTMLButtonElement) {
    if (closing) return;
    closing = true;
    button.disabled = true;
    const request = ++generation;
    try {
      const response = await fetch('/api/proyectos/logout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        redirect: 'error', headers: { 'X-CEDHU-Projects': '1' },
        signal: AbortSignal.timeout(12000),
      });
      if (request !== generation) return;
      if (!response.ok) throw new Error('logout');
      clear();
      message('Sesión cerrada.');
    } catch {
      if (request === generation) { button.disabled = false; message('No fue posible cerrar la sesión.', true); }
    } finally { closing = false; }
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get('acceso') === 'denegado') {
    message('Acceso denegado. Verifica que tu cuenta esté autorizada por el CEDHU.', true);
    window.history.replaceState(null, '', '/proyectos/');
  }
  window.addEventListener('pagehide', () => { generation++; clear(); });
  window.addEventListener('pageshow', event => { if (event.persisted) void refresh(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { generation++; clear(); }
    else void refresh();
  });
  void refresh();
}
