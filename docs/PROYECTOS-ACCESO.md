# Acceso privado a proyectos — Fase 1

> Documento histórico del acceso por contraseña. El candidato actual de PR #2 usa Workspace y retira login por contraseña (410). Para el estado vigente, las cookies de una hora y las condiciones de certificación, consultar [Entrega 1](PROYECTOS-WORKSPACE-ENTREGA1.md) y [auditoría de sesiones](PROYECTOS-SESIONES-AUDITORIA.md). Las ocho horas descritas aquí no aplican al acceso Workspace.

Ruta prevista: `https://website-2027-seven.vercel.app/proyectos/`.
Implementación local; requiere configuración y comprobación en el despliegue real.
No se han realizado commit, push, despliegue ni cambios en Vercel.

## Alcance y arquitectura

Astro conserva `output: 'static'`. `/proyectos/` entrega únicamente el acceso y un
contenedor vacío; nunca contiene una plantilla con datos privados escondidos.
El formulario utiliza una API del mismo origen. JavaScript comprueba la sesión
antes de solicitar y construir la interfaz privada; sin JavaScript solo hay un
aviso y un formulario desactivado. La autenticación siempre ocurre en el servidor.

Funciones Node de Vercel, independientes de `/api/cms/` y de GitHub OAuth:

| Ruta | Método | Comportamiento |
| --- | --- | --- |
| `/api/proyectos/login` | POST | Verifica scrypt y emite cookie firmada |
| `/api/proyectos/session` | GET | Valida firma/expiración y devuelve la bienvenida privada |
| `/api/proyectos/logout` | POST | Elimina la cookie del navegador |

Los endpoints usan `export default { fetch }`, la interfaz Web Standard del runtime
Node de Vercel. Esto permite leer el cuerpo como un stream y limitar sus bytes
antes de interpretar JSON, sin cambiar los helpers del OAuth existente.
No se requiere un adaptador SSR ni un paquete adicional.

La contraseña usa scrypt: N=131072, r=8, p=1, sal aleatoria de 32 bytes y derivado
de 64 bytes; límite de memoria de 160 MiB. La comparación usa `timingSafeEqual`.
Las sesiones usan HMAC-SHA-256 (firma de sesión, no almacenamiento de contraseña),
identificador aleatorio y expiración absoluta de ocho horas, sin renovación automática.
La firma está ligada al hash de contraseña: cambiar cualquiera de las dos variables
invalida todas las sesiones anteriores en las instancias con la nueva configuración.

En producción la cookie es `__Host-cedhu-proyectos`, `Path=/`, sin `Domain`,
`HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age=28800`. Logout usa los mismos
atributos y `Max-Age=0`. No hay credenciales en almacenamiento del navegador.

Se rechazan métodos inesperados (405), solicitudes de otros orígenes (403), cuerpos
mayores de 2048 bytes (413), tipos distintos de JSON (415), JSON/esquemas inválidos
(400) y lecturas de cuerpo de más de cinco segundos (408). La contraseña admite
hasta 512 bytes UTF-8. Todas las respuestas de API, incluidos errores, prohíben
caché del navegador y CDN. No se emiten permisos CORS.

POST exige `Origin` exactamente igual al origen autorizado, JSON y la cabecera
`X-CEDHU-Projects: 1`; se comprueba también Fetch Metadata cuando está presente.
Estas defensas y `SameSite=Strict` protegen frente a CSRF. No se confía en
`Host`/`X-Forwarded-Host` para definir el origen autorizado.

La página lleva `noindex, nofollow`, queda fuera del sitemap y carece de enlaces
desde el menú, inicio o footer. Vercel añade CSP sin scripts/estilos inline,
protección contra marcos, `nosniff`, política de referencia y permisos restrictivos.
Las instrucciones a buscadores no sustituyen la autenticación.

## Generar y configurar las variables

Usar una terminal local interactiva dentro del repositorio:

