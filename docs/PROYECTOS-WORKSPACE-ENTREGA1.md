# Entrega 1 — Acceso de Google Workspace al repositorio CEDHU

Estado al 24/10/2026 (Colombia): **publicación expresamente autorizada por el responsable del proyecto, pendiente de finalizar checks, integración y smoke canónico.** Las correcciones de seguridad `b9f2c3b` están en la rama remota de PR #2 y aprobaron Actions/Preview. No se declara certificación integral de los 14 criterios.

Informe vigente: [auditoría de sesiones y decisión de publicación](PROYECTOS-SESIONES-AUDITORIA.md). El vencimiento real de una hora queda pendiente de validación posterior en Production, sin bloquear esta publicación. La posible reutilización de cookies conservadas queda aceptada temporalmente por el responsable del proyecto; no está resuelta ni implica aprobación administrativa institucional adicional. Se mantiene la hora configurada y no se añaden servicios. No se abrirá el ensayo temporal de 75 minutos.

## Resultado vigente

Se reutilizó `CEDHU-Repositorio-Web`, aplicación Web interna, desde Google Cloud con la cuenta administradora institucional. Se conserva el callback exacto `https://website-2027-seven.vercel.app/api/proyectos/google/callback` y la redirección histórica existente. Scopes: únicamente `openid email profile` (userinfo.email y userinfo.profile en la consola). No se piden permisos Drive del usuario.

Client ID, Client Secret y dominio están solo en Vercel Production. El administrador introdujo directamente el secreto protegido; no se leyó ni publicó su valor. Los canjes OAuth reales posteriores comprobaron su funcionamiento.

El primer build real falló en STS. Se contrastó `GCP_PROJECT_NUMBER` con el recurso del pool en Google Cloud y se encontró una discrepancia. Se corrigió exclusivamente esa variable de Production. El siguiente build aprobó los ocho checks reales. No se ampliaron permisos IAM ni se habilitó Preview.

| Condición | Estado | Evidencia y límite |
| --- | --- | --- |
| 1. Acceso administrativo Google Cloud | APROBADO | Cuenta administradora y proyecto institucional verificados en consola. |
| 2. Cliente OAuth | APROBADO | Web interno reutilizado; callback canónico exacto y scopes de identidad. |
| 3. Credenciales en Vercel | APROBADO | Solo Production; secreto sensitive; canje real exitoso en copia aislada. |
| 4. Federación OIDC y STS | APROBADO | JWT Vercel validado e intercambio real tras corregir el número de proyecto. |
| 5. Cuenta de servicio e IAM | APROBADO | Suplantación real y Drive about contrastado con la cuenta backend; sin claves JSON ni ampliación IAM. |
| 6. Lectura real Drive | APROBADO | Repo Investigación y las tres carpetas esperadas verificadas. |
| 7. Lectura real Sheets | APROBADO | Tres archivos, pertenencia a 00_Sistema, pestañas y encabezados verificados; lectura real de autorizaciones. |
| 8. Autenticación real de pruebas | APROBADO | OAuth desde Vercel, ID token validado y acceso DOCENTE real. El ensayo usó callback temporal exacto, ya retirado. |
| 9. Rol y estado | APROBADO | Ausencia inicial rechazada. Alta expresamente autorizada DOCENTE/ACTIVO; revocación real rechazada en la petición siguiente. Registro temporal cerrado INACTIVO. |
| 10. ADMIN y DOCENTE | APROBADO | Dos identidades institucionales distintas y autorizadas; ADMIN existente activo y DOCENTE temporal, comprobados por separado. |
| 11. Seguridad de sesiones | PARCIAL / RIESGO ACEPTADO POR RESPONSABLE | Cifrado autenticado, vencimiento tras consultar permisos, logout de ambas cookies y controles de origen. 25 pruebas Workspace/ejecutor aprobadas. Vencimiento real pendiente posterior; reutilización de cookies aceptada temporalmente, sin aprobación institucional adicional. |
| 12. Actions y Preview | APROBADO EN b9f2c3b / REVISIÓN FINAL PENDIENTE | Actions 40106951563 success y Vercel Preview success. Deben pasar también los checks de la revisión documental que registra la decisión antes de integrar. |
| 13. Retirada del ensayo y diagnóstico | APROBADO | Callback temporal retirado, cinco hosts de prueba denegados por WAF, logout de ambas sesiones del portal y de CLI. Diagnóstico HTTP nunca activado, canónico 404/no-store, sin token ni expiry. |
| 14. Condiciones para publicar | AUTORIZADO / VERIFICACIÓN CANÓNICA PENDIENTE | Responsable autoriza expresamente integrar PR #2 en master y Production con los dos pendientes registrados, sin nueva confirmación. Detener o revertir exclusivamente esta integración ante una falla crítica. Registrar checks y smoke reales. |

