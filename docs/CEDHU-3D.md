# Integración de la maqueta CEDHU

## Recorte móvil contra los bordes de pantalla — 25 de septiembre de 2026

El corte anterior era el límite de dibujo del propio canvas: su ancho CSS
coincidía con el `.container` de la sección (335, 350 y 390 px en pantallas
de 375, 390 y 430 px). No existía un `overflow: hidden/clip` en ese contenedor
que bastara con retirar. WebGL no puede dibujar fuera de su canvas.

Se separó una sección exterior `.campus-model-section.section` del grid
interior `.campus-model.container`. El contenedor conserva exactamente sus
medidas, gutters, textos, pie de figura y altura del botón. Solo en pantallas
táctiles menores de 48rem, `.cedhu-3d__visual` extiende sus dos lados por el
valor de `--gutter`, y `overflow-x: clip` se aplica a la sección exterior,
que ocupa el ancho disponible del viewport. No se añadió overflow global
ni se introdujo un contenedor desplazable.

El canvas y el póster siguen siendo transparentes; el póster conserva su
encaje mediante `object-fit: contain`. No se añadió fondo, borde o máscara
visible. El canvas acepta eventos en la zona lateral expuesta y el controlador
del recorrido usa sus límites para validar el fin de un tap táctil; el umbral
de arrastre y el cálculo del giro siguen usando la referencia anterior.

### Conservación del encuadre y presupuesto de render

El botón original sigue siendo la referencia para `entryZoom`, `setSize` y
la reserva de píxeles. El DPR del renderer sigue limitado a 2. Para revelar
los laterales sin estirar el edificio ni cambiar su tamaño, solo se amplían
los límites horizontales de la cámara ortográfica según el ancho visual del
canvas. Posición, objetivo, zoom, frustum vertical y animación no cambian.

| Pantalla | Canvas CSS anterior → actual | Buffer anterior = actual | scrollWidth = clientWidth |
| --- | --- | --- | --- |
| 375 px | 335 × 268 → 375 × 268 | 670 × 536 | 375 = 375 |
| 390 px | 350 × 280 → 390 × 280 | 700 × 560 | 390 = 390 |
| 430 px | 390 × 312 → 430 × 312 | 780 × 624 | 430 = 430 |

Se conserva el número de píxeles solicitado, no se incrementa al hacer
full-bleed. Como consecuencia, esos mismos píxeles cubren un campo horizontal
mayor: la densidad horizontal efectiva es aproximadamente 1,79–1,81 muestras
por píxel CSS, aunque el DPR configurado permanece en 2; la vertical sigue
en 2. Esta distinción evita afirmar que un buffer idéntico y más ancho visual
tienen simultáneamente la misma densidad horizontal. El tamaño y las
proporciones proyectadas del modelo sí permanecen iguales.

### Validación

- Comparación antes/después a 375, 390, 430 y 1440 px, en tres posiciones de
  scroll: mismas coordenadas y dimensiones de todos los textos, mismo zoom,
  giro, escala proyectada horizontal/vertical y buffer. Escritorio también
  conserva el rectángulo original del canvas.
- En móvil, canvas desde x = 0 hasta x = ancho del viewport; revisión visual
  de acercamiento y encaje, con continuidad del fondo de la página.
- Seis combinaciones de 375/390/430 px con DPR 2/3: 726 lecturas durante
  barridos de scroll, sin overflow, desplazamiento horizontal ni cambios de
  buffer. Tanto `body.scrollWidth` como `documentElement.scrollWidth`
  coincidieron con `documentElement.clientWidth`.
- Taps a x = 5 y x = ancho − 5 abren el recorrido en las seis combinaciones;
  cierre correcto y ausencia de overflow también con el diálogo abierto.
- Gestos de ±4°, scroll vertical, mouse/hover de escritorio, resize y cambios
  de orientación, pausa en reposo/fuera de pantalla, movimiento reducido,
  desmontaje y recuperación de contexto WebGL: correctos.
- Barrido adicional de seis segundos a 375 px/DPR 3: aproximadamente 60 FPS
  en el equipo, 361 lecturas sin overflow ni cambios del buffer. Se conserva
  el render bajo demanda y no se añaden cálculos al listener de scroll.
- `npm run build`: correcto, 27 páginas. `npm run check:site`: correcto,
  3.916 referencias y 9 PDFs. `git diff --check`: correcto. Avisos existentes
  por colecciones vacías y tamaño del módulo diferido, sin ocultarlos.

