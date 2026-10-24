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

## Validación pendiente de infraestructura

El cliente WIF actual solicita exclusivamente drive.readonly y spreadsheets.readonly.
Las escrituras requieren un cliente separado con los scopes mínimos viables y
verificar el rol real de la cuenta de servicio. No se han cambiado permisos.
No se efectuarán ensayos de escritura sobre el catálogo institucional.
La carga real permanecerá deshabilitada hasta verificar tamaños variados y
reintentos con recursos aislados y autorización administrativa específica.
