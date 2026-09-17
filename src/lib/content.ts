import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { media } from '../data/media';
import { validateResearchProjects } from '../data/research';

export type PageData = CollectionEntry<'paginas'>['data'];
export type PageSection<K extends keyof PageData> = NonNullable<PageData[K]>;

/** All loaders can change behind this boundary without changing visual components. */
export async function getPage(id: string): Promise<PageData> {
  const entry = await getEntry('paginas', id);
  if (!entry) throw new Error(`Falta la página editorial paginas/${id}.`);
  return entry.data;
}

/** Shared sections have a single editorial owner and can also be passed as props. */
export async function getPageSection<K extends keyof PageData>(id: string, section: K): Promise<PageSection<K>> {
  const page = await getPage(id);
  const content = page[section];
  if (content === undefined || content === null) {
    throw new Error(`Falta la sección ${String(section)} en paginas/${id}.`);
  }
  return content;
}

export async function getEducationPages() {
  const entries = await getCollection('paginas', ({ data }) => Boolean(data.education));
  const ids = new Set(entries.map(entry => entry.id));
  return entries.map(entry => {
    const { education, ...page } = entry.data;
    if (!education) throw new Error(`Falta la propuesta educativa en ${entry.id}.`);
    if (!page.heroImage) throw new Error(`Falta la imagen educativa en ${entry.id}.`);
    for (const id of education.related) {
      if (!ids.has(id)) throw new Error(`Referencia educativa inexistente: ${entry.id} → ${id}.`);
    }
    return {
      ...education,
      slug: entry.id,
      route: page.route,
      name: page.title,
      title: page.heroTitle,
      intro: page.heroDescription,
      eyebrow: page.heroEyebrow,
      image: page.heroImage,
      supplement: page.supplement,
    };
  }).sort((a, b) => a.order - b.order);
}

export type EducationPage = Awaited<ReturnType<typeof getEducationPages>>[number];

export async function getNews() {
  const entries = await getCollection('noticias', ({ data }) => !data.draft);
  return entries.map(entry => ({
    ...entry.data,
    slug: entry.id,
    dateLabel: entry.data.date
      ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${entry.data.date}T00:00:00Z`)).replaceAll(' de ', ' ')
      : entry.data.undatedLabel ?? 'Comunicado institucional',
  })).sort((a, b) => a.order - b.order || (b.date ?? '').localeCompare(a.date ?? '') || a.slug.localeCompare(b.slug));
}

export type NewsItem = Awaited<ReturnType<typeof getNews>>[number];

/** Resolve editorial image identifiers through the same asset pipeline as Photo. */
export function getResearchProjects(projects: PageSection<'researchProjects'>['projects']) {
  type Photo = NonNullable<(typeof projects)[number]['coverImage']>;
  const resolvePhoto = (photo: Photo) => ({ src: media[photo.image].src, alt: photo.alt, caption: photo.caption });
  return validateResearchProjects(projects.map(project => ({
    ...project,
    coverImage: project.coverImage && resolvePhoto(project.coverImage),
    gallery: project.gallery?.map(resolvePhoto),
  })));
}