Archivos modificados: `CampusModel.astro`, `campus-model.css`,
`cedhu-3d-scene.ts`, `campus-tour.ts` y este informe. GLB, dependencias,
zoom y curva de animación intactos. Pruebas realizadas en Chromium con
emulación móvil; no en Safari/iPhone físico.

## Acercamiento móvil con scroll — 25 de septiembre de 2026

Se añadió exclusivamente a la cámara ortográfica un zoom de entrada que
regresa a 1 al avanzar el scroll. La geometría sobrepasa lateralmente el
encuadre inicial y WebGL recorta ese exceso, como una vista tipo cover.
El canvas no sale físicamente de su caja: no se amplía un bitmap mediante
CSS ni se ensancha el DOM. No fue necesario añadir `overflow-x: clip` ni
modificar wrappers, estilos globales, textos o navegación.

El efecto requiere puntero táctil, ausencia de puntero fino, ancho inferior
a 48rem y movimiento permitido. Escritorio y movimiento reducido mantienen
zoom 1. La rotación sigue perteneciendo a `interactionPivot`, mientras que
el acercamiento pertenece a `camera.zoom`; ambas operaciones se componen en
el mismo render. Se conservan los aportes originales de scroll y touch,
cada uno limitado a ±4°, incluido su suavizado y retorno táctil.

### Progreso y encaje

- Se reutiliza el progreso del visor, no el del texto que lo precede:
  `p = clamp((altoViewport - topVisor) / (altoViewport + altoVisor), 0, 1)`.
- Se mantiene el acercamiento hasta `p = 0,20`. Entre 0,20 y 0,65 se aplica
  `t = clamp((p - 0,20) / 0,45, 0, 1)` y la curva `t² × (3 - 2t)`.
- El zoom objetivo interpola entre el acercamiento inicial y 1. El encaje
  termina mientras el modelo todavía está visible; al subir se invierte.
- El zoom inicial se calcula al redimensionar, según el ancho CSS del canvas:
  `1,16 + 0,06 × clamp((ancho - 280) / 110, 0, 1)`.
- El mismo `requestAnimationFrame` aplica amortiguación exponencial de 12/s.
  El listener de scroll solo despierta el ciclo. La geometría del visor se
  consulta una vez por frame y se comparte entre giro y zoom. El ciclo se
  detiene cuando ambos se estabilizan.

| Viewport vertical | Zoom inicial → final | Buffer con pantalla DPR 2 o 3 |
| --- | --- | --- |
| 320 px (prueba adicional DPR 3) | 1,16 → 1 | 560 × 448 |
| 375 px | 1,19 → 1 | 670 × 536 |
| 390 px | 1,198 → 1 | 700 × 560 |
| 430 px | 1,22 → 1 | 780 × 624 |

Se inspeccionaron capturas de entrada, transición y encaje. El recorte se
limita a los extremos laterales, conservando la cancha y la mayor parte de
las fachadas; el encuadre final recupera toda la maqueta. El DPR efectivo
sigue limitado a 2 y las dimensiones del canvas no cambian al hacer zoom.

### Validación de este cambio

Pruebas en Chrome/Chromium sobre Windows, usando Playwright disponible en
el entorno e instrumentación temporal externa al proyecto:

- Seis combinaciones: 375, 390 y 430 px con pantalla DPR 2 y 3. Se muestrearon
  seis posiciones de scroll por combinación: zoom decreciente y giro
  simultáneo, encaje final en 1, ancho de texto constante, buffer constante
  y cero reasignaciones width/height durante el scroll.
- Prueba adicional a 320 px/DPR 3: acercamiento limitado a 1,16, encaje en 1,
  buffer constante y ancho de documento/cuerpo de 320 px.
- Tanto `document.body.scrollWidth` como `document.documentElement.scrollWidth`
  permanecieron en 375, 390 o 430 respectivamente, igual que antes de cargar
  la maqueta. Intentar desplazar horizontalmente la página mantuvo `scrollX = 0`.
- Barrido continuo de seis segundos a 375 px/DPR 3: 361 comprobaciones,
  ninguna con overflow ni cambio de buffer; aproximadamente 60 FPS en la GPU
  del equipo. Terminó con zoom 1. Los conteos de recursos permanecieron en
  19 geometrías y 2 texturas durante las pruebas móviles.