```powershell
npm run proyectos:hash
npm run proyectos:secret
```

El primer comando solicita la contraseña dos veces con eco desactivado. Exige
al menos 12 caracteres y como máximo 512 bytes; elegir una frase larga, aleatoria
y exclusiva del portal. Solo imprime `PROYECTOS_PASSWORD_HASH=...`, nunca la contraseña.
El segundo imprime `PROYECTOS_SESSION_SECRET=...`, 32 bytes aleatorios en hexadecimal.
Cada ejecución genera valores nuevos. No pasar la contraseña como argumento,
comando del shell, variable de entorno ni archivo. No ejecutar en terminales
compartidas o con grabación de sesión. Conservar los valores en un gestor de secretos.
El script no escribe archivos. El hash y la clave siguen siendo información sensible.

En el proyecto **existente** de Vercel, abrir **Settings → Environment Variables**:

1. Añadir `PROYECTOS_PASSWORD_HASH` con el hash completo, sin comillas adicionales.
2. Añadir `PROYECTOS_SESSION_SECRET` con los 64 caracteres hexadecimales generados.
3. Seleccionar **Production**; marcar los valores como sensibles si está disponible.
4. Guardar y desplegar nuevamente mediante el procedimiento habitual del proyecto.

No usar prefijos `PUBLIC_`, no pegarlos en el chat ni escribirlos en Git. No cambiar
variables `CMS_*`/`GITHUB_*`. `.env.example` solo contiene campos vacíos. `.gitignore`
ya excluye `.env`, `.env.*`, excepto `.env.example`, y `.vercel/`.
No se sobrescriben configuraciones existentes. Variables ausentes o mal formadas
devuelven 503, incluso si el navegador tiene una cookie anterior.

El único origen autorizado en producción es el indicado al inicio. Otros dominios
y URLs de Preview se rechazan deliberadamente; no copiar secretos Production a
Preview. Un cambio de dominio futuro exige revisar la constante de origen, canonical,
documentación y pruebas. No se reutiliza `CMS_ORIGIN`.

## Intentos automatizados: configuración pendiente de Vercel

**Antes de habilitar el acceso**, configurar una regla distribuida en el Firewall
del proyecto existente. En **Firewall → Configure → New Rule**, combinar:

- Request Path que comience con `/api/proyectos/login` (cubrir también slash final
  y cualquier alias con extensión que publique el runtime).
- Request Method igual a `POST`.
- Acción Rate Limit, clave IP, ventana inicial de 60 segundos y límite inicial de
  5 solicitudes; ajustar tras comprobar el uso del personal que comparte una IP.
- Acción de bloqueo 429; revisar y publicar la regla. Una acción solo de Log
  no impide intentos. Probar ambas rutas para evitar una variante sin protección.

La disponibilidad y cuotas dependen del plan. Si no puede habilitarse esta regla,
se necesita un limitador con almacenamiento compartido antes de exponer el portal;
ese servicio y su dependencia requieren autorización separada. No hay un contador
de intentos en memoria presentado como protección distribuida.
El servidor limita a dos verificaciones scrypt simultáneas por instancia para
contener consumo de memoria; esto **no** impide fuerza bruta entre instancias/IP.
Revisar alertas del Firewall y costos, sin registrar cuerpos, contraseñas o cookies.

