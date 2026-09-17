import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { pageSections } from './schemas/page-sections';
import { date, mediaKey, text } from './schemas/shared';
import { staffCategoryIds, staffGroupIds } from './data/personal';

const paginas = defineCollection({
  loader: glob({ base: './src/content/paginas', pattern: '**/*.md' }),
  schema: z.object({
    route: z.string().regex(/^\/(?:[a-z0-9-]+\/)*$/),
    title: text,
    description: text,
    heroTitle: text,
    heroDescription: text,
    heroEyebrow: text,
    heroImage: mediaKey.optional(),
    heroImageCaption: text.optional(),
    primaryActionLabel: text.optional(),
    secondaryActionLabel: text.optional(),
    education: z.object({
      order: z.number().int().nonnegative(),
      methodology: text,
      description: text,
      focus: z.array(z.object({ title: text, text })),
      related: z.array(text),
    }).optional(),
    supplement: z.object({
      eyebrow: text,
      title: text,
      introduction: text,
      familyDescription: text.optional(),
      image: mediaKey.optional(),
      linkLabel: text,
    }).optional(),
    ...pageSections,
  }),
});

const publication = {
  title: text,
  description: text,
  date: date.optional(),
  image: mediaKey.optional(),
  category: text,
  featured: z.boolean().default(false),
};

const noticias = defineCollection({
  loader: glob({ base: './src/content/noticias', pattern: '**/*.md' }),
  schema: z.object({
    ...publication,
    image: mediaKey,
    poster: mediaKey,
    // An original institutional notice has no confirmed date; never invent one.
    undatedLabel: text.optional(),
    source: z.url(),
    archived: z.boolean().default(false),
    archiveNotice: text.optional(),
    imageCaption: text,
    order: z.number().int().nonnegative().default(100),
    featuredOrder: z.number().int().nonnegative().default(100),
    draft: z.boolean().default(false),
  }),
});

const reconocimientos = defineCollection({
  loader: glob({ base: './src/content/reconocimientos', pattern: '**/*.md' }),
  schema: z.object({ ...publication, date }),
});

const eventos = defineCollection({
  loader: glob({ base: './src/content/eventos', pattern: '**/*.md' }),
  schema: z.object({
    title: text,
    description: text,
    startDate: date,
    endDate: date.optional(),
    location: text,
    image: mediaKey.optional(),
    category: text,
    featured: z.boolean().default(false),
  }).refine(event => !event.endDate || event.endDate >= event.startDate, {
    message: 'endDate debe ser igual o posterior a startDate.',
    path: ['endDate'],
  }),
});

const personal = defineCollection({
  loader: file('./src/content/personal.json'),
  schema: ({ image }) => z.object({
    personId: text,
    name: text,
    category: z.enum(staffCategoryIds),
    group: z.enum(staffGroupIds).optional(),
    role: text,
    order: z.number().int().positive(),
    photo: image(),
    photoUnavailable: z.boolean().optional(),
    description: text.optional(),
    officeHours: text.optional(),
    assignments: z.array(z.object({ subject: text, grades: text })).min(1).optional(),
    groupLeadership: text.optional(),
    research: text.optional(),
    responsibilities: z.array(text).min(1).optional(),
  }).refine(person => (person.category === 'docentes') === Boolean(person.group), {
    message: 'Cada docente debe pertenecer a un área; las demás categorías no llevan área docente.',
    path: ['group'],
  }),
});

export const collections = { paginas, noticias, reconocimientos, eventos, personal };
