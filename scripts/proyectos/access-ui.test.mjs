import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('../../src/scripts/interactions/projects-access.ts', import.meta.url), 'utf8'))
  .replace('export {};', '').replace(/^import .*;$/gm, '')
  .replace("await Promise.all([import('./projects-documents'), import('./projects-management')])", '[{ mountDocuments }, { mountManagement }]');
const settle = () => new Promise(resolve => setImmediate(resolve));
const ok = () => Response.json({ authenticated: true, role: 'DOCENTE', expiresAt: Date.now() + 3600000,
  title: 'Repositorio', welcome: 'Bienvenido', message: 'Autorizado' });

function environment(code = '', initial = () => Response.json({ code: 'sin_sesion' }, { status: 401 })) {
  let active;
  class Element extends EventTarget {
    textContent = ''; dataset = {}; children = []; hidden = false; open = false;
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    focus() { active = this; }
    showModal() { this.open = true; nodes.confirm.focus(); }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
  }
  const nodes = Object.fromEntries(['login', 'status', 'private', 'title', 'notice', 'link', 'heading', 'body', 'help', 'confirm', 'role', 'logout'].map(key => [key, new Element()]));
  nodes.title.textContent = 'Proyectos de investigación';
  const selectors = { '[data-projects-login]': 'login', '[data-projects-status]': 'status', '[data-projects-private]': 'private', '#projects-title': 'title',
    '[data-projects-notice]': 'notice', '[data-workspace-login]': 'link', '[data-notice-title]': 'heading', '[data-notice-message]': 'body', '[data-notice-guidance]': 'help', '[data-projects-role]': 'role', '[data-projects-logout]': 'logout' };
  const root = { dataset: {}, querySelector: selector => nodes[selectors[selector]] };
  const document = new EventTarget();
  document.querySelector = () => root;
  document.createElement = () => new Element();
  const window = new EventTarget();
  window.location = new URL('https://example.invalid/proyectos/' + (code ? '?acceso=' + code : ''));
  let cleaned;
  window.history = { replaceState: (_state, _unused, url) => { cleaned = url; } };
  const calls = [];
  let respond = initial;
  const timers = new Map();
  vm.runInNewContext(source, { performance, mountCatalog: () => ({ root: new Element(), dispose() {} }), mountDocuments: () => ({ dispose() {} }), mountManagement: () => ({ dispose() {} }), document, window, URL, URLSearchParams, AbortSignal, Date, setTimeout: fn => { timers.set(1, fn); return 1; },
    clearTimeout: id => timers.delete(id), fetch: (url, options) => { calls.push({ url, options }); return respond(url); } });
  return { nodes, document, window, calls, timers, get active() { return active; }, get cleaned() { return cleaned; },
    respond: next => { respond = next; }, refresh: () => document.dispatchEvent(new Event('visibilitychange')) };
}

test('denial survives pending, signed-out and failed session checks until explicit dismissal', async () => {
  for (const result of [() => Response.json({}, { status: 401 }), () => Response.json({}, { status: 503 }), ok,
    () => { throw Error('offline'); }]) {
    let resolve;
    const e = environment('denegado', () => new Promise(done => { resolve = done; }));
    assert(e.nodes.notice.open);
    assert.equal(e.active, e.nodes.confirm);
    assert.equal(e.cleaned, '/proyectos/');
    resolve(Response.json({}, { status: 401 }));
    await settle();
    e.respond(result);
    e.refresh();
    await settle();
    assert(e.nodes.notice.open);
    assert.equal(e.nodes.heading.textContent, 'Cuenta no autorizada');
    assert.match(e.nodes.help.textContent, /Tecnología CEDHU/);
    e.nodes.notice.close();
    assert(!e.nodes.notice.open);
    assert.equal(e.active, e.nodes.login.hidden ? e.nodes.title : e.nodes.link);
  }
});

test('all controlled results use separate messages; unknown and repeated codes fail safely', async () => {
  for (const [code, expected] of [['institucional', /Utiliza tu cuenta institucional/], ['cancelado', /No se completó/],
    ['servicio', /No fue posible comprobar/], ['sesion_vencida', /Tu sesión ha expirado/],
    ['private-token', /No fue posible comprobar/], ['denegado&acceso=cancelado', /No fue posible comprobar/]]) {
    const e = environment(code);
    await settle();
    assert.match(e.nodes.body.textContent, expected);
    assert(e.nodes.notice.open);
  }
});

test('a new visitor has no expiry notice; authorization denial and technical 403 remain distinct', async () => {
  const visitor = environment(); await settle();
  assert(!visitor.nodes.notice.open);
  for (const [status, code, heading] of [[401, 'sesion_vencida', 'Sesión vencida'], [403, 'denegado', 'Cuenta no autorizada'],
    [403, undefined, 'No pudimos comprobar tu acceso'], [503, undefined, 'No pudimos comprobar tu acceso']]) {
    const e = environment('', () => Response.json({ code }, { status })); await settle();
    assert.equal(e.nodes.heading.textContent, heading);
    assert(e.nodes.notice.open);
  }
});

test('dismissal permits retry, authorized login renders, logout restores focus and stale responses cannot restore access', async () => {
  const e = environment('cancelado'); await settle();
  e.nodes.notice.close();
  assert.equal(e.active, e.nodes.link);
  e.respond(ok); e.refresh(); await settle();
  assert(e.nodes.login.hidden);
  assert.equal(e.nodes.title.textContent, 'Investigación CEDHU');
  assert.equal(e.nodes.role.textContent, 'DOCENTE');
  assert.equal(e.nodes.status.textContent, '');
  const logout = e.nodes.logout;
  e.respond(() => Response.json({ authenticated: false }));
  logout.dispatchEvent(new Event('click')); await settle();
  assert(!e.nodes.login.hidden);
  assert.equal(e.nodes.status.textContent, 'Sesión cerrada.');
  assert.equal(e.active, e.nodes.link);
  const call = e.calls.at(-1);
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers['X-CEDHU-Projects'], '1');
  let resolve;
  e.respond(() => new Promise(done => { resolve = done; })); e.refresh();
  e.document.hidden = true; e.refresh(); resolve(ok()); await settle();
  assert(!e.nodes.login.hidden);
});

test('expiry timer and back-forward restoration keep notices visible and private content cleared', async () => {
  const e = environment('', ok); await settle();
  e.timers.get(1)();
  assert(!e.nodes.login.hidden);
  assert.equal(e.nodes.heading.textContent, 'Sesión vencida');
  e.window.dispatchEvent(new Event('pagehide'));
  const event = new Event('pageshow'); event.persisted = true;
  e.respond(() => Response.json({}, { status: 401 }));
  e.window.dispatchEvent(event); await settle();
  assert(e.nodes.notice.open);
});
