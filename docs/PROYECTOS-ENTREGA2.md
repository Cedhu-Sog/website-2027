# Entregable 2 — repositorio académico

Base verificada el 24 de octubre de 2026: master y origin/master en
`1e364afba66fe5f1d299be73f890bf30aa3d61a0`, árbol limpio. No se cambian encabezados,
OAuth de docentes, controles de sesión, IAM ni recursos institucionales existentes.

## Bloque A — consulta

`GET /api/proyectos/catalog` ofrece búsqueda por título, autores, resumen y
palabras clave, sin acentos ni mayúsculas, filtros exactos de año/grado/área,
orden por fecha/año/título y páginas de 12 proyectos. `mine=1` se resuelve contra
la identidad del servidor. Solo ADMIN puede incluir ARCHIVADO.

`GET /api/proyectos/project?id=…` entrega la ficha académica; no entrega IDs de
Drive, hashes ni identidades internas de auditoría. `canEdit` se calcula en el
servidor y no constituye autorización para una futura escritura.

Ambas rutas reutilizan `requireSession`: sesión cifrada, expiración absoluta y
relectura del estado/rol desde Usuarios. Cada apertura del catálogo comprueba
cuenta de servicio, unidad, carpetas, pertenencia del archivo y esquema canónico.
IDs ambiguos, errores de proveedor y capacidad excedida fallan cerrados.

La interfaz conserva logo, tokens y acceso actuales. Incluye filtros etiquetados,
estados de carga/error/vacío, tarjetas adaptables, diálogo de ficha y restitución
del foco. Se abortan las consultas y retiran los datos al cerrar sesión, expirar,
ocultar la página o abandonar la navegación. Los valores de Sheets se insertan
como texto, nunca como HTML.

Sheets carece de búsqueda de texto y paginación de filas por contenido. La
consulta se filtra en el servidor, con límite explícito de 10.000 registros y
16 MiB; se envía únicamente una página al navegador, sin caché compartida.
Superar el límite requiere revisar almacenamiento/consulta, no truncar datos.

Pruebas sintéticas: búsqueda y filtros combinados, paginación, propiedad,
archivados, colisiones de identificadores, proyección de campos, acceso anónimo,
revocación y cambio de rol con el guard real. La suite Workspace cubre regresión
del acceso. Build y verificación del sitio/CMS obligatorios en CI.

## Documentos grandes — decisión de diseño

Vercel documenta un máximo de 4,5 MB por petición/respuesta. Google Drive admite
subidas reanudables con fragmentos múltiplos de 256 KiB y descargas por Range.
Se evaluarán fragmentos binarios de 1 MiB a través del backend. El navegador no
recibirá tokens de Google ni la URI de sesión de Drive en texto abierto. No se
publicarán archivos ni se usarán enlaces de Drive arbitrarios.

Fuentes oficiales:
- https://vercel.com/docs/functions/limitations
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/manage-downloads

## Bloque B — documentos

La PR #5 implementa lectura de PDF por fragmentos binarios de 1 MiB. No es una
redirección a Drive ni una descarga completa dentro de una Function. Cada
petición comprueba sesión/rol/estado, relación con el catálogo, unidad, cadena
de carpetas permitida, MIME, firma PDF, tamaño máximo de 100 MiB, permisos sin
`anyone`, versión antes/después de la lectura y SHA-256 si está disponible.
El navegador verifica longitud e integridad y crea un Blob local para visor y
descarga. Las URL Blob se revocan al cerrar la ficha o perder la sesión.
En navegadores sin visor PDF integrado se conserva el enlace de guardar.
El archivo se ensambla en memoria; 100 MiB es un límite, no una certificación
de todos los modelos de iPhone/iPad. No se añadieron lectores PDF externos.

## Bloque C — registro y edición

`/api/proyectos/manage` concentra capacidades, registro, carga, edición e
historial para no multiplicar Functions. Todos sus métodos reutilizan la
sesión Workspace. Las escrituras exigen además Origin canónico, cabecera
`X-CEDHU-Projects`, JSON acotado a 1.500.000 bytes y los controles de activación.
Identidad, fechas, identificador y estado inicial FINALIZADO se generan en el
servidor. Se respetan los demás estados existentes; no hay aprobación académica.

Los PDF se suben con sesiones reanudables Google y fragmentos de 1 MiB,
codificados en base64 dentro de peticiones menores de 1,5 MB. La URI Google
es opaca: se conserva exacta, con origen HTTPS y ruta permitidos, sin redirecciones.
Viaja únicamente dentro de un ticket AES-GCM con propósito independiente,
vinculado a sujeto, recursos institucionales, información revisada y expiración
de 24 horas. El ticket nunca sustituye la revalidación del usuario. No se
entregan tokens Google ni URI de carga en claro al navegador.

