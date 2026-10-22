# Fase B — preparación y confirmación operativa

Fecha: 2026-10-22. Estado: preparación local terminada; activación pendiente de
confirmación operativa del usuario. Este documento no acredita conexión real con
Workspace ni cierre de una prueba que todavía no se ha iniciado.

## Producción comprobada antes de activar

| Elemento | Evidencia |
| --- | --- |
| Proyecto/equipo | `website-2027` / `cedhu-webmasters-projects` |
| Repositorio/rama | `Cedhu-Sog/website-2027` / `master` |
| Commit publicado | `4bb2b5b2e978a5f5788354058962ec4d78afa4bb` |
| D1, Fase A estable | `dpl_FmjjU8ocEjjaCBLU4nzyAGdx7u59`, READY, Production |
| URL única D1 | <https://website-2027-95t8sxw0n-cedhu-webmasters-projects.vercel.app> |
| Dominio asignado a D1 | <https://website-2027-seven.vercel.app> |
| Respaldo anterior a D1 | `dpl_32q56RazKrxEDb3zjMijagEdJnGS`, commit `f31507d` |
| URL del respaldo anterior | <https://website-2027-gwvw1uc8r-cedhu-webmasters-projects.vercel.app> |
| Concurrencia | Ningún BUILDING/QUEUED/INITIALIZING en los diez despliegues más recientes |
| Diagnóstico | Valor Production comprobado exactamente `false`; sin variables de token ni expiración |
| Configuración local | Válida; diagnóstico `false`, token y expiración vacíos; sin modificar el archivo ignorado |
| Node | Engines `^22.19.0`; selector remoto todavía `24.x`, discrepancia ya registrada en A; engines controla Node 22 |
| Protección Vercel | `enabled=true`, `all_except_custom_domains`; no sustituye la autenticación del diagnóstico |
| Firewall | Activo, versión 2; regla de login conservada y regla `CEDHU Google Phase B` que deniega el diagnóstico fuera de la IP administrativa |
| Log Drains | Ninguno configurado para el proyecto |
| Panel administrativo | Sesión disponible; formulario Secret con valor oculto y Production verificados, sin guardar |
| Retirada en panel | Opción Delete visible tanto para variables como para deployments; ninguna eliminación ejecutada |

La API marca D1 y el respaldo anterior como candidatos de rollback. Eso no demuestra
que ambos sean seleccionables a la vez en Hobby. Se conserva la comprobación manual
del usuario en A; la elegibilidad debe revisarse de nuevo tras cada publicación.

## Revisión de seguridad y cambios locales

Se revisaron `api/proyectos/`, `src/server/google/`, el cliente administrativo,
los helpers compartidos de sesión y los tipos/código instalados de OIDC.

| Control | Resultado |
| --- | --- |
| Activación | Cerrado salvo `true`, Vercel Production, secreto válido y vencimiento válido |
| Método | Solo POST cuando está habilitado; 405 y `Allow: POST` para otros métodos |
| Secreto | 32 bytes como 64 caracteres hexadecimales minúsculos; comparación con `timingSafeEqual` |
| Independencia | Cookie o contraseña del portal no autorizan el diagnóstico |
| Expiración | UTC absoluta, reloj del servidor, máximo 20 minutos futuros, cierre en el instante exacto |
| Formato | `YYYY-MM-DDTHH:mm:ssZ` o `YYYY-MM-DDTHH:mm:ss.sssZ`; sin offsets ni fechas normalizadas inválidas |
| Peticiones lentas | Nueva comprobación después de leer el cuerpo; aborto limitado también por el vencimiento |
| Recursos | IDs exclusivamente de configuración del servidor; pertenencia validada antes de leer Sheets |
| Lecturas | Drive/Sheets GET; metadatos y fila 1; ningún registro de fila 2 en adelante |
| Autenticación Google | JWT firmado RS256, issuer/audience/subject/Production/project/exp/iat verificados; STS y suplantación temporal |
| Caché | `no-store` en navegador/CDN para todas las respuestas del handler |
| Salidas | Booleanos y códigos sanitizados; ningún error crudo, token, encabezado o dato de Workspace |
| Logs de aplicación | Sin instrucciones de registro de secretos o cuerpos en los módulos revisados |

Cambios necesarios para B:

- `src/server/google/diagnostic.js`: límite de 20 minutos, fecha UTC canónica,
  revalidación después del cuerpo y aborto al vencimiento.
- `src/server/google/auth.js`: códigos diferenciados para audiencia y sujeto,
  conservando todas las validaciones JWT existentes.
