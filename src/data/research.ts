import type { ImageMetadata } from 'astro';

export interface ResearchImage {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export interface ResearchProject {
  title: string;
  slug: string;
  summary: string;
  /** Fecha editorial confirmada, en formato YYYY-MM-DD. */
  date?: string;
  area?: string;
  description?: string[];
  coverImage?: ResearchImage;
  gallery?: ResearchImage[];
  authors?: string[];
  details?: { label: string; value: string }[];
  pdfs?: { title: string; href: string }[];
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
}

/** Valida los datos al compilar y publica destacados primero, luego por fecha. */
export function validateResearchProjects(projects: ResearchProject[]): ResearchProject[] {
  const slugs = new Set<string>();
  for (const project of projects) {
    const fail = (message: string): never => { throw new Error(`Investigación (${project.slug}): ${message}`); };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || slugs.has(project.slug)) fail('slug inválido o duplicado');
    slugs.add(project.slug);
    if (!project.title.trim() || !project.summary.trim()) fail('título y resumen son obligatorios');
    if (project.date) {
      const date = new Date(`${project.date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(project.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== project.date) fail('fecha inválida');
    }
    for (const photo of [project.coverImage, ...(project.gallery ?? [])]) {
      if (photo && (!photo.src?.width || !photo.alt.trim())) fail('cada fotografía necesita una importación y un alt descriptivo');
    }
    for (const pdf of project.pdfs ?? []) {
      if (!pdf.title.trim() || !/^\/documentos\/investigacion\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.pdf$/.test(pdf.href)) fail('PDF sin título o ruta local válida');
    }
  }
  return projects.filter(project => !project.draft).sort((a, b) =>
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (b.date ?? '').localeCompare(a.date ?? '') || a.slug.localeCompare(b.slug)
  );
}
