# Informe de implementación de Decap CMS

15 de octubre de 2026 · Rama local `codex/decap-cms` · Sin commit, push ni cambios de configuración remota.

Actualización de dominio del 19 de octubre de 2026: configuración Decap, ejemplo de entorno y documentación preparados exclusivamente para `https://website-2027-seven.vercel.app`. Las pruebas y verificaciones remotas descritas en el informe original son antecedentes del 15 de octubre y no acreditan el funcionamiento OAuth en este dominio. Siguen pendientes la configuración externa, el despliegue y el login real.

## A. Implementación

Se integró Decap 3.17.1 sobre Astro 7.2.3, reutilizando rutas, layouts y Content Collections. El sitio sigue generándose estáticamente. Solo la autenticación utiliza funciones Node de Vercel. No se instalaron dependencias ni se modificó el lockfile.

| Archivos o grupo | Cambio y responsabilidad |
| --- | --- |
| `src/pages/admin/index.astro`, `public/admin/config.yml` | Panel independiente, versión fija e integridad del bundle; seis colecciones, campos y ayudas en español, workflow editorial y backend GitHub real |
| `api/cms/auth.js`, `api/cms/callback.js`, `src/server/cms-oauth.js` | Authorization Code, PKCE, estado/cookie cifrada y verificación de permisos de GitHub |
| `vercel.json`, `.env.example`, `.gitignore` | Despliegue estático, funciones, cabeceras y documentación/protección de variables locales |
| `src/content.config.ts`, `src/schemas/shared.ts`, `src/schemas/page-sections.ts` | Esquemas compatibles con Astro 7; referencias, enlaces, fechas, SEO y normalización de campos opcionales |
| `src/content/personal/*.json` | Migración íntegra de los 63 cargos desde `personal.json`; visibilidad y alternativa de fotografía |
| `src/content/medios/*.json` | 35 fichas reales de imágenes existentes con alternativas descriptivas |
| `src/content/reconocimientos/*.md` | Siete evidencias originales trasladadas desde inicio a registros individuales |
| `src/content/paginas/inicio.md`, `contacto.md`, `ludicas.md` | Referencias únicas de reconocimientos, contacto y Q10; formularios de lúdicas con URL completa. La metadescripción de contacto deja de repetir números que podrían quedar desactualizados |
| `src/data/media.ts`, `media-catalog.ts`, `asset-images.ts` | Catálogo y resolución automática de imágenes locales; sustituyen el registro y enumeración manual `media-keys.ts` |
| `src/assets/uploads/.gitkeep` | Directorio reservado de fotografías nuevas; los originales no se movieron |
| `src/lib/content.ts`, `personal.ts` | Consultas tipadas, orden, publicación y adaptación a componentes existentes |
| `src/lib/markdown-images.mjs`, `astro.config.mjs` | Plugin del procesador Sätteri ya instalado para optimizar fotos insertadas por Decap en Markdown y exigir alternativas |
| `StaffCard`, `Activities`, `ContactDetails`, `EvidenceSection`, `NewsArticle`, `QuickAccess` | Conexión de campos con presentación real; comunicado opcional en nuevas noticias; datos institucionales compartidos |
| `src/components/sections/EventsList.astro`, `src/styles/components/resources.css` | Agenda en la ruta existente de lúdicas; sin sección visible mientras no haya eventos |
| `src/layouts/BaseLayout.astro` y páginas existentes | SEO opcional e imagen social; conservan canonical, composición y rutas |
| `scripts/cms/check-config.mjs`, `oauth.test.mjs`, `content-smoke.mjs` | Validación de formularios/datos; seguridad OAuth aislada; prueba reversible de contenido generado |
| `scripts/check-site.mjs`, `check-personal.mjs`, `package.json` | Comprobación del sitio público separada del panel; adaptación del personal; validación previa y posterior al build |
| `.github/workflows/content-validation.yml` | Checks preparados para pull requests a `master`; no se han ejecutado en GitHub |
| `README.md`, `docs/CONTENT-COLLECTIONS.md`, `docs/PERSONAL.md`, esta guía y `DECAPCMS_ADMINISTRACION.md` | Documentación actualizada y operación en español |

