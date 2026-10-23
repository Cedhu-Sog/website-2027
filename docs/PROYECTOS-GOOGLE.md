# Conexión de servidor: Vercel → Google Workspace

La preparación vigente del segundo intento de Fase B está en
[Etapa 1 del segundo intento](PROYECTOS-GOOGLE-FASE-B.md#segundo-intento--etapa-1-preparada-pendiente-de-autorización).
Production conserva el cierre `18d6047`; las referencias de ejecución anteriores
son históricas. La nueva ventana requiere confirmación operativa independiente.

## Procedimiento vigente de A: publicación Git y rollback manual supervisado

Este apartado actualiza las incidencias históricas de acceso documentadas más
abajo. El usuario mantiene la autorización de A y confirma acceso funcional a
Instant Rollback en su cuenta, con las entradas Current y Previous visibles.
La limitación 403 de la conexión automatizada no se interpreta como incapacidad
de la cuenta humana para recuperar el sitio. No se reintenta la API de rollback.

Antes del push se confirmó mediante consultas autenticadas:

- D0 conservado: `dpl_32q56RazKrxEDb3zjMijagEdJnGS`, Production / READY,
  `master`, SHA `f31507db1e45f583bf46d89674ba5360eab7099b`.
- Dominio `website-2027-seven.vercel.app` asignado a D0 y URL única
  `https://website-2027-gwvw1uc8r-cedhu-webmasters-projects.vercel.app`.
- El listado normal de Production, sin solicitar candidatos de rollback, sitúa
  D0 como el más reciente y no muestra despliegues posteriores/intermedios.
- Flag remoto `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED` exactamente `false`,
  exclusivamente Production. No se cambian variables ni se crean token/fecha.
- `master` local y remoto siguen en `f31507d`; las mismas 15 rutas permanecen
  seleccionadas explícitamente. No se repiten auditorías o suites ya aprobadas.
- El usuario confirma que mantendrá abierto Instant Rollback y permanecerá
  disponible durante despliegue y comprobaciones, antes de ejecutar el push.

Se conserva Auto-assign Enabled: el push autorizado puede sustituir el dominio
automáticamente al terminar el build. Se supervisarán el SHA exacto, el deployment
nuevo, logs, asignación del alias, humo y errores de Functions. Tras publicarse,
D0 debe quedar como el Production inmediatamente anterior; se comprobará que
no haya intervenido otra publicación. No iniciar publicaciones CMS concurrentes.

Ante una regresión crítica comprobada, detener operaciones y comunicar literalmente
**EJECUTAR ROLLBACK MANUAL**, indicando restaurar
`dpl_32q56RazKrxEDb3zjMijagEdJnGS` en el proyecto `website-2027` del equipo
`cedhu-webmasters-projects`. El usuario ejecutará Instant Rollback desde su panel;
después se comprobarán alias y humo. Si el panel no ofrece ese destino, no elegir
otro silenciosamente ni efectuar una restauración destructiva. No ejecutar
rollback por API, cambios IAM/Workspace, rotaciones de claves ni Fase B.

Las pruebas con contraseña real, sesiones de navegador existentes y usuario OAuth
se harán mediante las interfaces habituales sin exponer credenciales. Cualquier
verificación que dependa del navegador del usuario se identificará como tal en el
informe; las pruebas HTTP automáticas no se presentarán como un login humano.

Para el siguiente paso, usar el [informe de preparación de Production del 22 de
octubre de 2026](#preparación-de-production--22-de-octubre-de-2026). Conserva la
validación local aprobada y distingue el despliegue cerrado de la futura ventana
de diagnóstico. Los apartados anteriores de validación son evidencia histórica.

## Ejecución autorizada de Fase A — comprobaciones previas

El usuario autorizó expresamente commit, push a `master`, despliegue automático,
validación y rollback ante regresión crítica, exclusivamente para A. La autorización
no incluye activar el diagnóstico, crear credenciales temporales ni consultar Google.

Referencia de recuperación aportada por el usuario: `32q56RazK`, Ready / Production
/ Current, rama `master`, SHA `f31507d`, dominio
`https://website-2027-seven.vercel.app`. El status GitHub previamente consultado
permite registrar la referencia completa asociada al SHA:
`32q56RazKrxEDb3zjMijagEdJnGS`, en
[Vercel](https://vercel.com/cedhu-webmasters-projects/website-2027/32q56RazKrxEDb3zjMijagEdJnGS).
No se conoce su URL inmutable ni se ha vuelto a comprobar su asignación Current
directamente en Vercel; no se confunde el dominio permanente con esa URL.

En las comprobaciones previas a ejecutar la autorización, Git sigue en `master`,
sin cambios staged preexistentes, y `git ls-remote` mantiene el SHA completo
`f31507db1e45f583bf46d89674ba5360eab7099b`. El inventario conserva seis modificados
y nueve nuevos. El código/package/lockfile coinciden con el baseline ya aprobado;
solo la documentación había cambiado. No se repitieron builds o suites completas.
La comprobación mínima con Node 22.23.4 confirmó configuración local cerrada,
`.env.local` intacto, 457 archivos versionables y 501 públicos sin los valores
privados configurados, y POST del handler local 404 con cero llamadas fetch.

La sesión no dispone de CLI Vercel, token de API disponible en el entorno ni
conector autenticado. Se encontró el plugin oficial Vercel disponible, todavía
sin instalar/conectar, y se facilitó su conexión. Se requiere acceso operativo
para comprobar que la referencia no cambió, obtener la asignación/URL efectiva,
supervisar build/runtime y ejecutar Instant Rollback si hiciera falta. Esto es
una condición pendiente de acceso, no una solicitud de nueva autorización de A.
Mientras no se resuelva, no se realiza commit ni push. Las variables remotas
ocultas conservan la confirmación administrativa previa, no una lectura propia.

### Actualización: complemento Vercel conectado, publicación detenida por permisos

Con el complemento conectado se realizaron consultas autenticadas de lectura:

- Proyecto `website-2027`: `prj_fiyvmDyYqGoh8eRAKlY5FYZAHC8p`; equipo
  `team_fSupqaSBZgzyLqIvd7oWCh8G`, correspondiente al scope suministrado
  `cedhu-webmasters-projects`.
- D0: **`dpl_32q56RazKrxEDb3zjMijagEdJnGS`**, READY, target Production,
  rama `master`, SHA `f31507db1e45f583bf46d89674ba5360eab7099b`.
- URL única confirmada:
  `https://website-2027-gwvw1uc8r-cedhu-webmasters-projects.vercel.app`.
- La consulta del alias `website-2027-seven.vercel.app` devuelve exactamente ese
  deployment ID y el mismo project ID. El proyecto también lo devuelve como último
  deployment: no se reemplazó silenciosamente la referencia de recuperación.
- Las diez variables de Google/diagnóstico existen con target exclusivamente
  Production. Se consultó individualmente solo el valor no secreto del flag:
  **`PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED` es exactamente `false`**. Token y fecha
  temporales no figuran en el listado. Las variables históricas de CMS/portal
  figuran sin leer sus valores; la allowlist opcional de CMS no figura. No se
  modificó ninguna variable ni se descargaron archivos de entorno.
- El selector general Node del proyecto devuelve **24.x**, distinto de la
  confirmación visual anterior de 22.x. El candidato conserva `engines.node`
  `^22.19.0`, que selecciona la línea 22 según la precedencia documentada; no se
  modifica el selector remoto ni se considera la advertencia un fallo de build.
  El runtime efectivo del candidato se verificará en su aceptación, si se publica.

**Bloqueo previo comprobado:** listar los candidatos de recuperación mediante
`GET /v7/deployments` con `rollbackCandidate=true` devolvió HTTP **403 forbidden**,
acción `list`, recurso `deploymentRollback`: la conexión no tiene permiso para
listar ese recurso. No se ejecutó una solicitud de rollback como prueba, pues
sería una mutación de Production. La alternativa CLI indicada por la respuesta no
está disponible: no hay CLI Vercel ni credenciales de API en el entorno. No se
reintentó sin cambios ni se asumió que reinstalar o volver a autenticar lo resolvería.

Se conserva la publicación detenida conforme a la autorización condicional: no
hubo commit, push, deployment, promoción ni rollback. Las mismas 15 rutas siguen
staged; la única edición local de esta continuación es este registro técnico.
Para continuar se debe resolver el acceso operativo al recurso de rollback o
disponer de una alternativa autenticada válida para ese mismo proyecto/equipo.
El complemento sí funciona para las lecturas realizadas; la incidencia actual
es de permisos de recuperación, no de instalación ni de diagnóstico Google.

## Estado y alcance

Implementación local, de solo lectura. No se ha realizado commit, push, despliegue,
intercambio real de tokens ni consulta a Google Workspace. No se han cambiado IAM,
permisos de Drive, registros, encabezados, autenticación del portal ni Decap CMS.
Astro conserva `output: 'static'`; no se necesita adaptador SSR.

Los encabezados fueron confirmados por los administradores durante esta fase y
están definidos exclusivamente en `src/server/google/config.js`: Proyectos A1:R1
(18), Usuarios A1:I1 (9), Actividad A1:I1 (9). Se compara texto y orden exactos,
incluidas columnas adicionales; no se normalizan ni corrigen las hojas.

La administración confirmó expresamente la correspondencia entre cada archivo y
su ID; se corrigió el intercambio de Usuarios y Actividad. Los valores reales se
conservan únicamente en `.env.local`, excluido de Git, y deberán configurarse en
Vercel. Esta guía y `.env.example` no contienen IDs privados de Drive/Sheets.
El diagnóstico comprobará nombre, pestaña y pertenencia de cada archivo antes de
leer sus encabezados. La confirmación administrativa no acredita todavía permisos
ni membresía mediante las API. No se consultó contenido remoto.

## Cierre de validación local con Node 22

Resultado del 21 de octubre de 2026: **APTO para preparar el primer despliegue
controlado de diagnóstico en Production**, sujeto a autorización expresa y al
procedimiento de acceso/cierre de esta guía. La validación local de Node 22 queda
cerrada. No equivale a una conexión real ni autoriza un despliegue.

| Comprobación | Resultado con Node 22 |
| --- | --- |
| Runtime exacto | Node **22.23.4**, Windows x64; npm **10.9.9** incluido en la distribución |
| Origen y aislamiento | ZIP oficial `https://nodejs.org/dist/v22.23.4/node-v22.23.4-win-x64.zip`; extraído en `.vercel/local-node22-validation-20261021/`, excluido de Git |
| Integridad | SHA-256 cotejado con `SHASUMS256.txt` del mismo release oficial; firma Authenticode de `node.exe` **Valid**, firmante OpenJS Foundation |
| Ejecución efectiva | PATH y `NODE_OPTIONS` solo del proceso de validación; un preload comprueba versión/ejecutable y registra npm, tests, subprocesos y Astro, todos con v22.23.4 |
| Instalación | `npm ci --engine-strict --no-fund --audit=false`: código **0**, 246 paquetes; package y lockfile sin cambios |
| Google OIDC/WIF, Drive/Sheets y diagnóstico | `npm run test:proyectos:google`: **17/17**, sin conexión real |
| Sesiones y protección del portal | `npm run test:proyectos`: **14/14** |
| Decap/GitHub y contenido/fechas | `npm run test:cms`: **13/13**; OAuth simulado y builds locales de regresión |
| Imágenes | `npm run test:images`: **7/7**; Sharp del propio Astro, AVIF/SVG/PNG/JPEG/WebP |
| Build explícito | `npm run build`: código **0**, `output: static`, sin SSR |
| Verificadores | Prebuild CMS y postbuild `check:site` correctos; `check:proyectos:build` código **0**, con segundo build necesario para inyectar credenciales sintéticas y descartar su publicación |
| Sitio generado | **30 HTML**, **4294 referencias locales** y **9 PDF** verificados; Astro informa 31 entradas generadas |
| Privacidad | **457 archivos versionables** y **501 públicos** sin los valores privados configurados; sin contraseñas/tokens/IDs sintéticos ni contenido privado del portal en `dist` |
| Resolución | `npm ls --all` código **0**; 246 entradas instaladas coinciden con el lockfile, sin engines incompatibles ni overrides fuera de rango |
| Audit | `npm audit` con npm 10.9.9: código **1**, solo **un aviso alto**, `http-cache-semantics@4.2.0`, GHSA-ch52-4w7c-c8xp; sin avisos nuevos |
| Configuración Google | Cuatro IDs locales coinciden exactamente con los autorizados; formato/identidad válidos; WIF esperado, issuer Team y subject Production coincidentes en código |
| Cierre del diagnóstico | `.env.local` conserva activación `false`, token/expiración vacíos; `.env.example` mantiene IDs y secretos vacíos |
| Protección local | SDK/diagnóstico rechazan entorno local con `production_required`; handler cerrado devuelve 404; comprobación adicional con fetch bloqueado, sin obtener tokens |
| Preservación | Huellas SHA-256 confirman que código, contenido, configuración, package, lockfile y `.env.local` quedaron idénticos al inicio; solo se actualizaron esta guía y `README.md` |

SHA-256 del ZIP oficial verificado:

```text
cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20
```

Se descargaron el índice de releases, el ZIP y su manifiesto exclusivamente desde
`https://nodejs.org/dist/`. La distribución y npm se ejecutaron después de verificar
checksum y firma. No se instaló un MSI, sustituyó Node 24 ni se cambió PATH de
usuario/máquina. Una terminal nueva sigue resolviendo Node 24.14.0/npm 11.9.0.
No se añadieron dependencias al proyecto. La herramienta temporal necesitó corregir
el escape de una ruta Windows en `NODE_OPTIONS` antes de iniciar `npm ci`; no fue
un fallo de la aplicación ni una incompatibilidad del runtime.

Los logs y herramientas locales están en la carpeta ignorada anterior, incluidos
`runtime-verification.json`, `runtime-processes.jsonl`, los cuatro logs de suites,
`build-node22.log`, `check-proyectos-build-node22.log`, `audit-node22.json` y el árbol
de dependencias. El registro de runtime no imprime argumentos, variables, cookies
ni tokens. Puede repetirse un comando desde la raíz con la herramienta local:

```powershell
& ./.vercel/local-node22-validation-20261021/with-node22.ps1 -NpmArgs @('run', 'test:proyectos:google')
```

Avisos no bloqueantes: `npm ci` informa la deprecación de `node-domexception` y
un `EPERM` al limpiar una carpeta opcional de `satteri-wasm32-wasi` en Windows;
termina correctamente y no hay dependencias instaladas incompatibles/faltantes.
Persisten los siete opcionales WASM marcados `extraneous` ya documentados y los
avisos del build por colección de eventos vacía y chunk mayor de 500 kB. Ninguno
requirió modificar versiones ni funcionalidades.

La comprobación de bloqueo local se refiere al backend y al preflight, que solo
valida formato. `proyectos:google:probe` sigue siendo un cliente administrativo
real hacia Production, no un simulador: **no se ejecutó** y no debe usarse como
prueba local offline. Las suites usan credenciales/transportes sintéticos y no
acreditan JWKS, STS/IAM ni permisos reales.

El usuario confirmó visualmente proyecto `website-2027`, equipo
`cedhu-webmasters-projects`, Production, Node Version **22.x** y Production
Overrides **22.x**, aplicables a builds y funciones Serverless. Se acepta como
confirmación aportada por el usuario; no se accedió a configuración remota.
Continúan pendientes únicamente las comprobaciones propias del despliegue:
patch/runtime Linux y empaquetado efectivo, contexto y frescura OIDC, audiencias
del proveedor, STS/suplantación, permisos/membresía y encabezados. El posible
rechazo por `maxTokenAge: '1h'` y el aviso de caché conservan sus límites descritos
más abajo. El navegador/handshake OAuth real y las respuestas HTTP de Vercel no se
probaron; se comprobaron automáticamente sus contratos y configuración local.

No se hicieron commits, push, despliegues, cambios en Google/Vercel ni activaciones
del diagnóstico. No se reemplazaron contraseñas ni secretos. El siguiente paso es
la configuración y prueba real **solo cuando el usuario lo autorice**.

## Archivos y dependencias

Nuevos:

- `src/server/google/config.js`: identidad permitida, validación de variables,
  esquema confirmado y errores seguros.
- `src/server/google/auth.js`: cliente de cuenta externa OIDC con suplantación.
- `src/server/google/repository.js`: consultas acotadas de metadatos y encabezados.
- `src/server/google/diagnostic.js`: comprobaciones y acceso administrativo temporal.
- `api/proyectos/google-diagnostic.js`: función Node Web Standard independiente.
- `scripts/proyectos/google.test.mjs`: pruebas sin servicios externos.
- `scripts/proyectos/google-check.mjs`: preflight local y cliente administrativo
  interactivo para la prueba real futura.
- `scripts/image-processing.test.mjs`: regresión de los codecs de imágenes usados por Astro.
- `docs/PROYECTOS-GOOGLE.md`: esta guía.

Modificados: `.env.example`, `package.json`, `package-lock.json`, `vercel.json`,
`README.md` y `scripts/proyectos/verify-build.mjs`. El timeout específico del diagnóstico es
30 segundos; las funciones previas de proyectos mantienen 15 y CMS mantiene 30.
No hay cambios de interfaz, estilos o páginas.

Dependencias directas fijadas: `@vercel/oidc@4.0.2` y
`google-auth-library@11.3.1`. Se inspeccionaron las API de las versiones instaladas.
La primera requiere Node >=20 y la segunda Node >=22, compatibles con el requisito
del proyecto `^22.19.0`. Se usan `node:test`, `node:crypto` y fetch nativo; no se
instalaron herramientas adicionales de validación ni el SDK completo `googleapis`.

## Actualización dirigida de dependencias

Astro queda fijado en `7.2.8`, sin migración a otra línea mayor. Los `overrides`
de `package.json` fijan versiones transitivas corregidas y reproducibles; todas
son compatibles con los rangos de sus consumidores. No se añaden librerías de UI
ni otro stack de imágenes. Las pruebas usan Sharp resuelto desde el propio Astro.

| Paquete | Antes | Versión objetivo | Motivo |
| --- | --- | --- | --- |
| Astro | 7.2.3 | 7.2.8 | RCE en procesamiento AVIF y bypass de rutas con base no raíz |
| Sharp | 0.35.3 | 0.35.5 | Correcciones de libheif y librsvg |
| devalue | 5.9.0 | 5.9.3 | Exposición de memoria y denegaciones de servicio |
| js-yaml | 4.3.1 | 4.3.2 | CPU excesiva en merges YAML |
| smol-toml | 1.8.0 | 1.9.1 | Parseo cuadrático |
| source-map-js | 1.2.1 | 1.2.2 | DoS mediante mapas indexados |
| SVGO | 4.0.2 | 4.1.0 | Bypasses del plugin removeScripts |
| Undici | 8.10.0 | 8.10.2 | Correcciones de TLS, caché y DoS |
| Vite | 8.2.1 | 8.2.4 | Fallos del servidor de desarrollo y launch-editor |

Los ocho overrides corresponden únicamente a dependencias transitivas afectadas.
Permiten instalar exactamente estas correcciones sin resolver versiones mayores
de devalue/js-yaml ni actualizar todo Astro/Vite a sus últimas versiones. El
lockfile registra la resolución instalada. En una actualización futura deberán
revisarse los pins: no son una política de mantener estas versiones indefinidamente.
`@vercel/oidc`, `google-auth-library`, Three y sus funciones mantienen sus versiones.

Aviso conservado para evaluación: `http-cache-semantics@4.2.0`,
[GHSA-ch52-4w7c-c8xp](https://github.com/github/advisory-database/issues/10139).
El mantenedor disputa el escenario descrito y no hay parche confirmado para ese
aviso. No se añade un override de 4.3.0 para ocultarlo: su corrección de `Vary` es
distinta del problema `max-stale` señalado. En este proyecto llega desde la caché
de imágenes remotas de Astro; las APIs privadas utilizan respuestas `no-store`
y no usan esta biblioteca. Esto reduce la exposición observada, sin demostrar que
el aviso esté resuelto. No se ejecutó `npm audit fix` ni `--force`.

La revisión local del 21 de octubre de 2026 confirmó que `npm audit` marca
`fixAvailable: true` para ese aviso. Se compararon los paquetes publicados 4.2.0
y 4.3.0 con `npm diff`: los cambios afectan `Vary`, el estado HTTP devuelto y
documentación; no modifican el tratamiento de `max-stale`. Por ello no se considera
confirmado el parche del aviso y se conserva explícitamente pendiente. La
evaluación anterior sobre la disputa del mantenedor no se volvió a consultar:
en esta revisión solo se usó el registro npm para dependencias y auditoría,
sin consultas a Google Workspace, Vercel Production ni cambios remotos.

Node mínimo del proyecto: `^22.19.0`, por el requisito de Undici. Se conserva la
línea 22 de Production. Vercel admite 22.x y selecciona automáticamente sus minor/
patch; su selector no fija un patch exacto. Antes del despliegue aprobado se debe
verificar el `node -v` del build y del runtime. No se modificó el proyecto remoto.
No usar una actualización genérica a Astro 7.4.2: requiere Node >=22.23.4 y queda
fuera de esta actualización dirigida.

## Revalidación local del 21 de octubre de 2026

Las versiones corregidas de la tabla y los cuatro IDs ya coincidían con lo
solicitado al iniciar esta revisión. Se conservaron los cambios locales anteriores;
no se reescribió `.env.local`, no se sustituyó la contraseña del portal ni se
modificó OAuth de Decap. Se actualizaron este informe, `README.md` y el verificador
del build, que ahora también comprueba el número privado de proyecto y añade
secretos sintéticos de CMS; el proceso de build fuerza el diagnóstico a `false`.

Se comparó con el lockfile de `HEAD`, sin modificar Git: la auditoría de esa base
detecta diez paquetes vulnerables (uno crítico, ocho altos y uno moderado). La
instalación actual deja solo el aviso alto de `http-cache-semantics`: nueve paquetes
afectados quedan corregidos, incluido el crítico de AVIF. `npm audit` termina con
código 1 por el aviso conservado; no se presenta como auditoría limpia.

| Validación ejecutada | Resultado |
| --- | --- |
| `npm ci --no-fund --audit=false` | Correcta; instala desde el lockfile sin actualizar rangos |
| `npm run test:proyectos:google` | 17/17; OIDC, SDK, scopes, allowlist, errores seguros y cierre administrativo; transportes simulados |
| `npm run test:proyectos` | 14/14; contraseña, sesiones, expiración, CSRF, límites y respuestas privadas |
| `npm run test:cms` | 13/13; OAuth simulado, fechas y builds reales con contenido válido e inválido |
| `npm run test:images` | 7/7; AVIF, SVG, PNG, JPEG y WebP con Sharp resuelto desde Astro |
| `node scripts/cms/content-smoke.mjs` | Correcto; edición, borradores, publicación local, fotografías, SEO y restauración del contenido original |
| `node --env-file=.env.local scripts/proyectos/google-check.mjs` | Configuración válida en formato; sin red |
| Correspondencia local de los cuatro IDs | Coincidencia exacta con los valores autorizados; no se copian a documentación ni ejemplos |
| `npm run check:proyectos:build` | Correcto; ejecuta `npm run build`, prebuild de CMS y postbuild del sitio |
| Comprobación posterior del sitio | 30 páginas HTML, 4294 referencias locales y nueve PDF válidos |
| Comprobación de privacidad del build | 457 archivos versionables y 501 archivos públicos sin los valores privados configurados; sin credenciales sintéticas en `dist` |
| Búsqueda adicional de patrones de credenciales | Sin coincidencias de claves privadas PEM/OpenSSH, claves API Google ni tokens GitHub en archivos versionables |
| `npm ls` de los paquetes corregidos y módulos OIDC | Resoluciones coincidentes con la tabla y SDK conservados; sin versiones vulnerables duplicadas de los paquetes corregidos |
| Rangos de los ocho overrides | Todos compatibles con las dependencias directas y opcionales de sus consumidores en el lockfile |
| `git diff --check` y sintaxis JavaScript | Sin errores |

La reinstalación y todas las pruebas se ejecutaron con Node **24.14.0** y npm
**11.9.0** en Windows x64. `npm ci` emite `EBADENGINE` porque el proyecto conserva
`^22.19.0`; no es una prueba ejecutada con Node 22. Los requisitos `engines` de las
dependencias aplicables a Windows x64 y Linux x64/arm64 admiten Node **22.19.0**.
Los binarios opcionales Linux de Sharp 0.35.5 están en el lockfile. No se ejecutó
el binario Linux ni se consultó la configuración real de Production en esta fase.

`npm ls --all` termina con código 0. npm 11.9.0 marca siete paquetes opcionales
WASM como `extraneous` incluso después de `npm ci`: `@emnapi/core`,
`@emnapi/runtime`, `@emnapi/wasi-threads`, `@img/sharp-wasm32`,
`@napi-rs/wasm-runtime`, `@tybys/wasm-util` y `tslib`. Todos tienen entrada en el
lockfile; Sharp usa el binario nativo Windows x64 y las pruebas de codecs pasan.
No se ejecutó `npm prune`: su simulación propone actualizar otros paquetes,
fuera del alcance de esta corrección dirigida.

El build conserva SSG y no introduce adaptadores SSR. Persisten avisos no
bloqueantes sobre la colección de eventos vacía y un chunk mayor de 500 kB.
El build valida compilación y genera tipos de Astro; no sustituye un chequeo
completo de tipos (`@astrojs/check` no está instalado).

Antes de la primera prueba controlada siguen pendientes: evaluar el aviso alto,
ejecutar la validación en Node 22 y verificar Node >=22.19 en build y Functions
de Vercel; trasladar administrativamente los IDs a las variables de Production;
confirmar en una fase autorizada permisos, WIF, JWKS, STS/IAM, unidad, pestañas y
encabezados. La configuración local solo comprueba formato y correspondencia.
El diagnóstico continúa deshabilitado, con autorización administrativa independiente
y expiración obligatoria; esta revisión no autoriza activarlo ni desplegar.

## Validación final antes de Production

La revisión estática previa se completó posteriormente con la ejecución aislada
en Node 22 autorizada por el usuario, documentada en el cierre al inicio de esta
guía. No se actualizaron dependencias ni funcionalidades; se reinstaló el lockfile
y se comprobaron los IDs locales sin publicarlos. Las conclusiones sobre el entorno
remoto siguen pendientes de la prueba autorizada; no se contactó Workspace.

### Node.js: compatibilidad declarada y ejecución local comprobada

`package.json` y el lockfile conservan `engines.node: ^22.19.0` y lockfile v3.
No existen `.nvmrc` ni `.node-version`. `vercel.json` configura Astro, build con
`npm run build`, salida `dist` y funciones Node independientes; no selecciona
otra línea de Node ni un runtime Edge. `astro.config.mjs` mantiene SSG.

| Paquete instalado | Requisito de Node |
| --- | --- |
| Astro 7.2.8 | >=22.12.0 |
| Sharp 0.35.5 | >=20.9.0 |
| Vite 8.2.4 | ^20.19.0 o >=22.12.0 |
| Undici 8.10.2 | >=22.19.0 |
| @vercel/oidc 4.0.2 | >=20 |
| google-auth-library 11.3.1 | >=22 |

Se comprobaron de nuevo los requisitos del lockfile aplicables a Windows x64,
Linux x64 y Linux arm64: ninguno excluye Node 22.19.0. Esto es análisis de rangos,
no ejecución de esos binarios. La variante opcional Windows ia32 de Sharp exige
Node 20 y no corresponde a este equipo ni al destino Linux de Vercel.

Al inicio solo se encontraron ejecutables Node 24.14.0 y 24.19.0. Después de la
autorización específica se obtuvo Node 22.23.4/npm 10.9.9 portátil oficial, con
checksum y firma verificados. Se ejecutaron correctamente las 51 pruebas, build
y verificadores con ese binario; Node 24 permanece instalado y predeterminado.

Usar **la versión 22.x mantenida por Vercel, >=22.19.0, tanto para build como para
Functions**. El usuario confirmó 22.x y Production Overrides 22.x en el proyecto;
el rango actual de `engines` también selecciona esa línea. Vercel administra los
minor/patch, por lo que 22.19.0 es un mínimo y no un pin de Production. No cambiar
el rango a `>=22`, que permitiría seleccionar 24.x. Ver la
[política oficial de Node en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Para reproducir la validación, usar la herramienta portátil documentada al inicio
o una distribución oficial 22.x mantenida de [Node.js](https://nodejs.org/en/download).
En una terminal que resuelva tanto `node` como `npm` de esa instalación, la secuencia
equivalente es la siguiente; no requiere cambiar el PATH global:

```powershell
node -p "process.execPath"
node --version
npm --version
# Debe ser 22.x y >=22.19.0 antes de continuar.
npm ci --engine-strict --no-fund --audit=false
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci con Node 22.' }
foreach ($check in @('test:proyectos:google', 'test:proyectos', 'test:cms', 'test:images', 'check:proyectos:build')) {
  npm run $check
  if ($LASTEXITCODE -ne 0) { throw "Falló $check con Node 22." }
}
```

La repetición se justifica únicamente por el cambio de runtime: comprueba el SDK,
crypto/scrypt, ESM, fetch/Streams, codecs nativos y generación SSG bajo Node 22.
El último comando incluye `npm run build` y los controles posteriores. No requiere
consultar Google. El preflight de `.env.local` se verificó por separado y solo
confirma formato e identidad, sin obtener tokens ni contactar servicios.

Frente a Node 24.14.0 cambian V8, OpenSSL, el fetch/Undici integrado y posiblemente
la versión de npm y resolución de opcionales; los rangos compatibles no prueban
equivalencia de comportamiento. En el Node 24.14.0 local, `process.versions.undici`
es 7.21.0: **el override npm de Undici 8.10.2 no actualiza el fetch de Node**.
Por eso se debe usar un patch mantenido de Node 22, no instalar el mínimo antiguo
como política permanente. Sharp selecciona además otro binario en Linux.

### Alcance real de http-cache-semantics

Cadena instalada: `astro@7.2.8 -> http-cache-semantics@4.2.0`. El único import en
el código distribuido de Astro está en `dist/assets/build/remote.js`, llamado por
`dist/assets/build/generate.js` para imágenes remotas. Allí se usan `storable()` y
`timeToLive()` al descargar/revalidar; no se pasa el `max-stale` de un visitante ni
se usa `evaluateRequest()` para servir solicitudes públicas.

La arquitectura actual genera archivos estáticos, sin adaptador SSR ni endpoint
Astro de imágenes en ejecución. El catálogo usa imports de archivos locales y
`src/lib/markdown-images.mjs` rechaza fotografías HTTP, data URL y URL relativas
a protocolo en Markdown. No se encontraron imágenes HTTP en los usos examinados.
No se debe incorporar una imagen o respuesta privada a un build: sus bytes podrían
terminar publicados aunque el origen indicara `no-store`.

Se inspeccionaron imports de las seis entradas `api/` y sus módulos `src/server/`.
Las únicas bibliotecas externas de esas funciones son los SDK OIDC/Google;
sus cierres de dependencias declaradas en el lockfile (24 y 23 paquetes,
respectivamente, incluidos opcionales/peers resolubles) no incluyen Astro ni
`http-cache-semantics`. Las funciones del portal y CMS usan módulos nativos.
No existe una ruta actual que pase respuestas Google, sesiones o cookies Decap
por esa caché. En esta arquitectura su uso corresponde al build/herramientas,
no al procesamiento de peticiones de las funciones. No hay un bundle de Functions
de Vercel generado localmente para certificar su exclusión física del artefacto;
la ausencia de una cadena ejecutable sí se comprobó en código y dependencias.

El [aviso oficial GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)
sigue clasificándolo como alto, afecta <=4.2.0 y no declara versión corregida.
La [solicitud de revisión del aviso](https://github.com/github/advisory-database/issues/10139)
recoge la discrepancia del mantenedor y sigue abierta al consultar. No se considera
retirado ni corregido por esa discrepancia. La comparación 4.2.0/4.3.0 de la fase
anterior no demostró un parche de `max-stale`; esta revisión no cambia versiones.

Una comprobación nueva, aislada y sin red, con cuatro combinaciones de respuestas
sintéticas `no-store`/`private` y peticiones `max-stale` confirmó que `storable()`
es falso. También mostró que invocar directamente `satisfiesWithoutRevalidation()`
sobre esas políticas puede devolver verdadero. La hipótesis inicial de que ese
método también las rechazaría resultó falsa: la mitigación requiere **no almacenar
ni consultar como compartidas esas respuestas**, no solo añadir una cabecera.
No se usaron cookies reales ni se reprodujo una exposición en una ruta del sitio.

Alternativa compatible actual: mantener imágenes locales, la separación SSG/API,
las respuestas privadas `no-store` y el aviso pendiente, sin sustituir dependencias
ni falsear el audit. Un cambio de motor de caché, fork, override a otra biblioteca
o servicio de imágenes sería una modificación distinta que exige revisión/pruebas;
no hay una sustitución necesaria y demostrada para el flujo actual. Revaluar antes
de añadir SSR, imágenes remotas autenticadas, proxy o caché compartida. No ignorar
el aviso en auditorías futuras. El riesgo observado de fuga por las funciones
actuales es bajo por falta de una cadena ejecutable; el paquete continúa afectado
según el aviso y el riesgo de build/cambios futuros no se declara nulo.

### Dictamen de preparación

**APTO para preparar el primer despliegue controlado de diagnóstico en Production**:
la ejecución local con Node 22 está cerrada y el usuario confirmó el selector 22.x
de Vercel. Se puede pasar a la preparación administrativa cuando se autorice; esta
conclusión no acredita todavía federación ni permisos reales y no autoriza desplegar.
El aviso de caché no demuestra exposición por las funciones actuales y se conserva
como riesgo residual explícito. No se necesita migrar a SSR ni alterar autenticaciones.

Los pendientes verificables solo en la fase remota autorizada son el empaquetado
real de Functions, el contexto OIDC, las versiones efectivas, IAM/WIF, APIs,
membresía y encabezados. Existe además un posible rechazo seguro: el código exige
`maxTokenAge: '1h'`, mientras Vercel documenta dos horas de validez para tokens de
Functions. Un token válido con más de una hora puede producir `oidc_invalid`.
Hacer la prueba en una invocación reciente tras el despliegue, sin asumir frescura;
si ocurre, detenerse y evaluar de forma autorizada la edad/refresco con resultados
sanitizados. No relajar firma, audiencia, identidad o antigüedad automáticamente.

## Flujo de autenticación

1. Un administrador invoca el diagnóstico protegido. La función comprueba primero
   activación, Production, expiración, clave administrativa, método, origen y
   ausencia de parámetros/cuerpo. Un usuario con la contraseña de proyectos no
   obtiene acceso administrativo por ese hecho.
2. Dentro de esa invocación se crea un `IdentityPoolClient`. Su
   `subject_token_supplier.getSubjectToken()` llama a `getVercelOidcToken()`.
   Nunca se obtiene un token durante imports, prerenderizado o compilación.
3. `verifyVercelOidcToken()` verifica criptográficamente el JWT con las claves
   públicas de Vercel. Se exige RS256, issuer Team exacto, audiencia exacta, subject
   exacto, `environment=production`, expiración, emisión y antigüedad máxima de una
   hora. `project_id` debe coincidir con `VERCEL_PROJECT_ID` del runtime.
   No se acepta simplemente decodificar un JWT.
4. La biblioteca de Google intercambia ese JWT mediante STS usando la audiencia
   del proveedor WIF, que es distinta de la audiencia del JWT:

   ```text
   //iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}
   ```

5. Con el token federado, la biblioteca llama a IAM Credentials
   `generateAccessToken` para la cuenta de servicio fijada, con vida solicitada de
   600 segundos y scopes finales `drive.readonly` y `spreadsheets.readonly`.
   El scope interno `cloud-platform` que usa el SDK en STS sirve para la llamada
   de suplantación; no se incluye en el token final de Drive/Sheets.
6. Las credenciales temporales permanecen en memoria del cliente de esa invocación.
   No hay claves JSON, ADC, OAuth de usuarios, delegación de dominio, refresh tokens
   persistentes, archivos de tokens ni caché global de credenciales de aplicación.

Google también debe validar issuer/audiencia/firma y autorizar en IAM el subject
Production exacto. Las validaciones locales no reemplazan esa política.

Issuer: `https://oidc.vercel.com/cedhu-webmasters-projects`.
Audiencia JWT: `https://vercel.com/cedhu-webmasters-projects`.
Subject: `owner:cedhu-webmasters-projects:project:website-2027:environment:production`.

## Variables de Production

Todas son de servidor, sin prefijo `PUBLIC_`. Los IDs no son contraseñas, pero no
se publican en HTML, bundles ni respuestas de diagnóstico.

| Variable | Valor / origen | Tratamiento |
| --- | --- | --- |
| `GCP_PROJECT_ID` | `cedhu-repositorio` | Configuración de identidad; no es secreto |
| `GCP_PROJECT_NUMBER` | Número confirmado en Google Cloud; configuración local excluida de Git | Identificador reservado; no es credencial |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `cedhu-repositorio-backend@cedhu-repositorio.iam.gserviceaccount.com` | Identidad; no es secreto |
| `GCP_WORKLOAD_IDENTITY_POOL_ID` | `vercel-cedhu-prod` | Configuración; no es secreto |
| `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `vercel-team-cedhu` | Configuración; no es secreto |
| `PROYECTOS_DRIVE_ROOT_ID` | ID de la unidad Repo Investigación; no el de 00_Sistema | Identificador privado; no publicar |
| `PROYECTOS_METADATA_SPREADSHEET_ID` | ID confirmado de Catalogo_Proyectos | Identificador privado; no publicar |
| `PROYECTOS_AUTH_SPREADSHEET_ID` | ID confirmado de Usuarios_Autorizados | Identificador privado; no publicar |
| `PROYECTOS_AUDIT_SPREADSHEET_ID` | ID confirmado de Registro_Actividad | Identificador privado; no publicar |
| `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED` | `false` inicialmente y al cerrar; `true` solo en la ventana autorizada | Bandera; no es secreto |
| `PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN` | Omitir/vacío mientras esté cerrado; 32 bytes aleatorios, 64 hex minúsculas para la prueba | **Secreto**, independiente; guardar como Secret/sensible |
| `PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT` | Omitir/vacío mientras esté cerrado; ISO UTC con `Z`, ventana propuesta de 20 minutos y máximo una hora restante | Fecha de control; no es secreto |

Las cinco primeras bastan para construir el cliente WIF. El diagnóstico completo
exige las nueve variables solicitadas antes de obtener tokens; las tres últimas
habilitan el acceso temporal. `VERCEL`, `VERCEL_ENV`, `VERCEL_PROJECT_ID` y, si
existe, `VERCEL_TARGET_ENV` son variables de sistema de Vercel. Habilitar su
exposición al runtime en Settings si fuera necesario; no inventar sus valores ni
configurar manualmente `VERCEL_OIDC_TOKEN`.

No copiar secretos existentes para revisarlos. Para conservar los servicios ya
probados, verificar administrativamente la presencia de estas variables sin
revelar ni sustituir sus valores:

| Variable existente | Tratamiento |
| --- | --- |
| `PROYECTOS_PASSWORD_HASH` | **Secreto derivado de contraseña**; conservar el hash actual |
| `PROYECTOS_SESSION_SECRET` | **Secreto**; conservarlo para no invalidar sesiones |
| `CMS_ORIGIN` | Configuración HTTPS del origen OAuth ya operativo |
| `GITHUB_OAUTH_CLIENT_ID` | Identificador OAuth; no es secreto |
| `GITHUB_OAUTH_CLIENT_SECRET` | **Secreto**; no modificar |
| `CMS_OAUTH_COOKIE_SECRET` | **Secreto**; no modificar |
| `CMS_GITHUB_ALLOWED_USERS` | Política opcional actual; no modificar |

Variables de sistema: `VERCEL=1`, `VERCEL_ENV=production`, `VERCEL_PROJECT_ID`
con formato `prj_...`, y `VERCEL_TARGET_ENV` ausente o `production`. Las proporciona
Vercel; no son secretos y no se deben suplantar con valores manuales. El JWT OIDC
sí es una credencial temporal: el helper lo toma del contexto de la invocación;
no se configura como secreto estático ni se copia a `.env`. No se necesita
`GOOGLE_APPLICATION_CREDENTIALS`, clave JSON, refresh token ni delegación de dominio.
Tampoco se necesita `GCP_AUDIENCE`: este código construye la audiencia STS y valida
la audiencia JWT fijada en servidor. Ninguna de estas variables debe usar `PUBLIC_`.

Para Sheets, copiar únicamente el segmento entre `/spreadsheets/d/` y el siguiente
`/` de la URL original. `gid` identifica una pestaña y **no** es el spreadsheet ID.
Para la unidad, abrir su raíz desde Unidades compartidas y cotejar el ID de la URL
original. No usar el ID de `00_Sistema`. El servidor confirma después con
`drives.get` que se trata de la unidad esperada.

Configurar solo **Production**, sin alterar `CMS_*`, `GITHUB_*` ni
`PROYECTOS_PASSWORD_HASH`/`PROYECTOS_SESSION_SECRET`. El token administrativo debe
ser distinto de cualquier contraseña, sesión o credencial de Vercel/Google. Marcarlo
como sensible y entregarlo únicamente a los administradores por el gestor seguro.
No pegar secretos en Git, chat, URLs, comandos con argumentos o logs. No usar los
comandos existentes que imprimen secretos para generar esta clave de diagnóstico.

## Protección de la prueba

La autenticación compartida no contiene roles y no puede identificar a los tres
administradores. Se propone una capacidad administrativa temporal independiente:
`Authorization: Bearer` con 256 bits aleatorios, comparación de tiempo constante,
activación explícita y expiración absoluta. Esta propuesta está implementada
**deshabilitada**; su habilitación y el despliegue requieren autorización humana.
No cambia el login existente ni concede roles a los usuarios de la hoja Usuarios.

El endpoint es `POST /api/proyectos/google-diagnostic`, únicamente en el origen
actual fijado en servidor. No admite IDs en query/body, GET, CORS, cookies como
credencial administrativa ni credenciales incluidas en una URL. Solicitudes sin
clave devuelven 401 cuando está habilitado; deshabilitado/expirado devuelve 404.
Todas las respuestas, incluidos errores, usan `no-store` para navegador y CDN,
`nosniff`, `noindex`, CSP y política de referencia restrictivas del helper existente.

Hay un límite de una comprobación simultánea por instancia, que **no** equivale a
un límite distribuido. Antes de habilitarlo, configurar o revisar en el Firewall de
Vercel una restricción por las IP administrativas disponibles o un rate limit
distribuido para todas las variantes de esta ruta (incluida extensión y slash final).
No usar reglas solo de Log como bloqueo. La clave fuerte y la expiración siguen
siendo obligatorias aunque se utilice el Firewall.

No hay interfaz ni enlace público al diagnóstico. Conocer la URL no autoriza.
El cliente CLI solicita la clave sin eco; no la toma de argumentos, variables de
entorno o archivos y solo muestra resultados sanitizados. No usar `curl -v`, trazas
HTTP, grabación de terminal ni volcado de errores del SDK. Revisar que observabilidad
y servicios externos no capturen Authorization, cookies o cuerpos de solicitudes.

## Consultas que realiza

Tras la federación, todas las llamadas a Workspace son GET:

1. `about.get`, únicamente `user.emailAddress`, para comparar la cuenta efectiva
   con la cuenta de servicio; no se devuelve el correo.
2. `drives.get` del ID fijo, `id,name`, sin `useDomainAdminAccess` elevado.
3. `files.list` acotado a `corpora=drive`, `driveId` configurado, parent raíz,
   MIME de carpeta, no eliminados y los tres nombres autorizados. Soporta Shared
   Drives, pagina con un límite y rechaza resultados incompletos/nombres duplicados.
4. Para cada ID permitido, `files.get` comprueba nombre, tipo nativo de Sheets,
   unidad y padre `00_Sistema`. Un shortcut, recurso ajeno, renombrado o movido
   se rechaza **antes** de consultar su contenido en Sheets.
5. `spreadsheets.get` solicita solo títulos/tipos de pestaña, sin datos de celdas.
6. `spreadsheets.values.get` lee exclusivamente `'Proyectos'!1:1`,
   `'Usuarios'!1:1` o `'Actividad'!1:1`. Se solicita toda la primera fila para
   detectar columnas adicionales a R/I; nunca se lee la fila 2 o registros.

Las comprobaciones son `configuration`, `federation`, `serviceAccount`, `drive`,
`structure`, `catalog`, `users`, `audit`. Respuesta: `ok` y resultados booleanos/
códigos de diagnóstico, sin tokens, IDs, nombres privados, filas o encabezados.
Si falla un prerrequisito, no se siguen leyendo recursos; una vez validada la
estructura, se comprueban las tres hojas de manera independiente.

## Validaciones locales

Sin red ni identidad real:

```powershell
npm run test:proyectos:google
npm run test:proyectos
npm run test:images
npm run test:cms
npm run check:proyectos:build
```

Ejecutar los comandos secuencialmente. Las pruebas CMS escriben fixtures temporales
y realizan builds; no deben competir con otra compilación. El último comando
ejecuta `npm run build` con prebuild/postbuild y credenciales/IDs sintéticos, y
escanea todos los archivos en `dist/` para descartar configuración Google, tokens,
contraseña y contenido reservado. También comprueba los valores privados presentes
en `.env.local`/entorno contra los archivos versionables y públicos, sin imprimirlos.
No introduce tokens reales en la compilación.

Preflight **sin red** con el archivo local ignorado:

```powershell
node --env-file=.env.local scripts/proyectos/google-check.mjs
```

También existe `npm run check:proyectos:google` para variables ya presentes en el
proceso. Solo comprueba formato, identidad fijada y unicidad; no puede demostrar
que un ID existe ni confirmar IAM o que cada URL corresponda al nombre asignado.
`.env.example` contiene marcadores vacíos; no debe superar el preflight hasta
completarlos en una configuración excluida de Git. `.env.local` tiene los IDs
confirmados; activación `false`, clave administrativa y expiración vacías. No
copiar ese archivo a `public/` ni incorporarlo al control de versiones.

La suite prueba el `IdentityPoolClient` instalado con transportes HTTP simulados:
construcción STS, suplantación, scopes finales, duración y caché por cliente. La
obtención del token es diferida. Se simulan fallos de firma/expiración e identidades
ajenas y se comprueban el rechazo de JWT malformados y los controles de acceso,
estructura, permisos y encabezados. Esto **no** acredita federación real, la
disponibilidad de JWKS ni la integración final del contexto del runtime Vercel.

Las pruebas de imágenes incluyen decodificación de un AVIF existente de confianza,
rasterización SVG en memoria y encode/decode de PNG, JPEG, WebP y AVIF, usando la
misma instalación nativa de Sharp que Astro. No se añaden fixtures al contenido
institucional ni se modifican archivos multimedia existentes.

## Procedimiento real, pendiente de autorización

Este es un plan para una fase futura. Ningún paso remoto se ejecutó ni queda
autorizado por esta documentación. La aprobación de un despliegue con diagnóstico
cerrado no implica permiso para activar la conexión. Las fases de activación y
retirada deben estar incluidas expresamente en la autorización de la ventana.

1. **Cerrar Node 22 y preparar reversión.** Completar el procedimiento local de
   Node 22 anterior y revisar el diff sin modificar el lockfile. Un administrador
   identifica el despliegue estable al que se puede volver y confirma que su
   diagnóstico esté ausente/cerrado. Registrar su ID y dominio, sin credenciales.
   Revisar capacidad de rollback del plan de Vercel y conservar el origen actual
   `https://website-2027-seven.vercel.app`: el portal y el cliente de diagnóstico
   lo tienen fijado. No probar mediante otro dominio ni ampliar el origen.
2. **Revisión administrativa de confianza, sin escrituras.** Confirmar APIs
   necesarias (STS, IAM Service Account Credentials, Drive y Sheets), provider
   activo, issuer en modo Team coincidente con el código y mapping
   `google.subject=assertion.sub`. El JWT usado aquí tiene audiencia
   `https://vercel.com/cedhu-webmasters-projects`: la lista de audiencias
   permitidas del proveedor debe aceptar exactamente ese valor. Elegir solo la
   audiencia predeterminada del recurso WIF, sin aceptar la del Team, sería
   incompatible con este código. La audiencia del intercambio STS sigue siendo
   el recurso `//iam.googleapis.com/projects/.../providers/...`; son dos controles
   distintos. Confirmar que `roles/iam.workloadIdentityUser` sobre la cuenta de
   servicio esté limitado al principal exacto:

   ```text
   principal://iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/subject/owner:cedhu-webmasters-projects:project:website-2027:environment:production
   ```

   No ampliar a todo el pool, Preview/development, roles Owner/Editor ni delegación
   de dominio para resolver un fallo. Si la configuración no coincide, detenerse:
   cualquier cambio IAM/WIF requeriría una autorización diferente. Confirmar también
   membresía de la cuenta, unidad e IDs y ubicación de las hojas en `00_Sistema`,
   sin mover archivos, escribir celdas o hacerlos públicos. Revisar el rol existente
   Gestor de contenido y otras membresías: los scopes finales readonly limitan
   esta implementación, pero no revocan los permisos amplios de la cuenta.
3. **Preparar el proyecto existente.** Tras autorización de configuración, usar
   las nueve variables de integración de la tabla en Production y conservar las
   siete variables previas de CMS/portal. Mantener
   `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED=false`, sin token ni
   expiración administrativos. Seleccionar Node 22.x y revisar disponibilidad de
   OIDC y variables de sistema en Functions. No descargar variables con `vercel
   env pull`. No colocar secretos en el build command ni en valores `PUBLIC_`.
4. **Primer despliegue expresamente autorizado, todavía cerrado.** Construir con
   Node 22.x >=22.19.0, Astro SSG y `npm run build`. Registrar solo versión de Node
   y resultado del build; comprobar en el artefacto de Functions runtime Node 22,
   handler ejecutable y timeout efectivo de 30 s para el diagnóstico. Si hace falta
   certificar el patch de Functions, usar instrumentación temporal autorizada que
   registre únicamente `process.version`; no añadir un endpoint público de entorno.
   Mantener el diagnóstico cerrado hasta que se confirme. Verificar que la función
   no incluya un import ejecutable de Astro/caché y que no haya datos Workspace en
   archivos estáticos. POST al diagnóstico debe devolver 404 sin obtener tokens.
   Verificar sitio, login/sesión/logout de `/proyectos` y acceso habitual a `/admin/`
   sin publicar contenido ni cambiar la autenticación. Un fallo obliga a detenerse.
5. **Autorizar una ventana de conexión de 20 minutos.** Antes del despliegue activo,
   preparar una clave nueva en gestor seguro, fecha de cierre absoluta UTC y
   operador responsable. Configurar Firewall para las IP administrativas o un
   límite distribuido específico de la ruta; incluir variantes `.js` y slash final.
   Confirmar que observabilidad no captura Authorization, cookies ni cuerpos.
   Activar las tres variables temporales y realizar un nuevo despliegue autorizado:
   cambiar variables no afecta al despliegue existente. El plazo cuenta desde la
   fecha absoluta, incluye el build y nunca se amplía automáticamente. Si el build
   consume la ventana, detenerse y acordar otra; no quitar la expiración.
6. **Comprobar acceso antes de Google.** Durante la ventana, POST sin Authorization
   o con solo cookie del portal debe dar 401; GET, 405; con clave correcta y query o
   cuerpo, 400; origen ajeno, 403. El control deshabilitado/expirado tiene precedencia
   y devuelve 404. Comprobar `no-store` de navegador y CDN. Solo tras esos controles,
   desde una terminal interactiva segura ejecutar:

   ```powershell
   npm run proyectos:google:probe
   ```

   La clave se introduce sin eco, sin argumentos ni archivos; las redirecciones se
   rechazan y no hay parámetros de recursos. Una ejecución basta: esperar HTTP 200,
   `ok=true` y ocho resultados correctos (`configuration`, `federation`,
   `serviceAccount`, `drive`, `structure`, `catalog`, `users`, `audit`). Esto prueba
   federación, suplantación, membresía, metadatos y encabezados de fila 1; no lectura
   de registros, escritura ni ausencia de otros permisos de la cuenta. Conservar
   solo ID de despliegue, hora UTC, HTTP, booleanos y códigos sanitizados.
7. **Criterio de parada.** Ante 503, timeout, `oidc_invalid`, resultado inesperado
   de acceso o regresión CMS/portal, no repetir en bucle ni ampliar scopes/roles.
   No volcar tokens, errores crudos ni requests del SDK. Cerrar la ventana y
   diagnosticar únicamente el código seguro en una fase autorizada. Un 403/404 de
   Google puede ocultar recursos sin distinguir ID incorrecto de falta de permisos.
8. **Reversión si es necesario.** El operador bloquea inmediatamente el diagnóstico
   en Firewall en todos los hosts/alias del proyecto y restaura el despliegue
   estable identificado. Esto recupera sitio y APIs, pero no desactiva la URL única
   del despliegue activo anterior. Protegerla o retirarla por separado. No rotar la
   contraseña ni las claves CMS/sesión como parte de esta reversión. El diagnóstico
   no escribe Workspace, por lo que no hay cambios de celdas/archivos que revertir.
9. **Cierre aun cuando la prueba funcione.** Restablecer
   `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED=false`, retirar el
   token y la fecha, y redesplegar la versión cerrada dentro del alcance autorizado.
   Comprobar 404 y repetir solo la verificación funcional mínima de CMS/portal.
   Mantener el bloqueo de Firewall mientras se revisan todos los despliegues que
   recibieron `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED=true`; proteger o eliminar sus
   URLs y aliases. Cambiar las
   variables del proyecto o rotar el token no revoca sus copias antiguas. Verificar
   el cierre tras la expiración absoluta; las solicitudes ya en curso pueden agotar
   el presupuesto de respuesta de 25 s. Los tokens finales permanecen solo en
   memoria y tienen vida solicitada de 600 s; no se publican ni persisten.
10. **Retirada definitiva, en cambio autorizado posterior.** Eliminar
    `api/proyectos/google-diagnostic.js` y su regla específica de timeout; actualizar
    los tests que exigen esa ruta, retirar el cliente/comando temporal si ya no es
    necesario y mantener los módulos reutilizables. Validar el cambio y desplegar
    solo con autorización. Registrar el inventario de despliegues anteriores y no
    reutilizar uno con diagnóstico activo en un rollback futuro. No eliminar ahora
    archivos ni cambiar funcionalidades como parte de esta revisión.

## Errores, límites y riesgos pendientes

| Código | Interpretación y revisión |
| --- | --- |
| `configuration_missing`, `configuration_invalid`, `configuration_duplicate_ids` | Variables ausentes, inválidas o IDs repetidos; se devuelve solo su nombre cuando corresponde |
| `production_required` | Runtime local/Preview/custom rechazado; no ampliar confianza para probar localmente |
| `oidc_unavailable` | El helper no encuentra/obtiene el token en contexto; revisar OIDC de Vercel |
| `oidc_invalid` | JWT/firma/fechas/claims no válidos o JWKS inaccesible; revisar issuer, hora, entorno y proyecto |
| `federation_exchange_failed` | STS rechazó/no completó intercambio; revisar número, pool/provider, audiencia y políticas |
| `impersonation_failed` | IAM Credentials falló; revisar API y binding del subject sobre la cuenta |
| `google_authentication_failed`, `google_empty_token` | No se obtuvo credencial temporal utilizable |
| `service_account_mismatch`, `drive_mismatch` | Identidad efectiva o unidad no coinciden |
| `structure_mismatch`, `structure_incomplete` | Carpetas faltantes/duplicadas/fuera de raíz o listado no concluyente |
| `sheet_outside_repository_or_mismatch`, `sheet_not_allowed` | Recurso rechazado por pertenencia/nombre/tipo/allowlist |
| `sheet_tab_mismatch`, `sheet_headers_mismatch` | Pestaña/tipo/encabezados no coinciden; no se altera la hoja |
| `google_api_disabled`, `google_scope_insufficient` | Google devolvió razón estructurada de API deshabilitada/scope insuficiente |
| `google_forbidden` | Permisos, membresía o políticas Workspace; el 403 por sí solo no permite distinguirlas con certeza |
| `google_not_found_or_inaccessible` | ID equivocado o recurso oculto por falta de acceso; Google puede usar 404 en ambos casos |
| `google_unauthorized`, `google_rate_limited`, `google_timeout`, `google_unavailable` | Autorización, cuota o fallo temporal de red/servicio |

No se imprimen errores crudos: pueden contener headers Authorization, subject
tokens, cookies, URLs/IDs y cuerpos de Google. Los códigos STS/IAM identifican la
fase, no intentan deducir una causa exacta a partir de texto potencialmente sensible.

El presupuesto total de respuesta es 25 s y las consultas de Workspace tienen
timeout de 4 s, sin reintentos ni redirecciones. IAM usa opciones de transporte
acotadas; el transporte STS es interno al SDK y puede mantener reintentos pendientes
tras el timeout externo, hasta que termine la invocación de Vercel. No se realizan
escrituras y ningún resultado tardío se entrega al cliente.

La allowlist y las comprobaciones de unidad/padre limitan esta implementación;
los scopes OAuth no restringen por sí mismos a una unidad o fila. La cuenta conserva
su rol preexistente **Gestor de contenido**. Estos tokens finales solo permiten
lectura, pero un código futuro con permiso de suplantación podría pedir scopes
más amplios: revisar si el rol Lector es suficiente para esta fase antes de ampliar
el backend. No se ha modificado ningún rol.

No se puede demostrar localmente que la cuenta carece de otras membresías o
compartidos directos. Esa revisión de ACL/IAM debe realizarse administrativamente;
la prueba no enumera otros Drives ni sondea recursos ajenos. Tampoco demuestra
ausencia de permisos de escritura en la cuenta por tener tokens de solo lectura.

La clave administrativa identifica una capacidad compartida por los administradores,
no personas ni roles Google. Si se necesita auditoría individual, habrá que diseñar
autenticación administrativa individual en otra fase. No se utiliza la hoja Usuarios
para autorizar acceso en esta implementación.

## Preparación de Production — 22 de octubre de 2026

### A. Estado del proyecto

Esta revisión **no ejecutó commit, push, despliegues, promociones, rollback,
activación ni consultas a Google Workspace**. No cambió configuración remota,
credenciales, dependencias ni código de aplicación. Solo amplió este documento.

Rama local: `master`. Remoto fetch/push:
`https://github.com/Cedhu-Sog/website-2027.git`. HEAD, `origin/master` y la consulta
de lectura `git ls-remote origin refs/heads/master` coinciden en
`f31507db1e45f583bf46d89674ba5360eab7099b`. El índice está vacío. La API pública
de GitHub confirma `default_branch=master`, repositorio público, no archivado y
propietario de tipo **Organization**. La rama Production configurada en Vercel
es `master`, confirmada directamente por el usuario en Branch Tracking. Es
evidencia administrativa aportada; no se presenta como lectura propia de Vercel.

El siguiente commit previsto contiene exactamente **15 rutas**:

| Estado actual | Archivo | Responsabilidad |
| --- | --- | --- |
| Modificado | `.env.example` | Nombres de variables; IDs y secretos vacíos, diagnóstico `false` |
| Modificado | `README.md` | Runtime y comandos aprobados |
| Modificado | `package.json` | Dependencias fijadas, engines y comandos |
| Modificado | `package-lock.json` | Resolución reproducible ya validada |
| Modificado | `scripts/proyectos/verify-build.mjs` | Verificación de privacidad ya aprobada |
| Modificado | `vercel.json` | Timeout específico del nuevo diagnóstico |
| Nuevo | `api/proyectos/google-diagnostic.js` | Entrada de la función independiente |
| Nuevo | `docs/PROYECTOS-GOOGLE.md` | Guía técnica e informe de preparación |
| Nuevo | `scripts/image-processing.test.mjs` | Regresión de imágenes ya aprobada |
| Nuevo | `scripts/proyectos/google-check.mjs` | Preflight offline y cliente administrativo |
| Nuevo | `scripts/proyectos/google.test.mjs` | Pruebas offline de Google y diagnóstico |
| Nuevo | `src/server/google/auth.js` | OIDC, STS y suplantación |
| Nuevo | `src/server/google/config.js` | Identidad, variables y esquema permitido |
| Nuevo | `src/server/google/diagnostic.js` | Control de acceso y resultado sanitizado |
| Nuevo | `src/server/google/repository.js` | Lecturas limitadas de Drive/Sheets |

El despliegue reconstruirá también los archivos previamente versionados del sitio,
CMS y portal. La tabla representa el delta completo, no una carga de solo 15
archivos. No hay cambios en páginas, CSS, contenido, OAuth ni sesiones existentes.

`git check-ignore` confirma la exclusión de `.env.local`, `.vercel/`, la distribución
portátil Node 22, `.astro/`, `dist/` y `node_modules/`. No hay archivos de esas rutas
en el inventario versionable. Los nueve PDF institucionales de `public/documentos/`
ya eran públicos y no cambiaron. No se añadieron documentos privados, JSON de
cuenta de servicio, volcados de tokens ni diagnósticos locales. Un log técnico
preexistente de QA de Blender permanece intacto; no se confunde con logs de Google.

Validación mínima de esta revisión, sin repetir suites ni builds aprobados:

| Comprobación | Resultado |
| --- | --- |
| SHA-256 frente al baseline local de Node 22 | 457 archivos comparados; solo `README.md` y esta guía diferían antes de la edición documental actual |
| `.env.local` frente al baseline | Misma huella; no se imprimió ni cambió su contenido |
| Sintaxis de los ocho archivos JS/MJS nuevos | Correcta con Node 22.23.4 |
| Package/lockfile | Dependencias raíz y engines coinciden; lockfile v3; URLs de resolución del registro público npm |
| Privacidad | 457 archivos versionables y 501 públicos sin los valores privados configurados ni claves privadas PEM |
| Frontera cliente/servidor | Sin imports/configuración Google en páginas, componentes, layouts o scripts cliente |
| Rutas estáticas | Ningún archivo generado en `dist/api/`; no se observan colisiones |
| Handler real importado con red bloqueada | POST cerrado: 404, `not_found`, cero llamadas fetch y `no-store` |
| `git diff --check` | Correcto |
| `npm audit --json`, npm 10.9.9 | Salida esperada 1: un aviso alto de `http-cache-semantics@4.2.0`; cero nuevos |

No se ejecutaron `npm ci`, suites completas ni un nuevo build: el código, package
y lockfile coinciden con el estado ya aprobado. La única edición de esta fase es
Markdown. Se conserva la evidencia previa 17/17 Google, 14/14 portal, 13/13 CMS,
7/7 imágenes y build completo. Una consulta auxiliar de inventario falló al tratar
un archivo nuevo como si ya estuviera seguido; se corrigió usando el listado Git
de archivos sin seguimiento y se confirmó el inventario de nueve nuevos. No afectó
la aplicación ni se presenta ese intento como prueba aprobada.

### B. Preparación de Production

**Evidencia directa local:** Astro `output: 'static'`, preset `astro`, comando
`npm run build`, salida `dist`, sin adaptador SSR ni reglas `builds`/rewrites que
capturen APIs. Los seis handlers independientes son `api/cms/auth.js`,
`api/cms/callback.js`, `api/proyectos/login.js`, `api/proyectos/logout.js`,
`api/proyectos/session.js` y `api/proyectos/google-diagnostic.js`. Usan el contrato
Web Standard admitido por Vercel. Los imports del diagnóstico son de servidor;
las dependencias están en `dependencies`, no solo en `devDependencies`.

Se conserva Node Production **22.x**, según confirmación del usuario. Engines
`^22.19.0`, `@vercel/oidc@4.0.2` (Node >=20) y `google-auth-library@11.3.1`
(Node >=22) son compatibles. Node local efectivo de estas comprobaciones:
**22.23.4**; la terminal por defecto continúa en Node 24.14.0. No se cambia el
selector de Vercel ni se promete un patch que ese selector no fija.

El diagnóstico dispone de 30 s en la regla exacta, situada antes del glob general
de proyectos (15 s); CMS conserva 30 s. Presupuesto del handler: 25 s, más hasta
1 s para comprobar cuerpo vacío; transportes Workspace: 4 s por petición.
Los 30 s caben en Hobby tanto con Fluid Compute como sin él. El cierre transitivo
instalado de OIDC/Google tiene 47 paquetes, aproximadamente 15,5 MiB, sin faltantes
y sin Astro. Es una estimación de archivos locales, **no** el bundle final Linux.
Vercel admite hasta 250 MB sin comprimir; tamaño, tracing de imports dinámicos,
runtime y timeout efectivos deben comprobarse en el artefacto desplegado. No se
instaló un CLI/trazador ni se simuló un empaquetado que no se realizó.

**Variables:** los diez nombres indicados por el usuario coinciden con el código
y `.env.example`. Se comprobó `.env.local` sin imprimir valores:

| Variables | Resultado local / correspondencia esperada |
| --- | --- |
| `GCP_PROJECT_ID` | Identidad institucional fija coincidente |
| `GCP_PROJECT_NUMBER` | Coincide con el número confirmado por el usuario |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Cuenta institucional fija coincidente |
| `GCP_WORKLOAD_IDENTITY_POOL_ID` | Pool `vercel-cedhu-prod` |
| `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | Provider `vercel-team-cedhu` |
| `PROYECTOS_DRIVE_ROOT_ID` | ID de unidad compartida, no carpeta `00_Sistema` |
| `PROYECTOS_METADATA_SPREADSHEET_ID` | `Catalogo_Proyectos` / `Proyectos` |
| `PROYECTOS_AUTH_SPREADSHEET_ID` | `Usuarios_Autorizados` / `Usuarios` |
| `PROYECTOS_AUDIT_SPREADSHEET_ID` | `Registro_Actividad` / `Actividad` |
| `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED` | Exactamente `false` |

Los nueve valores requeridos tienen formato válido, sin espacios añadidos; los
cuatro IDs de Workspace son distintos. La correspondencia real nombre/ID procede
de la confirmación administrativa previa; no se volvió a consultar Google. El
diagnóstico comprobará unidad, padre, MIME, nombre, pestaña y encabezados antes de
dar esa correspondencia por acreditada mediante APIs.

Token y expiración administrativos locales están vacíos; el usuario informa que
no están configurados en Vercel. Se deben mantener ausentes en la Fase A.
No se usa ADC ni `GOOGLE_APPLICATION_CREDENTIALS` ni una clave JSON permanente.
Conservar las siete variables históricas: `CMS_ORIGIN`, `GITHUB_OAUTH_CLIENT_ID`,
`GITHUB_OAUTH_CLIENT_SECRET`, `CMS_OAUTH_COOKIE_SECRET`, `CMS_GITHUB_ALLOWED_USERS`,
`PROYECTOS_PASSWORD_HASH`, `PROYECTOS_SESSION_SECRET`; la allowlist de CMS conserva
su estado previo aunque esté vacía. No rotar valores ni cambiar ámbitos.
`VERCEL`, `VERCEL_ENV`, `VERCEL_PROJECT_ID` y, si existe, `VERCEL_TARGET_ENV` son
contexto de plataforma; no sustituirlos manualmente. El token OIDC debe obtenerse
del contexto de cada invocación, no copiarse a una variable administrada.

No hubo acceso autenticado a Vercel: no hay conector/CLI disponible, ni enlace
local `.vercel/project.json`; la navegación de lectura al proyecto redirigió a
Login. La página ofreció abrir la página informativa del plugin, que no proporcionó
acceso autenticado ni herramientas de proyecto; se cerró la pestaña temporal.
No se inició sesión, no se descargaron variables ni se inspeccionaron credenciales
del equipo. Nombres/ámbitos Production y Node remoto
se aceptan como evidencia aportada por el usuario, **no** verificación de valores
ocultos. Auto-assign quedó confirmado Enabled por el usuario. El ID exacto del
despliegue estable/asignación actual, límites consumidos y protección efectiva
quedan por registrar antes de publicar. La ausencia de enlace local CLI está
verificada; no afecta a la conexión remota GitHub.

**Actualización con la inspección administrativa del usuario:**

| Dato | Evidencia disponible |
| --- | --- |
| Production → Branch Tracking | `master`, confirmado por el usuario |
| Auto-assign Custom Production Domains | Enabled, confirmado por el usuario; se conserva |
| Dominio Production | `website-2027-seven.vercel.app`, confirmado por el usuario |
| Primera entrada de Deployments | Ready, etiqueta azul Production, «Cambio de lugar del botón» |
| Origen de la primera entrada | `Redeploy of HnvY8FJnQ` |
| Original | Commit `f31507d` de `master`; Ready Stale según la interfaz observada |
| Asignación efectiva del dominio / ID de la primera entrada | Inferencia razonable de vigente; pendiente de identificar y comprobar en detalle |

La posición del listado y el resaltado respaldan la hipótesis del usuario, pero
no sustituyen el detalle de dominios del deployment. `HnvY8FJnQ` identifica el
origen del redeploy; no se registra como ID del deployment nuevo. Tampoco se
identifica automáticamente la primera entrada con el enlace del status GitHub
del commit: varios redeploys pueden compartir SHA. Para D0, registrar el ID/URL
de la entrada que muestra el dominio asignado, no solo el commit original. La
etiqueta Ready Stale no se interpreta como un fallo de build ni como evidencia de
un runtime concreto sin su detalle/tooltip y logs.

Con Auto-assign **Enabled**, un push a `master` puede construir y sustituir el sitio
automáticamente al quedar Ready. Por tanto, no existe una pausa Staged garantizada
en el flujo Git actual. La autorización futura del push debe abarcar ese efecto;
esta preparación no altera Auto-assign, dominios ni la integración.

**Advertencias de Node revisadas:** los logs locales aprobados
`build-node22.log` y `check-proyectos-build-node22.log` no contienen advertencias
de versión de Node ni `EBADENGINE`. El primero registra al inicio Node 22.23.4 y
npm 10.9.9; conservan únicamente los avisos conocidos de colección vacía y chunk
grande. El commit remoto `f31507d` declara `^22.12.0`; el candidato local aprobado
declara `^22.19.0`. Ambos rangos permanecen en la línea 22; no admiten Node 24.
`engines.node` puede prevalecer sobre el selector de Vercel y Vercel gestiona el
minor/patch efectivo. No se cambia a un rango abierto `>=22` ni se modifica el
selector remoto para silenciar avisos.

El usuario confirmó que las capturas muestran una discrepancia entre engines y
el selector Vercel, y que el build original terminó correctamente. Los logs remotos
no se leyeron directamente. Se registra como advertencia de precedencia de
configuración, **sin incompatibilidad demostrada ni fallo de compilación**.
El candidato `^22.19.0`, Production 22.x confirmado y las dependencias admiten
la misma línea. No es necesario obtener de nuevo capturas/logs para autorizar A
ni cambiar versiones para silenciar el aviso. El riesgo residual es confundir
el runtime de un deployment histórico con el del próximo: comprobar el runtime
efectivo y Node >=22.19.0 durante la aceptación del nuevo build/Functions. Si no
coincide, detener la aceptación y aplicar el procedimiento de recuperación.

**Seguridad y riesgos conservados:**

- La activación exige `true` literal, Production, clave de 64 hex minúsculas y
  fecha UTC futura con ventana restante no superior a una hora. Falta/expiración
  de cualquiera de esas puertas: 404 antes de obtener tokens. Si falta una variable
  de integración tras autorizar una solicitud, la configuración falla de forma
  cerrada con 503 sanitizado antes de federar; no garantiza 404 en ese caso.
- Solo POST; método incorrecto 405 cuando está activo. Sin bearer válido: 401;
  la cookie/contraseña del portal no autoriza. Origen ajeno: 403. Con autorización
  válida, cuerpo/query/encoding no permitido: 400, antes de Google.
- Sin parámetros arbitrarios, filas de registros, escrituras, encabezados de hojas
  devueltos, tokens o errores crudos. Respuestas `no-store` para navegador/CDN;
  no logging del SDK. Un límite por instancia no es un rate limit distribuido.
- Issuer Team `https://oidc.vercel.com/cedhu-webmasters-projects`; audiencia JWT
  `https://vercel.com/cedhu-webmasters-projects`; subject
  `owner:cedhu-webmasters-projects:project:website-2027:environment:production`.
  Verificación RS256/JWKS, exp/iat y `project_id` contra `VERCEL_PROJECT_ID`.
  La audiencia STS es distinta: recurso `//iam.googleapis.com/projects/.../providers/...`
  construido con número/pool/provider. No confundir `aud` JWT con `audience` STS.
- El proveedor debe aceptar la audiencia JWT del Team; mapping
  `google.subject=assertion.sub`; binding `roles/iam.workloadIdentityUser` limitado
  al principal exacto de Production y cuenta institucional. No se modificó IAM.
- Vercel documenta dos horas de vida para tokens de Functions y una para build.
  `maxTokenAge: '1h'` puede rechazar un token válido de entre una y dos horas;
  el SDK instalado refresca según `exp`, no según ese límite propio de una hora.
  No se elimina ni amplía el control. Un `oidc_invalid` en B exige cerrar y
  diagnosticar de forma autorizada. No impide A con diagnóstico cerrado.
- `http-cache-semantics`: mismo aviso alto, mismo paquete y uso durante build de
  imágenes remotas. El advisory oficial sigue sin parche declarado; el indicador
  `fixAvailable` de npm no demuestra una corrección confirmada. Sin actualizaciones
  ni cambios de alcance. El rol Gestor de contenido también permanece sin cambios;
  los scopes readonly de este código no eliminan permisos amplios de la cuenta.

**Canal Git contrastado:** la página general de límites de Vercel contiene una
restricción amplia para organizaciones/Hobby. La guía específica de Git distingue
repositorios privados y públicos; este repositorio es **público**. La consulta de
lectura al estado del commit HEAD mediante el conector GitHub devolvió
`context=Vercel`, `state=success` y este enlace al proyecto/equipo exactos:
[despliegue asociado al HEAD](https://vercel.com/cedhu-webmasters-projects/website-2027/32q56RazKrxEDb3zjMijagEdJnGS).
El status indica `Deployment has completed`, actualizado el 22 de octubre de 2026
a las 12:20:09 UTC (07:20:09 de Colombia). La colección pública GitHub Deployments
contiene entradas históricas más antiguas; no se usa como inventario del Current
de Vercel ni como fuente de configuración de Production.
Esto respalda la conexión declarada y resuelve la sospecha inicial; no hay evidencia
de un bloqueo por el plan. Ese status no demuestra que el deployment siga siendo
Current, su target, sus variables ni la elegibilidad de rollback: confirmarlos en
el dashboard antes de publicar. No transferir, desconectar ni cambiar de plan.
El usuario confirmó directamente en Vercel proyecto, repositorio conectado,
plan Hobby, visibilidad pública y fecha de conexión 16 de octubre de 2026. También
confirmó Production `master`, Auto-assign Enabled y los datos visuales del redeploy
anteriormente descritos. Falta el ID exacto y la asignación de dominio del vigente.
La ausencia
de `.vercel/project.json` significa que esta copia no está enlazada para CLI;
no impide el flujo GitHub existente y no se crea ese enlace en esta fase.
Mantener el autor Git institucional habitual y comprobar su Login Connection si
Vercel solicita validación; no falsificar identidad ni eludir un rechazo de acceso.

### C. Procedimiento de publicación — Fase A, todavía no ejecutable sin autorización

**Estrategia recomendada:** conservar integración y configuración existentes;
commit explícito en `master` y publicación Git solo tras autorización. Leer primero
el estado efectivo de Auto-assign, confirmado **Enabled** por el usuario. La ruta
actual recomendada es push autorizado con despliegue automático cerrado y rollback
preparado, conservando configuración. Si en una futura autorización está desactivado,
usar Production Staged
y promoción manual del mismo artefacto. Si está activo, el push puede publicar
automáticamente en el dominio al terminar el build: la autorización del push debe
incluir expresamente ese primer despliegue cerrado. No cambiar el toggle de forma
implícita. No crear otro proyecto/equipo ni usar Preview como evidencia de WIF
Production. Staged es un deployment Production sin asignación de dominio y no
requiere un Custom Environment.

Vercel documenta dos mecanismos para preparar Production sin asignar dominios:
el toggle **Auto-assign Custom Production Domains** en Environments → Production
→ Branch Tracking, y CLI `--prod --skip-domain`. No se presupone una función de
pago como Rolling Releases o protección de todos los dominios. El estado del
toggle y su disponibilidad concreta se deben leer en este proyecto antes del
push. Son opciones para una autorización posterior, no cambios aprobados en esta
fase. No prometer staging si Auto-assign sigue activo. Si el usuario exige staging
y el toggle no lo permite, detener esa ruta y acordar la alternativa CLI; no
sustituirla silenciosamente por un push que cambie el sitio público. El CLI tampoco
está instalado/autorizado en esta fase; su alternativa se muestra al final.

1. Obtener autorización expresa que cubra commit/push y su efecto real: despliegue
   automático si Auto-assign está activo, o preparación Staged si ya está desactivado.
   Mantener la promoción como decisión posterior salvo que también esté autorizada.
   Cualquier cambio del toggle requiere autorización específica. Acordar operador y
   ventana sin publicaciones CMS ni pushes concurrentes.
2. En Vercel, comprobar equipo/proyecto, `master`, directorio raíz del repositorio,
   preset/comando/salida, Node 22.x y Production Overrides; no cambiar Node. Confirmar
   las diez variables solo Production y el cierre exacto `false`, sin token/fecha;
   conservar las siete históricas. Comprobar OIDC Team y contexto de sistema.
3. Registrar **D0**, despliegue Current estable anterior: ID `dpl_...`, URL única,
   SHA Git, dominios asignados, hora UTC y diagnóstico ausente/cerrado. No inferir
   D0 del HEAD local ni del alias público. Verificar que siga retenido y sea el
   anterior elegible en Hobby. No promover otros despliegues durante la ventana.
4. Leer y registrar Auto-assign, conservando su valor. Si está desactivado,
   comprobar que el dominio seguirá en D0 hasta Promote. Si está activo, registrar
   que un push autorizado puede sustituir D0 automáticamente al quedar Ready.
   No tocar credenciales, dominios, protección de CMS/portal ni otros ajustes.
5. Releer estado y revisar el diff con los siguientes comandos. Solo después de
   esa revisión, ejecutar el bloque de staging/commit/push autorizado. Cada comando
   se comprueba antes de continuar; cualquier salida no cero detiene el procedimiento.

```powershell
# FUTURO: no ejecutado durante la preparación.
git status --short --branch
git branch --show-current
git remote -v
git ls-remote --exit-code origin refs/heads/master
git diff --check
git diff -- .env.example README.md package.json package-lock.json scripts/proyectos/verify-build.mjs vercel.json
git ls-files --others --exclude-standard
```

El remoto debe seguir en el SHA revisado o habrá que incorporar/revisar sus cambios
antes de continuar. Leer también el contenido de las nueve rutas nuevas: `git diff`
por sí solo no las muestra. Si el índice contiene trabajo ajeno, detenerse sin
limpiarlo. El bloque siguiente falla si el índice ya tiene cambios, si la rama no
es `master` o si las rutas staged no coinciden con la lista exacta.

```powershell
# FUTURO, SOLO DESPUÉS DE AUTORIZACIÓN Y PRECONDICIONES REMOTAS.
if ((git branch --show-current).Trim() -ne 'master') { throw 'Rama inesperada' }
if (@(git diff --cached --name-only).Count -ne 0) { throw 'Revisar índice preexistente' }
$cedhuReleaseFiles = @(
  '.env.example', 'README.md', 'package.json', 'package-lock.json',
  'scripts/proyectos/verify-build.mjs', 'vercel.json',
  'api/proyectos/google-diagnostic.js', 'docs/PROYECTOS-GOOGLE.md',
  'scripts/image-processing.test.mjs', 'scripts/proyectos/google-check.mjs',
  'scripts/proyectos/google.test.mjs', 'src/server/google/auth.js',
  'src/server/google/config.js', 'src/server/google/diagnostic.js',
  'src/server/google/repository.js'
)
git add -- $cedhuReleaseFiles
if ($LASTEXITCODE -ne 0) { throw 'No se completó git add' }
$cedhuStagedFiles = @(git diff --cached --name-only)
if (@(Compare-Object ($cedhuReleaseFiles | Sort-Object) ($cedhuStagedFiles | Sort-Object)).Count -ne 0) {
  throw 'Inventario staged inesperado; revisar sin borrar trabajo'
}
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Diff inválido' }
git diff --cached --stat
git diff --cached
# Pausa de revisión humana: exactamente 15 rutas, sin secretos.
git commit -m "Preparar integración Google Workspace con diagnóstico deshabilitado"
if ($LASTEXITCODE -ne 0) { throw 'Commit fallido' }
git show --stat --oneline HEAD
# PUSH SOLO con rama Production, efecto de Auto-assign y autorización confirmados.
git push origin master
if ($LASTEXITCODE -ne 0) { throw 'Push fallido; revisar sin forzar' }
```

6. Identificar **D1** creado por ese SHA: target Production, estado Ready y,
   según Auto-assign, Staged con dominio en D0 o Current con asignación automática.
   Verificar Actions existentes y logs de build:
   Node 22.x >=22.19.0, instalación desde lockfile, prebuild CMS, Astro SSG,
   postbuild del sitio y ausencia de errores de instalación, tracing o imports.
   Actions y Vercel pueden ejecutarse en paralelo: no suponer que CI bloquea una
   promoción si no hay un check configurado. No añadir checks remotos en esta tarea.
7. En Resources/Functions verificar los seis handlers, Node 22, dependencias
   OIDC/Google incluidas, bundle <250 MB y diagnóstico 30 s. Confirmar que Astro,
   caché de imágenes, `.env.local`, Node portátil y logs no sean parte de la función.
   El código local permite el empaquetado, pero esta inspección acredita el
   artefacto efectivo. No imprimir entornos o errores que contengan credenciales.
8. Si D1 está Staged, en su URL única revisar páginas públicas y diagnóstico cerrado usando
   acceso Vercel autenticado si Standard Protection lo exige. Un 401 de la
   plataforma no acredita el 404 del handler. No se debe validar login del portal,
   OAuth ni la conexión Google bajo otro host: sus orígenes están fijados al dominio
   actual. Un 403 por ese host es esperado cuando el control de origen está activo.
9. Si D1 está Staged, tras revisión y autorización, Promote del **mismo artefacto**.
   Si Auto-assign ya lo hizo Current, no repetir promoción: pasar inmediatamente
   a pruebas de humo. Comprobar que `https://website-2027-seven.vercel.app` apunta
   a D1. No usar alias
   manual a un Preview ni cambiar orígenes para evitar una prueba fallida.
10. Ejecutar las pruebas de humo siguientes y revisar 5xx por despliegue/ruta en
    runtime logs. Registrar D0/D1, SHA, hora UTC, resultados y códigos, sin cookies,
    contraseña, cuerpos de Workspace ni tokens. Aceptar D1 solo si todo pasa.
    Registrar el estado final de Auto-assign; conservar la configuración acordada
    y no asumir que una promoción o rollback mantiene ese valor.

| Prueba de humo en el dominio actual | Resultado esperado |
| --- | --- |
| Inicio, navegación principal y una página pública representativa | 200 tras redirecciones normales; estilos/JS/medios correctos |
| `/proyectos/` sin sesión | Pantalla de contraseña; sin contenido privado |
| Login con la contraseña actual | Sesión funcional; cookie Secure/HttpOnly/SameSite; sin mostrar su valor |
| Sesión en recarga y logout | Sesión reconocida; tras cerrar se vuelve a pedir contraseña |
| `/admin/` y OAuth GitHub habitual | Acceso de usuario ya autorizado y listado/editor; sin guardar ni publicar contenido |
| POST diagnóstico sin Authorization y sin cuerpo | 404, JSON `not_found`, `Cache-Control: no-store`; no 200, 401 ni 5xx del handler |
| Variantes del diagnóstico `.js` y slash final | 404 del handler o redirección/ruta inexistente documentada, nunca ejecución habilitada |
| Logs del intervalo | Sin errores 5xx/imports/runtime atribuibles al cambio |

Comprobación HTTP inocua, únicamente DESPUÉS del despliegue autorizado:

```powershell
curl.exe --silent --show-error --include --request POST --max-time 35 https://website-2027-seven.vercel.app/api/proyectos/google-diagnostic
```

No seguir redirecciones automáticamente: comprobar cada Location. Las claves y
cookies no se pasan a curl ni se capturan en transcripciones. Revisar `no-store`
en navegador/CDN cuando la plataforma exponga esos encabezados; Vercel puede
consumir/retirar su header CDN interno antes de entregar la respuesta.

**Reversión A:** antes de promover D1, conservar D0 y descartar el candidato tras
revisión. Después de promover, ante regresión de sitio/CMS/portal, 5xx o diagnóstico
habilitado inesperado, detener y usar Instant Rollback a D0 desde el dashboard.
Hobby solo permite el Production inmediatamente anterior. Verificar alias y repetir
las pruebas mínimas; no cambiar claves CMS/sesión. El rollback restaura el código y
las variables del despliegue D0, no las del proyecto actual. Revisar el estado de
Auto-assign: Vercel lo desactiva tras rollback. No hacer force push ni revertir
ciegamente un historial con cambios ajenos. Si D0 ya no es elegible, no prometer
rollback instantáneo: un redeploy del SHA estable requiere autorización y nuevo build.

**Alternativa CLI si se elige posteriormente:** una CLI oficial instalada con
autorización, autenticada y enlazada explícitamente al proyecto/equipo existentes
puede preparar Production sin asignar dominios. No instalarla con `npx` de forma
implícita. Usar un checkout limpio del commit autorizado sin `.env.local`, secretos,
logs ni Node portátil; no cargar el directorio local de investigación sin revisar
el inventario de subida. No usar `vercel env pull` ni `--prebuilt` solo con `dist`,
pues se omitiría el empaquetado independiente de Functions. Coordinar la conexión
Git antes de un push para evitar un segundo despliegue automático no revisado.

```powershell
# ALTERNATIVA FUTURA, no ejecutar junto al flujo Git por duplicado.
# Desde checkout limpio; requiere CLI autorizada y sesión existente.
vercel link --project website-2027 --scope cedhu-webmasters-projects
# Inspeccionar .vercel/project.json: proyecto/equipo correctos antes de continuar.
vercel deploy --prod --skip-domain --scope cedhu-webmasters-projects
# Revisar el ID/URL devuelto y el artefacto; promoción separada y autorizada:
vercel promote <URL_UNICA_D1_REVISADA> --scope cedhu-webmasters-projects
```

Estos comandos son un procedimiento alternativo, no evidencia de que se hayan
ejecutado ni una autorización de instalación, enlace, carga o promoción. La
documentación presenta este mecanismo sin exigir un plan de pago; no se ha
verificado su disponibilidad/permisos en la cuenta concreta.

### D. Prueba posterior con Google Workspace — Fase B independiente

1. Solicitar autorización específica para ventana, variables temporales, controles
   de Firewall, despliegue activo, cierre/redeploy y retirada de despliegues activos.
   Debe estar aprobada también la respuesta ante fallo; no iniciar B sin operador
   disponible para cerrar. Registrar D1 cerrado como destino de recuperación.
2. Revisar en lectura provider activo, issuer Team, audiencia JWT admitida, mapping
   del subject, binding exacto WIF de Production, cuenta institucional, APIs y ACL.
   Comparar con las identidades de B; no ampliar scopes, roles ni delegación.
3. Crear **entonces**, en gestor institucional seguro, 32 bytes aleatorios como
   64 hex minúsculas. Sin chat, argv, archivos, capturas ni logs. Definir fecha
   absoluta UTC ISO 8601 de cierre, aproximadamente ahora +20 minutos, incluyendo
   build/promoción/prueba/cierre. No generar nada durante esta preparación.
4. Revisar disponibilidad de reglas WAF: Hobby admite hasta tres custom rules,
   pero no se conocen los slots usados. Preparar una regla Block para la familia
   de rutas del diagnóstico cuando la IP no esté en la allowlist administrativa;
   incluir IPv4/IPv6, `.js`, slash final, aliases y URLs únicas. No asumir Trusted
   IPs de Deployment Protection ni rate limiting de pago. No usar solo Log ni
   desactivar reglas existentes. Comprobar prioridad/exclusiones para que no se
   eluda el bloqueo con otra URL. En cierre, convertirla a Block de esa ruta para
   todas las IP mientras se retiran los despliegues históricos.
5. En Production exclusivamente, configurar token y expiración, después `true`;
   iniciar un nuevo despliegue del SHA cerrado aprobado con las nuevas variables,
   target Production. Cambiar variables del proyecto no modifica D1 ni otros
   despliegues. Registrar **D2** y su expiración. Verificar Ready y promover solo
   con tiempo suficiente; si la ventana se consume, cerrar, sin ampliar el plazo.
6. Desde IP autorizada y el dominio canónico, comprobar antes de Google los rechazos
   de acceso. Preparar una terminal administrativa que lea la clave sin eco y nunca
   la escriba en el historial. La CLI existente se reserva para una ejecución válida;
   las comprobaciones negativas con bearer se hacen mediante un cliente seguro
   con entrada oculta, sin pegar la clave en herramientas que registren requests.

| Solicitud durante B activa, en IP admitida | Esperado |
| --- | --- |
| POST sin bearer / bearer inválido / solo sesión del portal | 401; ninguna consulta Google |
| GET u OPTIONS | 405 y `Allow: POST` |
| POST de origen ajeno | 403 |
| POST autorizado con query o cuerpo | 400 antes de Google |
| Solicitud cuando se deshabilita o vence | 404 antes de Google |
| Solicitud de IP fuera de allowlist | Bloqueo WAF; distinguirlo del código del handler |

7. Ejecutar una vez, en terminal TTY segura con Node 22 y entrada oculta:

```powershell
# SOLO B AUTORIZADA, con D2 efectivo y dentro de la ventana.
npm run proyectos:google:probe
```

   Usar el runtime 22 ya disponible, sin instalar ni sustituir el Node global.
   El helper envía POST sin body/query y rechaza redirecciones. Esperar HTTP 200,
   `ok=true` y ocho resultados `ok=true`: `configuration`, `federation`,
   `serviceAccount`, `drive`, `structure`, `catalog`, `users`, `audit`. Eso acredita
   OIDC verificado → STS → suplantación, identidad efectiva, unidad, carpetas,
   pertenencia de hojas y sus pestañas/encabezados de fila 1. No imprime encabezados,
   IDs, tokens o registros, ni prueba escritura o todos los permisos de la cuenta.
   Confirmar que no haya captura de Authorization/cookies/cuerpos en observabilidad.
8. Ante `oidc_invalid`, 503, timeout, rechazo incorrecto o regresión, cerrar primero;
   no repetir en bucle ni ampliar la antigüedad máxima. El runtime debe poder
   suministrar un token con `iat` dentro de la hora aceptada. La fecha de despliegue
   no demuestra por sí sola la fecha de emisión del token. Registrar solo códigos
   sanitizados; cualquier instrumentación adicional exige otra revisión autorizada.
9. **Cierre inmediato, incluso si todo pasa:** aplicar bloqueo WAF completo de la
   ruta; volver a `false`, retirar token y expiración de Production; crear y promover
   **D3 cerrado**, mismo SHA, nuevas variables. Probar 404 y humo mínimo. Una petición
   iniciada antes del cierre puede seguir hasta su presupuesto de 25 s; tokens
   Google ya emitidos solicitan 600 s de vida, no se revocan por cambiar la variable.
10. Inventariar **todos** los deployments/redeploys que recibieron `true`, no solo
    D2. Tras sacar sus dominios de servicio, eliminarlos mediante el procedimiento
    autorizado o aplicar protección efectiva verificada a todas sus URLs. Conservar
    WAF Block durante la retirada y hasta comprobar la expiración absoluta más
    margen de solicitudes en curso. Revisar aliases propios, URL única y dominios
    históricos. La ausencia de una URL en la interfaz o un simple cambio de token
    del proyecto no prueba revocación. No confiar en la retención automática.
11. **Retirada completa en un cambio autorizado posterior:** eliminar
    `api/proyectos/google-diagnostic.js`, su regla exacta de timeout, cliente/comando
    temporal y tests que dependan de ellos; conservar módulos reutilizables y el
    glob de sesiones/CMS. Adaptar la verificación de privacidad, ejecutar pruebas
    afectadas y `npm run build`, revisar el diff y desplegar el cierre sin endpoint.
    Comprobar 404 de ruta ausente. Un despliegue nuevo sin función tampoco elimina
    las copias históricas: terminar el inventario anterior antes de retirar WAF.

**Reversión B:** bloquear la ruta primero; volver al D1 cerrado si es el Production
inmediatamente anterior elegible. Mantener `false` y retirar token/fecha en la
configuración del proyecto para futuros builds. D2 conserva su copia aunque D1
vuelva a ser Current: retirarlo/protegerlo por separado. No hacer rollback de D3
al D2 activo como reacción automática. Si el anterior es un despliegue activo,
mantener WAF y hacer un redeploy autorizado de la configuración cerrada. Nunca
restaurar un deployment con diagnóstico habilitado en una reversión futura.
No hay escrituras Workspace que revertir ni motivo para rotar CMS o la contraseña
del portal en esta operación.

Hobby protege con Standard Protection los despliegues secundarios cuando está
configurado, pero **el dominio de Production continúa público**. No se ha verificado
qué modo efectivo usa esta cuenta. La clave, expiración, origen y cierre del handler
son obligatorios con independencia de esa protección.

### E. Decisión de esta revisión

**APTO CON CONDICIONES**, para la Fase A con diagnóstico cerrado.
No hay incompatibilidad técnica demostrada que impida A. La conexión Git declarada
está respaldada por el status exitoso del HEAD en el proyecto correcto. El aviso
de caché, la comprobación real de Google, el rol ya evaluado y el límite conservador
de antigüedad OIDC **no se elevan a bloqueos de A**.

**Única condición técnica pendiente imprescindible antes de publicar:** obtener
y registrar el ID o URL únicos del redeploy vigente, confirmar que recibe
`website-2027-seven.vercel.app` y conservarlo como D0 elegible para rollback.
`HnvY8FJnQ` es el original; no se inventa ni sustituye el ID del redeploy nuevo.

Production `master`, Auto-assign Enabled, repositorio público conectado, plan Hobby,
último Ready/Production y build original correcto se dan por confirmados por el
usuario. No se vuelve a solicitar esa evidencia. El aviso de Node se registra como
riesgo de interpretación/configuración; no es un bloqueo. Obtener el patch exacto
del runtime histórico o más capturas es opcional y no condiciona A. Build/Functions
del candidato y humo se comprueban en la aceptación del despliegue autorizado.

La publicación futura conserva la configuración actual: registrar D0, revisar las
15 rutas, confirmar que siguen aplicándose los valores Production ya preparados
(`false`, sin token/fecha, secretos históricos conservados), obtener autorización
expresa para commit y push con **despliegue automático**, y seguir el procedimiento
C. Ante fallo, Instant Rollback al D0 inmediatamente anterior en Hobby y humo mínimo;
no alterar credenciales ni Google Workspace. No hay pausa Staged garantizada con
Auto-assign Enabled y no se lo desactiva para este procedimiento.

Esta decisión no afirma lectura propia de valores ocultos ni autoriza publicar.
B requiere autorización independiente. Esperar autorización explícita del usuario
antes de cualquier commit, push o acción de publicación/configuración. Esta fase
queda cerrada sin repetir auditorías, suites o solicitudes de datos ya confirmados.

### Fuentes contrastadas para este informe

- [GitHub: metadatos públicos del repositorio](https://api.github.com/repos/Cedhu-Sog/website-2027).
- [GitHub: status Vercel del HEAD](https://github.com/Cedhu-Sog/website-2027/commit/f31507db1e45f583bf46d89674ba5360eab7099b/checks).
- [Vercel: límites de conexión Git con organizaciones](https://vercel.com/docs/limits#connecting-a-project-to-a-git-repository).
- [Vercel: distinción entre repositorios públicos y privados](https://vercel.com/docs/git#deploying-private-git-repositories).
- [Vercel: Production preparado y promoción](https://vercel.com/docs/deployments/promoting-a-deployment).
- [Vercel: CLI para Production sin dominio](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build).
- [Vercel: Instant Rollback y límite Hobby](https://vercel.com/docs/instant-rollback).
- [Vercel: handler Web Standard Node](https://vercel.com/docs/functions/runtimes/node-js).
- [Vercel: precedencia de engines y versiones Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- [Vercel: duración y orden de patrones](https://vercel.com/docs/functions/configuring-functions/duration).
- [Vercel: límites de Functions](https://vercel.com/docs/functions/limitations).
- [Vercel: claims y vida de tokens OIDC](https://vercel.com/docs/oidc/reference).
- [Vercel: protección de despliegues y dominio público](https://vercel.com/docs/deployment-protection).
- [Vercel: WAF y tres reglas Hobby](https://vercel.com/docs/vercel-firewall/vercel-waf).
- [Vercel: variables por despliegue](https://vercel.com/docs/environment-variables).
- [Google: configuración WIF con otros proveedores](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers).
- [Advisory de caché: sin parche declarado](https://github.com/advisories/GHSA-ch52-4w7c-c8xp).

## Referencias verificadas

- [Vercel: GCP con OIDC](https://vercel.com/docs/oidc/gcp).
- [Vercel: contexto de Functions y claims OIDC](https://vercel.com/docs/oidc/reference).
- [Google: Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation).
- [Google: buenas prácticas WIF](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation).
- [Drive: unidades compartidas](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives).
- [Drive: scopes de drives.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/get).
- [Sheets: values.get](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get).
- [Vercel: versiones de Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- [Node.js: distribución oficial para la validación pendiente](https://nodejs.org/en/download).
- [GHSA-ch52-4w7c-c8xp: estado oficial sin versión corregida](https://github.com/advisories/GHSA-ch52-4w7c-c8xp).
- [Solicitud abierta de revisión de GHSA-ch52-4w7c-c8xp](https://github.com/github/advisory-database/issues/10139).
- [Vercel: variables y conservación de valores en despliegues anteriores](https://vercel.com/docs/environment-variables).
- [Vercel: Instant Rollback y configuración del despliegue restaurado](https://vercel.com/docs/instant-rollback).
- [Google: requisitos de WIF con proveedores externos](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-providers).
- [Astro: corrección crítica AVIF en 7.2.8](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2).
- [Sharp: librsvg corregido en 0.35.5](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).

Los detalles de API también se contrastaron con el código y los tipos de los dos
paquetes instalados. La validación final depende del entorno real autorizado.
