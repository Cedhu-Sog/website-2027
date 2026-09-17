# Revisión de la primera versión

Fecha: 7 de septiembre de 2026. Entorno: Windows, Node 24.14.0, Astro 7.2.3, navegador Chromium integrado. El sitio se revisó en desarrollo y sobre el HTML estático generado. No se publicó en el dominio institucional.

## Estado al retomar

Ya estaban implementadas la Home, las páginas institucionales, siete páginas educativas, admisiones, lúdicas, servicios, documentos, contacto, cuatro artículos, navegación y SEO. También estaban migrados los recursos oficiales y existía el comprobador estático. Quedaban la verificación completa de teclado, preferencias, tablet, servicios externos, documentación y la validación de los últimos cambios.

Se inspeccionaron los cambios existentes antes de continuar. Se conservaron la implementación y los documentos previos del proyecto; no se reinició el sitio ni se añadieron dependencias.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | Correcto: 26 páginas HTML y 60 variantes de imágenes optimizadas |
| `npm run check:site` | Correcto: 26 páginas, 1.856 referencias locales y 9 PDF |
| `node --check` en los archivos `.ts` y `.mjs` de `src/` y `scripts/` | Sintaxis correcta en 12 archivos; no equivale a typecheck |
| `git diff --check` | Sin errores de espacios; Git avisó únicamente de normalización CRLF/LF del README |
| Dependencias | Astro 7.2.3 instalado; no se modificó el lockfile ni se instalaron herramientas |
| Lint / typecheck completo | No ejecutados: no hay scripts ni herramientas instaladas. Astro Check requiere `@astrojs/check` y `typescript`; ESLint tampoco está disponible |

El comprobador estático verifica destinos locales y fragmentos entre páginas, títulos únicos, descripción y canonical, metadatos de compartición, un `h1` y un `main` por página, IDs únicos, idioma, alternativas y dimensiones de imágenes, JSON-LD válido, sitemap, cabeceras de los PDF y ausencia de estilos dentro del marcado Astro. No es una auditoría completa WCAG ni comprueba la operación interna de servicios externos.

## Navegador y responsive

- Las 26 páginas se visitaron a 390 × 844, 768 × 1024 y 1440 × 900 px sobre el build final: 78 comprobaciones, sin desbordamiento horizontal, encabezados primarios ausentes o imágenes completas con error de carga.
- Se revisaron capturas de Home y páginas internas, incluyendo páginas completas de Inicio, Espacios y Servicios y los diferentes formatos de educación, noticias, documentos y contacto.
- Se recorrieron además las 26 rutas a 320 × 740 px con las cuatro preferencias de accesibilidad activadas, incluido texto al 120 %. Se corrigió el ancho mínimo de las rejillas de Inicio y PageHero; la repetición no detectó desbordamientos.
- Se ajustó la partición automática de palabras en títulos únicamente para pantallas pequeñas. No se recorta el contenido para ocultar desbordamientos.
- El mapa de Contacto carga, muestra CEDHU y permite alcanzar su enlace mediante el teclado.
- No se detectaron errores ni advertencias de consola en las comprobaciones locales registradas.

## Interacciones verificadas

- Menú de escritorio con Enter, Tab hacia el primer enlace, foco visible y cierre con Escape que devuelve el foco al control.
- Menú móvil con Enter, expansión de Educación, navegación a Robótica y cierre con Escape.
- Enlace «Saltar al contenido»: desplaza y enfoca `main#contenido`.
- Preguntas frecuentes: apertura con Enter y cierre con Espacio.
- Filtros de noticias: las cuatro categorías muestran una publicación cada una; «Todas» muestra cuatro. Se verificaron activación con Espacio, `aria-pressed` y anuncio de resultados.
- Preferencias de texto ampliado, contraste, enlaces subrayados y movimiento reducido: aplicación, persistencia al cambiar de página y restablecimiento. El tamaño ampliado calculado es 19,2 px frente a 16 px de base.
- El build de producción conserva el comportamiento del filtro; las páginas se sirven con los recursos compilados.

## Servicios externos

No se introdujeron datos personales, enviaron formularios, iniciaron sesiones ni realizaron pagos.

| Destino | Comprobación y alcance |
| --- | --- |
| Preinscripción Q10 | HTTP 200 y revisión en navegador. «Iniciar preinscripción» abre el diálogo de tipo y número de identificación; no se avanzó con datos |
| Portal académico Q10 | Enlace oficial accesible, HTTP 200. Operación posterior al acceso pendiente de una cuenta institucional |
| UNOi y portal de compra de textos | HTTP 200. No se probaron cuentas ni transacciones |
| Cuatro formularios de lúdicas | HTTP 200 y títulos consultados: corresponden a 2026; primero a quinto indica segundo semestre. La interfaz conserva esa vigencia |
| Formulario de egresados | Redirige al acceso de Google. Se añadió la necesidad de una cuenta junto al enlace. El contenido posterior al acceso requiere revisión del CEDHU |
| Documentos | Nueve archivos PDF oficiales conservados localmente y enlazados desde el HTML generado |
| Recorrido institucional | MP4 oficial conservado localmente; enlace a un recurso bajo demanda, sin reproducción automática en la página |
| Correo, teléfonos, WhatsApp y redes | Destinos comparados con los publicados por CEDHU. No se enviaron mensajes ni se efectuaron llamadas |

## Revisión manual pendiente

1. CEDHU debe confirmar los datos y documentos de 2027 descritos en [Fuentes](CONTENT-SOURCES.md). Los contenidos de 2026 no se presentan como una convocatoria confirmada de 2027.
2. Probar el proceso completo de los portales con cuentas autorizadas y un procedimiento de prueba acordado por la institución; confirmar los permisos del formulario de egresados.
3. Revisar en dispositivos físicos iOS/Android y en Safari/Firefox, y realizar una lectura con NVDA o VoiceOver. Las pruebas realizadas cubren Chromium con viewport responsive y teclado; no certifican esos otros entornos.
4. Validar la accesibilidad de los PDF oficiales y, si procede, disponer de versiones etiquetadas y alternativas accesibles del video institucional. Sus contenidos originales no se editaron.
5. Tras el despliegue, comprobar HTTPS, ruta 404, caché, sitemap, enlaces externos y rendimiento con la red y el alojamiento definitivos.

No quedan errores críticos conocidos en las comprobaciones realizadas. La aprobación editorial y las pruebas autenticadas siguen correspondiendo al equipo del CEDHU.
