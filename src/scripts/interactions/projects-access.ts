export {};

interface PrivateSession {
  authenticated: true;
  expiresAt: number;
  title: string;
  welcome: string;
  message: string;
}

const card = document.querySelector<HTMLElement>('[data-projects-access]');
if (card) initializeAccess(card);

function initializeAccess(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-projects-form]')!;
  const input = root.querySelector<HTMLInputElement>('#projects-password')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-projects-toggle]')!;
  const submit = root.querySelector<HTMLButtonElement>('[data-projects-submit]')!;
  const login = root.querySelector<HTMLElement>('[data-projects-login]')!;
  const status = root.querySelector<HTMLElement>('[data-projects-status]')!;
  const privateArea = root.querySelector<HTMLElement>('[data-projects-private]')!;
  const title = root.querySelector<HTMLHeadingElement>('#projects-title')!;
  const loginTitle = title.textContent;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let authenticated = false;
  let revalidateActive = false;
  let busy = false;
  // Generation prevents stale requests restoring UI after expiry/logout/navigation.
  let generation = 0;

  function message(text: string, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }

  function controls(disabled: boolean) {
    input.disabled = toggle.disabled = submit.disabled = disabled;
    form.setAttribute('aria-busy', String(disabled));
  }

  function clearPrivate() {
    clearTimeout(expiryTimer);
    authenticated = false;
    privateArea.replaceChildren();
    login.hidden = false;
    title.textContent = loginTitle;
  }

  function showLogin(text = '', error = false) {
    clearPrivate();
    controls(false);
    message(text, error);
  }

  async function api(route: string, body?: object) {
    return fetch(`/api/proyectos/${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: body === undefined ? { Accept: 'application/json' } : {
        Accept: 'application/json', 'Content-Type': 'application/json', 'X-CEDHU-Projects': '1',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  }

  function node<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  }

  function showPrivate(data: PrivateSession, focus: boolean) {
    clearPrivate();
    authenticated = true;
    login.hidden = true;
    input.value = '';
    input.type = 'password';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Mostrar contraseña');
    toggle.textContent = 'Mostrar';
    const section = node('section', '', 'projects-private');
    title.textContent = data.title;
    const empty = node('section', '', 'projects-private__empty');
    empty.setAttribute('aria-label', 'Disponibilidad del repositorio');
    empty.append(node('p', data.message));
    const logout = node('button', 'Cerrar sesión', 'button button--outline');
    logout.type = 'button';
    logout.addEventListener('click', () => void closeSession(logout));
    section.append(node('p', 'Sesión activa', 'projects-private__status'), node('p', data.welcome), empty, logout);
    privateArea.append(section);
    message('Sesión iniciada.');
    expiryTimer = setTimeout(() => {
      generation++;
      showLogin('Tu sesión ha expirado. Ingresa nuevamente.', true);
      input.focus();
    }, Math.max(0, data.expiresAt - Date.now()));
    if (focus) title.focus();
  }

  async function checkSession(focus = false, previouslyActive = authenticated) {
    const current = ++generation;
    clearPrivate();
    controls(true);
    message('Comprobando sesión…');
    try {
      const response = await api('session');
      if (current !== generation) return;
      if (response.status === 401) return showLogin(previouslyActive ? 'Tu sesión ha expirado. Ingresa nuevamente.' : '', previouslyActive);
      if (!response.ok) return showLogin('El acceso no está disponible temporalmente. Intenta más tarde.', true);
      const data: PrivateSession = await response.json();
      if (current !== generation) return;
      if (data.authenticated !== true || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now() ||
          ![data.title, data.welcome, data.message].every(value => typeof value === 'string')) throw new Error('session');
      showPrivate(data, focus);
    } catch {
      if (current === generation) showLogin('No fue posible conectar. Revisa tu conexión e intenta nuevamente.', true);
    }
  }

  async function closeSession(button: HTMLButtonElement) {
    if (busy) return;
    busy = true;
    const current = ++generation;
    button.disabled = true;
    message('Cerrando sesión…');
    try {
      const response = await api('logout', {});
      if (current !== generation) return;
      if (!response.ok) throw new Error('logout');
      showLogin('Sesión cerrada.');
      input.focus();
    } catch {
      // Do not claim successful logout if the server did not clear the cookie.
      if (current === generation) { button.disabled = false; message('No se pudo cerrar la sesión. Revisa tu conexión y vuelve a intentarlo.', true); }
    } finally { busy = false; }
  }

  toggle.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Ocultar' : 'Mostrar';
    toggle.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggle.setAttribute('aria-pressed', String(visible));
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true;
    const current = ++generation;
    controls(true);
    submit.textContent = 'Validando…';
    input.removeAttribute('aria-invalid');
    message('Validando acceso…');
    try {
      const pending = api('login', { password: input.value });
      input.value = '';
      const response = await pending;
      if (current !== generation) return;
      if (response.status === 401) {
        input.setAttribute('aria-invalid', 'true');
        showLogin('Contraseña incorrecta. Intenta nuevamente.', true);
        input.focus();
      } else if (response.status === 429) showLogin('Demasiados intentos. Espera un momento antes de intentar nuevamente.', true);
      else if (!response.ok) showLogin('No fue posible iniciar sesión. Intenta más tarde.', true);
      else await checkSession(true);
    } catch {
      if (current === generation) showLogin('No fue posible conectar. Revisa tu conexión e intenta nuevamente.', true);
    } finally { busy = false; submit.textContent = 'Ingresar'; }
  });

  // Revalidate after tab switches and back/forward navigation. No persistent
  // browser storage contains authentication or private response data.
  window.addEventListener('pagehide', () => { revalidateActive = authenticated; generation++; clearPrivate(); controls(true); input.value = ''; });
  window.addEventListener('pageshow', event => { if (event.persisted) void checkSession(false, revalidateActive); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { revalidateActive = authenticated; generation++; clearPrivate(); controls(true); }
    else void checkSession(false, revalidateActive);
  });
  void checkSession();
}
