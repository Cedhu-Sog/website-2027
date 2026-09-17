# Publicar proyectos del semillero

La sección está en `/oferta-educativa/investigacion/`, dentro del menú Educación y enlazada desde la propuesta educativa. Su ruta también está en el sitemap.

## Archivos y responsabilidades

- `src/content/paginas/investigacion.md`: introducción, hero y fichas en `researchProjects.projects`.
- `src/content.config.ts` y `src/schemas/page-sections.ts`: validación editorial mediante Content Collections.
- `src/lib/content.ts`: consulta y resolución de las imágenes del contenido.
- `src/data/research.ts`: tipos, validación de referencias y orden; no contiene fichas editoriales.
- `src/pages/oferta-educativa/investigacion.astro`: composición de la página.
- `src/components/sections/ResearchProjects.astro`: introducción, listado y estado sin publicaciones.
- `src/components/common/ResearchProject.astro`: ficha con información, fotografías y documentos.
- `src/components/common/Photo.astro`: imágenes locales optimizadas por Astro, compartidas con el resto del sitio.
- `src/styles/components/research.css`: presentación responsive, sin estilos dentro de Astro.

No se publicaron proyectos ficticios: el lote fotográfico no incluía fichas verificadas ni documentos del semillero. La fotografía del hero se identifica como una actividad de la feria científica; no se le atribuye un proyecto específico del semillero.

## Añadir una ficha

1. Reunir el título oficial, resumen y demás información confirmada del proyecto.
2. Preparar solo sus fotos seleccionadas en `src/assets/fotos-cedhu/` (se pueden crear subcarpetas por proyecto). Preferir WebP, orientación correcta y hasta 1600 px de ancho; no ampliar fotos pequeñas. Mantener una copia de conservación fuera de la web antes de optimizar nuevos originales.
3. Registrar cada fotografía en `src/data/media.ts` y su identificador en `src/data/media-keys.ts`. En el contenido, los objetos de imagen llevan `image` (el identificador), `alt` descriptivo y `caption` opcional.
4. Añadir una ficha a `researchProjects.projects` en `src/content/paginas/investigacion.md`. Solo `title`, `slug` y `summary` son obligatorios. Se pueden añadir campos progresivamente sin modificar el componente.
5. Colocar los PDF reales en `public/documentos/investigacion/<slug>/` y añadir sus rutas a `pdfs`. Usar nombres en minúscula y separados por guiones, con extensión `.pdf`.
6. Ejecutar `npm run build` y luego `npm run check:site`. Este último detecta archivos y enlaces ausentes y comprueba las cabeceras de los PDFs.

Ejemplo de estructura, exclusivamente para editar y completar con información oficial (no copiar como publicación real):

```yaml
researchProjects:
  # Conservar aquí los campos existentes de introducción y encabezados.
  projects:
    - title: Título oficial del proyecto
      slug: nombre-del-proyecto
      summary: "Resumen verificado: pregunta, propósito y alcance del proyecto."
      area: Área académica confirmada
      description:
        - Primer párrafo de desarrollo.
        - Segundo párrafo de desarrollo.
      coverImage:
        image: portadaProyecto
        alt: Descripción concreta de lo que muestra la portada.
      gallery:
        - image: procesoProyecto
          alt: Descripción concreta de la actividad.
          caption: Contexto de la fotografía.
      authors:
        - Nombre autorizado del autor o responsable
      details:
        - label: Estado
          value: Estado confirmado del proyecto
      pdfs:
        - title: Informe del proyecto
          href: /documentos/investigacion/nombre-del-proyecto/informe.pdf
      tags:
        - Tema del proyecto
      featured: false
      draft: true
```

Añadir `date: 'AAAA-MM-DD'` solo cuando exista una fecha editorial confirmada, sustituyendo el patrón por una fecha real. Cambiar `draft` a `false` o quitarlo cuando la ficha esté lista. Las rutas y claves de imágenes del ejemplo deben existir antes de compilar, también en borradores. `portadaProyecto` y `procesoProyecto` son nombres ilustrativos que deben registrarse o sustituirse por claves reales.

## Comportamiento editorial

- Los destacados aparecen primero; dentro de cada grupo se ordena por fecha descendente. Las fichas sin fecha van después. El slug desempata el orden.
- Un proyecto puede comenzar solo con título y resumen. Los bloques opcionales vacíos no generan encabezados ni controles vacíos.
- Los slugs deben ser únicos, en minúsculas y separados por guiones. No cambiarlos después de compartir un enlace.
- Cada ficha se puede enlazar mediante `/oferta-educativa/investigacion/#proyecto-<slug>`. El título contiene ese enlace permanente.
- La galería mantiene las proporciones completas de cada foto y usa carga diferida. No depende de JavaScript ni de un carrusel.
- Cada PDF muestra su título, «Ver documento» en la misma pestaña y «Descargar PDF». La descarga depende del comportamiento habitual del navegador.
- La validación durante el build rechaza títulos/resúmenes vacíos, slugs repetidos, fechas inválidas, fotos sin alternativa descriptiva y rutas PDF incorrectas.
- `draft` oculta la ficha, pero **no hace privados los archivos**: `public/` se copia al sitio y las importaciones pueden procesarse. Mantener material no publicable fuera del proyecto web.

La implementación usa Astro y TypeScript existentes, sin dependencias adicionales, CMS ni JavaScript de cliente para las fichas.
