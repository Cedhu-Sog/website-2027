export interface MediaRecord {
  id: string;
  title: string;
  image: string;
  alt: string;
}

// Metadata stays independent from image imports so content schemas can validate it.
const records = import.meta.glob<Omit<MediaRecord, 'id'>>('/src/content/medios/*.json', { eager: true, import: 'default' });
export const mediaCatalog = Object.entries(records).map(([path, record]) => ({ ...record, id: path.split('/').pop()!.replace(/\.json$/, '') }));
export const mediaIds = new Set(mediaCatalog.map(record => record.id));