Los archivos del modelo, texturas, vídeo, controladores 3D y navegación flotante/móvil no se modificaron. No se cambió el framework ni se añadieron bases de datos o servicios de almacenamiento externos.

## B. Contenidos administrables

| Sección | Campos disponibles | Dónde se reflejan |
| --- | --- | --- |
| Inicio | Bienvenida, títulos, descripciones, fotos, botones, accesos y textos de bloques existentes | `/` |
| Nosotros | Presentación, reseña, misión, visión, enfoque educativo e imagen | `/nosotros/` |
| Identidad | Principios, valores, lema, símbolos y fotografía | `/nosotros/identidad/` |
| Pedagogía | Cita, introducción, ideas, apoyo a familias, imagen y enlaces | `/nosotros/pedagogia-de-la-felicidad/` |
| Historia | Años, títulos, textos, orden e imagen | `/historia/` |
| Oferta educativa | Títulos, metodología, enfoques, textos, fotos y relacionados | Índice y siete páginas existentes de nivel/área |
| Investigación | Proyectos, resúmenes, educandos/responsables, fechas, áreas, descripciones, galerías, PDF existentes, destacado y visibilidad | `/oferta-educativa/investigacion/` |
| Admisiones | Proceso, pasos, avisos, botones, preguntas frecuentes y llamada compartida | `/admisiones/` y componentes compartidos |
| Espacios | Fotos, textos, orden de espacios e invitaciones | `/nosotros/espacios/`; vídeo y modelo permanecen en código |
| Equipo | Nombre, cargo, foto, alternativa, descripción, horarios, asignaturas, responsabilidades, orden y visibilidad | `/nosotros/equipo/` |
| Noticias | Crear, título, resumen, contenido visual completo, fecha, categoría, portada, comunicado opcional, alternativas, destacados, orden, retirada, aviso histórico y SEO | `/noticias/`, artículos existentes/nuevos y destacados del inicio |
| Reconocimientos | Título, categoría, fecha opcional confirmada, educandos/equipo, descripción, foto, organizador, enlace de respaldo, orden, destacado y retirada | Cuatro tarjetas existentes de Evidencia CEDHU en inicio |
| Eventos | Nombre, descripción, fecha/hora inicial y final, lugar, foto, información adicional y retirada | Agenda de `/ludicas/` |
| Lúdicas | Grupos, nombres de actividades, orden y formularios oficiales | `/ludicas/` |
| Servicios | Descripciones, títulos, botones y enlaces institucionales | `/servicios-en-linea/` |
| Documentos | Títulos, categorías, descripciones, orden y referencias a PDF existentes | `/documentos/` |
| Contacto | Teléfonos, correo, dirección, ciudad, WhatsApp, redes, plataformas, mapas y horarios publicados | Contacto, pie global y accesos que usan los datos compartidos |
| Fotografías | Archivo, nombre en biblioteca y alternativa accesible | Secciones que referencien la ficha; galerías conservan su orden editorial |
| SEO | Título, metadescripción e imagen social opcionales | Metadatos de las 22 páginas y noticias |

Las rutas institucionales y los identificadores estructurales no son editables. Los nombres de nuevas noticias se generan al crearlas; las URLs existentes se conservan. Cada ficha repetible se almacena individualmente, salvo listas de bloques que ya pertenecían a una página y mantienen ese contrato.

## C. Autenticación

Implementado: backend GitHub nativo de Decap, con funciones propias pequeñas que siguen el protocolo mantenido por Decap y GitHub; sin dependencia de brokers OAuth antiguos ni servicios de Netlify. Se comprobó la compatibilidad del handshake leyendo su implementación oficial.

La cookie cifrada dura diez minutos y contiene estado aleatorio y verificador PKCE. El servidor valida origen/host, estado y vencimiento, realiza el intercambio y consulta los permisos de escritura del repositorio `Cedhu-Sog/website-2027`. El scope preparado es `public_repo` porque el repositorio es público. Puede aplicarse además una lista de cuentas autorizadas.

**Estado real:** ocho pruebas locales pasan con respuestas GitHub aisladas. No hay credenciales OAuth en el entorno y no se ha realizado login real ni despliegue de las funciones.

