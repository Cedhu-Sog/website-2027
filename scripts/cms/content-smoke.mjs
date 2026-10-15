// Optional integration test: modifies local content, builds, verifies, restores in finally.
// No requests to GitHub/Vercel, commits, credentials, or remote publications.
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, copyFile, unlink, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import yaml from 'js-yaml';

const backups = new Map();
const created = [];
const id = `cms-verificacion-${Date.now()}`;
const marker = 'VerificacionCMS' + Date.now();
const root = process.cwd();
async function backup(file) { backups.set(file, await readFile(file, 'utf8')); }
async function create(file, content) {
  try { await access(file); throw new Error(`El archivo de prueba ya existe: ${file}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  created.push(file);
  await writeFile(file, content);
}
function markdown(data, body = '') { return '---\n' + yaml.dump(data, { lineWidth: 110 }) + '---\n\n' + body + '\n'; }
async function editMarkdown(file, edit, bodySuffix = '') {
  await backup(file);
  const source = backups.get(file);
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  const data = yaml.load(match[1]); edit(data);
  await writeFile(file, markdown(data, match[2] + bodySuffix));
}
function build() {
  execFileSync(process.execPath, ['scripts/cms/check-config.mjs'], { stdio: 'pipe' });
  // A collection that becomes empty must not reuse entries from Astro's build cache.
  execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'sync', '--force'], { stdio: 'pipe' });
  try {
    execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    throw new Error((error.stderr || error.stdout || error.message).slice(-6000));
  }
}
const newsFile = `src/content/noticias/${id}.md`;
const eventFile = `src/content/eventos/${id}.md`;
const recognitionFile = `src/content/reconocimientos/${id}.md`;
const photoFile = `src/assets/uploads/${id}.webp`;
const mediaFile = `src/content/medios/${id}.json`;
const news = { title: marker + 'NuevaNoticia', description: marker + 'Resumen', category: 'Institucional', date: '2026-10-15', image: id, draft: true, featured: true, order: 0, featuredOrder: 0, seo: { title: marker + 'SEO', description: marker + 'DescripcionSEO', image: id } };
const event = { title: marker + 'Evento', description: marker + 'DescripcionEvento', startDate: '2026-11-10T08:00:00-05:00', location: marker + 'Lugar', image: id, additionalInfo: marker + 'Informacion', draft: true };
const recognition = { title: marker + 'Logro', description: marker + 'DescripcionLogro', category: 'cientifico', image: id, educandos: marker + 'Educandos', organizer: marker + 'Organizador', order: 0, draft: true };
try {
  await create(photoFile, '');
  await copyFile('src/assets/fotos-cedhu/lectura-en-primaria.webp', photoFile);
  await create(mediaFile, JSON.stringify({ title: marker + 'Fotografia', image: '/' + photoFile, alt: marker + 'Alternativa' }));
  await create(newsFile, markdown(news, marker + 'Cuerpo\n\n![' + marker + 'FotoInterior](/' + photoFile + ')'));
  await create(eventFile, markdown(event));
  await create(recognitionFile, markdown(recognition));
  await editMarkdown('src/content/paginas/inicio.md', data => { data.heroTitle = marker + 'Inicio'; });
  await editMarkdown('src/content/paginas/contacto.md', data => { data.contact.email = 'cms-verificacion@example.invalid'; });
  await editMarkdown('src/content/noticias/tecnologia-en-las-aulas.md', data => { data.description = marker + 'NoticiaExistente'; }, '\n\n' + marker + 'CuerpoExistente');
  const staffFile = 'src/content/personal/' + (await readdir('src/content/personal')).filter(file => file.endsWith('.json')).sort()[0];
  await backup(staffFile);
  const staff = JSON.parse(backups.get(staffFile)); staff.name = marker + 'Perfil'; staff.photo = '/' + photoFile; staff.photoAlt = marker + 'Retrato';
  await writeFile(staffFile, JSON.stringify(staff));

  build();
  let home = await readFile('dist/index.html', 'utf8');
  assert(home.includes(marker + 'Inicio') && home.includes('cms-verificacion@example.invalid'));
  assert(!home.includes(marker + 'NuevaNoticia') && !home.includes(marker + 'Logro'));
  assert(!(await readFile('dist/ludicas/index.html', 'utf8')).includes(marker + 'Evento'));
  await assert.rejects(access(`dist/noticias/${id}/index.html`));
  assert((await readFile('dist/noticias/tecnologia-en-las-aulas/index.html', 'utf8')).includes(marker + 'CuerpoExistente'));
  const team = await readFile('dist/nosotros/equipo/index.html', 'utf8');
  assert(team.includes(marker + 'Perfil') && team.includes(marker + 'Retrato'));
  console.log('PASS: edición real de página, datos globales, noticia y perfil; nuevos borradores excluidos del sitio.');

  news.draft = event.draft = recognition.draft = false;
  await writeFile(newsFile, markdown(news, marker + 'Cuerpo\n\n![' + marker + 'FotoInterior](/' + photoFile + ')'));
  await writeFile(eventFile, markdown(event)); await writeFile(recognitionFile, markdown(recognition));
  staff.visible = false; await writeFile(staffFile, JSON.stringify(staff));
  build();
  home = await readFile('dist/index.html', 'utf8');
  assert(home.includes(marker + 'NuevaNoticia') && home.includes(marker + 'Logro') && home.includes(marker + 'Educandos'));
  const article = await readFile(`dist/noticias/${id}/index.html`, 'utf8');
  assert(article.includes(marker + 'Cuerpo') && article.includes(marker + 'DescripcionSEO') && article.includes(marker + 'SEO'));
  assert(article.includes('property="og:image"') && article.includes(marker + 'FotoInterior'));
  assert(!/<img[^>]*src="\/src\/assets\//.test(article), 'El contenido Markdown debe optimizar las fotografías locales.');
  assert((await readFile('dist/ludicas/index.html', 'utf8')).includes(marker + 'Evento'));
  assert(!(await readFile('dist/nosotros/equipo/index.html', 'utf8')).includes(marker + 'Perfil'));
  execFileSync(process.execPath, ['scripts/check-site.mjs'], { stdio: 'pipe' });
  console.log('PASS: publicación estática de noticia, fotografía nueva, SEO, reconocimiento y evento; ocultación de perfil; rutas e imágenes válidas.');
} finally {
  for (const [file, source] of backups) await writeFile(file, source);
  for (const file of created.reverse()) {
    const absolute = path.resolve(file);
    assert(absolute.startsWith(root + path.sep), 'La limpieza debe limitarse al proyecto.');
    await unlink(absolute);
  }
  build();
  console.log('Contenido original restaurado y compilación final generada sin datos temporales.');
}
