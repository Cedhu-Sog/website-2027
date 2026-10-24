# Entrega 1 — Acceso de Google Workspace al repositorio CEDHU

Fecha de preparación: 23/10/2026. **NO APROBADA PARA USO INSTITUCIONAL AÚN.**

## Estado vigente tras desbloquear Google Cloud — 23/10/2026

Acceso administrativo real con `web@cedhu.edu.co` y proyecto `cedhu-repositorio`
comprobados. Se reutilizó `CEDHU-Repositorio-Web` (Web application), Audience
Interno; callback Vercel corregido y guardado exactamente como
`https://website-2027-seven.vercel.app/api/proyectos/google/callback`.
Los scopes declarados y guardados son únicamente openid, userinfo.email y
userinfo.profile; no hay scopes sensibles/restringidos ni permisos personales Drive.
La redirección histórica a cedhu.edu.co se conservó para no afectar una posible
integración ajena; no se agregaron dominios públicos nuevos.

Vercel contiene Client ID, Client Secret y dominio únicamente en Production.
El secreto fue guardado por el administrador en campo oculto; se comprobó solo
su metadato sensitive y target, nunca su valor. Esto acredita configuración, no
validez del secreto ni un intercambio OAuth exitoso.

| Condición | Estado | Evidencia y límite |
| --- | --- | --- |
| Acceso administrativo Google Cloud | APROBADO | Sesión de Web Cedhu y proyecto CEDHU-Repositorio visibles. |
| Cliente OAuth | APROBADO | Existente reutilizado, Web, Interno, callback exacto y tres scopes guardados. |
| Credenciales en Vercel | APROBADO | Los tres nombres presentes solo en Production; Client Secret sensitive. Canje real pendiente. |
| Federación OIDC y STS | NO COMPROBADO | Pool/proveedor/emisor/audiencia/condición inspeccionados; no se ejecutó el intercambio real. |
| Cuenta de servicio e IAM | APROBADO | Cuenta habilitada, sin claves; Workload Identity User para el sujeto Production exacto. Identidad efectiva de un token pendiente. |
| Lectura real de Drive | NO COMPROBADO | No se llegó a ejecutar el probe. |
| Lectura real de Sheets | NO COMPROBADO | No se llegó a ejecutar el probe. |
| Autenticación real de la cuenta de prueba | NO COMPROBADO | Login oficial Google comprobado previamente; OAuth desde Vercel pendiente. |
| Rol y estado de la cuenta | NO COMPROBADO | No se consultó su fila real. No se alteraron permisos ni estado. |
| ADMIN y DOCENTE | NO COMPROBADO | Ambos perfiles reales pendientes por separado. |
| Seguridad de sesiones | NO COMPROBADO | Casos locales aprobados; ciclo real del sitio y revocación pendientes. |
| Actions y Preview | APROBADO | Actions run 40053858518 success; Preview f138eee READY. |
| Cierre del diagnóstico | APROBADO | Canónico 404/no-store, indicador false, sin token/expiry; host de prueba bloqueado por WAF. |
| Condiciones para publicar | NO COMPROBADO | Conexión real y OAuth pendientes; falta resolver un ensayo con aislamiento de alias y autorización final. |

### Intento de conexión, incidencia y corrección

El ejecutor `scripts/proyectos/google-build-probe.mjs` quedó preparado y pasó dos
tests nuevos de precondiciones y sanitización, junto con 11 tests Workspace.
Build local correcto. No se repitieron suites sin cambios.

Con autoasignación desactivada y comprobada se creó un único build Production
de `f138eee`. Vercel conservó el alias canónico, pero movió dos alias auxiliares;
además, el buildCommand del repositorio prevaleció y el probe no se ejecutó.
No se atribuye una conexión Google a ese READY. La revisión automática rechazó
otro despliegue por el riesgo de repetir la reasignación de alias.

Se restauraron todos los alias a sus destinos anteriores y la autoasignación a
Enabled. El intento quedó sin alias y con su host único bloqueado por WAF; se
verificó 403/deny. El dominio canónico y los dos alias de Production corresponden
otra vez al despliegue inicial `dpl_45na8koSAGfXJxnsrKdi7gr6v5gi` de `f870d75`.
master no cambió. No se promovió ni fusionó la PR. No se modificó el sitio oficial,
su DNS/hosting, CMS ni contenido. El diagnóstico público no fue activado.

