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
  const notice = root.querySelector<HTMLDialogElement>('[data-projects-notice]')!;
  const loginLink = root.querySelector<HTMLAnchorElement>('[data-workspace-login]')!;
  const notices = {
    denegado: ['Cuenta no autorizada', 'No pudimos permitir el acceso con esta cuenta.',
      'Ingresa con tu cuenta institucional del CEDHU. Si el problema continúa, comunícate con Tecnología CEDHU.'],
    institucional: ['Cuenta institucional requerida', 'Utiliza tu cuenta institucional del CEDHU para ingresar', ''],
    cancelado: ['Inicio de sesión incompleto', 'No se completó el inicio de sesión. Puedes intentarlo nuevamente', ''],
    servicio: ['No pudimos comprobar tu acceso', 'No fue posible comprobar tu acceso en este momento. Inténtalo nuevamente', ''],
    sesion_vencida: ['Sesión vencida', 'Tu sesión ha expirado. Inicia sesión nuevamente', ''],
  };
  type NoticeCode = keyof typeof notices;
  // Independent of session rendering: only an explicit dismissal closes this notice.
  let pendingNotice: NoticeCode | undefined;
  function showNotice(code: NoticeCode) {
    if (pendingNotice) return;
    pendingNotice = code;
    const [heading, body, guidance] = notices[code];
    root.querySelector<HTMLElement>('[data-notice-title]')!.textContent = heading;
    root.querySelector<HTMLElement>('[data-notice-message]')!.textContent = body;
    const help = root.querySelector<HTMLElement>('[data-notice-guidance]')!;
    help.textContent = guidance;
    help.hidden = !guidance;
    notice.showModal();
  }
  notice.addEventListener('close', () => {
    pendingNotice = undefined;
    (login.hidden ? title : loginLink).focus();
  });
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
        const data = await result.json();
        if (request !== generation) return;
        message('');
        if (result.status === 403) showNotice(data.code === 'denegado' ? 'denegado' : 'servicio');
        else if (previous || data.code === 'sesion_vencida') showNotice('sesion_vencida');
        return;
      }
      if (!result.ok) { message(''); showNotice('servicio'); return; }
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
      expiry = setTimeout(() => { generation++; clear(); message(''); showNotice('sesion_vencida'); },
        Math.max(0, data.expiresAt - Date.now()));
    } catch {
      if (request === generation) { message(''); showNotice('servicio'); }
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
      loginLink.focus();
    } catch {
      if (request === generation) { button.disabled = false; message('No fue posible cerrar la sesión.', true); }
    } finally { closing = false; }
  }
  const params = new URLSearchParams(window.location.search);
  if (params.has('acceso')) {
    const code = params.get('acceso') || '';
    showNotice(params.getAll('acceso').length === 1 && Object.hasOwn(notices, code) ? code as NoticeCode : 'servicio');
    const url = new URL(window.location.href);
    url.searchParams.delete('acceso');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  window.addEventListener('pagehide', () => { generation++; clear(); });
  window.addEventListener('pageshow', event => { if (event.persisted) void refresh(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { generation++; clear(); }
    else void refresh();
  });
  void refresh();
}
