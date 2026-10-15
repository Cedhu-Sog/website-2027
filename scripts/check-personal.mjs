import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const members = await Promise.all((await readdir('src/content/personal')).filter(file => file.endsWith('.json')).map(async file => JSON.parse(await readFile(path.join('src/content/personal', file), 'utf8'))));
const html = await readFile('dist/nosotros/equipo/index.html', 'utf8');
const cards = [...html.matchAll(/<article class="staff-card"[\s\S]*?<\/article>/g)].map(match => match[0]);
const compact = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
assert.equal(new Set(members.map(member => member.id)).size, members.length);
assert.equal(cards.length, members.filter(member => member.visible !== false).length);
const photoFiles = new Set();
for (const member of members) {
  const file = path.resolve('.' + member.photo);
  assert(file.startsWith(path.resolve('src/assets') + path.sep), 'Portrait must stay in src/assets');
  assert((await readFile(file)).length > 0, `Missing portrait: ${member.name}`);
  photoFiles.add(file);
  const card = cards.find(card => card.includes(`id="personal-name-${member.id}"`));
  if (member.visible === false) { assert(!card, `Hidden profile rendered: ${member.name}`); continue; }
  assert(card, `Missing card: ${member.name}`);
  const text = compact(card.replace(/<[^>]*>/g, ' '));
  const values = [member.name, member.role, member.description, member.officeHours, member.groupLeadership, member.research, ...(member.responsibilities ?? []), ...(member.assignments ?? []).flatMap(assignment => [assignment.subject, assignment.grades])].filter(Boolean);
  for (const value of values) assert(text.includes(compact(value)), `Missing rendered content for ${member.name}: ${value}`);
  for (const [key, value] of Object.entries(member)) assert(value !== '' && value !== null && (!Array.isArray(value) || value.length), `Empty field ${member.name}: ${key}`);
  const image = card.match(/<img\b[^>]*>/)?.[0];
  assert(image && /src="\/_astro\//.test(image), `Staff image must use local Astro output: ${member.name}`);
  assert(/loading="lazy"/.test(image) && /width="\d+"/.test(image) && /height="\d+"/.test(image) && /alt="[^"]+"/.test(image), `Image accessibility/loading: ${member.name}`);
  const hasDetails = values.length > 2;
  assert.equal(card.includes('data-staff-open'), hasDetails, `Incorrect detail button: ${member.name}`);
}
console.log(`PASS: ${members.length} roles, ${cards.length} visible profiles, ${photoFiles.size} local portraits; content, dimensions, lazy loading and accessible alternatives checked.`);