Detalles operativos y cierre: [Fase B](PROYECTOS-GOOGLE-FASE-B.md).
Evidencia remota: [PR #2](https://github.com/Cedhu-Sog/website-2027/pull/2),
[commit f138eee](https://github.com/Cedhu-Sog/website-2027/commit/f138eee8f261f860ba65a69f6d60ac933a1f67df),
[Actions aprobado](https://github.com/Cedhu-Sog/website-2027/actions/runs/40053858518),
[Preview](https://vercel.com/cedhu-webmasters-projects/website-2027/5NJiQXrSivYqnnqgzq886jwjQeok),
[intento bloqueado](https://vercel.com/cedhu-webmasters-projects/website-2027/EvvZnoN1km5no3NEu1GPT1exRTP2).

Los apartados siguientes conservan la preparación y prueba anteriores; sus
pendientes de configuración OAuth quedan sustituidos por este estado vigente.

## Alcance

Se prepara una ruta de acceso individual por Google OAuth 2.0, para cuentas
Workspace autorizadas y los roles `ADMIN` / `DOCENTE`. La interfaz Astro no
incorpora datos privados; las verificaciones de identidad, Drive y Sheets ocurren
en funciones de servidor de Vercel. El antiguo endpoint de contraseña compartida
responde 410 y su cookie no es compatible con la nueva sesión.

Fase B **sigue pendiente**: no existe evidencia de una federación OIDC real, STS,
suplantación de cuenta, lectura de Drive y Sheets desde Production. La suite
simulada de CI NO acredita esas operaciones. El diagnóstico temporal de B permanece
desactivado y no se han generado secretos.

## Seguridad de acceso

- Flujo Authorization Code con PKCE S256, nonce y estado HMAC firmado de diez minutos,
  en cookie `__Host-` HttpOnly, Secure, SameSite=Lax para permitir el callback de Google.
- Validación de firma, audiencia, emisor y expiración del ID token por la librería
  oficial; nonce, `hd` y correo verificado contrastados con el dominio Workspace real
  configurado en el servidor. El parámetro de interfaz `hd` NO autoriza por sí solo.
- Además, consulta de solo lectura de `Usuarios_Autorizados`, bajo `00_Sistema`
  dentro de la unidad compartida correcta. El servidor primero comprueba el
  drive, las carpetas, pertenencia y esquema. Comprueba también la cuenta de servicio
  efectiva con Drive `about`. Lee A2:E completo (respuesta limitada a 256 KiB) y
  rechaza más de 1000 filas; no trunca permisos ni oculta duplicados tras filas vacías.
  `estado=ACTIVO`, `rol=ADMIN|DOCENTE`, `google_id` debe coincidir si está relleno.
  Duplicados, cuentas inexistentes, estados distintos y errores de Google deniegan.
- Las sesiones duran una hora, con firma ligada a `PROYECTOS_SESSION_SECRET` y
  cookies `__Host-` HttpOnly, Secure, SameSite=Strict. Cada acceso a la API
  `session` revalida el rol, para que las bajas y cambios surtan efecto sin caché.
- El backend no expone correos, IDs Google, cabeceras OAuth ni registros de la hoja.
  Si Google no responde, se deniega el acceso en lugar de reutilizar un permiso
  antiguo; respuestas privadas `no-store`.
- La función `requireSession` debe aplicarse en los nuevos endpoints privados de
  D/E. **NO** utilizar el guard heredado de contraseña compartida.

## Configuración aún requerida (no inventar valores)

**Dominio confirmado por el administrador:** `cedhu.edu.co`. Configurar `PROYECTOS_GOOGLE_DOMAIN=cedhu.edu.co`. La identidad de pruebas vigente es la facilitada por Coordinación TIC el 23/10/2026. No se publica su contraseña, nombre, correo ni registros de autorización en esta evidencia versionada.

**<u>PENDIENTE DE CONFIRMAR</u>** Crear/identificar en Google Cloud un cliente OAuth
para aplicación de tipo Web, gestionado por la organización institucional, con
pantalla de consentimiento interna cuando aplique y redirect URI **exacta**:

`https://website-2027-seven.vercel.app/api/proyectos/google/callback`

Guardar en Vercel Production, como variables privadas (nunca en Git):

- `PROYECTOS_GOOGLE_OAUTH_CLIENT_ID`
- `PROYECTOS_GOOGLE_OAUTH_CLIENT_SECRET` (secret)
- `PROYECTOS_GOOGLE_DOMAIN`
- `PROYECTOS_SESSION_SECRET` existente (no rotarlo sin plan de sesiones)

No reutilizar ni modificar credenciales de GitHub/Decap. No publicar un flujo de
Google que pida privilegios Drive del usuario: solo `openid email profile`.
El acceso a Drive/Sheets usa exclusivamente el WIF del servidor.

**<u>PENDIENTE DE CONFIRMAR</u>** La lista `Usuarios_Autorizados` debe incluir cuentas
institucionales aprobadas con `rol` y `estado=ACTIVO`. La columna `google_id`
es vinculante cuando se completa, pero puede estar inicialmente vacía. Consultar
a la administración antes de cargar usuarios; este entregable no edita Sheets.

## Validación y activación

1. Mantener la PR #2 en borrador y revisar pruebas y CI.
2. Preparar un entorno de autenticación aislado en Vercel, con origen y callback
   exactos, cliente OAuth Web institucional, secreto de sesión propio y federación
   del backend expresamente limitada a ese entorno. El código actual y el sujeto
   WIF están fijados a Production: NO basta copiar variables a Preview ni cambiar
   solamente el callback. No usar credenciales personales ni retirar ese control.
3. Verificar OIDC/STS/IAM y lectura de Drive/Sheets con la cuenta de servicio del
   entorno de pruebas, manteniendo el diagnóstico de Production cerrado.
4. Ejecutar OAuth real, comprobar claims sin registrar tokens y consultar la fila
   autorizada. Probar cada rol con una identidad realmente autorizada para él;
   una identidad de prueba no acredita ADMIN y DOCENTE por sí sola. No modificar
   estados o permisos de usuarios sin autorización institucional específica.
5. Verificar rechazo por falta de permiso, persistencia, expiración, logout,
   cookies, respuestas, frontend y registros del entorno de pruebas.
6. Solo tras resolver esas condiciones, solicitar la decisión de publicación.
   Esta actualización no autoriza fusionar master ni modificar Production.

## Estado a 23/10/2026

- Código preparado en rama aislada: no afecta `master` ni el alias Production.
- Pruebas de la rama: consultar resultados de CI; no afirmar éxito sin evidencia.
- Fase B: **NO COMPROBADA**.
- Login real con Google Workspace: **NO COMPROBADO**.
- Dominio institucional: **CONFIRMADO**. OAuth client: **PENDIENTE**.

## Prueba de identidad real y revisión de la PR #2 — 23/10/2026

Se completó un inicio de sesión real en el formulario oficial de Google con la
identidad facilitada por Coordinación TIC. Google abrió su cuenta y mostró
**«Gestionada por cedhu.edu.co»**. No se solicitó reactivación ni cambio de
contraseña; no se alteraron permisos. No se consultaron Gmail, Drive personal,
archivos ni actividad histórica. La captura recortada de identidad se conserva
solo en `.vercel/entrega1-google-domain-evidence.png`, excluida de Git.
El éxito de este login no demuestra el claim `hd` de un ID token emitido al sitio,
la fila de Usuarios_Autorizados ni un rol del repositorio.

Referencia remota revisada: HEAD `1bc40c6a59e1c1c921fe51522e00494b82d26125`,
Preview `dpl_GLf44xQuf5Nrgjtf8iDrXdBEYD7T`, READY, estado Vercel success.
Production observado: `dpl_45na8koSAGfXJxnsrKdi7gr6v5gi`, commit
`f870d75e3c0a519ae4b5c42eb8ca12cf88c2232e`. No se modificaron sus variables,
firewall, alias, configuración ni despliegue; no se fusionó la PR.

| Prueba requerida | Evidencia real y límites |
| --- | --- |
| Cuenta y dominio institucional | Login oficial completado y dominio administrado visible; sin evidencia de suspensión durante el login. No acredita su estado administrativo completo. |
| OAuth desde Vercel | Bloqueado: GET start, callback y session devolvieron 503 y mensaje fijo, con no-store en navegador/CDN. El guard rechaza Preview. |
| Tokens de identidad reales | No emitidos al sitio; no se capturaron, imprimieron ni almacenaron tokens. Validaciones criptográficas solo con tokens sintéticos. |
| Usuarios_Autorizados | No consultada realmente; registro, estado y rol de la identidad siguen desconocidos. |
| Acceso ADMIN real | No probado. Casos sintéticos separados correctos. |
| Acceso DOCENTE real | No probado. Casos sintéticos separados correctos. |
| Rechazo real por falta de autorización | No probado. El 503 es configuración no disponible, no un rechazo de la fila de una cuenta. |
| Persistencia, expiración y logout del sitio | Probados con cookies y reloj sintéticos; pendientes en Vercel con OAuth real. |
| Drive/Sheets mediante cuenta de servicio | Código y transporte simulado comprobados; falta conexión real OIDC/STS/IAM/Drive/Sheets. El login de Google del usuario no se usa para pedir permisos Drive. |
| Privacidad | Respuestas remotas observadas sanitizadas y sin caché. Escaneo de build y fuentes correcto; falta auditoría de una ejecución real autenticada y sus registros. |

El inventario de metadatos de Vercel muestra las variables GCP/recursos/sesión y
dominio solo en Production; los nombres OAuth CLIENT_ID y CLIENT_SECRET no están
configurados en ningún target del proyecto. No se descifraron valores.
Google Cloud requiere volver a verificar la identidad administrativa antes de
mostrar los clientes OAuth: todavía no se afirma si existe un cliente allí.

### Correcciones y pruebas locales de esta actualización

- Comprobación explícita de la cuenta de servicio efectiva antes de consultar la
  unidad y la hoja. Se rechazan cuentas personales antes de leer registros.
- Lectura completa de las cinco columnas de permisos con límite de respuesta y
  rechazo de más de 1000 filas, incluidos duplicados tras espacios vacíos.
- Verificador oficial de Google ejecutado con claves RSA y tokens sintéticos:
  éxito válido y rechazo de firma alterada, audiencia, emisor y expiración inválidos.
  Los certificados se sustituyen solo en la prueba; ninguna clave o token real.
- ADMIN y DOCENTE comprobados por separado: consultas repetidas conservan una hora
  de vigencia sin renovarla; al límite exacto se deniega; logout elimina la cookie
  y una petición posterior sin cookie recibe 401. No se atribuyen esos roles a la
  identidad institucional de pruebas.
- Node 22.23.4 existente, sin instalaciones. Build mediante
  `npm run check:proyectos:build` (incluye `npm run build`) correcto: 31 páginas,
  30 páginas verificadas, 4296 referencias, nueve PDF y 502 archivos públicos
  sin los secretos/recursos comprobados. Avisos existentes de colección de eventos
  vacía y chunk grande; sin errores de compilación.
- Pruebas de esta revisión: Workspace 11/11 y autenticación heredada 14/14;
  backend Google 24/24 mediante `npm run test:proyectos:google`. La ejecución
  directa inicial de esa última suite falló en el transporte de prueba por no
  tener `npm_execpath`; ejecutarla mediante npm resolvió ese requisito, sin
  cambiar ni omitir pruebas. La suite CMS ejecutada también pasó sus 13 casos.

### Límites que no deben certificarse como resueltos

La sesión es una cookie firmada, no cifrada: contiene correo, sujeto Google y rol,
protegidos de JavaScript por HttpOnly. El JSON público de session omite esos
identificadores, pero no se afirma que la identidad no viaje al navegador en la
cookie. Logout borra la cookie de ese navegador; no existe registro central de
revocación de una copia previamente robada. La expiración, rotación de clave y
revalidación de autorización siguen aplicando. No se promete revocación global de
sesiones ni se añade un almacén nuevo sin decidir antes su arquitectura.

Al cerrar las pruebas, rotar la contraseña por el procedimiento institucional,
revocar las sesiones innecesarias de la identidad de pruebas y dejarla suspendida
cuando termine su uso. La sesión Google abierta para esta prueba no equivale a
una sesión del sitio. No se cerraron las otras cuentas presentes en el navegador.

Referencias técnicas contrastadas: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
y [Vercel OIDC](https://vercel.com/docs/oidc/reference). Estas referencias explican
los controles; no sustituyen la evidencia pendiente del entorno institucional.
