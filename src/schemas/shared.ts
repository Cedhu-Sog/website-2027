import { z } from 'astro/zod';
import { mediaIds } from '../data/media-catalog';

export const text = z.string().trim().min(1);
export const mediaKey = text.refine(value => mediaIds.has(value), 'Selecciona una fotografía existente en la biblioteca.');
export const date = z.iso.date();
export const assetPath = z.string().regex(/^\/src\/assets\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp|avif)$/i);
export const link = z.string().trim().regex(/^(?:\/(?!\/)|#[a-zA-Z]|https:\/\/|mailto:|tel:)[^\s]*$/, 'Usa una ruta interna o un enlace seguro.');
export const seo = z.object({ title: text.optional(), description: text.max(180).optional(), image: mediaKey.optional() }).optional();

/** Decap serializes cleared optional fields as null/empty strings. */
export function cleanContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== '').map(([key, item]) => [key, cleanContent(item)]));
  }
  return value;
}
