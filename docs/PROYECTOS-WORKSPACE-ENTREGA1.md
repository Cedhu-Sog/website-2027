# Entrega 1 — Acceso de Google Workspace al repositorio CEDHU

Fecha de preparación: 23/10/2026. **NO APROBADA PARA USO INSTITUCIONAL AÚN.**

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