Antes de aceptar un fragmento se consulta el avance confirmado por Google.
Un reenvío ya recibido devuelve el avance sin repetirlo. El primer fragmento
debe tener firma PDF. El commit comprueba MIME, ubicación original exacta,
tamaño y SHA-256 calculado por Drive. Los documentos incompletos no entran en
el catálogo. Los IDs de archivos son preasignados por Drive para poder reintentar.

Cada operación tiene UUID y huella semántica. Una marca `developerMetadata`
única y el cambio de fila se ejecutan en el mismo `spreadsheets.batchUpdate`
atómico. Una respuesta perdida se reconcilia por la marca; nunca provoca un
append libre. Las colisiones de marca con otra huella fallan cerradas. Los
campos se escriben como `stringValue`, sin evaluar fórmulas. El catálogo y
la bitácora son hojas distintas: no existe transacción entre ambas. Se registra
intento antes de modificar y resultado después; un reintento completa la
bitácora si el catálogo ya se confirmó. Los intentos sin cierre quedan visibles
al administrador.

El registro individual y los lotes ofrecen revisión previa; cada archivo tiene
metadatos, avance y resultado. Se procesan secuencialmente, con máximo de 30 por
selección. Reintentar omite los exitosos. `id_lote` agrupa la importación.
SessionStorage guarda solo tickets cifrados y datos técnicos de reanudación,
nunca PDF ni metadatos académicos en claro. Tras recargar hay que volver a
seleccionar los archivos; se recupera la información original para revisarla.

Se advierten coincidencias exactas de PDF y combinaciones significativas de
título/contexto/autores/resumen. Se muestran los registros para revisión y se
exige una confirmación explícita; un título parecido por sí solo no bloquea.

DOCENTE solo edita registros cuyo `registrado_por` corresponde a su identidad;
ADMIN edita cualquiera. Se conservan ID, PDF, fecha y responsable originales.
Una marca de revisión atómica impide sobrescribir una edición concurrente. Los
cambios de año/grado corrigen el catálogo y conservan la carpeta histórica del
PDF original; nuevas cargas se organizan siempre por su año/grado de registro.
La descarga sigue verificando que esa carpeta histórica pertenece a la
estructura autorizada. No se necesita ampliar a `drive` completo para mover
archivos históricos ajenos a la aplicación.

## Bloque D — administración

Solo ADMIN puede archivar: cambia estado a ARCHIVADO sin borrar el PDF. El
historial muestra eventos paginados, intentos, resultados de importación,
ediciones con información anterior/posterior e incidencias. Permite documentar
la resolución de una incidencia. Archivar un duplicado y reintentar una carga
son operaciones disponibles; no se implementa borrado físico ordinario.
El historial no devuelve `usuario_google_id`. Errores Google, cabeceras,
cookies, tickets, URI de carga y credenciales nunca se guardan en los eventos.

## Ensayo aislado y permisos

El usuario autorizó expresamente crear recursos sintéticos dentro de
`02_Importaciones_Temporales` y los scopes backend `drive.readonly`, `drive.file`
y `spreadsheets`. El cliente de consulta conserva sus dos scopes de lectura;
OAuth docente conserva `openid email profile`. No se cambió IAM ni permisos.
El ensayo real confirmó `canAddChildren` en la carpeta temporal y `canEdit`
en catálogo/bitácora. Esto acredita capacidad técnica, no una ampliación nueva.

`scripts/proyectos/transfer-probe.mjs` es un comando administrativo explícito,
no parte del build normal y nunca una API. Crea una carpeta QA con hojas vacías,
sus encabezados canónicos y PDF sintéticos. Nunca escribe en las hojas reales.
Reutiliza los servicios candidatos con un almacén restringido al sandbox.
La matriz de roles usa identidades sintéticas inyectadas en el ensayo; no se
presenta como un nuevo inicio de sesión real de ADMIN/DOCENTE.

La copia se despliega con CLI oficial ya instalada, `--prod --skip-domain`,
identidad WIF de Production y sin archivos locales privados. Se comprueban los
alias reales; no se modifica el callback OAuth ni se abre un diagnóstico HTTP.
Las primeras ejecuciones detectaron un validador demasiado restrictivo de la
URI opaca y el 429 de Sheets. La corrección conserva el endpoint HTTPS exacto,
reduce comprobaciones estructurales duplicadas dentro de cada almacén y añade
reintentos de interfaz acotados para errores temporales. No hay caché de roles.

