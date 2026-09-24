# Integración de la maqueta CEDHU

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
