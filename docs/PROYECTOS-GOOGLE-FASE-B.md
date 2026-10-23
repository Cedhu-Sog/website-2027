# Fase B — preparación, incidencia y cierre

Fecha: 2026-10-22. La ventana autorizada venció sin ejecutar la consulta real a
Workspace. Se retira el diagnóstico del código desplegable y se publica el cierre.
Las secciones de preparación conservan la evidencia previa; el resultado de
ejecución figura al final. Este documento no acredita conexión con Workspace.

## Segundo intento — Etapa 1 preparada, pendiente de autorización

La nueva autorización limita esta etapa a preparación local y consultas remotas
de lectura. No se hizo commit, push, despliegue, cambio WAF, configuración de
secretos ni activación. No se inició ninguna ventana y no se consultó Google.
Los apartados posteriores conservan el historial del primer intento.

Estado remoto comprobado: `dpl_D7wHHoueKojzZDQohyEdqvzea4vP`, READY, commit
`18d6047d80da48c6d1d3161cd4185a5f2853db42`, asignado al dominio principal.
Fase A y el cierre anterior están disponibles. Sin despliegues concurrentes.
Las nueve variables de Google/recursos siguen presentes solo en Production,
sin modificar sus valores. `ENABLED=false` leído individualmente; TOKEN y
EXPIRES_AT ausentes. La configuración local autorizada sigue válida en formato.
El panel autenticado ofrece Secret con campo oculto y Production seleccionado;
se inspeccionó vacío y se cerró sin guardar. El CLI Vercel no está instalado:
se usará el conector autenticado y la integración Git existente, sin instalar nada.

### Formato y transporte del secreto

La causa exacta de los caracteres recibidos por el primer deployment no se conoce:
el log solo acreditó `tokenFormat=false`. El comprobador de portapapeles llegó a
mostrar formato válido, pero eso no acreditó el valor del snapshot ya desplegado.
No se atribuye el incidente a Google ni se afirma haber leído aquel secreto.

Se recuperaron exclusivamente la ruta, handler, CLI y pruebas desde `7aa2af6`;
no se revirtió el cierre ni se tocaron los módulos IAM/Workspace existentes.
Cambios dirigidos para el segundo intento:

- `diagnostic-access.js`: validación compartida, longitud exactamente 64,
  exclusivamente `a-f0-9`, sin normalizar ni recortar. La longitud explícita
  también rechaza el salto final que puede admitir el ancla `$` de JavaScript.
- `google-diagnostic-prebuild.mjs`: con ENABLED=true, formato/entorno/fecha y
  configuración del servidor inválidos abortan el build antes de publicar.
  Con ENABLED=false no activa nada ni consulta servicios. Errores de texto fijo.
- `google-session.ps1`: genera 32 bytes CSPRNG solamente después de autorización
  y `-Start`, conserva el valor en memoria y lo copia una vez al panel. `R` permite
  recuperar el mismo valor si se sobrescribe el portapapeles; nunca regenera.
- Tras un único pegado humano en Secret/Production, el cliente recibe el MISMO
  valor residente por pipe anónimo, exactamente 64 bytes ASCII, sin BOM ni newline,
  argumentos, variables de entorno o archivo. No hay que volver a pegarlo al CLI.
- `npm run proyectos:google:probe -- --all --stdin-secret` conserva la entrada
  oculta TTY alternativa. Ejecuta ocho negativos y luego una sola lectura real.
  La petición `credential_match` exige HTTP 400 `invalid_request` después de la
  comparación segura: demuestra coincidencia cliente-servidor sin consultar Google.
  Si obtiene 401, 404, WAF, redirección o una salida inesperada, se detiene y cierra.
- El handler conserva POST, comparación constante, vencimiento absoluto máximo
  de 20 minutos, IDs exclusivamente del servidor, no-store y todos los controles
  JWT. Se retiró el logging temporal del gate; no se añaden logs de credenciales.

La garantía de coincidencia con Production se obtiene en esa comprobación HTTP,
no por afirmar que leer el portapapeles demuestra lo guardado. En Etapa 1 no existe
un secreto real nuevo que pueda compararse con Production.

