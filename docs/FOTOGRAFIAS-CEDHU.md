# Selección editorial de fotografías del CEDHU

## Resultado

- Lote original: 582 archivos. Se revisaron visualmente 570 fotografías mediante hojas de contacto y se ampliaron las finalistas. Un JPEG adicional con un nombre excesivamente largo no pudo abrirse en Sharp; se dejó intacto. Los demás archivos incluyen vídeos.
- Se seleccionaron **7 fotografías**. Sus versiones renombradas y optimizadas están en `src/assets/fotos-cedhu/`.
- Permanecen **575 archivos sin usar, intactos** en `public/images/`, con sus nombres y estructura originales. Se comprobó su contenido mediante SHA-256 contra el inventario previo.
- Las siete seleccionadas pasaron de 15.05 MiB a 1.72 MiB en los archivos fuente WebP (88.6 % menos). El navegador recibe variantes aún menores cuando corresponde.
- La foto pequeña rotada del hero sigue siendo la original `src/assets/images/inicial.jpg`. Se conserva su enlace a Inicial y ahora permanece visible también en móvil.

## Fotografías utilizadas

| WebP en src/assets/fotos-cedhu | Clave en media.ts | Dimensiones | Peso | Uso editorial |
| --- | --- | --- | --- | --- |
| aprendizaje-en-el-aula.webp | aulaCedhu | 1600 × 1200 | 276 KiB | Collage de inicio y hero de Educación y Bachillerato |
| lectura-en-primaria.webp | lecturaCedhu | 1600 × 1200 | 146 KiB | Hero de Primaria |
| instalaciones-vista-aerea.webp | instalacionesCedhu | 1600 × 900 | 304 KiB | Collage de inicio; heros de Nosotros, Espacios, Historia y Contacto |
| encuentro-musical-comunidad.webp | comunidadCedhu | 1600 × 1200 | 207 KiB | Hero de Actualidad y Formación integral |
| reconocimiento-institucional.webp | encuentroCedhu | 1600 × 1200 | 398 KiB | Hero de Equipo institucional |
| convivencia-juego-respeto.webp | convivenciaCedhu | 1280 × 960 | 141 KiB | Collage de inicio; heros de Lúdicas, Identidad y Pedagogía de la Felicidad |
| feria-cientifica-experimentacion.webp | cienciaCedhu | 1600 × 1200 | 292 KiB | Hero de Investigación y Ciencia y tecnología |

## Procedencia exacta

Las siguientes rutas eran relativas a `public/images/`. Solo estos originales se retiraron de esa carpeta tras comprobar sus versiones WebP.

- **aprendizaje-en-el-aula.webp** ← `EDUCANDO ESTUDIANDO/IMG_8033.JPG`
- **lectura-en-primaria.webp** ← `EDUCANDO ESTUDIANDO/IMG_8037.JPEG`
- **instalaciones-vista-aerea.webp** ← `INSTALACIONES CEDHU/DJI_0018.JPG`
- **encuentro-musical-comunidad.webp** ← `Izada 7 Agosto prim y bach/IMG_4488.jpg`
- **reconocimiento-institucional.webp** ← `Izada 7 Agosto prim y bach/IMG_4539.JPG`
- **convivencia-juego-respeto.webp** ← `PROYECTOS TRANSVERSALES/1 EDUCACION SALUD SEXUAL Y CIUDADANIA, ESTILOS DE VIDA SALUDABLE Y TIEMPO LIBRE/Convivencia 7/WhatsApp Image 2026-03-13 at 12.32.01 PM.jpeg`
- **feria-cientifica-experimentacion.webp** ← `PROYECTOS TRANSVERSALES/1 EDUCACION SALUD SEXUAL Y CIUDADANIA, ESTILOS DE VIDA SALUDABLE Y TIEMPO LIBRE/Feria Científica/WhatsApp Image 2026-06-25 at 9.51.32 AM (4).jpeg`

Los originales seleccionados también se conservaron como respaldo temporal en `%TEMP%/cedhu-editorial/originales-seleccionados/`; no forman parte del sitio ni sustituyen una copia de conservación permanente.

## Criterio visual y rendimiento

El aula es la pieza dominante del collage. La vista aérea sitúa al visitante en el colegio; el juego de tarjetas sobre el respeto aporta actividad lúdica y convivencia. Las piezas de apoyo son menores, con recortes moderados y pies breves.

La interpretación musical aporta comunidad a Actualidad; el reconocimiento institucional acompaña Equipo; la experimentación de la feria científica acompaña Ciencia e Investigación. La vista aérea en Historia está identificada como una vista actual, no como fotografía histórica.

Se conservaron fotografías oficiales ya existentes cuando eran más pertinentes: Inicial, Inglés, Robótica, familias en Admisiones y Documentos, y el proyecto con computador en Servicios. No se añadieron fotografías genéricas. Las noticias individuales mantienen sus materiales y contexto originales.

Los archivos nuevos se orientaron según EXIF, se limitaron a 1600 px sin ampliar los pequeños y se codificaron en WebP con calidad 86. Astro genera variantes WebP a calidad 82 con `srcset`, `sizes` y dimensiones intrínsecas. Solo la imagen principal de cada hero usa prioridad alta; las fotografías secundarias y galerías usan carga diferida. La foto flotante genera variantes pequeñas de 160, 240 y 400 px. El límite general de generación es 1600 px. No se añadió ninguna dependencia.

Las fotos restantes no están referenciadas por los nuevos componentes y no se descargan al visitar las páginas. **Astro copia todo `public/` al build**: el lote sin usar seguirá formando parte de los archivos estáticos hasta que se revise y se retire manualmente, conforme a lo solicitado.

Para incorporar nuevos proyectos, consultar [INVESTIGACION.md](INVESTIGACION.md).
