import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const config = yaml.load(await readFile('public/admin/config.yml', 'utf8'));
assert.equal(config.backend.name, 'github');
assert.equal(config.backend.repo, 'Cedhu-Sog/website-2027');
assert.equal(config.backend.branch, 'master');
assert.equal(config.publish_mode, 'editorial_workflow');
assert.equal(config.locale, 'es');
assert.equal(config.backend.auth_scope, 'public_repo');
assert.equal(config.backend.base_url, config.site_url);
assert.equal(config.media_folder, 'src/assets/uploads');
assert.equal(config.public_folder, '/src/assets/uploads');
assert(!config.local_backend, 'No se permite un backend local sin autenticación en producción.');

const catalogue = new Map();
for (const file of await readdir('src/content/medios')) {
  if (!file.endsWith('.json')) continue;
  const record = JSON.parse(await readFile(`src/content/medios/${file}`, 'utf8'));
  assert(record.title?.trim() && record.alt?.trim(), `Falta nombre o alternativa en ${file}`);
  assert(/^\/src\/assets\/(?:[\w.-]+\/)*[\w.-]+\.(?:jpe?g|png|webp|avif)$/i.test(record.image), `Ruta de fotografía inválida: ${file}`);
  const resolved = path.resolve('.' + record.image);
  assert(resolved.startsWith(path.resolve('src/assets') + path.sep), 'La fotografía debe estar dentro de src/assets.');
  assert((await stat(resolved)).isFile(), `No existe ${record.image}`);
  catalogue.set(file.slice(0, -5), record);
}
for (const file of await readdir(config.media_folder)) {
  if (file === '.gitkeep') continue;
  assert(/^[\w.-]+\.(?:jpe?g|png|webp|avif)$/i.test(file), `Formato o nombre de fotografía no admitido: ${file}`);
  const info = await stat(path.join(config.media_folder, file));
  assert(info.isFile() && info.size <= 3145728, `La fotografía supera 3 MB: ${file}`);
}

let entries = 0;
let fields = 0;
function validate(definitions, data, context) {
  assert(new Set(definitions.map(field => field.name)).size === definitions.length, `${context}: campos duplicados`);
  for (const field of definitions) {
    fields++;
    const value = data?.[field.name];
    const location = `${context}.${field.name}`;
    if (field.widget !== 'hidden') assert(field.label, `${location}: falta etiqueta`);
    if (value === undefined || value === null || value === '') {
      assert(field.required === false || field.widget === 'hidden', `${location}: campo obligatorio vacío`);
      continue;
    }
    if (field.pattern && typeof value === 'string') assert(new RegExp(field.pattern[0]).test(value), `${location}: formato inválido`);
    if (field.widget === 'relation' && field.collection === 'medios') assert(catalogue.has(value), `${location}: fotografía inexistente ${value}`);
    if (field.widget === 'image') assert((/^\/src\/assets\//.test(value)) && catalogue.size && typeof value === 'string', `${location}: ruta de imagen inválida`);
    if (field.widget === 'object') validate(field.fields, value, location);
    if (field.widget === 'list') {
      assert(Array.isArray(value), `${location}: se requiere una lista`);
      if (field.min !== undefined) assert(value.length >= field.min, `${location}: faltan elementos`);
      if (field.max !== undefined) assert(value.length <= field.max, `${location}: demasiados elementos`);
      value.forEach((item, i) => field.fields ? validate(field.fields, item, `${location}[${i}]`) : validate([field.field], { [field.field.name]: item }, `${location}[${i}]`));
    }
  }
}
async function readEntry(file) {
  const source = await readFile(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(source);
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  assert(match, `Frontmatter inválido: ${file}`);
  return { ...yaml.load(match[1]), body: match[2]?.trim() };
}
for (const collection of config.collections) {
  assert(!collection.delete, 'Retirar contenido debe ser reversible.');
  if (collection.files) {
    for (const file of collection.files) { validate(file.fields, await readEntry(file.file), file.file); entries++; }
  } else {
    for (const file of await readdir(collection.folder)) {
      if (!file.endsWith('.' + collection.extension)) continue;
      validate(collection.fields, await readEntry(path.join(collection.folder, file)), `${collection.name}/${file}`);
      entries++;
    }
  }
}
const admin = await readFile('src/pages/admin/index.astro', 'utf8');
assert(admin.includes('decap-cms@3.17.1/') && admin.includes('integrity="sha384-') && admin.includes('noindex'));
console.log(`PASS: configuración Decap, ${entries} entradas, ${fields} campos existentes, ${catalogue.size} fotografías, referencias y límites de medios.`);