## Evidencia remota reproducible

Fuente de las copias: [115f4b0](https://github.com/Cedhu-Sog/website-2027/commit/115f4b0ee4040618287bde5d88747ff38e29c31e), sobre [PR #2](https://github.com/Cedhu-Sog/website-2027/pull/2).

- [Actions fuente aprobado](https://github.com/Cedhu-Sog/website-2027/actions/runs/40054385765).
- [Preview fuente](https://website-2027-331j7a6q6-cedhu-webmasters-projects.vercel.app/).
- [Build real antes de corregir STS](https://vercel.com/cedhu-webmasters-projects/website-2027/BFS2m8jgDrxUwGXt5hWQjVZct9Ce): configuración válida, federation_exchange_failed, ERROR.
- [Build real corregido](https://vercel.com/cedhu-webmasters-projects/website-2027/DQrgipCeJaseF4jgMk2yX3uWRXQm): READY; configuration, federation, serviceAccount, drive, structure, catalog, users y audit verdaderos.
- [Lectura administrativa inicial de autorización](https://vercel.com/cedhu-webmasters-projects/website-2027/ajzgNuyDrCBscgnU1ti2XaodmGhS): sin entrada para la identidad DOCENTE de pruebas; solo indicadores, ninguna fila publicada.
- [Ensayo OAuth real](https://vercel.com/cedhu-webmasters-projects/website-2027/8hoQQVTqfwrianVw4zWrZG87a6cw): READY; logs acotados a identity_verified y authorization_allowed/authorization_denied. Host cerrado con WAF al finalizar.

El aislamiento se comprobó con CLI oficial temporal 65.1.0, autorizada por el usuario, `--prod --skip-domain`, inventario de alias vacío por despliegue y los tres alias de Production conservados en `dpl_45na8koSAGfXJxnsrKdi7gr6v5gi`. No usar el campo de alias previstos del detalle como sustituto de consultar las asignaciones reales. El intento anterior del conector reasignó alias auxiliares y fue cerrado; no se repitió ese mecanismo.

La carga partió de un archivo del commit y excluyó .env privados, .vercel, credenciales CLI, logs, .astro, dist y dependencias locales. El build de conexión solo sustituyó su comando administrativo. La copia OAuth añadió un origen limitado al VERCEL_URL propio del proyecto y guard de ventana absoluta de veinte minutos; no acepta Host/Origin arbitrarios. Añadió únicamente eventos booleanos después de validar claims y autorización. Estos cambios de ensayo viven en la copia ignorada, no en la implementación candidata de la PR, cuyo origen sigue siendo el canónico.

La ventana OAuth fue 2026-10-24T02:55:11.040Z a 03:15:11.040Z. La URI adicional se guardó tras autorización expresa, se utilizó con éxito y se retiró antes del vencimiento. No se activó la ruta HTTP de diagnóstico. La copia heredó la configuración Production y su clave de sesión existente; no se rotó esa clave. No constituye un entorno permanente con credenciales independientes: los hosts quedaron bloqueados y las sesiones del portal se cerraron. No volver a habilitarlos como entornos reutilizables.

## Autorizaciones y prueba de acceso

La cuenta facilitada por TIC no tenía registro. El primer OAuth real validó firma, audiencia, emisor y expiración mediante la librería oficial, además de nonce, hd, sub y correo verificado; luego la consulta real de permisos denegó el acceso.

El usuario autorizó expresamente su alta como DOCENTE/ACTIVO exclusivamente para pruebas. Desde Google Sheets, con el administrador institucional, se añadió solo la fila nueva en Usuarios A4:I4, sin copiar historial ni alterar otras identidades. google_id se dejó vacío, permitido por el esquema; el correo institucional verificado sigue siendo obligatorio. No se afirmó ni se restauró ningún rol histórico.

El siguiente OAuth concedió DOCENTE. Recargas y consultas reales de session mantuvieron el mismo expiresAt, dentro de una hora desde el inicio, y solo devolvieron etiquetas públicas, rol y vencimiento. Cambiar E4 a INACTIVO hizo que la siguiente petición devolviera Acceso no autorizado y eliminara la sesión. Restaurar ACTIVO no restauró esa cookie: fue necesario repetir OAuth. Logout mostró Sesión cerrada y una petición posterior respondió Inicia sesión para continuar.

La otra identidad, expresamente autorizada para ADMIN, ya tenía una fila ADMIN/ACTIVO. Completó su propio OAuth y la interfaz mostró Administrador. Se cerró esa sesión. Las pruebas no acreditan funciones de catálogo, importación, escritura o administración que pertenecen a entregas posteriores.

Al finalizar, el nuevo registro de pruebas quedó DOCENTE/INACTIVO. No se suspendió, reactivó ni modificó el estado de ninguna cuenta en Google Workspace. No se accedió a Gmail, archivos personales ni actividad histórica.

## Seguridad de la implementación candidata

- Authorization Code, PKCE S256, nonce y flujo de diez minutos cifrado con AES-256-GCM; cookie __Host-, HttpOnly, Secure y SameSite=Lax. El canje lento no puede completar un flujo vencido.
- Cliente backend con WIF, sujeto Production exacto, STS y suplantación de cuenta de servicio; scopes Google de solo lectura. Sin claves privadas permanentes.
- Identidad efectiva contrastada con Drive about antes de leer permisos. Unidad, carpetas, pertenencia y esquema verificados. Lectura A2:E completa, respuesta máxima 256 KiB y rechazo de más de 1000 filas y duplicados.
- Estado ACTIVO y rol ADMIN o DOCENTE obligatorios. google_id vinculante si está relleno. Cada petición privada revalida estado y rol; los fallos de Google deniegan el acceso.
- Sesión absoluta de una hora, cookie cifrada __Host-, HttpOnly, Secure, SameSite=Strict y respuestas no-store. Se vuelve a comprobar el vencimiento después de consultar permisos; las lecturas no emiten Set-Cookie. Session omite correo, sub, tokens y filas. Aplicar requireSession a todos los futuros endpoints privados; no reutilizar el guard heredado de contraseña.
- Eventos del ensayo sin JWT, secretos, campos de correo ni códigos OAuth en la muestra revisada. Las capturas de roles contienen solo la interfaz pública y se guardan localmente bajo .vercel, nunca en Git. No se afirma una auditoría exhaustiva de todos los logs históricos.

La base `8f88675` usaba cookies firmadas con identidad legible. Las correcciones locales cifran sesión y flujo con AES-256-GCM y claves separadas por propósito derivadas con HKDF de la clave existente, sin dependencias ni servicios nuevos. Rechazan el formato anterior: al desplegar la corrección hará falta iniciar sesión nuevamente. El cifrado protege la identidad y el verificador PKCE, pero la cookie sigue siendo una credencial de portador.

Logout elimina sesión y flujo del navegador incluso si falta configuración backend. No revoca centralmente una copia conservada. La baja y los cambios de rol deniegan en la siguiente petición; si se restablecen antes del vencimiento, una copia conservada puede volver a funcionar. La expiración absoluta y la rotación de clave siguen aplicando. La revocación individual y la suspensión en Google requieren los límites y la decisión administrativa descritos en el informe vigente. Ninguno de estos cambios locales se ha publicado.

## Verificación y publicación pendiente

Las suites de la fuente aprobaron Workspace 11, backend Google 24, autenticación heredada 14 y CMS 13, además de los dos casos del ejecutor. La copia OAuth aprobó nuevamente 11 casos Workspace y dos específicos de origen y cierre exacto de veinte minutos. `npm run build` de esa copia aprobó 31 páginas, comprobación de 30 páginas, 4296 referencias y nueve PDF. Esas pruebas locales se distinguen de las conexiones reales citadas arriba.

Decisión de publicación del responsable: integrar la PR existente cuando sus checks pasen, desplegar Production y comprobar el callback canónico. No esperar la expiración real ni implementar revocación inmediata ahora. Conservar el vencimiento de una hora, permisos y configuraciones preexistentes; detener o revertir exclusivamente la integración ante una falla crítica. Registrar separadamente los smoke realizados y los pendientes.

Al terminar el uso de la identidad de pruebas, la institución debe rotar su contraseña, revocar sesiones y conexiones innecesarias de Google, y suspenderla cuando deje de necesitarse. La sesión temporal de Vercel CLI ya se cerró con la herramienta oficial. No se cerraron sesiones administrativas ajenas.

Incidencia y detalle histórico: [Fase B](PROYECTOS-GOOGLE-FASE-B.md). Referencias: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Vercel OIDC](https://vercel.com/docs/oidc/reference).
