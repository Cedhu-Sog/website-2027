import type { ImageMetadata } from 'astro';

const images = import.meta.glob<ImageMetadata>([
  '/src/assets/**/*.[jJ][pP][gG]',
  '/src/assets/**/*.[jJ][pP][eE][gG]',
  '/src/assets/**/*.[pP][nN][gG]',
  '/src/assets/**/*.[wW][eE][bB][pP]',
  '/src/assets/**/*.[aA][vV][iI][fF]',
], { eager: true, import: 'default' });

export function assetImage(path: string): ImageMetadata {
  const image = images[path];
  if (!image) throw new Error(`No existe la fotografía local: ${path}`);
  return image;
}
