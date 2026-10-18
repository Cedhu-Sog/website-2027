import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { editorialGlob } from './lib/content-loader.mjs';
import { z } from 'astro/zod';
import { pageSections } from './schemas/page-sections';
import { assetPath, cleanContent, date, datetime, mediaKey, seo, text } from './schemas/shared';
import { staffCategoryIds, staffGroupIds } from './data/personal';

const paginas = defineCollection({
  loader: editorialGlob({ base: './src/content/paginas', pattern: '**/*.md' }),
  schema: z.preprocess(cleanContent, z.object({
    route: z.string().regex(/^\/(?:[a-z0-9-]+\/)*$/),
    title: text,
    description: text,
    seo,
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
  })),
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
  loader: editorialGlob({ base: './src/content/noticias', pattern: '**/*.md' }),
  schema: z.preprocess(cleanContent, z.object({
    ...publication,
    seo,
    image: mediaKey,
    poster: mediaKey.optional(),
    // An original institutional notice has no confirmed date; never invent one.
    undatedLabel: text.optional(),
    source: z.url().optional(),
    archived: z.boolean().default(false),
    archiveNotice: text.optional(),
    imageCaption: text.optional(),
    introduction: text.optional(),
    imageRecognition: text.optional(),
    resultHighlight: z.object({ rank: text, location: text, edition: text, regional: text }).optional(),
    visitCta: z.object({
      title: text,
      description: text,
      invitation: text,
      details: text,
      visitLabel: text,
      whatsappLabel: text,
    }).optional(),
    order: z.number().int().nonnegative().default(100),
    featuredOrder: z.number().int().nonnegative().default(100),
    draft: z.boolean().default(false),
  })),
});

const reconocimientos = defineCollection({
  loader: editorialGlob({ base: './src/content/reconocimientos', pattern: '**/*.md' }),
  schema: z.preprocess(cleanContent, z.object({
    ...publication,
    category: z.enum(['academico', 'deportivo', 'cientifico', 'cultural', 'egresados']),
    educandos: text.optional(),
    organizer: text.optional(),
    source: text.optional(),
    sourceUrl: z.url().optional(),
    order: z.number().int().nonnegative(),
    draft: z.boolean().default(true),
  })),
});

const eventos = defineCollection({
  loader: editorialGlob({ base: './src/content/eventos', pattern: '**/*.md' }),
  schema: z.preprocess(cleanContent, z.object({
    title: text,
    description: text,
    startDate: datetime,
    endDate: datetime.optional(),
    location: text,
    image: mediaKey.optional(),
    additionalInfo: text.optional(),
    draft: z.boolean().default(true),
  }).refine(event => !event.endDate || Date.parse(event.endDate) >= Date.parse(event.startDate), {
    message: 'endDate debe ser igual o posterior a startDate.',
    path: ['endDate'],
  })),
});

const personal = defineCollection({
  loader: glob({ base: './src/content/personal', pattern: '*.json' }),
  schema: z.preprocess(cleanContent, z.object({
    personId: text,
    name: text,
    category: z.enum(staffCategoryIds),
    group: z.enum(staffGroupIds).optional(),
    role: text,
    order: z.number().int().positive(),
    photo: assetPath,
    photoAlt: text.optional(),
    visible: z.boolean().default(true),
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
  })),
});

const medios = defineCollection({
  loader: glob({ base: './src/content/medios', pattern: '*.json' }),
  schema: z.object({ title: text, image: assetPath, alt: text }),
});

export const collections = { paginas, noticias, reconocimientos, eventos, personal, medios };
