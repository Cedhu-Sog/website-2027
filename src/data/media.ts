import type { ImageMetadata } from 'astro';
import { mediaCatalog } from './media-catalog';
import { assetImage } from './asset-images';

// The same identifiers keep all existing content and optimized image URLs intact.
export const media: Record<string, { src: ImageMetadata; alt: string }> = Object.fromEntries(
  mediaCatalog.map(record => [record.id, { src: assetImage(record.image), alt: record.alt }]),
);
export type MediaKey = string;