Referencias: [funciones Node y entradas en api](https://vercel.com/docs/functions/runtimes/node-js),
[límites distribuidos del WAF](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting),
[scrypt de Node](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

## Validación local

Ejecutar secuencialmente: las pruebas CMS crean temporalmente contenido y ejecutan
varias compilaciones, por lo que no deben coincidir con otro build.

```powershell
npm run test:proyectos
npm run test:cms
npm run check:cms
npm run check:proyectos:build
```

El último comando ejecuta `npm run build` completo, incluidos prebuild y postbuild,
con contraseña/hash/clave sintéticos recién generados. Revisa **todos** los archivos
de `dist/` para descartar esos valores, nombres de secretos y el texto privado inicial.
También comprueba compatibilidad con CSP y ausencia de enlaces públicos al acceso.
Nunca imprime ni guarda las credenciales sintéticas. No usa valores reales.

Las pruebas de autenticación cubren acierto/error, cookies ausentes/manipuladas,
expiración, logout del navegador, configuración incompleta, rotación, CSRF, métodos,
formatos y cuerpos, cabeceras sin caché y entradas ejecutables de Vercel.

Resultado local del 19 de octubre de 2026 (Node 24.14.0 disponible en este equipo):

- 14 pruebas de proyectos y 13 pruebas CMS aprobadas.
- `npm run check:cms` aprobado: 134 entradas y 2384 campos.
- `npm run build` aprobado, incluidos prebuild y postbuild: 31 páginas generadas;
  el verificador revisa 30 páginas HTML al excluir la aplicación Decap.
- 501 archivos públicos revisados sin los secretos sintéticos ni el texto privado.
- Navegador contra servidor HTTP local temporal con CSP real y credenciales
  desechables: rechazo de contraseña, login, sesión tras recarga, logout y recarga
  sin acceso, Mostrar/Ocultar con Espacio/Enter y error de conexión aprobados.
- Anchos 375, 768, 1440 y 1920 píxeles sin desbordamiento horizontal. Un solo h1
  tanto en el formulario como en la interfaz autenticada.
- Generador de hash probado en terminal con eco desactivado; generador de clave
  comprobado como 32 bytes hexadecimales. Los valores de prueba se descartaron.

El build conserva advertencias sobre la colección de eventos vacía y un chunk
grande de la aplicación existente. No impiden compilar. `package.json` mantiene
Node `^22.12.0` para Vercel; falta verificar el runtime y empaquetado en ese despliegue.
El servidor temporal se detuvo después de las pruebas. No sustituye el builder Vercel.

`astro dev` y `astro preview` sirven la página, pero no ejecutan las funciones de
`api/`. Para probar el flujo completo localmente puede usarse una instalación ya
autorizada del CLI Vercel, con valores **de prueba** en `.env.local` y `vercel dev`.
No está instalado por esta implementación. La excepción HTTP de desarrollo solo
se permite con `NODE_ENV=development`, sin `VERCEL`, en `localhost:3000` o `:4321`;
usa una cookie de desarrollo distinta. Nunca se habilita en un despliegue Vercel.

## Comprobar el despliegue real

No se ha ejecutado un despliegue desde esta tarea. La revisión local de las entradas
en `api/` y `vercel.json` no demuestra su publicación por el builder de Vercel.
Después del despliegue autorizado, comprobar en su resumen de Functions que existen
las tres rutas y que incluyen las utilidades importadas de `src/server/`.

1. Abrir `/proyectos/` en una ventana privada: solo aparece el acceso. En Network,
   GET `/api/proyectos/session` debe responder 401 sin bienvenida privada.
2. Probar contraseña incorrecta: 401 y ningún `Set-Cookie` de sesión nueva.
3. Ingresar la contraseña correcta: POST login 200, cookie con los atributos
   indicados y GET session 200 con la bienvenida y área vacía. Verificar que la
   cookie no es accesible mediante `document.cookie`.
4. Recargar: conserva el acceso hasta ocho horas desde el login. Verificar controles
   Mostrar/Ocultar, foco de teclado, mensajes y diseño móvil/tableta/escritorio.
5. Cerrar sesión: POST logout 200 con cookie eliminada. La página vuelve al acceso;
   recargar y abrir otra pestaña deben producir 401. Las pestañas ya abiertas se
   comprueban nuevamente al recibir visibilidad; al ocultarse eliminan el área privada.
6. Modificar la cookie en DevTools: session devuelve 401. Las pruebas locales
   comprueban la caducidad exacta sin esperar ocho horas.
7. Verificar `Cache-Control: no-store`, CSP en `/proyectos/`, ausencia de caché
   compartida para session, ausencia del contenido privado en View Source y rechazo
   de POST con Origin ajeno, sin Origin o sin la cabecera específica (403).
8. Verificar que la regla WAF responde 429 al exceder el umbral, con y sin slash
   final; revisar que `/admin/` y el sitio público conservan su comportamiento.

No enviar contraseñas en URLs, capturas, comandos de historial ni reportes de prueba.
Para comprobar configuración faltante en despliegue, usar un entorno de prueba
autorizado y aislado; no retirar secretos de Production para hacer una prueba.

## Ampliación futura y límites explícitos

No hay registros, buscador, archivos, GitHub, Supabase ni almacenamiento privado
implementado. La bienvenida del endpoint es el único contenido del área privada.
`src/components/common/ResearchProject.astro` pertenece a la investigación pública
existente: no se conecta al portal ni debe usarse para publicar registros privados.

Todo endpoint futuro debe llamar a `requireProjectsSession(request)` desde
`src/server/proyectos-session.js`, retornar inmediatamente si recibe una `Response`
(401/403/503), y solo entonces leer datos privados. Todas sus respuestas, también
errores, deben usar `projectsJson()` o `privateHeaders()`. El guard devuelve sesión
y configuración al autorizar. Para mutaciones futuras deben aplicarse además las
defensas CSRF; la comprobación de sesión por sí sola no las sustituye.

Nunca colocar investigaciones privadas en `public/`, `src/content/`, imports del
frontend, JSON públicos, HTML prerenderizado ni archivos generados en `dist/`.
Las descargas futuras deben pasar por un endpoint autenticado que transmita el
archivo desde almacenamiento privado, sin URL pública alternativa ni caché pública.
Una URL difícil de adivinar y una interfaz escondida no protegen un archivo.

Las sesiones son sin estado: logout borra la cookie del navegador, pero no revoca
una copia robada del token antes de su expiración. La revocación individual requiere
almacenamiento compartido/registro de sesiones en una fase autorizada. Para revocar
todas, rotar la clave (o el hash) y desplegar de nuevo. También retirar o restringir
despliegues anteriores que conserven variables antiguas. Una contraseña compartida
no identifica personas ni permite permisos/auditoría individual; distribuirla por
un canal institucional seguro y rotarla al cambiar el personal autorizado.

## Archivos

Creados:

- `src/pages/proyectos/index.astro`: ruta y composición.
- `src/layouts/ProjectsLayout.astro`: documento de acceso sin navegación pública.
- `src/components/sections/ProjectsAccess.astro`: formulario semántico y accesible.
- `src/styles/components/projects-access.css`: presentación con tokens existentes.
- `src/scripts/interactions/projects-access.ts`: estados, API, foco y eliminación de UI privada.
- `src/server/proyectos-password.js`: generación/verificación scrypt.
- `src/server/proyectos-session.js`: cookies, firma, guard reutilizable y cabeceras.
- `src/server/proyectos-auth.js`: validación de solicitudes y handlers.
- `api/proyectos/login.js`, `session.js`, `logout.js`: entradas serverless.
- `scripts/proyectos/secrets.mjs`: generador local con entrada oculta.
- `scripts/proyectos/auth.test.mjs`: pruebas del servidor y configuración de rutas.
- `scripts/proyectos/verify-build.mjs`: build con secretos sintéticos y auditoría pública.
- `docs/PROYECTOS-ACCESO.md`: esta guía.

Modificados: `vercel.json` (rutas/headers del portal), `package.json` (comandos),
`src/styles/tokens.css` (escala del título de acceso),
`.env.example` (variables vacías), `scripts/check-site.mjs` (validación del layout
independiente y exclusión del acceso del sitemap). Astro, OAuth, CMS, navegación,
footer, noticias y contenido institucional permanecen sin cambios.