### Validación específica y cierre preparado

Node 22.23.4 existente: 24/24 pruebas Google, incluidos casos de formato, apagado,
expiración exacta, autorización y transporte real por npm con HTTP simulado.
`google-session.ps1 -SelfTest`: fixtures públicas válidas e inválidas y transporte
PowerShell→Node sin alterar bytes; no genera secreto ni hace solicitudes remotas.
Build Astro SSG con `check:proyectos:build` correcto; 462 archivos versionables y
501 públicos sin valores privados. CMS, estilos y autenticación no se editaron.
No se repitieron suites extensas sin cambios ni se añadieron dependencias.

`google-close.mjs` prepara/restaura diez rutas exactas respecto a `18d6047`, con
huellas de contenido y rechazo previo si detecta cambios ajenos. No usa reset,
force push ni borrados recursivos. `--self-test` aplicó el cierre local,
comprobó cada archivo y 13/13 pruebas del baseline, y restauró exactamente el
diagnóstico preparado. El manifiesto ignorado no contiene secretos.

Comandos listos, para el agente, únicamente durante Etapa 2:

```text
git add -- api/proyectos/google-diagnostic.js src/server/google/diagnostic.js src/server/google/diagnostic-access.js scripts/proyectos/google-check.mjs scripts/proyectos/google.test.mjs scripts/proyectos/google-diagnostic-prebuild.mjs scripts/proyectos/google-session.ps1 scripts/proyectos/google-close.mjs package.json vercel.json docs/PROYECTOS-GOOGLE-FASE-B.md docs/PROYECTOS-GOOGLE.md
git commit -m "fix(proyectos): prepare second controlled Workspace probe"
git push origin master
& '.vercel/local-node22-validation-20261021/node-v22.23.4-win-x64/node.exe' scripts/proyectos/google-close.mjs --check
& '.vercel/local-node22-validation-20261021/node-v22.23.4-win-x64/node.exe' scripts/proyectos/google-close.mjs --apply
git add -u -- api/proyectos/google-diagnostic.js src/server/google/diagnostic.js src/server/google/diagnostic-access.js scripts/proyectos/google-check.mjs scripts/proyectos/google.test.mjs scripts/proyectos/google-diagnostic-prebuild.mjs scripts/proyectos/google-session.ps1 scripts/proyectos/google-close.mjs package.json vercel.json docs/PROYECTOS-GOOGLE-FASE-B.md docs/PROYECTOS-GOOGLE.md
git commit -m "fix(proyectos): close second Workspace connectivity probe"
git push origin master
```

Se empleará el Node 22 verificado, no el Node 24 global. La lista exacta está
en `.vercel/phase-b-2/closure.json`; el push de master inicia cada deployment
por la integración Git. No se duplica con create_deployment ni se prueba un
rollback mediante el API que devolvió 403. Staging `skip-domain` no está demostrado
operativamente con las herramientas disponibles; no se presupone ni se instala CLI.

### Secuencia remota prevista, aún NO iniciada

1. Recibir confirmación operativa explícita de Etapa 2; revisar que no haya
   cambios de Git/producción y que continúe disponible el margen de uso de Codex.
2. Aplicar el payload WAF preparado: conservar bloqueos de ambos históricos,
   bloquear diagnóstico fuera de la terminal administrativa y verificar activo.
   La IP se guarda solo en `.vercel/phase-b-2/`, no en Git o informes públicos.
3. Preparar commit local (sin push aún) y panel protegido, autorizar el control
   local de sesión. El usuario ejecuta el comando que se le facilitará entonces,
   pega una vez en Secret/Production, guarda, pulsa G en su terminal y avisa aquí.
   Hasta ese momento ENABLED=false y no se calcula fecha ni arranca la ventana.
4. Verificar metadatos Secret/Production y sesión local lista; calcular UTC actual
   +20 minutos, configurar EXPIRES_AT y ENABLED=true, hacer UN push de activación.
   Build y despliegue cuentan dentro de los 20 minutos; no se amplía el vencimiento.