- Gestos táctiles nativos simulados: aportes de +4° y −4°, retorno al soltar,
  scroll vertical sin activar el recorrido, tap para abrir y cierre funcional.
- Resize y cambios entre vertical y horizontal (844 y 932 px), incluido resize
  con el recorrido abierto; seguimiento de mouse y hover de escritorio a
  1440 px, con comprobaciones adicionales de resize a 768, 1280 y 1920 px.
- Recuperación de contexto WebGL, también estando acercado; pausa fuera de
  pantalla, en reposo y durante el recorrido. Se conserva el desmontaje.
- Activar movimiento reducido del sistema o del sitio estando acercado
  devuelve zoom y giro a su estado neutro; restablecerlo recupera el efecto.
- `npm run build`: correcto, 27 páginas; `npm run check:site`: correcto,
  3.916 referencias y 9 PDFs; `git diff --check`: correcto. Persisten los
  avisos previos de colecciones vacías y tamaño del módulo diferido.

Archivos modificados: `src/scripts/animations/cedhu-3d-scene.ts` y este
documento. No se añadieron dependencias ni se alteraron GLB, CSS o Astro.
Estas pruebas emulan dispositivos móviles; no certifican Safari/iOS ni el
rendimiento térmico de un teléfono físico. Los apartados siguientes conservan
las verificaciones e implementaciones anteriores.

## Nitidez Retina y pruebas móviles — 25 de septiembre de 2026

### Diagnóstico y corrección

La pérdida general de nitidez provenía del límite `fine.matches ? 1.5 : 1`
en `renderer.setPixelRatio()`: los dispositivos táctiles con DPR 3 recibían
un framebuffer a DPR 1. El navegador ampliaba ese render para mostrarlo en
la pantalla Retina. Se confirmó leyendo tanto los atributos del canvas como
`gl.drawingBufferWidth/Height`, y comparando capturas antes y después.

El antialiasing ya estaba solicitado y el contexto de prueba confirmó cuatro
muestras. La cámara ortográfica conserva su encuadre y proporción. No había
un filtro de desenfoque permanente ni una ampliación CSS en móvil: el blur
solo aparece al abrir el recorrido. Las escalas de hover (1,025) y recorrido
(1,06) se conservan, pero ahora se mide la caja CSS sin esas transformaciones
para que un resize durante el efecto no altere la resolución base.

El GLB actual contiene 19 mallas, 15.614 triángulos y una textura PNG de logos
de 768 × 355. Usa magnificación lineal, minificación trilineal con mipmaps,
clamp-to-edge y anisotropía 1. Las fachadas y aristas también estaban borrosas
aunque no dependen de esa textura. Las capturas con el mismo GLB y DPR 2
confirman que no era necesario sustituirlo, comprimirlo ni cambiar sus filtros.
Los logos pequeños siguen limitados por su tamaño proyectado en pantalla.

Cambios exclusivamente en `src/scripts/animations/cedhu-3d-scene.ts` y este
documento:

- DPR máximo 2 sin puntero fino; se conserva el máximo 1,5 de escritorio.
- `setSize(..., false)` conserva el control del tamaño visual en CSS.
- Medición del tamaño CSS sin transformaciones y observación directa del
  canvas mediante `ResizeObserver`; se mantienen resize, pageshow y
  restauración del contexto.
- No se reasigna el tamaño del framebuffer si sus dimensiones ya coinciden.
- Liberación de las texturas del modelo, deduplicadas, y cierre de sus
  `ImageBitmap` al desmontar. El comentario anterior sobre ausencia de
  texturas correspondía al GLB original y ya no era válido.

No se modificaron Astro, CSS, el GLB, las texturas, las dependencias ni las
rutinas de mouse, scroll, touch, activación del recorrido o movimiento reducido.

### Resoluciones medidas

Chrome/Chromium en Windows con emulación táctil y DPR de pantalla 3:

| Viewport CSS | Canvas CSS aproximado | Buffer anterior | Buffer corregido |
| --- | --- | --- | --- |
| 390 × 844, vertical | 350 × 280 | 350 × 280 | 700 × 560 |
| 430 × 932, vertical | 390 × 312 | 390 × 312 | 780 × 624 |
| 844 × 390, horizontal | 440,5 × 352,4 | No medido | 881 × 704 |
| 932 × 430, horizontal | 486,6 × 389,3 | No medido | 973 × 778 |