- `src/server/google/repository.js`: distinguir errores de Drive de errores de Sheets,
  incluso si ocurren durante la comprobación de la misma hoja.
- `scripts/proyectos/google-check.mjs`: modo `--negative` con la entrada oculta
  existente; salida sanitizada y detención ante el primer rechazo incorrecto.
- `scripts/proyectos/google.test.mjs`: pruebas afectadas y prueba del cliente
  negativo contra el handler real con TTY/HTTP simulados, sin red.
- Este documento: evidencia y procedimiento. Ninguna dependencia nueva.

## Validación realizada

Runtime local reutilizado: Node 22.23.4 ya aprobado en A, sin instalaciones.

| Validación | Resultado |
| --- | --- |
| Suite Google afectada | 21/21, sin consultas reales a Google |
| Límite temporal | Acepta exactamente 20 minutos; rechaza 20 minutos + 1 ms; misma instancia cerrada al expirar |
| Fecha imposible | Rechazada aunque `Date.parse` la normalice a un instante futuro |
| CLI negativo | Ocho rechazos, ninguna invocación Google; se detiene si el endpoint está cerrado |
| Build | `npm run check:proyectos:build`, que ejecuta `npm run build` con prebuild/postbuild, correcto |
| Astro | 31 páginas generadas; salida static, sin adaptador SSR |
| Validación del sitio | 30 páginas, 4294 referencias locales, nueve PDF, correcta |
| Privacidad | 457 archivos versionables y 501 públicos comprobados antes de añadir este documento; ningún valor privado detectado |
| Diff | Sin errores de espacios |

Persisten los avisos ya conocidos de colección `eventos` vacía y chunk mayor de
500 kB. No son fallos del build ni se modifican dentro de B.

HTTP remoto a las 14:19:03 UTC (09:19:03 Colombia), sin credenciales:

| Ruta/método | Resultado |
| --- | --- |
| GET `/` | 200 |
| GET `/proyectos/` | 200, formulario de contraseña presente |
| GET `/admin/` | 200, shell Decap presente |
| GET `/admin/config.yml` | 200 |
| GET `/api/proyectos/session` | 401, sin sesión |
| POST diagnóstico, `.js` y slash final | 404, JSON `not_found`, `no-store` en las tres variantes |

Evidencia HTTP local sanitizada: `.vercel/cedhu-phase-b-preflight-http.json`.
Los accesos autenticados del portal y GitHub/Decap fueron confirmados por el usuario
en A; no se repitieron ni se presentan como una nueva verificación autenticada.
La consulta de logs error/fatal de D1 durante los últimos 15 minutos no devolvió
grupos. El primer intento de ventana de una hora fue rechazado por retención Hobby;
se redujo la consulta, sin contratar observabilidad ni ocultar el rechazo.

## Estrategia de despliegue

Vercel documenta `vercel deploy --prod --skip-domain` como Production sin asignar
dominios. Los claims OIDC dependen del target Production; la lectura documental
respalda que el staging de dominios no convierte el target en Preview. No se ha
ejecutado un despliegue para demostrar sus claims ni permisos en esta cuenta.

En este entorno no hay CLI instalada/autenticada/enlazada; el conector de creación
de despliegues no expone `skip-domain`. El panel está accesible, pero no se ha
demostrado un control equivalente por despliegue. Además, el handler y el probe fijan el origen canónico: una URL única sería
rechazada por diseño. No se amplían orígenes ni se instala una CLI para esta prueba.

Se propone un despliegue Production normal D2 sobre el dominio canónico y un
despliegue limpio D3. El primer push a `master` incluirá las correcciones de B y
activará un solo build por Git, DESPUÉS de la confirmación y de configurar el
entorno. No ejecutar además create/redeploy del conector. El cierre usará otro
único push con retirada de la ruta y configuración cerrada. Sin publicaciones
intermedias ni push documental adicional durante la ventana.

## Preparación operativa pendiente, sin activar todavía

El conector permite editar variables y Firewall, pero no ofrece eliminación de
variables ni de deployments. El panel autenticado muestra esas opciones de retirada;
conservar la sesión durante la ventana. Su presencia no demuestra una eliminación
efectiva hasta ejecutarla y verificarla sobre el candidato temporal.

1. Obtener confirmación operativa explícita del usuario para D2, prueba y D3.
2. Conservar la sesión del panel del equipo/proyecto correcto. Las opciones de
   cierre ya se comprobaron visualmente sin ejecutarlas sobre los respaldos.
