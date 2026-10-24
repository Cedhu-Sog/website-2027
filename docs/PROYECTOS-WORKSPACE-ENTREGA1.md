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
  drive, las carpetas, pertenencia y esquema. Busca correo autorizado en A2:E1001;
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

**Dominio confirmado por el administrador:** `cedhu.edu.co`. Configurar `PROYECTOS_GOOGLE_DOMAIN=cedhu.edu.co`. Cuenta para prueba humana autorizada: `alexis.patarroyo@cedhu.edu.co`; no registrar contraseñas ni tokens.

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

1. Revisar PR, CI y pruebas Google simuladas, sin mezclar con el trabajo del sitio.
2. Validar Fase B con el diagnóstico temporal ya existente en Production, usando
   su procedimiento de expiración, protección WAF y cierre. Aún no ha ocurrido.
3. Configurar credenciales OAuth de forma segura, comprobar el redirect.
4. Publicar únicamente después de las pruebas, verificar login de ADMIN y DOCENTE
   con cuentas reales, cuenta externa rechazada, cuenta institucional no autorizada
   rechazada, expiración, logout, baja y cambio de rol.
5. Auditar headers, cookies, firewall, logs y ruta privada; verificar sitio y CMS.
6. Cerrar diagnóstico B. Solo entonces certificar el entregable 1 como concluido.

## Estado a 23/10/2026

- Código preparado en rama aislada: no afecta `master` ni el alias Production.
- Pruebas de la rama: consultar resultados de CI; no afirmar éxito sin evidencia.
- Fase B: **NO COMPROBADA**.
- Login real con Google Workspace: **NO COMPROBADO**.
- Dominio institucional y OAuth client: **<u>PENDIENTE DE CONFIRMAR</u>**.
