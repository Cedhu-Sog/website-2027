# Administración de contenidos del CEDHU

Implementación del 15 de octubre de 2026. Esta guía diferencia el código preparado de la activación que debe realizar el responsable de GitHub y Vercel. No contiene credenciales.

## Estado y direcciones

El repositorio real es [Cedhu-Sog/website-2027](https://github.com/Cedhu-Sog/website-2027), público, con rama principal `master`. Su página de GitHub identifica [website-2027-bay.vercel.app](https://website-2027-bay.vercel.app) como sitio desplegado. La API pública confirma un estado `Vercel` exitoso para `f14d144452fa7c2a9defefefaba039ba3d3ace52`, actualizado el 2 de octubre de 2026. Esto acredita la integración previa; no demuestra un despliegue de estos cambios.

La consulta pública de la rama devuelve `protected: false`. **Antes de habilitar la edición institucional hay que proteger `master`** según las instrucciones de esta guía. No se han cambiado permisos, secretos ni ajustes remotos, ni se ha realizado push.

Direcciones preparadas, disponibles después del despliegue autorizado:

| Uso | Dirección |
| --- | --- |
| Panel | `https://website-2027-bay.vercel.app/admin/` |
| Inicio OAuth | `https://website-2027-bay.vercel.app/api/cms/auth` |
| Callback OAuth exacto | `https://website-2027-bay.vercel.app/api/cms/callback` |

`cedhu.edu.co` responde por Cloudflare, pero no se ha acreditado que dirija a este proyecto Vercel. Se conserva su uso previo en canonical, sitemap y datos institucionales, sin cambiar DNS. Cuando el responsable vincule y verifique ese dominio en Vercel, el panel será `https://cedhu.edu.co/admin/` y el callback será `https://cedhu.edu.co/api/cms/callback`. Deben cambiar juntos `CMS_ORIGIN`, el callback de GitHub y `backend.base_url`, `site_url` y `display_url` de `public/admin/config.yml`. No usar ambos orígenes indistintamente.

## Arquitectura

- Astro **7.2.3**, salida `static`, rutas y componentes existentes. Se mantiene Three.js **0.186.0**, sin tocar su lógica, modelos ni vídeos.
- Decap CMS **3.17.1**, versión estable comprobada en npm y en sus releases oficiales. Se descarga únicamente en `/admin/`, desde jsDelivr con versión exacta e integridad SHA-384. No entra en el JavaScript del sitio público.
- `src/pages/admin/index.astro` genera el documento independiente del CMS. No usa la cabecera ni los estilos públicos. Se eligió una ruta Astro porque `public/admin/index.html` no resolvía `/admin/` en el servidor de desarrollo de esta versión. `public/admin/config.yml` conserva la configuración estándar de Decap.
- Seis colecciones en Decap: Noticias, Páginas institucionales, Equipo institucional, Reconocimientos, Eventos y agenda, Fotografías. Los campos reutilizados usan alias YAML estándar para evitar duplicación. Se mantienen directamente en el YAML.
- `src/content.config.ts` valida las colecciones con `astro/zod`; `src/schemas/` define contenido, fechas, imágenes y enlaces. Los campos opcionales vaciados por Decap se normalizan antes de validar.
- `src/content/paginas/*.md`: 22 documentos existentes. Las rutas están ocultas y se conservan; no se pueden crear páginas arbitrarias desde el CMS.
- `src/content/noticias/*.md`: cuatro noticias originales, más las que se creen. El cuerpo Markdown se muestra en el artículo real.
- `src/content/personal/*.json`: los **63 cargos actuales**, migrados desde `personal.json`, correspondientes a 62 personas. Las fotografías originales permanecen en su ubicación. Los perfiles se pueden editar y ocultar; crear nuevas categorías o cargos requiere una intervención de desarrollo.
- `src/content/reconocimientos/*.md`: siete reconocimientos y evidencias ya publicados en las tarjetas de inicio. Se trasladaron conservando títulos, descripciones y procedencia. No se inventaron fechas, nombres de educandos ni entidades organizadoras.
- `src/content/eventos/*.md`: inicialmente vacío. Al publicar registros, `EventsList.astro` los muestra en `/ludicas/` con fecha y hora de Colombia. No se creó una página de calendario ni contenido de ejemplo permanente.
- `src/content/medios/*.json`: 35 fotografías institucionales con nombre y alternativa accesible, que conservan los identificadores originales. `src/data/media-catalog.ts`, `media.ts` y `asset-images.ts` resuelven las referencias e importaciones optimizadas.
- `api/cms/auth.js`, `api/cms/callback.js` y `src/server/cms-oauth.js`: dos funciones Node de Vercel, exclusivamente para OAuth. No hay servidor permanente, base de datos, Netlify Identity, Git Gateway ni servicio de pago nuevo.
- `vercel.json` declara Astro, `dist`, las dos funciones y cabeceras del panel. `.github/workflows/content-validation.yml` prepara validación de contenido en pull requests y en `master`.

No se instalaron paquetes ni se cambió `package-lock.json`. El procesador Sätteri y `js-yaml` utilizados ya forman parte del árbol instalado de Astro; el lockfile conserva sus versiones. El código utiliza las APIs del procesador Sätteri de Astro 7, no plugins Remark que exigirían otro paquete.

## Contenidos que se reflejan en el sitio

| Colección o sección | Qué puede editarse | Salida pública |
| --- | --- | --- |
| Inicio | Bienvenida, textos, fotografías, botones, propuesta humana, accesos, ciencia, títulos de noticias y tarjetas de evidencia; textos junto a la maqueta | `/`, componentes existentes `Hero`, `WhyCedhu`, `HumanFormation`, `QuickAccess`, `Technology`, `EvidenceSection`, `NewsSection`, `CampusModel` |
| Nosotros | Presentación, enfoque educativo, misión, visión, vínculos e imagen | `/nosotros/`, `InstitutionOverview` |
| Identidad | Principios, valores, lema y símbolos | `/nosotros/identidad/`, `InstitutionIdentity` |
| Pedagogía | Cita, introducción, ideas pedagógicas, apoyo a familias, fotografía | `/nosotros/pedagogia-de-la-felicidad/`, `Pedagogy` |
| Historia | Reseña por años, títulos, textos e imagen | `/historia/`, `HistoryTimeline` |
| Oferta educativa | Niveles, metodología, descripción, enfoques, imágenes y contenidos relacionados | `/oferta-educativa/` y sus siete rutas de nivel o área, `EducationDetail` |
| Investigación | Presentación, proyectos, educandos y responsables, fecha, áreas, fotografías, galería, etiquetas, enlaces a PDF existentes y visibilidad | `/oferta-educativa/investigacion/`, fichas y galerías existentes |
| Admisiones | Bienvenida, proceso, pasos, avisos, enlaces y preguntas frecuentes | `/admisiones/`, `AdmissionsProcess`, `FAQ`, invitaciones compartidas |
| Espacios | Fotografías, descripciones, orden de espacios y textos de invitación | `/nosotros/espacios/`, `SchoolSpaces`. El vídeo y su implementación quedan fuera de edición |
| Equipo | Nombre, cargo, fotografía, alternativa, descripción, horarios, asignaturas y responsabilidades, orden, visibilidad | `/nosotros/equipo/`, tarjetas y diálogos existentes |
| Noticias | Título, resumen, fecha confirmada, portada, comunicado opcional, contenido completo con fotografías, categoría, destacado, orden, aviso histórico, retirada y SEO | `/noticias/`, `/noticias/<nombre>/` y hasta tres destacados de inicio |
| Reconocimientos | Título, categoría académica/deportiva/científica/cultural/egresados, fecha confirmada opcional, educandos o equipo, descripción, foto, organizador, enlace de respaldo, orden, destacado, retirada | Tarjetas existentes de «Evidencia CEDHU» en `/`. La categoría determina su tarjeta |
| Eventos | Nombre, descripción, inicio y final con hora, lugar, fotografía, información adicional, retirada | Agenda de `/ludicas/`; la sección solo aparece cuando hay eventos publicados |
| Lúdicas | Grupos, actividades, orden y enlaces completos de inscripción | `/ludicas/`, `Activities` |
| Servicios | Textos y enlaces de servicios, recursos, tesorería, libros y egresados | `/servicios-en-linea/`, `Services` |
| Documentos | Títulos, categorías, descripciones, orden y nombres de los PDF que ya existen | `/documentos/`, `DocumentsList` |
| Contacto y datos compartidos | Teléfonos, email, dirección, ciudad, WhatsApp y etiqueta, Q10, UNOi, preinscripción, redes, mapas; textos y horarios | `/contacto/`, pie global, accesos, navegación y enlaces de admisiones. Su fuente común es `contacto.md` |
| SEO | Título y descripción existentes; título SEO opcional, metadescripción opcional e imagen social de la biblioteca | Metadatos del layout de las 22 páginas y cada noticia; canonical y rutas se conservan |
| Fotografías | Nombre, archivo y alternativa accesible | Todas las secciones que referencian la ficha. Reemplazar una ficha compartida actualiza todas sus referencias |

Los nombres internos, rutas fijas, categorías de personal y procedencias históricas se mantienen ocultos para preservar relaciones y trazabilidad. Los datos del modelo 3D, CSS, animaciones, componentes y navegación estructural permanecen en el código.

## Activación en GitHub

Estas acciones corresponden al propietario o administrador autorizado. No se ejecutaron remotamente.

1. Abrir [Developer settings → OAuth Apps](https://github.com/settings/developers) de la cuenta institucional que custodiará la integración. También puede crearse desde Developer settings de la organización. Seleccionar **New OAuth App**.
2. Application name: un nombre reconocible como «CEDHU · Administración de contenidos». Homepage URL: `https://website-2027-bay.vercel.app/admin/`. Authorization callback URL: **`https://website-2027-bay.vercel.app/api/cms/callback`**, sin barra final. No activar Device Flow.
3. Guardar el Client ID y generar un Client Secret. Introducirlos exclusivamente en Vercel. Nunca en config.yml, archivos públicos, capturas o mensajes. No crear un token personal para compartir entre editores.
4. Si la organización restringe aplicaciones OAuth, aprobar esta aplicación para `Cedhu-Sog`; si corresponde, autorizar SSO. Cada administrativo utiliza su propia cuenta GitHub existente con autenticación de dos factores.
5. En [Settings → Collaborators and teams](https://github.com/Cedhu-Sog/website-2027/settings/access), conceder **Write** al equipo editorial. No conceder Admin ni Maintain para editar contenido. Read y Triage no permiten guardar borradores en este backend. La baja de un editor requiere retirar su permiso Write y revocar su autorización de la app si procede.
6. En [Settings → Rules → Rulesets](https://github.com/Cedhu-Sog/website-2027/settings/rules), crear o adaptar una regla activa para `master`: exigir pull request, al menos una aprobación de otra persona, descartar aprobaciones cuando haya cambios, exigir resolución de conversaciones, bloquear force pushes y borrado. No dar bypass al equipo editorial ni a la aplicación OAuth. Evitar activar una cola de merge o exigir métodos de merge que Decap no utilice sin probar antes su compatibilidad.
7. Después del primer run de la acción, exigir el check **«Validación de contenido»**. Mantener habilitado un método de merge compatible con Decap (merge commit es el comportamiento preparado). No habilitar automerge. Si Vercel publica un check estable por PR, se puede exigir también tras comprobar su nombre exacto.
8. Probar con dos cuentas reales: el autor puede guardar y solicitar revisión; no puede aprobar su propio cambio; el revisor puede aprobar, esperar los checks y publicar. Si GitHub rechaza la publicación por una regla, resolver su condición en GitHub sin desactivar la protección.

El workflow por sí solo ofrece estados de borrador, revisión y publicación. La separación obligatoria entre autor y aprobador depende de estas reglas de GitHub. Sin ellas, una cuenta con Write puede publicar su propio cambio.

## Activación en Vercel

Proyecto identificado por el estado público: [website-2027 en Vercel](https://vercel.com/patarroyoalexis-6165s-projects/website-2027).

1. En **Settings → Git**, verificar que el repositorio conectado sea `Cedhu-Sog/website-2027` y la rama de producción sea `master`. Conservar la integración y los hooks existentes. No añadir un webhook que duplique despliegues.
2. En **Settings → Build and Deployment**, comprobar preset **Astro**, build command **`npm run build`**, output directory **`dist`**, directorio raíz del repositorio y Node.js **22.x** según `package.json`. La implementación no necesita un adaptador SSR.
3. En **Settings → Environment Variables**, crear las siguientes variables en **Production**, sin prefijo `PUBLIC_`:

| Variable | Valor o finalidad |
| --- | --- |
| `CMS_ORIGIN` | `https://website-2027-bay.vercel.app`, sin barra final ni ruta |
| `GITHUB_OAUTH_CLIENT_ID` | Client ID real de la OAuth App |
| `GITHUB_OAUTH_CLIENT_SECRET` | Client Secret real, marcado como sensible |
| `CMS_OAUTH_COOKIE_SECRET` | 32 bytes aleatorios expresados como 64 caracteres hexadecimales, marcado como sensible |
| `CMS_GITHUB_ALLOWED_USERS` | Opcional: logins reales separados por comas. Cada uno debe tener también Write; esta lista no concede permisos |

Para generar la clave de cookie, ejecutar localmente y copiar su resultado directamente al campo secreto de Vercel: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. No guardar el resultado en el repositorio. `.env.example` solo documenta nombres y valores públicos.

4. No habilitar secretos de producción indiscriminadamente en previews. El CMS solo autentica en `CMS_ORIGIN`; una preview puede mostrar el formulario, pero su origen no está autorizado. Para una prueba OAuth aislada, usar un proyecto/origen y una app GitHub separados, ajustando también `config.yml`. No abrir la lista de orígenes mediante comodines.
5. Revisar y desplegar esta rama mediante el procedimiento autorizado. Los cambios de entorno requieren un nuevo despliegue. Comprobar en **Functions** que aparezcan `/api/cms/auth` y `/api/cms/callback` como funciones Node, y que el resto siga siendo estático.
6. Verificar `/admin/` y `/admin/config.yml`. Sin credenciales configuradas, `/api/cms/auth?provider=github&site_id=website-2027-bay.vercel.app` devuelve **503**; después de configurarlas debe redirigir a GitHub. Abrir directamente el callback sin cookie/estado válido debe devolver **403**, no un token.
7. Completar la prueba real de publicación descrita al final. No dar el CMS por habilitado hasta superar esa prueba.

## Autenticación y alcance de seguridad

Se usa el backend nativo GitHub de Decap y el flujo Authorization Code de GitHub con PKCE S256, intermediado por dos funciones pequeñas del mismo proyecto. Se investigaron los proveedores externos recomendados por Decap; el proveedor histórico de `bericp1` para Vercel registra su último push en febrero de 2023. Se evitó adoptar esa dependencia sin mantenimiento reciente. La implementación conserva el protocolo público de Decap y las APIs mantenidas de GitHub, con pruebas locales; su mantenimiento queda a cargo del proyecto CEDHU.

La función de inicio fija el origen, repositorio, callback y scope; ignora un scope solicitado por el navegador. Genera estado impredecible y verificador PKCE; cifra ambos con AES-256-GCM en una cookie HttpOnly, Secure, SameSite=Lax, válida diez minutos. El callback valida cookie, estado, vencimiento y host antes de intercambiar el código. Comprueba por API el repositorio real y `permissions.push`, además de la lista opcional de usuarios. Un token rechazado por falta de permiso se revoca cuando GitHub lo permite.

El resultado solo se entrega al `window.opener` esperado mediante `postMessage` con origen exacto y validación de origen **y ventana emisora**. No se usa `*`. Las respuestas no se cachean y el callback aplica CSP con nonce y protección contra inclusión en frames. No se registran códigos ni tokens en logs.

**Distinción necesaria:** el backend nativo de GitHub necesita un token OAuth de sesión en el navegador y Decap lo gestiona en su sesión/almacenamiento. No existe ningún token preconfigurado ni Client Secret en el código público. El Client Secret y la clave de cifrado permanecen en variables del servidor. Si la política institucional prohíbe incluso los tokens de sesión en el navegador, esta arquitectura nativa no cumple esa condición: sería necesario evaluar un backend intermediario con permisos y sesiones propios, fuera de esta implementación.

El scope `public_repo` es el mínimo OAuth de escritura compatible con este repositorio público y el backend nativo; puede abarcar otros repositorios públicos en los que esa cuenta tenga permisos. No ofrece selección de un único repositorio como una GitHub App de permisos granulares. Usar cuentas institucionales y custodiar su acceso; un cambio a repositorio privado exige revisar la arquitectura y permisos, no cambiar ciegamente a `repo`.

Write de GitHub permite editar el repositorio también fuera del CMS. Los formularios ocultan código y estructura, pero no son una frontera de permisos por carpeta o por colección. La protección efectiva de producción reside en GitHub y sus revisiones. La pantalla `/admin/` es pública; leer su HTML/configuración no concede permiso para escribir.

## Acceso y tareas del personal administrativo

### Entrar

Abrir el panel oficial y elegir **Iniciar sesión con GitHub**. Usar la cuenta personal autorizada, completar la autenticación de GitHub y aceptar la app institucional. Permitir la ventana emergente. No compartir cuentas, tokens ni contraseñas. Cerrar sesión al terminar en equipos compartidos.

### Crear una noticia

1. Si necesita una fotografía nueva, preparar y aprobar primero su ficha en **Fotografías**.
2. En **Noticias**, seleccionar nueva publicación. Completar título, descripción breve, categoría y fotografía. Indicar fecha solo cuando esté confirmada. El enlace se genera a partir del título al crear la entrada; conservarlo después de publicar.
3. Escribir el **Contenido completo** en el editor visual. Usar encabezados 2 y 3, listas y enlaces cuando ayuden. Al insertar imágenes, describirlas en su campo de alternativa accesible. La compilación rechaza fotografías sin alternativa o desde almacenamiento remoto.
4. El comunicado original es opcional. Las publicaciones nuevas no requieren inventar un cartel ni un enlace de procedencia. La portada se utiliza también en el artículo si no hay comunicado.
5. Activar **Destacar en el sitio** para participar en las tres noticias de inicio; un número menor en el orden de destacados tiene prioridad.
6. Para que aparezca al aprobar, dejar desactivado **Retirar u ocultar del sitio público**. Guardar el borrador y solicitar revisión. La fecha por sí sola no programa una publicación futura.

### Editar contenido existente

Entrar en la colección, abrir la ficha, modificar los campos necesarios y guardar como borrador. En **Páginas institucionales**, cada página incluye solamente sus bloques existentes, agrupados y plegados. Para misión y visión, abrir **Nosotros → Nosotros, misión y visión**. Los títulos compartidos y llamadas a admisiones se editan en su documento propietario y se reflejan donde los componentes los reutilizan.

Para teléfonos, redes, plataformas, WhatsApp y correo, usar **Contacto → Datos institucionales compartidos**. Los horarios generales están en **Atención y ubicación**; los horarios individuales, en cada perfil. Los destinos de Q10, UNOi y preinscripción se centralizan; no hace falta repetirlos en inicio o navegación.

Para un perfil, cambiar nombre, cargo, foto, descripción u orden. **Mostrar este perfil en el sitio** permite ocultarlo sin borrarlo. Las tarjetas conservan proporciones y comportamiento; un nombre más largo sigue dependiendo del diseño responsive existente.

### Fotografías

En **Fotografías**, crear una ficha con nombre descriptivo, archivo y descripción accesible. Cargar desde el campo de imagen de esa ficha. JPG, JPEG, PNG, WebP y AVIF son los formatos admitidos. Usar nombres sencillos, sin espacios ni caracteres especiales. Límite: **3 MB por archivo nuevo**; se comprueba en el selector y en la validación previa al build. Recomendar aproximadamente 1600–2400 píxeles de ancho y archivos menores a 500 KB cuando sea posible.

Guardar y aprobar la ficha antes de seleccionarla en una noticia o sección mediante el buscador de fotografías. Esta secuencia evita referencias entre dos borradores aún no publicados. Una fotografía nueva no aparece en el sitio hasta que una sección la utilice.

Las cargas nuevas quedan en `src/assets/uploads/`. El CMS guarda rutas de repositorio `/src/assets/...`; **no son URLs públicas que se deban pegar en enlaces**. Astro importa los archivos y genera las URLs `/_astro/...`, dimensiones, formatos y variantes que usa `Photo.astro`. El plugin de Sätteri adapta las fotografías del cuerpo Markdown al mismo pipeline. Se conservan las fotografías existentes y sus importaciones optimizadas. No se duplican en `public/` ni se exige Cloudinary u otra plataforma.

La previsualización del selector utiliza los archivos de GitHub. La vista exacta de las páginas se revisa en Vercel; no se han creado plantillas falsas de preview ni una segunda implementación del diseño en React.

Evitar operaciones de carga o eliminación desde la biblioteca global fuera de un editor: Decap puede registrar operaciones de medios directamente en la rama principal. Las reglas de GitHub deben bloquear esos cambios directos. Para asociar medios a un borrador, cargarlos desde el campo de imagen de la ficha; comprobar este comportamiento con los permisos reales durante la activación. Si la operación se bloquea, no desproteger la rama: revisar el flujo de carga y el PR con el responsable técnico.

Las eliminaciones permanentes de fichas están deshabilitadas. Para retirar una foto del sitio, reemplazar o eliminar su referencia en la sección y aprobar ese cambio. Un desarrollador puede borrar después los archivos sin referencias, con revisión. No eliminar por intuición: una misma ficha puede usarse en varias páginas.

### Borradores, revisión y publicación

El flujo nativo crea ramas y pull requests de contenido en GitHub. **Guardar** un borrador de una ficha no debe fusionar sus textos en `master`. El estado **En revisión** permite que otra persona los revise. **Listo** indica intención editorial; GitHub sigue exigiendo revisiones y checks cuando se activen las reglas.

El revisor abre la preview de Vercel si está disponible, revisa textos, imágenes, alternativas, teléfonos y fechas, y aprueba el PR. Luego publica desde Decap cuando GitHub lo permita, o fusiona el PR aprobado en GitHub si una protección requiere ese paso. Vercel construye la versión de `master`; hay que esperar a que el despliegue termine correctamente.

El estado editorial del borrador y el interruptor **Retirar u ocultar** tienen funciones diferentes. El primero mantiene el trabajo en una rama; el segundo excluye la ficha del sitio incluso si se fusiona en producción. Eventos y reconocimientos nuevos empiezan ocultos por precaución. Desactivar la ocultación antes de solicitar su publicación.

Para retirar una noticia, evento o reconocimiento, activar **Retirar u ocultar**, guardar, revisar y publicar la retirada. Las noticias desaparecen de índices, destacados y sitemap, y su URL deja de generarse. Para conservar un comunicado antiguo accesible, utilizar el **aviso de publicación histórica** con su explicación. La retirada no elimina datos del historial de Git; información confidencial no debe introducirse en un repositorio público ni en sus borradores.

### Revisar y recuperar un cambio publicado

Comprobar la URL pública después de que Vercel muestre el despliegue como listo. Revisar una vez en móvil y escritorio, abrir la fotografía y confirmar enlaces. Si no aparece el cambio, verificar la rama y el commit del despliegue, su resultado y el estado de ocultación de la ficha. Se puede volver a editar la ficha y publicar una corrección; para un error mayor, el responsable técnico puede revertir el PR y dejar que Vercel reconstruya.

## Comprobaciones técnicas y límites

Comandos disponibles:

```sh
npm run check:cms
npm run test:cms
npm run build
npm run check:site
node scripts/check-personal.mjs
```

`prebuild` ejecuta la validación de Decap, datos y referencias. El build comprueba los esquemas Astro y la generación estática; `postbuild` comprueba rutas, imágenes, accesibilidad básica y metadatos, de modo que Vercel también rechaza un build con enlaces internos rotos. La acción de GitHub ejecuta además las pruebas de seguridad y perfiles. Las pruebas OAuth usan un transporte GitHub aislado; no acreditan un login real.

Prueba local adicional, con el servidor de desarrollo detenido: `node scripts/cms/content-smoke.mjs`. Crea fotografías y registros locales temporales, edita contenido existente, verifica borradores y publicación estática, y restaura los originales en `finally`. Nunca publica en GitHub. Fuerza sincronización del contenido porque Astro 7.2.3 puede conservar en caché la última entrada de una colección que queda vacía.

No hay `typescript` ni `@astrojs/check` instalados. Se revisa sintaxis TypeScript con Node y compilación Astro; no equivale a un typecheck exhaustivo. No se instalaron herramientas adicionales.

El panel no permite modificar CSS, animaciones, estructura de tarjetas, lógica de menú, recursos 3D ni archivos del recorrido. No incluye contraseñas locales, roles falsos, base de datos ni calendario externo. No programa despliegues a una fecha futura. Los documentos PDF nuevos siguen requiriendo el procedimiento técnico existente. La creación de nuevas rutas institucionales o categorías del personal requiere desarrollo. La vista previa exacta, OAuth real y la publicación remota requieren su entorno y permisos.

### Prueba real pendiente de activación

Con dos usuarios autorizados y las reglas activas:

1. Abrir el panel HTTPS e iniciar sesión con GitHub. Comprobar que una cuenta sin Write no recibe acceso.
2. Leer una noticia real y una página institucional. Verificar que sus valores coincidan con el sitio.
3. Cargar una fotografía de uso autorizado desde una ficha, completar alternativa y guardar borrador. Comprobar rama/PR y que no cambie producción.
4. Aprobar la ficha con el revisor, publicar y seleccionarla en una noticia nueva. Revisar miniatura y archivo cargado.
5. Guardar esa noticia como borrador. Confirmar que la URL y el texto todavía no aparecen en producción.
6. Solicitar revisión, comprobar preview/checks, aprobar con otra cuenta y publicar. Verificar el nuevo commit en `master` y el despliegue Vercel que lo contiene.
7. Abrir la noticia y verificar texto, fotografía, alternativa, SEO, índices y versión móvil. Probar también un perfil, reconocimiento y evento si se usarán en la operación inicial.
8. Retirar el registro temporal mediante ocultación y publicar esa retirada. Si se requiere limpiar Git permanentemente, tratarlo como una operación técnica separada y autorizada.

Hasta completar estos pasos, el estado correcto es **implementado y probado localmente; pendiente de habilitación y verificación remota**.

## Diagnóstico

| Síntoma | Qué revisar |
| --- | --- |
| Error de configuración del CMS | Sintaxis y alias YAML; consola del navegador; `npm run check:cms`. Una configuración global `media_library` sin `name` es inválida; el límite de carga está en los campos de imagen |
| Panel 404 | Confirmar despliegue de esta rama y existencia de `dist/admin/index.html`; usar `/admin/` |
| OAuth 503 | Faltan variables de servidor o la clave de cookie no tiene 64 caracteres hexadecimales; volver a desplegar |
| OAuth 403 al entrar | Se abrió otra preview/origen; revisar `CMS_ORIGIN`, host, `base_url` y `site_id`. No habilitar comodines |
| Estado inválido o vencido | Reiniciar acceso desde el panel; permitir cookies y popup; evitar pestañas de login simultáneas y revisar el límite de diez minutos |
| GitHub indica callback incorrecto | Usar exactamente `/api/cms/callback`, sin barra final, en la app y el origen activo |
| Usuario sin autorización | Verificar Write real, autorización organizacional/SSO, lista opcional y cuenta GitHub activa |
| No permite publicar | Revisar aprobación de otra cuenta, checks, conflictos y reglas del PR. No desactivar protecciones |
| Medio no aparece en otra ficha | Aprobar primero su ficha; confirmar nombre, ruta y archivo en GitHub |
| Build falla por una fotografía | Referencia desconocida, ruta inválida, archivo ausente, más de 3 MB o alternativa faltante; corregir el borrador |
| Texto no cambia tras aprobar | Verificar ocultación, despliegue listo y commit correcto; un PR abierto sigue siendo borrador |
| Evento con hora distinta | Seleccionar la hora local y revisar zona del equipo; el sitio muestra siempre `America/Bogota` |
| Una colección vacía conserva datos en pruebas locales | Detener dev y ejecutar `npm run astro -- sync --force`; no borrar contenido real |
| Acceso bloqueado después de rotar secretos | Volver a desplegar y reiniciar login; las cookies previas dejan de ser válidas al cambiar su clave |

## Referencias y mantenimiento

- [Backend GitHub de Decap](https://decapcms.org/docs/github-backend/), [workflow editorial](https://decapcms.org/docs/editorial-workflows/) y [relaciones entre colecciones](https://decapcms.org/docs/widgets/relation/).
- [Release estable Decap 3.17.1](https://github.com/decaporg/decap-cms/releases/tag/decap-cms%403.17.1) y [proveedores OAuth externos](https://decapcms.org/docs/external-oauth-clients/).
- [OAuth Authorization Code y PKCE de GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
- [Funciones Node en Vercel](https://vercel.com/docs/functions/runtimes/node-js).
- [Imágenes Astro](https://docs.astro.build/en/guides/images/) y [procesador Sätteri](https://docs.astro.build/en/reference/markdown-processors/satteri/).

Al actualizar Decap, fijar la nueva versión estable y recalcular su hash SRI. Verificar carga del panel, configuración, flujo OAuth, edición y compatibilidad de las ramas editoriales antes de promoverla. No sustituir la versión fija por `latest`.
