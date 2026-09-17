import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getNews } from '../lib/content';
import { site } from '../data/site';

export const GET: APIRoute = async () => {
  const [pages, news] = await Promise.all([getCollection('paginas'), getNews()]);
  const routes = [...pages.map(entry => entry.data.route), ...news.map(item => '/noticias/' + item.slug + '/')];
  if (new Set(routes).size !== routes.length) throw new Error('Hay rutas editoriales duplicadas.');
  const urls = routes.map(route => '<url><loc>' + new URL(route, site.url).href + '</loc></url>').join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>', { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
