# Validación de Content Collections

Fecha: 9 de septiembre de 2026. Windows, Node 24.14.0 y Astro 7.2.3. Migración y comprobaciones locales; sin despliegue.

## Resultado final

| Comprobación | Resultado |
| --- | --- |
| `npm run build` ejecutado al retomar y cerrar | Correcto: 27 páginas HTML y 132 variantes optimizadas de imágenes |
| `npm run check:site` | Correcto: 27 páginas, 3.345 referencias locales y nueve PDF |
| Colecciones | 22 entradas en `paginas`, cuatro en `noticias`; `eventos` y `reconocimientos` vacías |
| Schemas | Todas las entradas válidas, sin campos de entrada descartados por el schema |
| Pruebas negativas de schemas, en memoria | Rechazan fechas imposibles, fin anterior al inicio, claves de imagen inexistentes, títulos vacíos y `draft` con un tipo incorrecto |
| Parser de Astro instalado | 54 archivos `.astro`, sin diagnósticos |
| `node --check` | Sintaxis correcta en 15 archivos TypeScript/JavaScript de `src/` y `scripts/` |
| Tipos de Content Collections | Generados correctamente por Astro durante el build |
| `git diff --check` | Sin errores de espacios; aviso de normalización CRLF/LF del README |

El comprobador del sitio se amplió para validar también las rutas de las variantes `srcset`. Mantiene las comprobaciones de títulos, descripciones, canonical, metadatos sociales, JSON-LD, encabezados, alternativas y dimensiones de imágenes, fragmentos, sitemap, PDF y separación del CSS.

## Pruebas de edición y restauración

Se ejecutaron sobre el servidor de desarrollo, usando copias originales en memoria y restauración en bloques `finally`:

1. Se cambiaron temporalmente `title`, `description`, `heroTitle`, `heroDescription` y `heroImage` de `investigacion.md`. Se comprobó la actualización de `/oferta-educativa/investigacion/`, el título del documento, descripción, Open Graph, encabezado, introducción e imagen.
2. Se añadió temporalmente un párrafo Markdown a `tecnologia-en-las-aulas.md`. Se comprobó que se renderizaba dentro del artículo existente.
3. Se cambió temporalmente esa noticia a `draft: true`. Desapareció del archivo de noticias, destacados del inicio, sitemap y ruta pública; esta última devolvió 404.
4. Se restauró `draft: false` y el artículo volvió a responder correctamente con su contenido original.
5. Se cambió temporalmente el lema compartido en `contacto.md` y se comprobó su actualización en el pie del inicio.

Todos los contenidos originales quedaron restaurados. La revisión posterior confirmó la ausencia de frases de prueba y borradores temporales en `src/content/`. No se crearon publicaciones ficticias ni fixtures dentro de las colecciones.

## Conservación visual y rutas

- Se guardó fuera del repositorio una copia del código y build anteriores a la migración.
- Se compararon las 27 rutas generadas: se conservan los mismos destinos públicos.
- La comparación del DOM de producción no encontró cambios de elementos, atributos o texto, normalizando espacios y excluyendo el orden de agrupación del CSS generado por el bundler.
- Los archivos fuente de CSS, scripts de navegador, assets y `package.json` son idénticos a la copia anterior a la migración.
- En Chromium se compararon las posiciones y dimensiones de los elementos de `main` en 81 vistas: 27 rutas a 390 × 900, 768 × 900 y 1440 × 900. Se confirmó la equivalencia tras completar la carga de imágenes; una diferencia transitoria inferior a un píxel en Espacios desapareció al repetir la lectura.
- No se detectaron desbordamientos horizontales ni imágenes completadas con error de carga. Se inspeccionó visualmente el hero y collage de Inicio.
- El filtro «Tecnología» de noticias muestra una publicación y actualiza el anuncio accesible. No se registraron errores de consola en esa comprobación.
- Se conservaron las nueve descargas PDF y el video institucional, sin duplicar ni sustituir recursos.

## Limpieza y límites

Se retiraron `src/data/education.ts`, `institution.ts`, `news.ts` y `documents.ts`; no quedan imports hacia esos módulos. El contenido editorial de las secciones está en los Markdown. Permanecen en Astro los textos de interfaz, como navegación, accesibilidad, 404, «PDF», «Consultar comunicado original» y «Volver a la actualidad».

Los schemas vacíos de eventos y reconocimientos producen avisos informativos del loader porque todavía no hay Markdown en esas carpetas. Es el estado solicitado, no un fallo del build.

No están instalados `typescript` ni `@astrojs/check`: no se ejecutó una comprobación semántica completa de TypeScript. El parser, `node --check`, la generación de tipos y el build no la sustituyen. No se instalaron dependencias para realizar estas verificaciones.

La validación visual cubre Chromium en los tamaños indicados; no certifica todos los navegadores ni dispositivos físicos. Se mantienen las revisiones institucionales y de servicios externos descritas en [QA anterior](QA.md). No hay errores de compilación, rutas, colecciones o recursos conocidos en las comprobaciones finales.
