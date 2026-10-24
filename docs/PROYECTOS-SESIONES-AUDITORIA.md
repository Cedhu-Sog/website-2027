# Entregable 1 — Auditoría de sesiones y cierre pendiente

Fecha: 24/10/2026, America/Bogota. Base auditada: `8f88675e9395dbed791990023002a431a347d93d`, [PR #2](https://github.com/Cedhu-Sog/website-2027/pull/2), rama `feature/proyectos-workspace-entrega1`.

## Decisión vigente del responsable del proyecto — 24/10/2026

El responsable del proyecto **autoriza subir la rama existente, integrar PR #2 en master y desplegar Production cuando pasen los checks**, sin esperar una hora ni implementar revocación inmediata. Se mantiene el vencimiento absoluto de 3600 segundos y no se incorporan servicios, costos ni cambios arquitectónicos para revocación.

La posible reutilización de una cookie previamente conservada hasta su vencimiento queda **aceptada temporalmente por el responsable del proyecto**. Esto no resuelve el riesgo, no acredita revocación inmediata ni implica aprobación administrativa institucional adicional. El vencimiento real de una sesión de 60 minutos queda pendiente de una validación posterior en Production; las pruebas automatizadas de frontera siguen siendo evidencia local.

La decisión habilita la publicación con pendientes explícitos; **no convierte los 14 criterios en verificaciones íntegramente realizadas**. Si aparece una falla crítica de autenticación, autorización, exposición de datos o funcionamiento, detener la integración/despliegue o revertir exclusivamente esta integración, conservando configuraciones preexistentes. No se abrirán el ensayo de 75 minutos ni callbacks temporales para completar esta publicación.

`b9f2c3be574c97661eb1bd61371467350b6d6504` se verificó como último commit de seguridad de la rama existente y se subió sin crear otra PR. GitHub confirmó ese SHA como head de PR #2. [Actions 40106951563](https://github.com/Cedhu-Sog/website-2027/actions/runs/40106951563) y [Vercel Preview](https://vercel.com/cedhu-webmasters-projects/website-2027/8b7z4HhUJ3H1f1gYujgXJUczjUp7) aprobaron ese commit. La revisión documental que registra esta decisión debe pasar sus propios checks antes de la fusión.

## Publicación y comprobaciones canónicas — 24/10/2026

La revisión final de PR #2 fue `9c7b63a3953483a269918a1ac871870c8ac8e835`: [Actions 40107156293](https://github.com/Cedhu-Sog/website-2027/actions/runs/40107156293) y [Preview 6CYuRSt9XEHuCiWLKXu74bchuFaC](https://vercel.com/cedhu-webmasters-projects/website-2027/6CYuRSt9XEHuCiWLKXu74bchuFaC) aprobaron antes de la fusión. Se usó un commit de fusión con SHA esperado del head, conservando b9f2c3b en el historial. La PR quedó fusionada a las 15:31:04 UTC (10:31:04 Colombia) en **`7298525a415cf74dd2716e17fa711e79b0cf1ac1`**. No se creó otra PR ni se reescribió el historial.

Vercel asignó Production al despliegue **`dpl_8sE3MTKB2yXHxtvdQAZJAHKSnhP6`**, [detalle](https://vercel.com/cedhu-webmasters-projects/website-2027/8sE3MTKB2yXHxtvdQAZJAHKSnhP6), URL propia `https://website-2027-ldo7e5zom-cedhu-webmasters-projects.vercel.app`, estado **READY**, fuente `master` y SHA 7298525. El canónico `https://website-2027-seven.vercel.app` y el alias git-master corresponden a ese despliegue. El alias auxiliar de equipo permanece en el despliegue anterior; no se reasignó manualmente ni se usó para autenticación. El sitio público, CMS y su configuración canónicos conservaron exactamente sus hashes de respuesta anteriores a la integración.

[Actions de master 40107336746](https://github.com/Cedhu-Sog/website-2027/actions/runs/40107336746) terminó success. Se consultaron los pasos del job: npm ci, test:cms, test:proyectos:workspace, build y check-personal, todos success. No se atribuye a CI la suite backend Google o la heredada que solo constan en la auditoría local previa. master no tenía protección ni rulesets al consultar GitHub; se esperaron los checks configurados igualmente y no se alteró esa configuración preexistente.

| Smoke canónico realizado | Evidencia y alcance |
| --- | --- |
| Sitio y CMS por HTTP | `/`, `/admin/` y `/admin/config.yml`: 200, hashes idénticos antes/después. `cedhu.edu.co/`: 200 y título institucional. No se cambió contenido desde el CMS |
| Inicio OAuth CMS | 302 a GitHub, callback canónico exacto y cookie de flujo Secure/HttpOnly de diez minutos. No acredita una sesión editorial autenticada ni una operación de escritura |
| Interfaz de repositorio | 200, entrada Workspace presente, contraseña compartida retirada |
| Inicio Workspace | 302 a Google; callback canónico exacto, sin callbacks temporales. Cookie de flujo __Host-, Secure/HttpOnly, Lax y Max-Age=600 |
| ADMIN real | OAuth completado con una cuenta ya autorizada; interfaz Administrador. API session devolvió authenticated=true, rol ADMIN, expiresAt y solo las seis claves permitidas. Recarga de esa API mantuvo el mismo expiresAt |
| DOCENTE real | El responsable completó el ingreso de una cuenta DOCENTE/ACTIVO que él registró en la lista. Interfaz Docente y API authenticated=true/role=DOCENTE; mismas seis claves permitidas. El agente no realizó el alta ni cambió permisos |
| Cierre ADMIN | Botón real devolvió la interfaz de acceso y el mensaje Sesión cerrada. La eliminación de ambas cookies se comprobó además en las cabeceras HTTP de logout; no se leyó ni exportó el valor de cookies |
| Cierre DOCENTE y navegador sin sesión | Botón real mostró Sesión cerrada. Navegar después a la API session en el mismo navegador devolvió únicamente el mensaje Inicia sesión para continuar, sin authenticated ni contenido privado |
| Cuenta institucional INACTIVO | Se seleccionó una identidad real ya abierta en Google con ese estado, sin modificarlo. Volvió a la pantalla de acceso, sin área privada; session en el mismo navegador siguió exigiendo inicio de sesión. No se prueba una cuenta externa diferente ni se afirma un código HTTP no observado en esa navegación |
| Rechazo sin sesión o con cookie sintética alterada | 401, no-store y eliminación de la cookie de sesión. Sin campos de identidad en la respuesta |
| Origen ajeno y logout sin defensas | 403. Logout válido: 200, no-store, dos cookies Max-Age=0 con sus atributos originales |
| Login heredado y diagnóstico | 410 y 404/no-store, respectivamente |
| Errores de ejecución | Consulta agrupada error/fatal, acotada al nuevo despliegue, devolvió cero grupos. No es una garantía sobre todas las peticiones futuras |
| CMS en navegador | Cargó el logo, botón Iniciar sesión con GitHub y enlace de regreso; consulta final de consola vacía. No se abrió sesión editorial ni se creó/editó/publicó contenido |

El smoke interactivo anterior se completó entre las 15:33 y 15:45 UTC (10:33–10:45 Colombia). El navegador se bloqueó transitoriamente y se recuperó mediante su API documentada; no se trató de una falla de autenticación o de Production. El responsable completó personalmente el acceso DOCENTE y confirmó que él había registrado la cuenta. El agente no alteró filas, roles ni estados; el registro DOCENTE/INACTIVO protegido no fue reactivado y solo se utilizó para comprobar rechazo. No se compartieron contraseñas ni se cerraron sesiones generales de Google. Las sesiones del portal usadas para el smoke terminaron cerradas.

No se afirma inspección directa del almacén de cookies HttpOnly: se observaron el efecto real de logout en el navegador, la respuesta privada que después exige iniciar sesión y las cabeceras de eliminación de ambas cookies, sin extraer sus valores. El texto de acceso denegado no se conservó en la interfaz del ensayo negativo; la evidencia de rechazo es que no apareció el área privada y la API siguió sin sesión. Es una limitación de presentación, no una concesión de acceso.

El único recurso privado de esta entrega sigue siendo la respuesta de sesión/bienvenida. No hay catálogo ni documentos privados implementados para probar descarga o escritura. La autenticación ADMIN real sí exige la lectura ordinaria de la lista autorizada mediante WIF; no se repitieron diagnósticos generales de Drive/Sheets.

La publicación queda realizada con los pendientes expresamente aceptados por el responsable. Se conserva el vencimiento de una hora y no se esperó su expiración real. No se detectó una falla crítica en las comprobaciones efectuadas; no se ejecutó rollback. La evidencia original `qa/proyectos-sesiones-2026-10-24.json` es una instantánea de b9f2c3b, no una certificación de este despliegue ni del documento actualizado.

Evidencia del cierre: [publicación y smoke canónico](qa/proyectos-publicacion-2026-10-24.json). Capturas sin identidad y salidas sanitizadas permanecen localmente en `.vercel/entrega1-production-*.png` y `.vercel/entrega1-release-*.json`, ignoradas por Git. Esta actualización final modifica solo documentación/evidencia en master; los checks y el despliegue de su commit documental deben comprobarse al cerrar, sin repetir los logins si el código ejecutable sigue idéntico al integrado.

## Dictamen histórico de la auditoría de b9f2c3b

La recomendación original fue no certificar ni publicar hasta resolver los pendientes. La decisión anterior del responsable sustituye ese bloqueo de publicación, manteniendo las limitaciones técnicas y la falta de comprobación real de una hora. Lo que sigue describe la auditoría original y no debe interpretarse como una prohibición vigente de la integración expresamente autorizada.

## Alcance y evidencia conservada de la auditoría original

No se repitieron pruebas reales de Workspace, OAuth, OIDC, Drive, Sheets ni ADMIN/DOCENTE. La evidencia previa sigue en [Entrega 1](PROYECTOS-WORKSPACE-ENTREGA1.md) y [Fase B](PROYECTOS-GOOGLE-FASE-B.md). La autorización del usuario para una nueva ventana aislada de 75 minutos llegó durante esta auditoría. No se ejecutó: el control del navegador terminó porque no pudo determinar la URL activa de Windows con suficiente confianza. No se abrió una nueva sesión, no empezó la ventana y no hay callback que retirar ni host nuevo que cerrar.

El único acceso remoto de esta revisión fue de lectura: metadatos/checks de PR y consulta de alias. Los tres alias siguen asociados a `dpl_45na8koSAGfXJxnsrKdi7gr6v5gi`; `master` conserva `f870d75e3c0a519ae4b5c42eb8ca12cf88c2232e`. Sin cambios en Production, WAF, OAuth, IAM, DNS, CMS, sitio público ni filas de autorización. El registro de pruebas protegido permanece DOCENTE/INACTIVO; no se modificó ninguna cuenta.

No se hizo push: la integración Git de Vercel crea Preview al actualizar la rama. La prohibición de publicar automáticamente se conserva; las correcciones quedan en la rama local existente, pendientes de actualizar la PR y ejecutar sus checks cuando se autorice ese paso. La PR permanece borrador, sin fusión ni promoción.

## Hallazgos y correcciones

| Hallazgo en la base | Corrección de esta revisión | Verificación local |
| --- | --- | --- |
| Cookie HMAC permitía decodificar correo, sujeto y rol; el flujo exponía también su verificador PKCE a quien obtuviera su valor | AES-256-GCM, IV aleatorio de 96 bits, tag de 128 bits, HKDF-SHA256 por propósito y AAD de versión/propósito. Solo módulos de Node existentes | Integridad de todos los componentes, claves/propósitos separados, IV distintos, ausencia de campos legibles y rechazo de formatos viejos/no canónicos |
| Una consulta de permisos iniciada antes del vencimiento podía devolver contenido después del límite | Segunda comprobación del reloj después de resolver permisos y también ante error del proveedor | Petición a 59:59.999 que cruza 60:00 devuelve 401, incluso cuando Google falla |
| El callback fijaba el inicio de sesión antes del canje/consulta y no revisaba otra vez la expiración del flujo | Inicio absoluto al emitir la sesión; flujo vencido durante el canje denegado | Flujo a 599 segundos permite emisión; a 600 segundos deniega |
| Logout dependía de configuración y solo eliminaba la sesión | Elimina sesión y flujo, sin requerir Google ni secretos; conserva POST, Origin exacto y cabecera propia | Logout sin configuración, repetido y con cookie ausente/inválida devuelve 200 y dos eliminaciones seguras |
| La lectura privada solo validaba el origen de la URL | Reutiliza el control existente de Origin y Fetch Metadata | Origin externo, cross-site y same-site se rechazan con 403 antes de consultar permisos |

Los cambios se concentran en `src/server/proyectos-google-auth.js`, el nuevo módulo `src/server/proyectos-workspace-session.js`, sus pruebas y el comando de CI. No se cambia markup, CSS, comportamiento público, dependencias ni configuración de despliegue. El formato cifrado v2 no admite compatibilidad con cookies firmadas antiguas; la futura publicación exige nuevo acceso institucional. No se rotó la clave de Production.

## Contrato de cookies y API

- Sesión: `__Host-cedhu-proyectos`, `Path=/`, sin Domain, HttpOnly, Secure, SameSite=Strict, Max-Age=3600. El servidor exige `exp - iat = 3600` y rechaza `exp <= floor(now/1000)`; el redondeo al segundo puede acortar menos de un segundo la duración observada. No hay tolerancia de reloj ni renovación deslizante.
- Flujo: `__Host-cedhu-google-flow`, mismos atributos de host/seguridad, SameSite=Lax para el retorno de Google, Max-Age=600. Logout elimina ambas cookies con sus atributos originales y Max-Age=0.
- Las lecturas válidas de sesión no emiten Set-Cookie ni cambian expiresAt. Una cookie vencida, ausente, alterada, duplicada, antigua o de otra clave obtiene 401 y eliminación antes de contactar Google.
- Revocación por lista o cambio de rol: 403 y eliminación. Error de Google: 503 sin datos privados ni permisos en caché. Configuración ausente: 503. Métodos inválidos: 405. Login por contraseña retirado: 410. Diagnóstico deshabilitado: 404 según las pruebas backend existentes.
- Todos estos resultados usan no-store para navegador y CDN, no permiten CORS y llevan las cabeceras privadas existentes. `session` devuelve únicamente authenticated, expiresAt, role, title, welcome y message; nunca correo, sub, tokens, filas ni mensajes del proveedor.
- El navegador no guarda credenciales en localStorage/sessionStorage. Limpia la interfaz al vencer, ocultarse o salir, y revalida al volver. Estas medidas de interfaz no sustituyen el control del servidor. Solo `session` entrega actualmente contenido privado, limitado a etiquetas y rol; no existe aún un catálogo/documento privado implementado.

## Revocación: alcance y decisión pendiente

La lista central existente de Sheets ya gobierna la autorización por cuenta, sin caché entre peticiones. INACTIVO, ausencia, duplicados, sujeto incompatible o rol distinto impiden el siguiente acceso privado. No se ha cambiado ese esquema ni se han añadido permisos de escritura.

**Logout no es revocación central de sesión.** Una copia conservada de la cookie sigue funcionando hasta su vencimiento si la cuenta mantiene autorización. Eliminar la cookie en un navegador tampoco afecta a otros dispositivos. Si una cuenta vuelve al mismo rol/ACTIVO antes de vencer, la copia antigua puede recuperar acceso. Las nuevas pruebas demuestran explícitamente ambos límites para evitar certificaciones incorrectas.

Suspender una cuenta o revocar sus conexiones en Google no constituye una comprobación nueva de este backend en cada petición: un ID token ya validado originó una cookie local de hasta una hora. Para una baja inmediata del portal debe usarse también la lista institucional. El identificador Google es vinculante cuando está rellenado; con ese campo vacío se autoriza por correo verificado. La reasignación de una dirección merece completar ese vínculo mediante un procedimiento administrativo, sin hacerlo automáticamente aquí.

Recomendación para esta entrega, que todavía no sirve documentos ni operaciones de escritura: conservar la autorización central existente, el vencimiento absoluto y el cifrado. **No añadir Redis, base de datos o servicio externo para este cierre.** Un registro distribuido por sesión solo se justifica si se exige que logout invalide inmediatamente todas las copias, que una baja sea irreversible para sesiones anteriores, o que exista cierre individual/multidispositivo. Si esos son requisitos de aceptación, el diseño actual no los satisface y debe corregirse antes de certificar.

La alternativa mínima a evaluar primero es un almacén ya aprobado con una generación de sesiones por usuario: la cookie liga esa generación y logout/baja la incrementan antes de confirmar el cierre. Requiere definir escritura, consistencia, concurrencia y comportamiento ante fallos; hoy Sheets es de solo lectura y el esquema no tiene ese campo. No se debe reutilizar silenciosamente ultimo_acceso o fecha_baja ni añadir escrituras/permisos para simular una garantía inexistente. Un mapa en memoria de una función no sería revocación distribuida.

Medida de contención sin infraestructura nueva: mantener la cuenta INACTIVO al menos hasta agotar sus cookies anteriores (una hora desde la última posible emisión), o rotar la clave del portal y desplegar de forma controlada si se requiere corte global. Una rotación solo afecta instancias con la configuración nueva y exige mantener cerrados los despliegues anteriores; no se ejecuta aquí. Un cambio de contraseña Google por sí solo no invalida esta cookie.

El responsable del proyecto aceptó temporalmente la ventana residual de hasta una hora y la semántica limitada de logout para esta publicación. No se presume aceptación administrativa institucional adicional ni se presenta el sistema como plenamente conforme a la recomendación de invalidación en servidor de OWASP.

## Pruebas y evidencia verificable

Node **22.23.4**, runtime ya disponible; no se instalaron paquetes. Todos los comandos se ejecutaron desde la rama existente:

| Comando | Resultado |
| --- | --- |
| `npm run test:proyectos:workspace` | 25/25: 21 acceso Workspace, 2 cookies cifradas, 2 ejecutor de build |
| `npm run test:proyectos:google` | 24/24, transporte sintético; no conexión real repetida |
| `npm run test:proyectos` | 14/14 autenticación heredada aislada; el endpoint desplegable sigue retirado |
| `npm run test:cms` | 13/13, sin cambio de implementación CMS |
| `npm run check:proyectos:build` | Ejecuta npm run build, prebuild, postbuild y análisis de filtraciones. 31 páginas; 30 verificadas; 4296 referencias; 9 PDF; 502 archivos públicos revisados |
| `git diff --check` | Sin errores |

Total: **76 pruebas aprobadas**. Una primera invocación directa de `node --test` hizo fallar un test existente que necesita npm_execpath; ejecutar el comando npm previsto aprobó 24/24. No se cambió código para ocultar ese fallo.

Los casos de 59:59.999, 60:00.000 y posteriores usan reloj inyectado y proveedores sintéticos. Son evidencia automatizada local, **no una sesión Google real esperada durante una hora**. La ausencia de Set-Cookie se comprueba en lecturas válidas y expiresAt permanece fijo.

Resumen con hashes de fuentes/resultados: [evidencia local](qa/proyectos-sesiones-2026-10-24.json). Las salidas completas permanecen en `.vercel/entrega1-session-*.log`, ignoradas por Git; no contienen cookies reales. Los hashes permiten contrastar la revisión y detectar cambios; no son una captura remota firmada.

Checks remotos consultados para la base `8f88675`: [Actions 40057370811](https://github.com/Cedhu-Sog/website-2027/actions/runs/40057370811) success; [Vercel EhiZs6S9FxHTCGeqb5fs6vLmeDVg](https://vercel.com/cedhu-webmasters-projects/website-2027/EhiZs6S9FxHTCGeqb5fs6vLmeDVg) success. No atribuirlos a las correcciones locales todavía no subidas.

## Pendientes de la auditoría original y tratamiento autorizado

| Pendiente | Decisión o evidencia requerida |
| --- | --- |
| Vencimiento real de 60 minutos | PENDIENTE posterior en Production por decisión expresa; no esperar una hora en esta publicación ni reabrir el ensayo temporal |
| Logout y reactivación de permisos | Riesgo aceptado temporalmente por el responsable del proyecto. Revocación persistente pendiente de mejora; sin aprobación administrativa institucional adicional |
| Pruebas remotas de esta revisión | b9f2c3b, 9c7b63a y master 7298525 aprobados según evidencia anterior. Verificar también el commit documental de cierre, sin atribuirle pruebas de una hora no realizadas |
| Clave heredada por ensayos anteriores | Los hosts previos deben seguir cerrados. Evaluar rotación controlada del secreto del portal antes de publicar; no se afirma compromiso de la clave |
| Acceso compartido temporal preexistente | La consulta de alias detectó una entrada shareable-link en el alias canónico que vence el 25/10/2026 a las 02:14:25 UTC (24/10 21:14:25 Colombia). No se usó, extendió ni modificó; no se publica su valor. No sustituye autenticación privada. Revisar su necesidad o constatar su expiración antes de la publicación |
| Publicación canónica | REALIZADA: Production READY, sitio/CMS y callback canónico comprobados, ADMIN/DOCENTE reales y rechazo de cuenta inactiva, logout y límites de alcance registrados arriba |

Los criterios 1–10 y 13 conservan su evidencia previa; ADMIN/DOCENTE y rechazo se comprobaron además en el canónico. El 11 sigue parcial, con riesgo aceptado por el responsable y prueba real pendiente; el 12 aprobó en la PR final y en master; el 14 queda publicado con autorización y smoke documentado. Se puede continuar al siguiente entregable conforme a la decisión del responsable, sin declarar certificación integral de los 14 criterios ni aprobación administrativa institucional adicional.

## Protocolo histórico del ensayo aislado (no ejecutar en esta publicación)

La decisión vigente traslada la validación de una hora a Production para una ejecución posterior. Este protocolo se conserva como historial; no autoriza reabrir hosts o callbacks temporales ahora.

1. Recuperar un navegador cuya URL pueda verificar la herramienta. La autorización de 75 minutos ya existe; no pedir de nuevo autorización para el mismo alcance. Si hace falta autenticación administrativa, la persona administradora la completa directamente, sin compartir credenciales.
2. Preparar una copia revisable de esta revisión, con origen único del despliegue, cierre absoluto de 75 minutos y aislamiento criptográfico respecto de las cookies canónicas. Verificar proyecto/equipo y conservar todos los alias; el procedimiento previo usa CLI `--prod --skip-domain`, sin promoción. No reutilizar los hosts antiguos ni ampliar IAM o scopes.
3. Registrar exclusivamente su callback exacto temporal y completar un único OAuth con ADMIN ya autorizado. No cambiar filas de permisos ni repetir las pruebas de roles/Drive/Sheets ya acreditadas, salvo la lectura ordinaria que exige cada acceso.
4. Registrar hora de emisión/vencimiento, estado HTTP y atributos de cookie sin su valor. Guardar una copia para replay únicamente en memoria protegida del cliente de ensayo, sin consola, clipboard, archivo, captura ni argumentos del proceso.
5. Consultar session durante la hora y antes del límite: 200, mismo expiresAt, ninguna renovación Set-Cookie. Dejar avanzar el reloj real, sin cambiar exp, iat ni el reloj del servidor. Una petición iniciada antes del límite puede ser 401 si lo cruza durante la consulta.
6. Al vencer: navegador sin acceso y API 401. Reenviar la copia exacta vencida al endpoint real y exigir 401/eliminación/no-store, sin datos privados. Separar esa evidencia del resultado sin cookie. Registrar márgenes de tiempo reales; no afirmar una observación exacta al milisegundo si la red solo permite acotarla.
7. Verificar logout protegido e idempotente; nunca confundir borrar la cookie con revocación de una copia. El diagnóstico debe seguir 404 y no activarse para este ensayo. Publicar solo marcas de tiempo, estados y booleanos, sin identidad.
8. Cerrar la sesión del portal y CLI, retirar únicamente el callback temporal, bloquear el host nuevo y comprobar cierre y alias conservados. Actualizar la matriz con evidencia y solicitar la decisión administrativa pendiente; no fusionar ni publicar.

## Referencias de diseño

- [Node 22 Crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html): AES-GCM, autenticación antes de usar texto y HKDF.
- [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): __Host-, Secure, HttpOnly, SameSite y Max-Age.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): expiración en servidor e invalidación de sesión al salir. El logout stateless de esta entrega mantiene la desviación descrita.
