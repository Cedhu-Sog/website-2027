import path from 'node:path';
import { fileURLToPath } from 'node:url';

const assetRoot = fileURLToPath(new URL('../assets/', import.meta.url));

/** Convert Decap's repository paths into imports understood by Astro Markdown. */
export default {
  name: 'cedhu-cms-images',
  image(node, context) {
    if (!node.alt?.trim()) throw new Error('Cada fotografía de una noticia necesita una descripción accesible.');
    if (node.url.startsWith('/src/assets/')) {
      const image = path.resolve(assetRoot, node.url.slice('/src/assets/'.length));
      if (!image.startsWith(assetRoot) || !context.fileURL) throw new Error('La fotografía debe estar dentro de src/assets.');
      const relative = path.relative(path.dirname(fileURLToPath(context.fileURL)), image).replaceAll('\\', '/');
      context.setProperty(node, 'url', relative.startsWith('.') ? relative : './' + relative);
    } else if (/^(?:https?:|\/\/|data:)/i.test(node.url)) {
      throw new Error('Carga las fotografías en la biblioteca del CEDHU antes de insertarlas.');
    }
  },
};
