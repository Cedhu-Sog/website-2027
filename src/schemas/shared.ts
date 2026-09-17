import { z } from 'astro/zod';
import { mediaKeys } from '../data/media-keys';

export const text = z.string().trim().min(1);
// Keep the existing optimized asset registry and fail builds on unknown image keys.
export const mediaKey = z.enum(mediaKeys);
export const date = z.iso.date();