La activación requiere ambas variables de servidor:
`PROYECTOS_WRITES_ENABLED=true` y `PROYECTOS_TRANSFER_VERIFIED=v1`.
Por defecto están cerradas; una revisión Preview no puede usar WIF Production.

## Evidencia de publicación

- Bloque A: PR #4; commit `06d4c9b`, merge `b964a74`; Actions 40112569597 aprobado.
- Bloque B: PR #5; commit `189cb6e`, merge `981b41a`; Actions 40112902077 aprobado.
- Production A+B: `dpl_8GErN48zthAVZZnA7gYScxTE7Txr`, READY, dominio canónico verificado por alias.
- Ensayos remotos: `FwB8HWWszTvaPFKTw37wL83846Eb`, `8XYdirEp6BHhE36JZ6pBbiJg5N5C`,
  `AiQjVv62ZzNGje9rUMRJEdLMUyvE`, `9F51WoD4TebzPfZUhq5ov7WsL7nx`,
  `HxSL6aWWS3XgXqZDL9iMPgqrgGQM`: builds aislados ERROR, sin promoción.
  El cuarto aprobó 1 KiB; el quinto aprobó 1 KiB y más de 5 MiB antes de un 429.
  Se conservan los recursos QA privados para inspección; no se purgaron.
- Ensayo completo aprobado: `dpl_2QzMT2HEGxvjuQYejkNzzXmrHRCR`, READY,
  sin alias. Los tamaños 1.024, 5.242.957 y 17.825.811 bytes aprobaron carga,
  reintento y descarga SHA-256; tres registros, diez eventos, edición y archivo.
  Se recuperó un error temporal de descarga mediante espera y reintento acotado.
  La prueba llama a los handlers desde el build de Vercel y usa Google real;
  no se presenta como transferencia HTTP autenticada por la Function pública.
- Preflight final solo lectura: `dpl_BeqkBFerpKY4m8PiE479LPHVnXU7`, READY,
  confirmó escritura ya concedida en ambas carpetas y ambas hojas. La columna
  estado institucional está vacía, sin valores previos que migrar. No hubo
  modificación de datos institucionales.

Pruebas locales: 100 casos: 14 del acceso heredado, 33 Workspace, 24 Google,
13 CMS, 7 catálogo/documentos y 9 gestión/red, además de build, comprobación
de contenido y escaneo de salida pública.
El compilador TypeScript ya incluido en la CLI instalada comprobó los módulos
de navegador sin instalar paquetes. El navegador local recorrió registro y
edición de un PDF válido de más de 5 MiB, ficha, preparación de descarga y búsqueda
sin acentos; viewport móvil sin desbordamiento horizontal. Un lote con dos
archivos terminó inicialmente con un éxito y una coincidencia pendiente;
tras confirmación explícita pasó a dos éxitos sin repetir el registro guardado.
Se consultó el historial de las operaciones realizadas.

## Publicación autorizada

El usuario autorizó expresamente activar y publicar después de los checks.
Se configuraron `PROYECTOS_WRITES_ENABLED=true` y
`PROYECTOS_TRANSFER_VERIFIED=v1`, exclusivamente en Production, y se integró
la PR #6 en `3dec705afd80f5c0f384b60252f36dadfba29a20`.
GitHub Actions de la revisión: 40116732355 success; de master: 40116936626 success.
El despliegue `dpl_BzEemYGq2NQNAgKwMSATKWwX48qG` quedó READY, con los alias
canónico y git-master asignados a esa versión. El registro institucional queda
habilitado para las identidades activas autorizadas; no se efectuaron escrituras
de prueba en el catálogo real.

Smoke de Production: inicio, CMS, configuración CMS y acceso institucional 200;
las cuatro API nuevas sin sesión devuelven 401 y no-store. La comprobación
detectó que la variante `/proyectos/` con barra final solo recibía la regla
corta de indexación. El cierre incorpora todas las cabeceras de seguridad en
esa coincidencia, además de conservar la regla sin barra final. El esqueleto
HTML no contiene registros privados; las API mantuvieron no-store.

La validación real de OAuth ADMIN/DOCENTE de la entrega anterior se conserva.
En esta entrega no se repitió un login Google con esas cuentas ni un registro
HTTP sobre las hojas reales. Tampoco se certificó Safari físico: se mantiene
el enlace de guardar cuando el navegador no pueda integrar el visor PDF.
Los recursos sintéticos QA siguen privados dentro de la carpeta temporal para
inspección; no se publicaron ni se eliminaron permanentemente.