5. Confirmar READY, SHA, alias, portal/CMS y admisión WAF con rechazo sin credencial.
   Marcar control local ready con ID/commit/fecha para que la sesión ejecute
   automáticamente negativos, coincidencia y una consulta real, sin más pegados.
   La sesión rechaza comenzar si quedan menos de tres minutos, aplica timeout
   de dos minutos como máximo y reserva tiempo de cierre. No reintenta sola.
6. En éxito o fallo: control closed=true/ready=false, WAF Block para todos,
   ENABLED=false, eliminar TOKEN/EXPIRES_AT en el panel y verificar inventario.
   Aplicar cierre local, publicar una sola vez y verificar READY/alias/HTTP 404.
7. Añadir el nuevo host temporal al bloqueo histórico; no retirar los dos previos.
   Mantener la fecha absoluta efectiva en cada snapshot y verificar WAF. Conservar
   cierre y Fase A como recuperación; no usar el temporal como respaldo.

No emitir el informe definitivo mientras el nuevo snapshot conserve una capacidad
temporal vigente: confirmar que pasó su vencimiento absoluto, manteniendo WAF Block,
o retirar exclusivamente ese deployment de prueba después de verificar el cierre.
Cambiar variables del proyecto no revoca snapshots. No se borran Fase A, el cierre
`18d6047` ni los respaldos anteriores. La expiración no se prolonga para verificarla.

En Hobby el cierre `18d6047` será el anterior seguro durante activación. Después
del cierre siguiente, el anterior puede ser el diagnóstico: no se promete Instant
Rollback al cierre `18d6047` o a Fase A. Si dejan de ser elegibles, la alternativa
segura es un nuevo deployment del commit cerrado con variables cerradas, verificando
READY y dominio. Ante regresión crítica: bloquear diagnóstico, identificar destino
elegible y comunicar EJECUTAR ROLLBACK MANUAL; no ejecutar el API de rollback.

El margen consultado antes de la autorización tiene 61% disponible en cinco horas
y 94% semanal; es una instantánea compartida de cuenta, no una reserva o garantía.
Se volverá a consultar al iniciar Etapa 2 para reducir el riesgo del intento anterior.

**Punto de parada:** preparación terminada; requiere respuesta expresa
«AUTORIZO LA ETAPA 2 DEL SEGUNDO INTENTO DE FASE B». No ejecutar todavía el
generador ni crear variables. No comienza Fase C.

## Producción comprobada antes de activar (primer intento)

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

## Resultado de ejecución y cierre

### A. Conexión Google Workspace

| Comprobación | Resultado |
| --- | --- |
| Token OIDC Vercel | No comprobado en ejecución real |
| Identidad Production | No comprobada mediante JWT real |
| Google Cloud STS | No comprobado |
| Suplantación de cuenta de servicio | No comprobada |
| Unidad compartida Drive | No comprobada |
| Carpetas institucionales | No comprobadas |
| Tres archivos Sheets | No comprobados |
| Pestañas y encabezados | No comprobados |

Ventana absoluta: 2026-10-22T15:40:03.000Z a 2026-10-22T16:00:03.000Z,
incluido el despliegue. No se amplió. Los despliegues rechazaron el acceso con
404 antes de obtener credenciales Google. La evidencia booleana del segundo
despliegue mostró Production y fecha válidas, pero `tokenFormat=false`.
Clasificación: configuración de la credencial administrativa en Vercel; no
demuestra un fallo OIDC, STS, IAM, Drive ni Sheets. La rotación confirmada por el
operador no llegó a aplicarse a un nuevo despliegue antes del vencimiento.
Al retomar a las 19:04 UTC se inició el cierre, sin reabrir la ventana.

### B. Seguridad

- La terminal administrativa atravesó el WAF; una solicitud externa fue bloqueada
  con 403 y la marca WAF `deny`. El endpoint devolvió 404 sin credencial y con GET,
  con `no-store`; no alcanzó los rechazos 401/405 del estado habilitado.