En escritorio, viewport 1440 × 900 con DPR de pantalla 2: buffer 1101 × 881
tanto antes como después (DPR efectivo 1,5). Los tamaños CSS fraccionarios
se convierten a píxeles internos enteros mediante redondeo hacia abajo.

### Pruebas realizadas

Se usó Playwright ya disponible en el entorno, sin instalar herramientas.
La instrumentación temporal se añadió a la respuesta del módulo servido en
desarrollo, no al código entregado. Las capturas se hicieron con la misma
cámara, el mismo GLB y DPR de pantalla 3 para comparar visualmente.

- Inspección visual de 390 y 430 px: bordes del edificio, ventanas, fachadas,
  líneas de cancha y logos considerablemente más definidos.
- Nueve tamaños/orientaciones móviles sucesivos, regresando a vertical:
  buffer y tamaño CSS coherentes; sin desbordamiento horizontal.
- Escritorio a 768, 1280, 1440 y 1920 px, incluidos resize con recorrido
  abierto, seguimiento del mouse y escala visual de hover.
- Gestos táctiles enviados por el navegador: giro medido de +4° y −4°,
  retorno al soltar, scroll que modifica la orientación y swipe vertical
  que desplaza la página sin abrir el recorrido.
- Tap/clic abre el diálogo y pausa el render; cerrar lo reanuda.
- Parada del render al estabilizarse y fuera de pantalla; movimiento reducido
  restablece el giro a cero.
- Veinte eventos de resize sin cambio de caja: cero escrituras en los
  atributos width/height del canvas.
- Pérdida/restauración real de contexto mediante `WEBGL_lose_context`:
  recuperación de `data-ready` y render funcional.
- Tres desmontajes y montajes: se emite una liberación por textura compartida,
  se cierra el bitmap y se liberan las 19 geometrías. El contador de texturas
  termina en 1, correspondiente a un recurso auxiliar del renderer; no se
  presenta ese contador como memoria GPU total ni como cero recursos WebGL.
- La compilación de producción, sin instrumentación, también carga el modelo
  a 390, 430 y 1440 px con las resoluciones esperadas.
- Sin errores JavaScript no capturados en las pruebas de interacción.
- `npm run build`: correcto, 27 páginas. `npm run check:site`: correcto,
  3.916 referencias locales y 9 PDFs. `git diff --check`: correcto.
  Permanecen los avisos existentes por colecciones vacías y módulo mayor
  de 500 kB. El build transpila TypeScript; no sustituye una revisión completa
  con `astro check`, que no está instalado en este proyecto.

### Rendimiento y límites de la validación

Con movimiento continuo durante cuatro segundos por escenario en la GPU
AMD Radeon del equipo Windows (ANGLE/D3D11), tanto antes como después se
midieron aproximadamente 60 FPS a 390, 430 y 1440 px. En móvil emulado el
percentil 95 del intervalo entre renders fue de 17,6–17,8 ms en ambas
versiones. No se observó caída relevante en ese equipo.

Una comparación adicional a 430 × 932, con seis segundos de movimiento y
consultas `EXT_disjoint_timer_query_webgl2` válidas, midió una mediana de
GPU de 0,95 ms con DPR 1 y 2,47 ms con DPR 2; percentiles 95 de 1,13 y
2,72 ms respectivamente (401 y 385 muestras incluyendo el asentamiento).
El coste GPU aumenta, aunque en este equipo sigue por debajo del presupuesto
de 16,7 ms de un frame a 60 Hz. Estas cifras no representan una GPU de iPhone.

Los cambios repetidos de orientación mantuvieron 19 geometrías y 2 texturas
registradas en móvil (4 en escritorio con sombras). Es un conteo de recursos,
no una medición de bytes de VRAM. DPR 2 cuadruplica los píxeles respecto a
DPR 1, pero utiliza un 56 % menos que DPR 3. Se conservan la carga diferida,
el render bajo demanda, la preferencia de bajo consumo y la ausencia de
pasada de sombras en táctiles.

No se dispuso de Safari/WebKit ni de un iPhone físico. La causa encontrada
se aplica a cualquier dispositivo táctil Retina y no demuestra un defecto
exclusivo de Safari. Falta validar en Safari/iOS real: giro con las barras del
navegador, nitidez, FPS sostenidos, temperatura, batería y memoria de GPU.
No se justifica por ahora reducir geometría o texturas ni añadir resolución
dinámica basándose únicamente en una GPU de escritorio.

