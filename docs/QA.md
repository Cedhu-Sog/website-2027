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

## Seguimiento de la auditoría comercial y técnica — 29 de septiembre de 2026

### Cambios de esta revisión

- El cierre comercial existente incluye «Agenda una visita», con el SVG del sistema de iconos, hacia `site.whatsapp`. El texto explica que Admisiones coordina la visita y confirma disponibilidad; no confirma una reserva. Se conserva `/admisiones/` como acceso secundario. Hay un cierre por página, reutilizando las ubicaciones existentes, incluida la parte final de Inicio.
- Los cuatro accesos de Inicio se identifican como «Comunidad CEDHUISTA». Se conservan Q10, documentos y lúdicas; el cuarto lleva a la ruta existente de Servicios. Contacto sigue disponible en la navegación y el footer.
- Servicios conserva Q10, UNOi, el formulario de egresados, documentos, lúdicas y tesorería, con un índice de enlaces internos. No se añadieron servicios ni destinos externos. Los logos no se modificaron.
- Los textos secundarios revisados de comunidad, documentos, noticias, footer y preferencias usan el token de 15 px. El menú inferior usa 14 px y distribuye el ancho según sus etiquetas; permite ajustar las etiquetas con texto ampliado. Los enlaces del footer y del índice de Servicios tienen al menos 44 px de alto.
- Se conserva el foco visible de 3 px; los accesos de comunidad también se subrayan al recibir foco. Se ajustaron los márgenes de desplazamiento respecto a la navegación fija y se limitó la altura de los desplegables de escritorio para permitir su desplazamiento vertical.
- Se suprimen los desplazamientos de hover en botones, noticias y la ampliación visual de la maqueta cuando se solicita reducir movimiento. Se mantiene el comportamiento animado normal.
- El video conserva su archivo original y `preload="none"`. Ahora no tiene `src` hasta que se activa el recorrido; lo reutiliza en las reaperturas. Sus dimensiones originales de 848 × 480 reservan espacio antes de disponer de metadatos.

### Resultado técnico

- `npm run build`: correcto, 27 páginas. Conserva avisos de las colecciones vacías `eventos` y `reconocimientos`, y del chunk dinámico de Three.js (632.130 bytes, superior a 500 kB). No se ocultaron los avisos ni se añadieron contenidos de relleno.
- `npm run check:site`: correcto, 27 páginas, 3.978 referencias locales y 9 PDF. Comprueba rutas, fragmentos, un h1 y un main por página, IDs, alternativas y dimensiones de imágenes, metadatos y separación de estilos.
- `node --check src/scripts/interactions/campus-tour.ts` y `git diff --check`: correctos. La compilación Astro/TypeScript pasó; no hay `typescript`/`@astrojs/check` instalados para ejecutar una comprobación semántica completa de tipos. No se instalaron herramientas adicionales.
- Comprobación adicional del HTML compilado: el CTA coincide exactamente con el WhatsApp institucional y el video carece de `src` inicial y tiene dimensiones y `preload="none"`.
- Contrastes calculados con los tokens: texto secundario/fondo 5,72:1; texto secundario/tinte 5,20:1; texto de botón/verde 6,19:1; enlace oscuro/amarillo del CTA 7,86:1. Se evitó usar texto verde normal sobre amarillo (4,26:1).
- Las imágenes ya utilizan `Photo`/`astro:assets`, WebP, variantes responsivas, dimensiones intrínsecas y carga diferida cuando corresponde. Los logos de Servicios son de 300 × 200; no se alteraron ni se ampliaron artificialmente sus archivos.
- La tipografía utiliza una pila local del sistema: no hay solicitudes a proveedores de fuentes ni variantes remotas duplicadas.
- Se revisó el ciclo de vida de la maqueta: importación dinámica al entrar al viewport, un bucle de renderizado que termina al estabilizarse, pausa fuera de pantalla/con el modal abierto/página oculta y limpieza de observadores, listeners y recursos al desconectar. Estas optimizaciones ya existían y se conservaron. La implementación 3D no se importa desde Servicios, Admisiones ni Noticias.

### Comprobaciones en navegador

- Revisión de desbordamiento horizontal y de navegación superior en Inicio, Servicios, Documentos, Admisiones, Contacto, Noticias y Espacios: 360, 390, 430, 768, 1024, 1280, 1440 y 1920 px. Se incluyeron tablet vertical 768 × 1024 y horizontal 1024 × 768. Sin desbordamientos detectados.
- Inspección visual del CTA y de Servicios a 360 px, de Comunidad a 768 px y de la maqueta a 360 y 1440 px. CTA móvil de aproximadamente 50 px de alto; logos Q10/UNOi conservados.
- Teclado: Enter/Tab/Escape en el desplegable de escritorio y menú de tablet; apertura/cierre y contención de foco en «Más» móvil; retorno del foco al control de apertura; foco visible en comunidad y CTA.
- Recorrido: apertura con Enter, reproducción, Escape, pausa al cerrar, retorno del foco y reapertura. También se comprobó reproducción efectiva en el build servido por `astro preview`. La maqueta renderiza en los anchos móvil y escritorio.
- Preferencia «Reducir movimiento»: desplazamiento automático sin animación, transiciones de 0 s, transformaciones desactivadas en la maqueta y apertura del diálogo sin animación. La reproducción voluntaria del video permanece disponible.

### Límites y decisiones de alcance

- El navegador de pruebas conserva un puntero de mouse al cambiar el viewport. La validación física de mouse, gestos táctiles y rotación/zoom por scroll en móvil, así como Safari/iOS, Android y lectores de pantalla, debe completarse en esos entornos. Se revisó y conservó la lógica de interacción existente; no se presenta la revisión responsive como una prueba táctil real.
- No se enviaron WhatsApp, formularios, solicitudes de admisión ni pagos; no se iniciaron sesiones en plataformas. Se conservaron las URLs oficiales ya presentes. Su operación autenticada no queda certificada por estas pruebas.
- No se modificaron Hero, «¿Por qué elegir el CEDHU?», evidencia, la estructura de Espacios, la composición/archivo 3D ni el archivo de video. La galería de la página Espacios conserva el salto de h1 a h3 existente, pendiente de una revisión semántica autorizada de esa sección protegida.
- Subtítulos, transcripción y accesibilidad del contenido audiovisual/PDF necesitan materiales y revisión institucional; no se inventaron alternativas ni se editaron esos archivos.
- No se incorporaron calendario, testimonios, analítica, tracking ni nuevas dependencias.

### Archivos modificados

| Responsabilidad | Archivos |
| --- | --- |
| CTA y comunidad | `src/components/sections/AdmissionsCTA.astro`, `src/components/sections/QuickAccess.astro`, `src/components/sections/Services.astro` |
| Iconografía y video | `src/components/common/Icon.astro`, `src/components/common/Cedhu3D.astro`, `src/scripts/interactions/campus-tour.ts` |
| Contenidos | `src/content/paginas/admisiones.md`, `src/content/paginas/inicio.md` (solo `quickAccess`), `src/content/paginas/servicios-en-linea.md` |
| Estilos de componentes | `src/styles/components/accessibility.css`, `src/styles/components/admissions-cta.css`, `src/styles/components/bottom-nav.css`, `src/styles/components/cedhu-3d.css`, `src/styles/components/footer.css`, `src/styles/components/header.css`, `src/styles/components/news.css`, `src/styles/components/quick-access.css`, `src/styles/components/resources.css`, `src/styles/components/ui.css` |
| Estilos compartidos | `src/styles/global.css`, `src/styles/tokens.css` |
| Registro de pruebas | `docs/QA.md` |
