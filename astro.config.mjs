// @ts-check
import { defineConfig } from 'astro/config';
import markdownImages from './src/lib/markdown-images.mjs';
import { satteri } from '@astrojs/markdown-satteri';
export default defineConfig({ site: 'https://cedhu.edu.co', trailingSlash: 'always', output: 'static', devToolbar: { enabled: false }, markdown: { processor: satteri({ mdastPlugins: [markdownImages] }) } });
