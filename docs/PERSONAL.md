# Personal institucional

El directorio amplía la ruta existente `/nosotros/equipo/`, enlazada desde Nosotros. Conserva el layout, hero, navegación y llamadas institucionales. No genera rutas individuales.

## Edición

- `src/content/personal.json`: fuente editorial de los 64 registros (63 personas; Yadira Africano figura en coordinación y docencia). Los textos, cargos, horarios y responsabilidades proceden del listado proporcionado para esta implementación, no del sitio anterior.
- La colección `personal` utiliza `file()` e `image()` en `src/content.config.ts`. Astro valida campos, categorías, áreas docentes e imágenes locales durante el build.
- `personId` identifica a una persona; `id` distingue sus funciones. Reutilizar `photo` cuando la misma persona aparece en varias categorías. `order` conserva el orden editorial.
- `role` es el cargo, área o curso visible. Los campos opcionales `description`, `officeHours`, `assignments`, `groupLeadership`, `research` y `responsibilities` contienen los detalles. Omitir los campos no proporcionados; no agregar horarios inferidos. Cada asignatura lleva `subject` y `grades`.
- `src/data/personal.ts`: orden y etiquetas de categorías y áreas. `src/lib/personal.ts`: consulta tipada, agrupación y validación de la fotografía compartida.
- `src/content/paginas/equipo.md`: mantiene únicamente los textos editoriales de la página y la sección de contacto; el antiguo arreglo de tres directivas se sustituyó por la colección completa.

## Imágenes

La página `https://cedhu.edu.co/nosotros/` se utilizó exclusivamente para asociar nombres e imágenes. La auditoría de cada registro está en `PERSONAL-FOTOGRAFIAS.json`: nombre visible en la fuente, URL observada, archivo local y SHA-256 del original comprobado.

Se recuperaron 62 retratos únicos. Las tres imágenes de las directivas ya existían en `src/assets/images/` y coinciden exactamente con los originales (SHA-256); se reutilizan. Los otros 59 archivos están en `src/assets/fotos-cedhu/personal/`. Gladys Yadira Africano y Yadira Africano usan el mismo archivo.

La URL publicada de Jorge Fabio Rusinque Bustos devuelve HTTP 404. Su registro usa el logo local existente y `photoUnavailable: true`. Al obtener su retrato confirmado, actualizar `photo`, retirar esta propiedad y actualizar la auditoría. No asociar otro retrato por semejanza del nombre de archivo.

`StaffCard.astro` reutiliza `Photo.astro`, que importa `Image` de `astro:assets`. Genera WebP con `srcset`, limita los tamaños a la resolución original, incluye dimensiones y carga diferida. La fotografía usa proporción cuadrada, `object-fit: cover` y alineación superior; el logo utiliza `contain`.

## Presentación y accesibilidad

- `StaffSection.astro` agrupa las tarjetas por categoría y, para docentes, por área. Las fotografías, nombres y cargos están en el HTML estático.
- La cuadrícula consulta el ancho real del contenedor. Reserva al menos 16rem por tarjeta y el espaciado existente de 1.5rem: dos columnas desde 33.5rem, tres desde 51rem y cuatro desde 68.5rem. Nunca supera cuatro columnas y se adapta al tamaño de texto preferido.
- `StaffCard.astro` presenta los detalles con un botón y un `dialog` nativo. `staff-dialog.ts` mueve el contenido ya renderizado al diálogo, enfoca su título, restaura el foco al botón y mantiene `aria-expanded`. Escape, botón de cierre y clic en el fondo permiten cerrar; el modal contiene el foco y bloquea el desplazamiento del documento.
- Sin JavaScript, los detalles nativos de cada tarjeta permiten consultar la misma información. No hay duplicación de datos, tarjetas giratorias ni dependencias de interfaz. La impresión incluye los detalles.
- `src/styles/components/staff.css` consume las tipografías, colores, radios, espaciados, sombras y duraciones del sitio. Respeta las preferencias globales de movimiento reducido, contraste y tamaño de texto.

## Validación

Ejecutar `npm run build`, `npm run check:site` y `node scripts/check-personal.mjs`.
Para una actualización de personal, revisar también imágenes, nombres, horarios y asignaturas contra el listado institucional autorizado, y comprobar la cuadrícula y los diálogos con teclado en móvil, tablet y escritorio.
