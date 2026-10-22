import { emitKeypressEvents } from 'node:readline';
import { googleRepositoryConfig, safeGoogleFailure } from '../../src/server/google/config.js';
import { PROJECTS_ORIGIN } from '../../src/server/proyectos-session.js';

const safeCode = value => typeof value === 'string' && /^[a-z_]{1,64}$/.test(value) ? value : undefined;

async function checkRejections(token) {
  const wrongToken = `${token[0] === '0' ? '1' : '0'}${token.slice(1)}`;
  const cases = [
    { name: 'missing_authorization', expected: 401, authorization: '' },
    { name: 'wrong_authorization', expected: 401, authorization: `Bearer ${wrongToken}` },
    { name: 'get', expected: 405, method: 'GET' },
    { name: 'options', expected: 405, method: 'OPTIONS' },
    { name: 'query', expected: 400, query: '?resource=forbidden' },
    { name: 'body', expected: 400, body: '{}' },
    { name: 'encoding', expected: 400, headers: { 'Content-Encoding': 'gzip' } },
    { name: 'foreign_origin', expected: 403, headers: { Origin: 'https://example.invalid' } },
  ];
  for (const item of cases) {
    const response = await fetch(`${PROJECTS_ORIGIN}/api/proyectos/google-diagnostic${item.query || ''}`, {
      method: item.method || 'POST',
      headers: { Authorization: item.authorization ?? `Bearer ${token}`, ...item.headers },
      ...(item.body === undefined ? {} : { body: item.body }),
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    await response.body?.cancel();
    const noStore = response.headers.get('cache-control')?.includes('no-store') === true;
    const allowPost = item.expected !== 405 || response.headers.get('allow') === 'POST';
    const ok = response.status === item.expected && noStore && allowPost;
    console.log(JSON.stringify({ check: item.name, status: response.status, expected: item.expected, noStore, ok }));
    // Stop if a gate misbehaves; never repeat or fall through to the real probe.
    if (!ok) throw new Error('unexpected_rejection');
  }
}

// Administrator token is entered with echo disabled, never in argv, URL, files
// or logs. Generate/store the 32-byte token with an institutional password manager.
async function readAdminToken() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('tty');
  process.stdout.write('Clave administrativa temporal (entrada oculta): ');
  emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function finish(error) {
      process.stdin.removeListener('keypress', keypress);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) { value = ''; reject(error); } else resolve(value);
    }
    function keypress(text, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(new Error('cancelled'));
      if (key.name === 'enter' || key.name === 'return') return finish();
      if (key.name === 'backspace') { value = value.slice(0, -1); return; }
      if (!key.ctrl && !key.meta && text && /^[a-f0-9]+$/.test(text)) {
        if (value.length + text.length > 64) return finish(new Error('length'));
        value += text;
      } else if (text && !key.ctrl && !key.meta) return finish(new Error('format'));
    }
    process.stdin.on('keypress', keypress);
  });
}

if (process.argv.length === 2) {
  try {
    googleRepositoryConfig();
    console.log('PASS: configuración local completa y válida en formato. No se contactó Google ni Vercel; IDs y encabezados aún requieren validación real.');
  } catch (error) {
    console.error(JSON.stringify(safeGoogleFailure(error)));
    process.exitCode = 1;
  }
} else if (process.argv[2] === '--production' &&
    (process.argv.length === 3 || (process.argv.length === 4 && process.argv[3] === '--negative'))) {
  try {
    let token = await readAdminToken();
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('format');
    if (process.argv[3] === '--negative') {
      try { await checkRejections(token); }
      finally { token = ''; }
    } else {
      const response = await fetch(`${PROJECTS_ORIGIN}/api/proyectos/google-diagnostic`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(35000),
      });
      token = '';
      const data = await response.json();
      const checks = {};
      for (const key of ['configuration', 'federation', 'serviceAccount', 'drive', 'structure', 'catalog', 'users', 'audit']) {
        if (!data.checks?.[key]) continue;
        const check = data.checks[key];
        checks[key] = { ok: check.ok === true, ...(safeCode(check.code) ? { code: safeCode(check.code) } : {}) };
      }
      console.log(JSON.stringify({ status: response.status, ok: data.ok === true, ...(safeCode(data.code) ? { code: safeCode(data.code) } : {}), checks }));
      if (!response.ok || data.ok !== true) process.exitCode = 1;
    }
  } catch {
    console.error('La prueba no se completó. Revisa configuración, ventana temporal y clave administrativa en una terminal interactiva. No imprimas solicitudes ni credenciales.');
    process.exitCode = 1;
  }
} else {
  console.error('Usa npm run check:proyectos:google (sin red) o, solo tras autorización y despliegue, npm run proyectos:google:probe.');
  process.exitCode = 1;
}
