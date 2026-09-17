import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
const files = await walk(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const pages = new Map();
const errors = [];
const titles = new Set();
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const route = relative === 'index.html' ? '/' : relative.endsWith('/index.html') ? '/' + relative.slice(0, -10) : '/' + relative;
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const check = (valid, message) => { if (!valid) errors.push(`${route}: ${message}`); };
  check((html.match(/<h1(?:\s|>)/g) ?? []).length === 1, 'must contain exactly one h1');
  check((html.match(/<main(?:\s|>)/g) ?? []).length === 1, 'must contain exactly one main');
  check(new Set(ids).size === ids.length, 'duplicate element IDs');
  check(Boolean(title) && !titles.has(title), 'missing or duplicated page title');
  titles.add(title);
  check(/<html[^>]*lang="es-CO"/.test(html), 'missing Spanish document language');
  check(/<meta name="description" content="[^"]+"/.test(html), 'missing description');
  check(html.includes(`rel="canonical" href="https://cedhu.edu.co${route === '/404.html' ? '/404/' : route}"`), 'canonical does not match route');
  check(html.includes('property="og:title"') && html.includes('name="twitter:title"'), 'missing sharing metadata');
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    check(/\balt="[^"]*"/.test(img[0]), 'image without alt');
    check(/\bwidth="\d+"/.test(img[0]) && /\bheight="\d+"/.test(img[0]), 'image without intrinsic dimensions');
  }
  for (const json of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    try { JSON.parse(json[1]); } catch { check(false, 'invalid JSON-LD'); }
  }
  pages.set(route, { html, ids: new Set(ids) });
}
let references = 0;
for (const [route, page] of pages) {
  const directReferences = [...page.html.matchAll(/\b(?:href|src)="([^"]*)"/g)].map(match => match[1]);
  const responsiveImages = [...page.html.matchAll(/\bsrcset="([^"]*)"/g)]
    .flatMap(match => match[1].split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
  for (const reference of [...directReferences, ...responsiveImages]) {
    const value = decode(reference);
    if (!value || value === '#' || value.startsWith('javascript:')) { errors.push(`${route}: inactive link ${value}`); continue; }
    if (!value.startsWith('/') && !value.startsWith('#')) continue;
    const url = new URL(value, `https://cedhu.edu.co${route}`);
    if (url.origin !== 'https://cedhu.edu.co') continue;
    const destination = pages.get(url.pathname);
    references++;
    if (destination) {
      if (url.hash && !destination.ids.has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${route}: missing fragment ${value}`);
      continue;
    }
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!filename.startsWith(root + path.sep)) { errors.push(`${route}: invalid asset path`); continue; }
    try { assert((await stat(filename)).isFile()); } catch { errors.push(`${route}: missing route or asset ${value}`); }
  }
}
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
for (const route of pages.keys()) {
  if (route !== '/404.html' && !sitemap.includes(`<loc>https://cedhu.edu.co${route}</loc>`)) errors.push(`Missing sitemap entry: ${route}`);
}
const sourceFiles = await walk(path.resolve('src'));
for (const file of sourceFiles.filter(file => file.endsWith('.astro'))) {
  const source = await readFile(file, 'utf8');
  if (/<style\b|\bstyle\s*=/.test(source)) errors.push(`${file}: styling inside Astro markup`);
}
const pdfs = files.filter(file => file.endsWith('.pdf'));
for (const file of pdfs) assert((await readFile(file)).subarray(0, 4).toString() === '%PDF', `Invalid PDF: ${file}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${pages.size} pages, ${references} local references, ${pdfs.length} PDFs. Metadata, headings, image alternatives, fragments, sitemap and separation of styles checked.`);