- Las validaciones negativas con credencial incorrecta, cuerpo o recursos
  arbitrarios se validaron localmente; no se presentan como pruebas remotas.
- No se ejecutó la consulta real ni hubo operaciones de escritura en Workspace.
  No se generaron claves JSON permanentes ni se ampliaron privilegios.
- Production: `ENABLED=false` comprobado mediante lectura exclusiva de esa
  variable; TOKEN y EXPIRES_AT retirados e inventario sin ambas claves.
- Se eliminan la función HTTP, el handler, la duración específica y el modo
  administrativo del CLI. Los módulos Google reutilizables siguen fuera del cliente.
- La revisión de logs del intento encontró exclusivamente indicadores booleanos
  del gate. No se imprimieron secretos ni datos Workspace. La revisión no equivale
  a una garantía sobre todos los logs históricos de la plataforma.
- Cierre validado con Node 22: 13/13 pruebas, Astro SSG y verificación de privacidad
  sobre 458 archivos versionables y 501 archivos públicos. Se conservan los avisos
  previos de eventos vacíos y tamaño de chunk.

### C. Producción y recuperación

| Despliegue | Commit | URL única |
| --- | --- | --- |
| `dpl_FKn3To4fnmqZU3XWEKMQmapWKsCL` | `33830aa06cf52bca4279fdc4f72f71f17f0bba00` | <https://website-2027-d0bkixvok-cedhu-webmasters-projects.vercel.app> |
| `dpl_ACbEeR97ARJgFos1L4FSUnG1g8AY` | `7aa2af652e8e34ecb507bfaa52cb0983fab7cc98` | <https://website-2027-m6yg31y90-cedhu-webmasters-projects.vercel.app> |

El despliegue limpio se genera exclusivamente mediante el push de este cierre;
su ID, URL, asignación de dominio y comprobaciones HTTP posteriores se registran
en el informe final y en la evidencia operativa local ignorada bajo `.vercel/`.

Se conserva D1, `dpl_FmjjU8ocEjjaCBLU4nzyAGdx7u59`, READY, y el respaldo
anterior. Los dos despliegues de prueba tienen vencimiento absoluto ya pasado.
No se usan como destino de recuperación. Se protegen además sus rutas históricas
mediante WAF; conservarlos evita eliminar evidencia o respaldos sin necesidad.
La elegibilidad técnica de una versión como rollback no acredita que sea segura.
D1 ya no es el despliegue Production inmediatamente anterior: no se promete
Instant Rollback a D1 en Hobby. La alternativa segura es publicar nuevamente
el commit estable de Fase A con configuración cerrada, tras verificar entorno y
dominio; no se ha ejecutado esa recuperación ni el API de rollback.

El sitio, formulario `/proyectos/`, shell Decap y configuración CMS respondieron
200 durante el intento. La publicación de cierre vuelve a verificar esos recursos.
No se sustituyen contraseñas ni OAuth; una prueba nueva de login autenticado no
se afirma a partir de la mera carga del formulario o del shell.

### D. Conclusión

La conexión real queda pendiente. No se inicia Fase C ni se vuelve a activar el
diagnóstico automáticamente. La declaración de cierre solo es válida después
de confirmar READY, ausencia de la ruta y protección de las versiones históricas:
**FASE B DETENIDA POR BLOQUEO — ACCESO TEMPORAL DESHABILITADO.**

## Fuentes contrastadas

- [Vercel: variables Secret y Config](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
- [Vercel: skip-domain](https://vercel.com/docs/cli/deploy#skip-domain).
- [Vercel: staging Production](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build).
- [Vercel: claims OIDC](https://vercel.com/docs/oidc/reference).
- [Vercel: Instant Rollback y elegibilidad Hobby](https://vercel.com/docs/instant-rollback).
- [Vercel: retirada de despliegues](https://vercel.com/docs/deployments/managing-deployments#delete-a-deployment).
- [Vercel: límites WAF y rate limiting Hobby](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting#limits).
- [Vercel: precios WAF](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing).
