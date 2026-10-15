import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink, access, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { createServer } from 'vite';
import { parseFrontmatter } from '@astrojs/internal-helpers/frontmatter';

// Load the actual TypeScript schemas, including Vite's media catalogue glob.
// All tools are already supplied by Astro; no additional test dependencies.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null },
  resolve: { alias: { 'astro:content': 'astro/content/config' } },
});
after(() => server.close());
const { date, datetime, cleanContent } = await server.ssrLoadModule('/src/schemas/shared.ts');
const { collections } = await server.ssrLoadModule('/src/content.config.ts');
const news = { title: 'PRUEBA', description: 'Prueba de fechas del CMS', image: 'bandera', category: 'ICFES' };
const parse = (source) => parseFrontmatter(`---\n${source}\n---\n`).frontmatter;

test('Astro YAML dates, quoted dates and optional cleared fields pass the news schema', () => {
  for (const literal of ['2026-10-15', '"2026-10-15"', "'2026-10-15'", '2024-02-29', '"2024-02-29"']) {
    const data = parse(`date: ${literal}`);
    assert.equal(collections.noticias.schema.parse({ ...news, ...data }).date, literal.replaceAll(/["']/g, ''));
  }
  const yamlDate = parse('date: 2026-10-15').date;
  assert(yamlDate instanceof Date);
  assert.equal(cleanContent({ nested: [{ date: yamlDate }] }).nested[0].date, yamlDate);
  for (const value of [undefined, null, '']) {
    assert.equal(collections.noticias.schema.parse({ ...news, date: value }).date, undefined);
  }
});

test('date-only values reject invalid dates and implicit coercions', () => {
  for (const value of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-01', '2026-10-00', '15/10/2026', '2026-1-1', 'tomorrow', 0, {}, true, new Date(NaN), new Date('2026-10-15T12:00:00Z'), '2026-10-15T00:00:00Z']) {
    assert.equal(date.safeParse(value).success, false, String(value));
  }
  assert.equal(date.parse(new Date('2026-10-15T00:00:00Z')), '2026-10-15');
  assert.equal(date.parse('0099-10-15'), '0099-10-15');
});

test('recognitions and nested research dates share the same date normalization', async () => {
  const result = collections.reconocimientos.schema.parse({ ...news, category: 'cientifico', order: 1, date: parse('date: 2026-10-15').date });
  assert.equal(result.date, '2026-10-15');
  assert.equal(collections.reconocimientos.schema.safeParse({ ...news, category: 'cientifico', order: 1, date: '2026-02-30' }).success, false);
  const page = parseFrontmatter(await readFile('src/content/paginas/investigacion.md', 'utf8')).frontmatter;
  const project = { title: 'Investigación de prueba', slug: 'prueba-fecha', summary: 'Regresión CMS', date: parse('date: 2026-10-15').date };
  page.researchProjects.projects = [project];
  assert.equal(collections.paginas.schema.parse(page).researchProjects.projects[0].date, '2026-10-15');
  project.date = '2026-02-30';
  assert.equal(collections.paginas.schema.safeParse(page).success, false);
});

test('events preserve string offsets, accept YAML instants and validate their order', () => {
  const base = { title: 'Evento', description: 'Prueba de agenda', location: 'CEDHU' };
  const literal = '2026-10-15T23:30:00-05:00';
  assert.equal(datetime.parse(literal), literal);
  assert.equal(datetime.parse(parse(`startDate: ${literal}`).startDate), '2026-10-16T04:30:00.000Z');
  const event = collections.eventos.schema.parse({ ...base, startDate: literal, endDate: '2026-10-16T06:00:00Z' });
  assert.equal(event.startDate, literal);
  assert.equal(collections.eventos.schema.parse({ ...base, ...parse(`startDate: ${literal}`), endDate: null }).endDate, undefined);
  assert.equal(collections.eventos.schema.safeParse({ ...base, startDate: literal, endDate: '2026-10-15T23:00:00-05:00' }).success, false);
  for (const value of ['2026-10-15', '2026-10-15T08:00:00', '2026-02-30T08:00:00-05:00', new Date(NaN)]) {
    assert.equal(datetime.safeParse(value).success, false);
  }
});

const run = promisify(execFile);
async function build(...args) {
  return run(process.execPath, ['node_modules/astro/bin/astro.mjs', ...args], {
    env: { ...process.env, TZ: 'America/Bogota' }, maxBuffer: 10 * 1024 * 1024,
  });
}

test('real builds publish PRUEBA, quoted and undated news; reject impossible YAML dates', async () => {
  const fixtures = new Map([
    ['src/content/noticias/prueba.md', '---\ntitle: PRUEBA\ndescription: Esta es una noticia de prueba\ndate: 2026-10-15\nimage: bandera\ncategory: ICFES\nfeatured: false\narchived: false\norder: 100\nfeaturedOrder: 100\ndraft: false\n---\nLa noticia de prueba, es esta, solo estamos probando cosas.\n'],
    ['src/content/noticias/cms-fecha-con-comillas.md', '---\ntitle: Fecha con comillas\ndescription: Regresión CMS\nimage: bandera\ncategory: ICFES\ndate: "2026-10-15"\n---\nPrueba.\n'],
    ['src/content/noticias/cms-sin-fecha.md', '---\ntitle: Sin fecha\ndescription: Regresión CMS\nimage: bandera\ncategory: ICFES\n---\nPrueba.\n'],
    ['src/content/eventos/cms-fecha-evento.md', '---\ntitle: Evento de prueba\ndescription: Regresión CMS\nlocation: CEDHU\nstartDate: 2026-10-15T23:30:00-05:00\nendDate: 2026-10-16T01:00:00-05:00\ndraft: false\n---\n'],
  ]);
  const created = [];
  try {
    for (const [file, source] of fixtures) {
      // Never overwrite an editor's content if PRUEBA already exists locally.
      if (file.endsWith('/prueba.md')) {
        try {
          const existing = await readFile(file, 'utf8');
          assert.equal(parseFrontmatter(existing).frontmatter.title, 'PRUEBA');
          continue;
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      await writeFile(file, source, { flag: 'wx' });
      created.push(file);
    }
    await build('sync', '--force');
    await build('build');
    for (const slug of ['prueba', 'cms-fecha-con-comillas']) {
      const html = await readFile(`dist/noticias/${slug}/index.html`, 'utf8');
      assert(html.includes('datetime="2026-10-15"'));
      assert(html.includes('15 octubre 2026'));
      assert(!html.includes('14 octubre 2026'));
    }
    assert((await readFile('dist/noticias/cms-sin-fecha/index.html', 'utf8')).includes('Comunicado institucional'));
    const agenda = await readFile('dist/ludicas/index.html', 'utf8');
    assert(agenda.includes('datetime="2026-10-15T23:30:00-05:00"'));
    assert(agenda.includes('15 de octubre de 2026'));
    for (const file of await readdir('src/content/noticias')) {
      if (!file.endsWith('.md') || fixtures.has(`src/content/noticias/${file}`)) continue;
      const { frontmatter } = parseFrontmatter(await readFile(`src/content/noticias/${file}`, 'utf8'));
      if (frontmatter.draft) continue;
      const output = `dist/noticias/${file.slice(0, -3)}/index.html`;
      await access(output);
      const html = await readFile(output, 'utf8');
      if (frontmatter.date) assert(html.includes(`datetime="${frontmatter.date}"`));
      else assert(html.includes(frontmatter.undatedLabel ?? 'Comunicado institucional'));
    }
    // Test raw YAML through Astro's real loader: default YAML would roll this
    // impossible date to March 2 before the schema ever sees it.
    for (const [file, field, literal] of [
      ['src/content/noticias/cms-fecha-con-comillas.md', 'date', '2026-02-30'],
      ['src/content/eventos/cms-fecha-evento.md', 'startDate', '2026-02-30T08:00:00-05:00'],
    ]) {
      const source = fixtures.get(file);
      await writeFile(file, source.replace(new RegExp(`^${field}:.*$`, 'm'), `${field}: ${literal}`));
      await assert.rejects(build('sync', '--force'), error => {
        assert.match(error.stdout + error.stderr, /InvalidContentEntryDataError/);
        assert((error.stdout + error.stderr).includes(field));
        return true;
      });
      await writeFile(file, source);
    }
  } finally {
    for (const file of created.reverse()) {
      assert(path.resolve(file).startsWith(process.cwd() + path.sep));
      await unlink(file);
    }
    await build('sync', '--force');
    await build('build');
  }
});
