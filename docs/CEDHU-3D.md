# Integración de la maqueta CEDHU

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
