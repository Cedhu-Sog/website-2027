# Edición de contenido y Content Collections

La migración usa Astro 7.2.3, sin actualizar dependencias. La configuración oficial está en `src/content.config.ts`: `defineCollection`, loaders `glob()` de `astro/loaders` y Zod de `astro/zod`. Las consultas usan `getEntry`, `getCollection` y `render` de `astro:content`, sin APIs heredadas.

Referencia: [Content collections, documentación oficial de Astro](https://docs.astro.build/en/guides/content-collections/).

## Responsabilidades

- `src/content/paginas/*.md`: contenido editorial de las 22 páginas institucionales y de los índices. Frontmatter con campos nombrados para las secciones existentes; sin HTML ni clases CSS.
- `src/content/noticias/*.md`: cuatro publicaciones originales. El frontmatter describe la publicación y el cuerpo Markdown contiene sus párrafos.
- `src/content/reconocimientos/` y `src/content/eventos/`: colecciones preparadas, todavía vacías. Los `.gitkeep` conservan los directorios en Git y no se cargan como entradas. Astro puede advertir que no encontró Markdown en ellas; es esperado.
- `src/schemas/`: campos compartidos y schemas de las secciones. Los textos obligatorios no pueden quedar vacíos; las imágenes deben existir en el registro; las fechas deben ser válidas. En eventos, la fecha final no puede ser anterior al inicio.
- `src/lib/content.ts`: consultas tipadas, secciones compartidas, filtros de borradores, orden de noticias y adaptación de referencias al sistema de imágenes existente.
- `src/components/`: estructura y presentación de cada sección. Los componentes conservan elementos, clases, saltos de línea y particularidades del diseño. Las secciones compartidas aceptan contenido por props y consultan su entrada de origen si no se proporciona.
- `src/layouts/BaseLayout.astro`: documento, metadatos, cabecera y pie. Recibe `title` y `description` de la colección desde cada ruta.
- `src/pages/`: composición y rutas. Se conservaron las páginas individuales y las rutas dinámicas existentes; no se añadió una plantilla universal ni un layout redundante.
- `src/data/`: navegación de interfaz, adaptador de contacto, registro de assets y validación de fichas de investigación. Se retiraron los antiguos módulos editoriales de educación, institución, documentos y noticias.

Las páginas institucionales usan frontmatter porque sus diseños combinan múltiples bloques, títulos, imágenes y listas. El cuerpo Markdown se renderiza en las noticias; añadir texto fuera del frontmatter de una página institucional no crea automáticamente una sección visual.

## Archivo y URL

| Archivo en `src/content/paginas/` | Ruta existente |
| --- | --- |
| `inicio.md` | `/` |
| `nosotros.md` | `/nosotros/` |
| `identidad.md` | `/nosotros/identidad/` |
| `pedagogia-de-la-felicidad.md` | `/nosotros/pedagogia-de-la-felicidad/` |
| `espacios.md` | `/nosotros/espacios/` |
| `equipo.md` | `/nosotros/equipo/` |
| `historia.md` | `/historia/` |
| `oferta-educativa.md` | `/oferta-educativa/` |
| `inicial.md`, `primaria.md`, `bachillerato.md` | `/oferta-educativa/<nombre>/` |
| `ingles.md`, `ciencia-tecnologia.md`, `robotica.md`, `formacion-integral.md` | `/oferta-educativa/<nombre>/` |
| `investigacion.md` | `/oferta-educativa/investigacion/` |
| `admisiones.md`, `ludicas.md`, `contacto.md`, `documentos.md`, `servicios-en-linea.md` | `/<nombre>/` |
| `noticias.md` | `/noticias/` |

El nombre del archivo es el ID de la entrada. `route` conserva la URL pública y alimenta el sitemap. No renombrar archivos ni cambiar `route` para editar títulos. Las rutas individuales siguen definidas en Astro; el comprobador detecta discrepancias entre esas rutas y el sitemap. Las páginas nuevas con diseños propios requieren su composición Astro. La página 404 conserva textos de interfaz y no constituye contenido institucional.

## Cambiar una página

Editar, por ejemplo, `src/content/paginas/investigacion.md`:

```yaml
title: Investigación
description: Descripción editorial para buscadores y redes sociales.
heroTitle: Investigación en CEDHU
heroDescription: Introducción visible de la página.
heroImage: cienciaCedhu
```

Mantener los demás campos existentes. `title` alimenta el título del documento y las tarjetas sociales; `description` alimenta la descripción y los metadatos sociales. `heroTitle` y `heroDescription` controlan el encabezado visible. En Inicio, `heroTitle` y `heroDescription` usan bloques YAML multilínea para conservar los saltos del diseño.

Los bloques como `researchProjects`, `institutionOverview` o `admissionsProcess` contienen títulos, párrafos, listas, leyendas y llamadas a la acción. Los campos `titleStart`, `titleEnd` y `titleEmphasis` corresponden a fragmentos separados visualmente por saltos o énfasis en los componentes originales.

## Contenido compartido

| Fuente única | Dónde se reutiliza |
| --- | --- |
| `admisiones.md`: `faq`, `admissionsCta` | Inicio, admisiones y páginas con la llamada de admisiones |
| `oferta-educativa.md`: `educationalLevels`, `educationInterface` | Encabezado de niveles y etiquetas de las páginas educativas |
| Entradas con `education` | Tarjetas, páginas educativas y enlaces relacionados; `order` conserva su orden |
| `contacto.md`: `contact` | Información institucional de contacto en cabecera, pie, metadatos y secciones |
| `inicio.md`: secciones del inicio | Collage, identidad, tecnología y destacados |

No copiar estas secciones a cada página que las usa. Los nombres de navegación, textos de accesibilidad y controles como «Volver» o «Descargar» permanecen en la interfaz.

## Noticias

Conservar los nombres de los cuatro archivos existentes: generan `/noticias/<id>/`. Para nuevas publicaciones, crear un Markdown con título, descripción, categoría, imagen de tarjeta, pieza original (`poster`), fuente (`source`) y leyenda (`imageCaption`). Las imágenes son claves del registro existente.

- `date`: fecha confirmada `YYYY-MM-DD`. La etiqueta visible se calcula automáticamente; no mantener una segunda fecha textual.
- `undatedLabel`: solo para publicaciones sin fecha confirmada, como el comunicado original de registro de marca.
- `featured` y `featuredOrder`: controlan los destacados del inicio. Se muestran hasta tres.
- `order`: orden del archivo; luego se desempata por fecha descendente e ID.
- `draft: true`: excluye la noticia del archivo, inicio, sitemap y rutas generadas.
- `archived` y `archiveNotice`: preservan el contexto de las publicaciones antiguas.

El cuerpo se convierte en HTML con `render(entry)` dentro de `NewsArticle`, conservando su diseño. No se inventaron noticias, eventos ni reconocimientos. Los recursos colocados en `public/` continúan siendo públicos aunque una entrada sea borrador.

## Imágenes y documentos

`heroImage`, `image`, `poster` y las referencias del collage usan identificadores como `cienciaCedhu` o `robotica`. `src/data/media.ts` conserva las mismas importaciones, alternativas descriptivas y assets; `Photo.astro` mantiene la optimización de Astro. `media-keys.ts` enumera los identificadores válidos para el schema sin importar binarios durante la configuración del contenido.

Para una imagen nueva, añadir una sola importación al registro, su alternativa descriptiva y su clave a `media-keys.ts`. Las claves del registro están comprobadas con `satisfies`. No duplicar archivos de imágenes al editar contenido.

Los documentos se editan en `documentos.md`, bloque `documentsList.items`; los PDF permanecen en `public/documentos/`. Las fichas del semillero se editan en `investigacion.md`, bloque `researchProjects.projects`; ver [Investigación](INVESTIGACION.md).

## Integración futura con CMS

Un CMS basado en Git puede editar directamente estos Markdown y configurar sus formularios con los campos de los schemas. Para un CMS remoto se puede sustituir el loader de la colección por un loader de Astro que devuelva los mismos IDs y datos. Mantener el contrato validado permite conservar las rutas, consultas y componentes. El adaptador del CMS deberá resolver sus imágenes al sistema de assets del proyecto si proporciona otro formato.

No se incorporaron CMS, panel de administración, autenticación, bases de datos ni APIs externas. Las colecciones de eventos y reconocimientos no crean rutas nuevas por sí solas.

## Validación

1. Ejecutar `npm run dev -- --host 127.0.0.1` y editar Markdown; los cambios se reflejan en desarrollo.
2. Ejecutar `npm run build` para validar schemas y generar el sitio estático con sus imágenes.
3. Ejecutar `npm run check:site` para revisar rutas, fragmentos, metadatos, imágenes y variantes `srcset`, sitemap y PDF.
4. Revisar visualmente las páginas afectadas antes de publicar. En alojamiento estático, el cambio editorial requiere un nuevo build y despliegue.

No están instalados `typescript` ni `@astrojs/check`. El build, la generación de tipos, la revisión de sintaxis y el comprobador del sitio no equivalen a una comprobación semántica completa de TypeScript. No se instalaron herramientas adicionales.