**Límite frente al requisito sobre tokens:** el backend nativo necesita un token de sesión en el navegador. Los secretos de aplicación permanecen en el servidor y no existen tokens preconfigurados en archivos públicos. Si se exige que tampoco exista un token de sesión en el navegador, se requiere otra arquitectura de backend; esta implementación no debe presentarse como cumplimiento de esa condición estricta.

## D. Pruebas

| Prueba | Resultado concreto |
| --- | --- |
| `npm run check:cms` | Correcto: 131 entradas, 2.310 campos existentes revisados, 35 fotografías; YAML, referencias, campos obligatorios y límites de carga |
| `npm run test:cms` | 8 pruebas correctas: secretos ausentes, métodos inválidos, origen/host/proveedor, PKCE, estado alterado/ausente/vencido, cancelación, permisos, lista de cuentas, fallos upstream y handshake de origen/ventana |
| `npm run build` | Correcto: salida estática, 28 páginas incluyendo `/admin/` y 336 variantes optimizadas; ejecuta validación de contenido y comprobación del sitio |
| `npm run check:site` | Correcto: 27 páginas públicas, 3.978 referencias locales y 9 PDF; metadatos, imágenes, fragmentos, sitemap y separación CSS |
| `node scripts/check-personal.mjs` | Correcto: 63 perfiles visibles, 62 retratos locales; contenido, dimensiones, lazy loading y alternativas |
| Comparación de la migración de personal contra `master` | Todos los campos originales de los 63 perfiles conservados; solo cambian rutas equivalentes, se añade visibilidad y se aplica el término educandos |
| `node --check` | Sintaxis correcta de 33 archivos TypeScript/JavaScript de código y validación. No es typecheck semántico completo |
| `node scripts/cms/content-smoke.mjs` | Correcto: edita página, datos globales, noticia y perfil; crea noticia, fotografía, reconocimiento y evento; verifica exclusión de borradores, publicación estática, SEO, imagen interior optimizada, retirada de perfil y rutas válidas; restaura todo |
| Navegador Chromium: `/admin/` | Carga Decap con «Iniciar sesión con GitHub» en español; configuración aceptada por Decap |
| Navegador Chromium: responsive | Equipo: 63 tarjetas y sin desbordamiento a ancho móvil. Inicio: sin desbordamiento a viewports de 390, 768 y 1440 px; cuatro tarjetas de evidencia. Menú móvil abre y cierra con estado `aria-expanded` correcto |
| Secretos en salida estática | No aparecen nombres de variables secretas del servidor ni credenciales de prueba en `dist/` |
| Git y recursos protegidos | `git diff --check` correcto. No cambió el lockfile, los controladores de navegación, 3D, modelos ni vídeo |
| Integración remota existente | API GitHub confirma repositorio público, `master`, estado Vercel exitoso del commit actual y homepage Vercel con HTTP 200. No acredita este nuevo flujo CMS |

Errores encontrados y corregidos:

- El HTML en `public/admin/index.html` no resolvía `/admin/` en dev: se sustituyó por la ruta Astro que genera ese mismo destino estático.
- Decap rechazó un `media_library` global sin proveedor: el límite de tamaño se colocó en los campos nativos de imagen y se verificó la carga real del panel.
- Las fotos del cuerpo Markdown conservaban `/src/assets/...`: se integró un plugin nativo de Sätteri que las convierte en importaciones optimizadas. No se instaló el procesador Remark que esta versión de Astro ya no incluye.
- El comprobador histórico de personal esperaba 64 perfiles, aunque `master` contenía 63. Se adaptó para comprobar el contenido vigente y permitir las ediciones y retiradas solicitadas.
- El comprobador de rutas interpretaba un `srcset` vacío válido como enlace roto. Se corrigió sin omitir imágenes ni enlaces reales.
- Astro conservaba en caché una entrada cuando una colección quedaba vacía durante las pruebas reversibles. La prueba fuerza sincronización antes de compilar; todos los datos temporales y su salida se limpiaron.