3. Mantener la regla WAF Block ya aplicada: path comienza por
   `/api/proyectos/google-diagnostic` AND IP distinta de la terminal administrativa.
   Sin límite por host ni método; cubre `.js`, slash, aliases y URL única. La
   terminal identificó IPv4; IPv6 no estuvo disponible. Las tres variantes
   devolvieron 404 JSON cerrado con `no-store` desde esa terminal. Una petición
   externa recibió 403 con `x-vercel-mitigated: deny`, a las 14:58:04 UTC.
   Las IPs administrativas permanecen fuera de Git y de este informe.
4. Hobby permite tres reglas custom y una regla de rate limiting. Esta última ya
   protege el login. Usar la regla Block adicional sin modificar la existente ni
   contratar más capacidad. Escritura comprobada: versión activa 2, regla válida
   `rule_cedhu_google_phase_b_wnm1WC`, sin borrador pendiente. Este endpoint del
   conector aplicó el cambio directamente; se verificó la versión activa después.
5. No habilitar captura de Authorization, cookies o cuerpos. La aplicación no
   los imprime, no hay Log Drains y no hay configuración explícita `logHeaders`
   en el inventario WAF recibido. Durante esta preparación no se han creado ni
   enviado credenciales de diagnóstico; no se presentan logs previos como prueba
   de una futura petición que todavía no ocurrió.
6. Mantener la prueba cerrada si falla alguno de estos preparativos.

## Entrada segura de las variables y ejecución

No se ha generado ningún secreto real durante la preparación.

Después de la confirmación, el operador genera con el generador criptográfico de
su gestor institucional **32 bytes aleatorios codificados en hexadecimal minúsculo**
(64 caracteres). Mantiene el secreto en ese gestor y lo introduce directamente en
el panel y en los prompts ocultos; nunca en chat, argv, archivos ni transcripciones.

