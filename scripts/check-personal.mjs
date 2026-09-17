import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const members = JSON.parse(await readFile('src/content/personal.json', 'utf8'));
const audit = JSON.parse(await readFile('docs/PERSONAL-FOTOGRAFIAS.json', 'utf8'));
const html = await readFile('dist/nosotros/equipo/index.html', 'utf8');
const cards = [...html.matchAll(/<article class="staff-card"[\s\S]*?<\/article>/g)].map(match => match[0]);
const compact = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
assert.equal(members.length, 64, 'Roster must contain every supplied role');
assert.equal(new Set(members.map(member => member.personId)).size, 63);
assert.equal(new Set(members.map(member => member.id)).size, members.length);
assert.equal(cards.length, members.length);
assert.deepEqual(Object.fromEntries(['directivas','coordinadores','docentes','administrativos','servicios-generales'].map(category => [category, members.filter(member => member.category === category).length])), { directivas:3, coordinadores:4, docentes:42, administrativos:6, 'servicios-generales':9 });
assert.equal(members.filter(member => member.officeHours).length, 47);
assert.equal(members.find(member => member.personId === 'nelson-omar-camargo').officeHours, undefined);
assert.equal(members.filter(member => member.photoUnavailable).length, 1);
assert(members.find(member => member.photoUnavailable).name === 'Jorge Fabio Rusinque Bustos');
const photoFiles = new Set();
const hashes = new Map();
for (const member of members) {
  const card = cards.find(card => card.includes(`id="personal-name-${member.id}"`));
  assert(card, `Missing card: ${member.name}`);
  const text = compact(card.replace(/<[^>]*>/g, ' '));
  const values = [member.name, member.role, member.description, member.officeHours, member.groupLeadership, member.research, ...(member.responsibilities ?? []), ...(member.assignments ?? []).flatMap(assignment => [assignment.subject, assignment.grades])].filter(Boolean);
  for (const value of values) assert(text.includes(compact(value)), `Missing rendered content for ${member.name}: ${value}`);
  for (const [key, value] of Object.entries(member)) assert(value !== '' && value !== null && (!Array.isArray(value) || value.length), `Empty field ${member.name}: ${key}`);
  const image = card.match(/<img\b[^>]*>/)?.[0];
  assert(image && /src="\/_astro\//.test(image), `Staff image must use local Astro output: ${member.name}`);
  assert(/loading="lazy"/.test(image) && /width="\d+"/.test(image) && /height="\d+"/.test(image) && /alt="[^"]+"/.test(image), `Image accessibility/loading: ${member.name}`);
  const record = audit.records.find(record => record.id === member.id);
  assert(record && record.name === member.name, `Missing photograph audit: ${member.name}`);
  const file = path.resolve('src/content', member.photo);
  assert.equal(file, path.resolve(record.localFile));
  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  if (member.photoUnavailable) assert(record.status.includes('404'));
  else {
    assert.equal(hash, record.sha256, `Photograph differs from verified original: ${member.name}`);
    const existing = hashes.get(hash);
    assert(!existing || existing === file, 'Unnecessary duplicate portrait file');
    hashes.set(hash, file);
    photoFiles.add(file);
  }
  const hasDetails = values.length > 2;
  assert.equal(card.includes('data-staff-open'), hasDetails, `Incorrect detail button: ${member.name}`);
}
assert.equal(photoFiles.size, 62);
const yadira = members.filter(member => member.personId === 'gladys-yadira-africano');
assert.equal(yadira.length, 2);
assert.equal(yadira[0].photo, yadira[1].photo);
assert.equal(audit.records.length, members.length);
console.log('PASS: 64 roles, 63 people, 5 categories, 47 schedules, every supplied detail rendered, 62 verified unique local portraits and one explicit institutional fallback.');