Persisten advertencias de build por la colección de eventos vacía y por el tamaño del chunk 3D preexistente. No se modificó la implementación tridimensional para silenciarlas. Safari real en iPhone/iPad y el ciclo de publicación remoto quedan pendientes.

## E. Configuración pendiente

El procedimiento detallado está en [la guía de administración](DECAPCMS_ADMINISTRACION.md), apartados «Activación en GitHub» y «Activación en Vercel».

1. Actualizar la OAuth App existente desde [GitHub Developer Settings](https://github.com/settings/developers); crear una solo si todavía no existe. Homepage: `https://website-2027-seven.vercel.app/admin/`. Callback exacto: **`https://website-2027-seven.vercel.app/api/cms/callback`**.
2. Configurar en Vercel Production: `CMS_ORIGIN=https://website-2027-seven.vercel.app`, Client ID y Client Secret reales, `CMS_OAUTH_COOKIE_SECRET` aleatorio de 64 caracteres hexadecimales. Opcional: `CMS_GITHUB_ALLOWED_USERS`. No usar variables `PUBLIC_`.
3. Dar Write a las cuentas editoriales reales, sin conceder Admin. Autorizar la app en la organización si corresponde.
4. **Proteger `master`: actualmente GitHub devuelve `protected: false`.** Exigir PR, aprobación de otra persona, checks y ausencia de bypass editorial. Exigir «Validación de contenido» cuando la acción ya haya ejecutado su primer run.
5. Verificar en Vercel repositorio, producción desde `master`, Node 22.x, build `npm run build` y salida `dist`. Revisar y desplegar estos cambios únicamente mediante el procedimiento autorizado.
6. Completar login, lectura, edición, creación, carga de foto desde una ficha, borrador, revisión, publicación y comprobación del nuevo commit/despliegue. Probar que el borrador no cambia producción y que usuarios sin Write quedan rechazados.
7. Mantener el CMS exclusivamente en `https://website-2027-seven.vercel.app/admin/`. El dominio institucional conserva sus configuraciones SEO, canonical, sitemap y DNS.

## F. Limitaciones

- No se ha verificado autenticación ni publicación remota. `astro dev` sirve el panel; no ejecuta las funciones de `api/` de Vercel. No se añadió ni instaló Vercel CLI.
- El flujo editorial no impone doble aprobación sin reglas de GitHub. Un editor con Write tiene acceso al repositorio también fuera del CMS; los formularios no conceden aislamiento por carpetas.
- OAuth `public_repo` puede abarcar otros repositorios públicos accesibles para el usuario; no es un permiso granular a un único repositorio. El token de sesión es necesario en el navegador con el backend nativo.
- Las operaciones globales de medios de Decap pueden escribir directamente en la rama principal. Debe usarse la carga desde el campo de la ficha y verificar su PR durante la activación; las reglas deben bloquear escrituras directas. No se relajaron permisos para sortearlo.
- No hay programación automática por fecha, editor de diseño, calendario externo ni carga de nuevos PDF. No se habilita crear páginas institucionales arbitrarias ni categorías nuevas de personal.
- Las vistas exactas se revisan mediante Vercel; no se duplicó el diseño público en plantillas de preview del CMS.
- Las fechas, educandos y organizadores históricos no confirmados permanecen opcionales. No se inventó información para completar formularios.
- No existe typecheck exhaustivo ni prueba Safari real con las herramientas instaladas. No se instalaron herramientas adicionales.

## G. Estado final

**Implementado:** panel y formularios conectados a contenido real, medios optimizados, migración de personal y reconocimientos, agenda en lúdicas, SEO, workflow, funciones OAuth, validación y documentación.

**Probado localmente:** configuración aceptada por Decap, producción estática, referencias e imágenes, preservación de datos, edición/creación/ocultación mediante archivos equivalentes al CMS, responsive básico y seguridad del protocolo OAuth con transporte aislado.

**Pendiente:** credenciales, permisos y protección de rama, despliegue autorizado, login real, operaciones de GitHub desde Decap, carga real de medios con las reglas activas, preview y publicación en Vercel, vinculación del dominio y Safari en dispositivos reales.

La implementación está preparada para revisión y activación. No se declara operativa en producción hasta completar las acciones anteriores.