Referencias: [dimensionado del renderer de Three.js](https://threejs.org/docs/pages/WebGLRenderer.html)
y [alcance de la emulación responsive de Safari](https://developer.apple.com/documentation/safari-developer-tools/responsive-design-mode).

Los apartados siguientes conservan el historial de integración; los límites
de DPR, la interacción y la liberación de texturas descritos arriba sustituyen
las condiciones de la integración original.

## Actualización de logos institucionales — 24 de septiembre de 2026

El recurso `public/models/cedhu/cedhu.glb` incorpora el logo oficial en ambas
fachadas, el círculo central de la cancha y los dos tableros existentes.
El póster de respaldo se actualizó con el mismo encuadre. Se conservan los
recursos anteriores en `assets/3d/cedhu/original/`, junto al nuevo editable y
exportación versionada en `assets/3d/cedhu/`.

El GLB nuevo pesa 889.256 bytes y contiene una textura PNG compartida,
19 mallas y 15.614 triángulos. Se verificó en el visor web existente. No se
modificaron archivos de Astro, CSS ni TypeScript, ni el comportamiento de
mouse, tacto o scroll. Las cifras de cero texturas de la integración original
documentada abajo describen la versión anterior.

Los detalles de ubicación, conservación y comprobación están en
`assets/3d/cedhu/README.md` y los informes y vistas en su carpeta `qa/`.

Integrada el 24 de septiembre de 2026 en el proyecto existente `cedhu-web-2027`.
La portada incorpora `CampusModel` inmediatamente después de `Hero`. El hero,
sus fotografías, textos y enlaces se conservan completos. Las rutas, el layout,
la navegación, el menú inferior, el logo, los tokens y los estilos globales no
fueron modificados.

## Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `src/pages/index.astro` | Importa y compone la sección después del hero. |
| `src/content/paginas/inicio.md` | Añade exclusivamente los textos de `campusModel`. |
| `src/schemas/page-sections.ts` | Valida los nuevos textos con el patrón existente de Content Collections. |
| `package.json` | Añade `three@0.186.0` y `@types/three@0.186.0` como dependencia de desarrollo. |
| `package-lock.json` | Registra estas dependencias y sus dependencias transitivas; no cambia las versiones de las dependencias que ya existían. |

## Archivos creados

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/common/Cedhu3D.astro` | Visor reutilizable: imagen accesible, respaldo y canvas. |
| `src/components/sections/CampusModel.astro` | Compone el visor con los textos editoriales de la portada. |
| `src/scripts/animations/cedhu-3d.ts` | Elemento personalizado, carga diferida por visibilidad y desmontaje. |
| `src/scripts/animations/cedhu-3d-scene.ts` | GLB, cámara, luces, renderizado e interacción. |
| `src/styles/components/cedhu-3d.css` | Tamaño estable, superposición del canvas y respaldo, impresión y transiciones. |
| `src/styles/components/campus-model.css` | Distribución responsive de la sección con los tokens existentes. |
| `public/models/cedhu/cedhu.glb` | Modelo original del ZIP, sin reexportarlo. |
| `public/models/cedhu/cedhu-poster.webp` | WebP transparente original del ZIP, renombrado. |
| `docs/CEDHU-3D.md` | Este registro. |

## Qué se recuperó del ZIP

- `cedhu-web/public/models/cedhu.glb`: 920.120 bytes, 17.960 triángulos,
  18 materiales y ninguna textura externa. Las cifras de triángulos proceden
  del informe del paquete; se comprobó además la estructura binaria GLB,
  su versión, longitud, materiales y ausencia de texturas.
- `cedhu-web/public/images/cedhu-hero.webp`: 93.450 bytes, 1600 × 1280.
- De `cedhu-web/src/components/CedhuHero.astro`: encuadre ortográfico, posición
  de cámara, iluminación, límites de giro y suavizado temporal. Se adaptó su
  comportamiento a archivos TypeScript independientes y su CSS a los tokens
  del sitio, sin copiar el componente completo.
- `LEEME.md`, `metricas.json` y `validacion-glb.json` se consultaron como
  documentación del recurso. Sus instrucciones no sustituyeron el pedido del
  usuario ni las reglas del proyecto.

## Qué no se incorporó

- La página `cedhu-web/src/pages/index.astro`, su diseño, textos, cabecera y pie.
- La configuración Astro, TypeScript, manifiesto y lockfile del ejemplo.
- El archivo Blender y los scripts Python de generación/exportación; no se
  ejecutaron. El archivo editable sigue disponible dentro del ZIP original.
- Los PNG de presentación y la vista frontal: el WebP ya cubre el respaldo.
- Los informes de validación y métricas como recursos públicos.

El ZIP se descomprimió en una carpeta temporal, fuera del repositorio. No se
creó un segundo sitio ni se publicó un despliegue.

## Uso y comportamiento

`Cedhu3D` requiere `label` y acepta `model` y `poster` opcionales. Sus rutas
predeterminadas respetan `import.meta.env.BASE_URL`. Se importa como componente
Astro normal, sin directivas de hidratación ni frameworks adicionales. Admite
varias instancias y desconexión/reconexión del elemento.

El controlador pequeño se carga con la portada. Three.js, GLTFLoader y el GLB
se solicitan al entrar el visor en pantalla. La imagen ocupa su espacio desde
el HTML inicial; permanece visible durante la carga, sin JavaScript o cuando
falla la descarga o WebGL. El canvas se revela tras el primer frame.

El cursor tiene un giro horizontal máximo de 0,1 radianes y una inclinación
máxima de 0,035 radianes, con suavizado independiente de la frecuencia de
pantalla. No hay giro automático. El renderizado se detiene al estabilizarse,
fuera de pantalla y con la pestaña oculta. El controlador aborta la descarga y
libera listeners, observadores, geometrías, materiales y renderer al retirarse.

La animación se desactiva con `prefers-reduced-motion`, con el atributo global
`data-motion="reduced"` del sitio y para punteros táctiles. No se bloquean
gestos de scroll. La densidad de render se limita a 1,5 para puntero fino y a 1
en dispositivos sin puntero fino; estos últimos se inicializan sin la pasada
adicional de sombras. En impresión se muestra la imagen estática.

El contrato del visor está pensado para esta maqueta sin texturas. Si se cambia
por un GLB con texturas, se debe ampliar su liberación de recursos y revisar el
encuadre. Referencia consultada: [GLTFLoader de Three.js](https://threejs.org/docs/pages/GLTFLoader.html).

## Verificación

- `npm run build`: correcto; 27 páginas generadas.
- `npm run check:site`: correcto; 3.912 referencias locales y 9 PDFs. Incluye
  metadatos, encabezados, alternativas de imagen y separación del CSS.
- Desarrollo ejecutado en `http://127.0.0.1:4323/`; compilación servida mediante
  `npm run preview -- --host 127.0.0.1 --port 4324`.
- Inspección visual en navegador a 320, 390, 768, 1440 y 1920 px: maqueta
  renderizada, sin desbordamiento horizontal y con navegación conservada.
- Comprobación del atributo `data-ready`, tamaño real del canvas y consola:
  carga 3D completada sin errores observados. El ajuste de movimiento del sitio
  se activó y restableció desde su interfaz.
- Pruebas temporales del controlador con APIs DOM/WebGL simuladas, sin instalar
  herramientas: suavizado y parada, movimiento reducido del sistema y del
  sitio, puntero táctil, límite de densidad, pausa por visibilidad, pérdida y
  restauración de contexto, limpieza y fallo HTTP. Estas pruebas no sustituyen
  mediciones en una GPU o un móvil físico.

La compilación informa un módulo diferido de 613.055 bytes (153.108 bytes al
comprimirlo con gzip en la comprobación local). Se mantiene visible el aviso
de tamaño de Vite; no se subió su umbral para ocultarlo. La compresión efectiva
de transferencia depende del alojamiento. El GLB y el respaldo se suman a ese
tamaño y no se cargan desde un CDN.

Continúan los avisos por las colecciones vacías `eventos` y `reconocimientos`.
El entorno usa Node 24.14.0 mientras el manifiesto existente declara
`^22.12.0`, por lo que npm avisa de esa diferencia. No se modificó ese requisito.
No hay una herramienta de comprobación completa de tipos instalada; el build
transpila TypeScript, pero no sustituye `tsc` o `astro check`. No se instalaron
herramientas de validación adicionales ni se hicieron pruebas en móviles físicos.
