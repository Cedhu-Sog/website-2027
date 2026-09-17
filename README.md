# CEDHU Web 2027

Primera versión integral del sitio del Centro de Desarrollo Humano, Sogamoso. Astro genera HTML estático; CSS y TypeScript están separados del marcado. El contenido procede del sitio institucional publicado, con las vigencias originales claramente identificadas.

## Desarrollo y validación

Requiere Node.js 22.12 o posterior y las dependencias del lockfile. La versión instalada durante la revisión fue Astro 7.2.3 sobre Node 24.14.0.

| Comando | Responsabilidad |
| --- | --- |
| `npm run dev -- --host 127.0.0.1` | Servidor local de desarrollo |
| `npm run build` | Genera el sitio y las imágenes optimizadas en `dist/` |
| `npm run check:site` | Revisa el resultado de un build: rutas, enlaces locales, fragmentos, metadatos, imágenes, PDFs y separación del CSS |
| `npm run preview -- --host 127.0.0.1` | Revisión local de `dist/` |

Ejecutar siempre `build` antes de `check:site`. No hay comandos de lint o typecheck configurados ni están instalados ESLint, TypeScript o `@astrojs/check`. El build y el comprobador del sitio no sustituyen una comprobación completa de tipos. No se añadieron dependencias para esta implementación.

## Arquitectura

- `src/pages/`: rutas que componen el layout y las secciones.
- `src/layouts/BaseLayout.astro`: documento, SEO, cabecera, pie y accesibilidad global.
- `src/components/common/`: fotografías, iconos, encabezados, noticias y elementos compartidos.
- `src/components/navigation/`: navegación de escritorio, menú móvil y accesos inferiores.
- `src/components/sections/`: secciones completas de las páginas.
- `src/content/`: contenido editable de páginas, noticias, reconocimientos y eventos mediante Content Collections.
- `src/content.config.ts` y `src/schemas/`: loaders y schemas de contenido para Astro 7.
- `src/lib/content.ts`: consultas tipadas y adaptación del contenido a las secciones existentes.
- `src/data/`: navegación, adaptador de contacto, registro de imágenes y validación de investigación.
- `src/styles/`: tokens, reset y estilos globales; `components/` contiene los estilos de cada componente.
- `src/scripts/interactions/`: navegación, filtros y preferencias de accesibilidad.
- `src/assets/images/`: 23 recursos oficiales; Astro genera variantes WebP sin ampliar los originales.
- `public/documentos/` y `public/videos/`: nueve PDFs y el recorrido institucional original.
- `scripts/check-site.mjs`: validación del HTML generado con módulos nativos de Node.

## Rutas

El build incluye 27 páginas HTML (22 páginas editoriales, cuatro noticias y la página 404), además de `sitemap.xml` y `robots.txt`.

| Área | Rutas |
| --- | --- |
| Inicio | `/` |
| Institución | `/nosotros/`, `/nosotros/identidad/`, `/nosotros/pedagogia-de-la-felicidad/`, `/nosotros/espacios/`, `/nosotros/equipo/`, `/historia/` |
| Educación | `/oferta-educativa/` y sus páginas `inicial/`, `primaria/`, `bachillerato/`, `ingles/`, `ciencia-tecnologia/`, `investigacion/`, `robotica/`, `formacion-integral/` |
| Familias | `/admisiones/`, `/ludicas/`, `/servicios-en-linea/`, `/documentos/`, `/contacto/` |
| Actualidad | `/noticias/` y los artículos `registro-marca-cedhu/`, `picnic-de-las-emociones/`, `tecnologia-en-las-aulas/`, `actividades-ludicas-2026/` |
| Error | `404.html` en el resultado estático |

## Edición de contenido

Editar los Markdown de `src/content/paginas/` y `src/content/noticias/`. Por ejemplo, `src/content/paginas/investigacion.md` controla los metadatos, hero y textos de `/oferta-educativa/investigacion/`. Los párrafos de las noticias están en el cuerpo Markdown; las páginas institucionales usan frontmatter estructurado para mantener sus diseños particulares.

Las colecciones de reconocimientos y eventos están preparadas sin publicaciones ficticias. Las imágenes conservan el registro de `src/data/media.ts` y su optimización. La [guía de Content Collections](docs/CONTENT-COLLECTIONS.md) explica todos los campos, archivos, contenido compartido, borradores y el punto de integración para un CMS futuro.

Los formularios se abren en los servicios oficiales externos. Este sitio no almacena inscripciones ni procesa pagos. Las preferencias de accesibilidad se guardan solo en el navegador y funcionan aunque el almacenamiento no esté disponible. Los menús y preguntas frecuentes usan HTML nativo; las noticias permanecen disponibles si JavaScript está deshabilitado.

## Fuentes y revisión

- [Procedencia del contenido y recursos](docs/CONTENT-SOURCES.md)
- [Resultados de QA y comprobaciones manuales pendientes](docs/QA.md)
- [Validación de la migración de contenido](docs/QA-CONTENT-COLLECTIONS.md)

Los datos publicados de admisiones, lúdicas y documentos corresponden principalmente a 2026. CEDHU debe confirmar cupos, fechas, costos y versiones de 2027 antes de anunciar una convocatoria nueva.

## Publicación

La URL canónica está configurada como `https://cedhu.edu.co`. El entregable actual es local: no se ha desplegado. Al publicar, servir `dist/` con soporte para directorios con `index.html`, las barras finales y la página `404.html`; comprobar los portales externos y actualizar los documentos del periodo. El recorrido MP4 se descarga únicamente al abrir su enlace y no se reproduce automáticamente.
