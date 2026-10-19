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
// Decap is an independent application; check:cms validates its entry point.
const htmlFiles = files.filter(file => file.endsWith('.html') && !path.relative(root, file).startsWith('admin' + path.sep));
const pages = new Map();
const errors = [];
const titles = new Set();
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#38;', '&');
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const route = relative === 'index.html' ? '/' : relative.endsWith('/index.html') ? '/' + relative.slice(0, -10) : '/' + relative;
  const projectsAccess = route === '/proyectos/';
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const check = (valid, message) => { if (!valid) errors.push(`${route}: ${message}`); };
  check((html.match(/<h1(?:\s|>)/g) ?? []).length === 1, 'must contain exactly one h1');
  check((html.match(/<main(?:\s|>)/g) ?? []).length === 1, 'must contain exactly one main');
  if (!projectsAccess) {
    check((html.match(/\bdata-floating-logo(?=[\s=>])/g) ?? []).length === 1, 'must contain exactly one global floating logo');
    check((html.match(/\bdata-floating-logo-trigger(?=[\s=>])/g) ?? []).length === 1, 'must contain exactly one floating logo trigger');
  } else {
    check(html.includes('name="robots" content="noindex, nofollow"'), 'access page must not be indexed');
    check(!html.includes('data-floating-logo') && !html.includes('class="site-footer"'), 'access shell must remain independent of public navigation');
  }
  check(new Set(ids).size === ids.length, 'duplicate element IDs');
  check(Boolean(title) && !titles.has(title), 'missing or duplicated page title');
  titles.add(title);
  check(/<html[^>]*lang="es-CO"/.test(html), 'missing Spanish document language');
  check(/<meta name="description" content="[^"]+"/.test(html), 'missing description');
  const canonicalOrigin = projectsAccess ? 'https://website-2027-seven.vercel.app' : 'https://cedhu.edu.co';
  check(html.includes(`rel="canonical" href="${canonicalOrigin}${route === '/404.html' ? '/404/' : route}"`), 'canonical does not match route');
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
    .flatMap(match => match[1].split(',').map(candidate => candidate.trim()).filter(Boolean).map(candidate => candidate.split(/\s+/)[0]));
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
const privatePath = /^\/(?:admin|proyectos|api\/(?:cms|proyectos))(?:\/|$)/;
for (const [, location] of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  if (privatePath.test(new URL(location).pathname)) errors.push(`Private or administrative URL in sitemap: ${location}`);
}
for (const file of files.filter(file => file.endsWith('.html'))) {
  const route = '/' + path.relative(root, file).replaceAll('\\', '/');
  if (privatePath.test(route)) {
    const html = await readFile(file, 'utf8');
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    if (!head.includes('name="robots" content="noindex, nofollow"')) errors.push(`${route}: missing initial noindex, nofollow metadata`);
  }
}
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
if (/^\s*Disallow\s*:\s*\S/im.test(robots)) errors.push('robots.txt must allow crawlers to read noindex directives and public pages');
const deployment = JSON.parse(await readFile('vercel.json', 'utf8'));
// Vercel's :path* wildcard covers zero or more segments: bare roots, slashes and descendants.
// Validate deployment configuration here; real HTTP responses require a Vercel deployment.
for (const prefix of ['/admin', '/proyectos', '/api/cms', '/api/proyectos']) {
  const rule = deployment.headers.find(rule => rule.source === `${prefix}/:path*`);
  if (!rule?.headers.some(header => header.key.toLowerCase() === 'x-robots-tag' && header.value === 'noindex, nofollow')) {
    errors.push(`${prefix}: missing recursive Vercel noindex, nofollow header`);
  }
}
for (const rule of deployment.headers) {
  if (rule.headers.some(header => header.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(header.value)) &&
      !['/admin/:path*', '/proyectos/:path*', '/api/cms/:path*', '/api/proyectos/:path*'].includes(rule.source)) {
    errors.push(`Unexpected noindex rule affecting public routes: ${rule.source}`);
  }
}
for (const route of pages.keys()) {
  if (privatePath.test(route)) continue;
  if (route !== '/404.html' && /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(pages.get(route).html)) errors.push(`${route}: public page must remain indexable`);
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
