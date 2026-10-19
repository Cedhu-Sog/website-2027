import { randomBytes } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';
import { hashPassword } from '../../src/server/proyectos-password.js';

// Passwords are read from a real terminal with echo disabled, never from argv,
// environment, a file or a shell command (which could enter shell history).
async function hiddenInput(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('tty');
  process.stdout.write(prompt);
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
      if (error) { value = ''; reject(error); }
      else resolve(value);
    }
    function keypress(text, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(new Error('cancelled'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') { value = Array.from(value).slice(0, -1).join(''); return; }
      if (!key.ctrl && !key.meta && text && /^[^\p{C}]+$/u.test(text)) {
        if (Buffer.byteLength(value + text) > 512) return finish(new Error('length'));
        value += text;
      }
    }
    process.stdin.on('keypress', keypress);
  });
}

try {
  if (process.argv.length !== 3) throw new Error('usage');
  if (process.argv[2] === 'secret') {
    console.log(`PROYECTOS_SESSION_SECRET=${randomBytes(32).toString('hex')}`);
  } else if (process.argv[2] === 'hash') {
    let password = await hiddenInput('Contraseña institucional (entrada oculta): ');
    let confirmation = await hiddenInput('Repite la contraseña (entrada oculta): ');
    if (Array.from(password).length < 12 || password !== confirmation) throw new Error('password');
    const hash = await hashPassword(password);
    password = confirmation = '';
    console.log(`PROYECTOS_PASSWORD_HASH=${hash}`);
  } else throw new Error('usage');
} catch {
  console.error('No se generó el valor. Usa una terminal interactiva; para el hash, repite una contraseña de al menos 12 caracteres y hasta 512 bytes.');
  process.exitCode = 1;
}