En [Settings → Environment Variables](https://vercel.com/cedhu-webmasters-projects/website-2027/settings/environment-variables):

1. Seleccionar únicamente Production; desmarcar Preview/Development y cualquier
   entorno custom. No importar ni editar el resto de variables.
2. Añadir `PROYECTOS_GOOGLE_DIAGNOSTICS_TOKEN` como Secret/Sensitive. Comprobar
   ANTES de pegar que la entrada oculta el valor; no accionar el icono de revelar.
   Si el panel no permite entrada enmascarada, detener la activación y habilitar
   otro mecanismo administrativo aprobado; no pegar en un campo visible.
   En esta preparación se comprobó el formulario vacío: tipo Secret seleccionado,
   entrada `secret value` oculta con botón `Show value` y entorno Production.
3. Añadir `PROYECTOS_GOOGLE_DIAGNOSTICS_EXPIRES_AT` con UTC absoluta calculada
   justo antes de activar, como máximo ahora +20 minutos. El formato recomendado
   es el ISO de tres milisegundos que produce `new Date(...).toISOString()`.
4. Cambiar `PROYECTOS_GOOGLE_DIAGNOSTICS_ENABLED` a `true` al final. Escribir en
   el registro solo la hora UTC de activación/vencimiento, nunca el token.
5. Reconfirmar ausencia de otros builds, publicar D2, registrar ID/URL/SHA y READY,
   comprobar asignación del dominio y humo del sitio/portal/CMS. El tiempo de build
   consume parte de la ventana; no extenderla si se agota.

En una terminal TTY autorizada con Node 22 y sin grabación:

```powershell
npm run proyectos:google:probe -- --negative
# Solo si todos los rechazos son correctos:
npm run proyectos:google:probe
```

Ambos solicitan la clave sin eco. Introducirla en ese prompt, nunca como argumento
del comando ni mediante un mensaje a la herramienta que registre la entrada.
El operador puede usar la terminal directamente. Guardar únicamente las líneas
JSON sanitizadas del resultado. El modo negativo hace ocho solicitudes acotadas;
el modo normal se ejecuta una vez. No hay reintentos automáticos ni redirects.

Los ocho campos existentes son `configuration`, `federation`, `serviceAccount`,
`drive`, `structure`, `catalog`, `users`, `audit`. `federation=true` solo se obtiene
después de validar OIDC, intercambiar STS y suplantar mediante IAM Credentials.
Esto permite completar las ocho condiciones solicitadas por el usuario, sin
confundir estos campos del protocolo con esas ocho condiciones del informe.

Errores seguros: `oidc_unavailable`, `oidc_invalid`, `oidc_audience_invalid`,
`oidc_subject_invalid`, `federation_exchange_failed`, `impersonation_failed`,
`drive_forbidden`, `sheets_forbidden`, y códigos específicos de pertenencia,
pestaña/encabezados. Un fallo interrumpe los prerrequisitos; las condiciones no
alcanzadas deben anotarse como no comprobadas, nunca como éxitos ni fallos probados.

## Cierre obligatorio previsto

Tras éxito o fallo, cerrar inmediatamente; no esperar al vencimiento para empezar:

1. Convertir la regla WAF del diagnóstico en Block para todas las IP. Mantener la
   protección mientras D2 conserve la copia de su entorno. Un 403 WAF no acredita
   por sí solo el 404 del handler.
2. En Production, `ENABLED=false`; eliminar TOKEN y EXPIRES_AT desde el panel.
   Comprobar por inventario las dos ausencias sin leer ni imprimir secretos.
3. Retirar `api/proyectos/google-diagnostic.js` y su entrada exacta de duración
   en `vercel.json`; adaptar la prueba de la ruta retirada. Conservar los globs de
   CMS/sesiones y los módulos Google reutilizables. Ejecutar pruebas afectadas y
   build, publicar un único D3 cerrado y verificar READY y asignación de dominio.
4. Comprobar sitio, portal y CMS. Retirar/proteger D2 y cualquier otro deployment
   que haya recibido `true`; conservar D1 y el respaldo anterior. Para eliminar
   D2: Deployments → D2 identificado por ID → menú `...` → Delete. Verificar su
   retirada mediante inventario y respuesta HTTP, no solo mediante el clic.
5. No confiar en cambiar las variables del proyecto para revocar D2. Si su retirada
   se bloquea, conservar WAF Block y comprobar después de la hora absoluta de cierre
   que D2 ya no autoriza el diagnóstico. Solo entonces retirar la regla temporal,
   comprobar 404 en D3 y que D2 esté retirado o efectivamente cerrado.
6. El aborto al vencimiento está probado localmente; la comprobación remota del
   vencimiento con el bearer correcto se hará solo si D2 sigue disponible y es
   seguro hacerlo. No afirmar que una URL protegida por Vercel demuestra ese gate.
7. Credenciales Google emitidas solicitan 600 segundos. No son claves permanentes;
   cambiar variables no revoca un token Google ya emitido. No se expone al operador.
8. Registrar D2/D3, UTC, resultados, cierre de configuración/ruta, situación histórica,
   logs y nuevo respaldo elegible. No restaurar D2 como reacción a una regresión de D3.

Ante regresión crítica de D2: cerrar acceso, emitir **EJECUTAR ROLLBACK MANUAL** y
restaurar D1 solo tras confirmar su elegibilidad actual en el panel. No ejecutar
el recurso de rollback del conector que dio 403. Después de D3, el anterior puede
ser D2 con diagnóstico activado: no asumir que sea un respaldo seguro ni que D1
siga disponible para Instant Rollback. La eliminación de D2 también puede cambiar
las opciones de recuperación; volver a comprobarlas.

## Estado del informe de ejecución

Las ocho condiciones Google Workspace están pendientes de prueba real.
Despliegues B realizados: ninguno. El commit local de preparación se registrará
en la evidencia operativa; no se hará push hasta confirmar el inicio de la ventana.
Diagnóstico actual: deshabilitado, sin credenciales temporales. No hay despliegues
históricos con diagnóstico activado creados durante esta preparación.
No se inicia Fase C. El informe A/B/C/D definitivo se completará después del cierre.

La autorización de ejecución recibida después de la preparación permite configurar
WAF, hacer commit y preparar el cierre. El usuario mantiene un punto adicional de
confirmación justo antes de iniciar la ventana: hasta recibirlo, `ENABLED=false`,
sin token, sin expiración, sin push ni despliegue. La expiración se calculará
inmediatamente antes de la activación, después de la entrada segura del secreto.

## Fuentes contrastadas

- [Vercel: skip-domain](https://vercel.com/docs/cli/deploy#skip-domain).
- [Vercel: staging Production](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build).
- [Vercel: claims OIDC](https://vercel.com/docs/oidc/reference).
- [Vercel: Instant Rollback y elegibilidad Hobby](https://vercel.com/docs/instant-rollback).
- [Vercel: retirada de despliegues](https://vercel.com/docs/deployments/managing-deployments#delete-a-deployment).
- [Vercel: límites WAF y rate limiting Hobby](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting#limits).
- [Vercel: precios WAF](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing).
