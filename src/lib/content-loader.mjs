import { readFile } from 'node:fs/promises';
import { glob } from 'astro/loaders';
import { extractFrontmatter } from '@astrojs/internal-helpers/frontmatter';
import { JSON_SCHEMA, load } from 'js-yaml';

/**
 * Preserve calendar literals before schema validation. YAML's default timestamp
 * parser rolls impossible dates into another month and loses explicit offsets.
 * Keep Astro's glob rendering, caching and watching; change only schema input.
 */
/** @param {Parameters<typeof glob>[0]} options @returns {import('astro/loaders').Loader} */
export function editorialGlob(options) {
  const loader = glob(options);
  return {
    ...loader,
    name: 'cedhu-editorial-glob',
    async load(context) {
      await loader.load({
        ...context,
        async parseData(props) {
          if (!props.filePath) return context.parseData(props);
          const source = await readFile(props.filePath, 'utf8');
          const raw = extractFrontmatter(source);
          const data = raw === undefined ? props.data : load(raw, { schema: JSON_SCHEMA });
          return context.parseData({ ...props, data });
        },
      });
    },
  };
}
