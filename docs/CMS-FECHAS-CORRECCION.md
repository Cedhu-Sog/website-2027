# Corrección de fechas de Decap CMS

Fecha: 15 de octubre de 2026.

## Causa raíz

Decap guarda las fechas de publicación con el formato `YYYY-MM-DD`, que YAML
puede representar sin comillas. El parser de frontmatter de Astro 7.2.3 utiliza
`js-yaml`: `date: 2026-10-15` produce un objeto `Date` a medianoche UTC, mientras
que la misma fecha entre comillas permanece como cadena.

El esquema compartido exigía una cadena con `z.iso.date()`. Además,
`cleanContent()` recorría cualquier objeto y convertía los objetos `Date` en
objetos vacíos. Eso explica el error de tipo observado en Vercel.

Hay otra condición que una simple conversión con `toISOString()` no resuelve:
el parser YAML convierte fechas imposibles, como `2026-02-30`, en fechas de
marzo. Una vez convertido el valor, un `Date` por sí solo no permite recuperar
el literal inválido original. Es necesario conservar el literal antes de validar.

## Corrección y archivos

- `src/schemas/shared.ts`: conserva los objetos `Date` durante la limpieza;
  normaliza fechas válidas a cadenas `YYYY-MM-DD` usando UTC, sin aplicar la
  zona local. Rechaza objetos inválidos y objetos con hora distinta de medianoche
  para campos que solo admiten fecha. Añade un esquema de fecha y hora que
  conserva offsets de cadenas y normaliza objetos `Date` al mismo instante UTC.
- `src/lib/content-loader.mjs`: adapta el cargador `glob` existente. Antes de
  validar, relee el frontmatter con `JSON_SCHEMA` de `js-yaml`, que conserva las
  fechas como cadenas. Así detecta días imposibles y mantiene los offsets
  originales. Conserva el renderizado, la caché y la observación de archivos de
  Astro. Sigue el uso de módulos `.mjs` para integración de Markdown que ya existe
  en el proyecto.
- `src/content.config.ts`: aplica el adaptador a las colecciones Markdown y el
  esquema de fecha y hora a `eventos.startDate` y `eventos.endDate`; conserva la
  validación del orden cronológico del evento.
- `scripts/cms/dates.test.mjs`: pruebas de los esquemas reales y de compilación,
  con contenido temporal que se retira en `finally`.
- `package.json`: incorpora las regresiones de fechas al comando `test:cms`.

Las fechas de noticias, reconocimientos y proyectos de investigación comparten
el esquema de fecha sin hora. Los eventos mantienen fechas y horas con offset;
su presentación sigue usando `America/Bogota`. Las noticias ya se presentaban
con `es-CO` y zona `UTC`, por lo que no requieren cambios visuales.

No se añadieron ni instalaron dependencias. Se usan herramientas ya incluidas
en Astro y utilizadas por el proyecto. No se modificaron OAuth, estilos,
componentes visuales, navegación ni la escena 3D.

## Validación

- `npm run check:cms`: correcto; 131 entradas, 2310 campos y 35 fotografías.
- `npm run test:cms`: 13 pruebas correctas, incluyendo las 8 pruebas OAuth
  existentes y 5 grupos nuevos de regresión de fechas.
- `npm run build`: correcto, 28 páginas generadas. Incluye `prebuild` y
  `postbuild`: `check:site` valida 27 páginas HTML, 3978 referencias locales y
  9 PDF. Astro genera sus tipos sin errores de compilación. El proyecto no tiene
  instalado un comprobador TypeScript independiente; no se instalaron herramientas.
- El build informa de la colección de eventos vacía tras retirar los fixtures y
  de un chunk de más de 500 kB; ambas advertencias son ajenas a la validación de
  fechas y no impiden compilar.
- Los esquemas aceptan noticias con fecha YAML sin comillas, con comillas simples
  o dobles y sin fecha opcional, incluyendo campos vaciados como `null` o `""`.
- Se comprueban años bisiestos, formatos incorrectos, días imposibles, tipos
  inadecuados, `Invalid Date` y horas que no deben truncarse a una fecha.
- Se comprueban reconocimientos y fechas anidadas de investigación, así como
  fechas y horas de eventos, offsets, campo final opcional y orden cronológico.
- La integración compila con `TZ=America/Bogota` y verifica el HTML de
  `/noticias/prueba/`: `datetime="2026-10-15"` y «15 octubre 2026».
- También verifica noticia con fecha entre comillas, noticia sin fecha,
  presentación de eventos en español y rutas y fechas de las noticias anteriores.
- El cargador real rechaza `2026-02-30` sin comillas y
  `2026-02-30T08:00:00-05:00` sin comillas con errores del esquema.

## Estado para revisión

La copia local partía de `47c797a`. Se consultó `origin/master` y se confirmó que
su única diferencia, el commit `da8cd22`, añade `src/content/noticias/prueba.md`.
La integración utiliza exactamente ese contenido como fixture temporal cuando
el archivo no existe localmente; no incorpora la noticia al árbol de trabajo ni
fusiona el commit remoto. Después restaura el contenido y recompila.

Los cambios quedan locales para revisión. No se hicieron commits, push,
fusiones ni despliegues. La validación de Vercel queda pendiente del despliegue
que autorice el responsable del proyecto.
