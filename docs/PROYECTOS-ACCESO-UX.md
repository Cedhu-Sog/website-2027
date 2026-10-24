# Acceso institucional: claridad y avisos persistentes

Fecha: 24 de octubre de 2026. Base: master, `a6aece81a6655bdb44152c90ac2e9d89131aef42`.

## Implementación

- `ProjectsAccess.astro`: instrucciones institucionales, enlace «Iniciar sesión con Google» y diálogo nativo con nombre y descripción accesibles. «Entendido» y Escape cierran el aviso; el foco vuelve al enlace de acceso o al título si hay sesión.
- `projects-access.css`: presentación institucional, tamaños táctiles de 52 px, logo cuadrado de 20 px y diálogo en la capa superior nativa, con fondo atenuado y desplazamiento vertical en pantallas bajas. Sin animación adicional.
- `projects-access.ts`: estado del aviso independiente del renderizado de sesión. Las comprobaciones, cambios de visibilidad, respuestas tardías y restauración del historial no cierran ni reemplazan un aviso pendiente. El parámetro público se consume una vez y se elimina de la dirección. Solo se muestra texto fijo, nunca mensajes proporcionados por Google.
- `proyectos-google-auth.js`: resultados públicos controlados: `denegado` solo después de verificar identidad institucional y consultar autorización; `institucional` para identidad verificada de otro dominio; `cancelado` solo con `access_denied` y flujo/cookie/state válidos; `servicio` para errores técnicos o respuestas inválidas. La API distingue `sin_sesion`, `sesion_vencida` y `denegado`; los errores de origen no se presentan como rechazo de una cuenta. Solo una cookie auténtica y estructuralmente válida puede informar vencimiento.
- `google-g.svg`: trazados y colores del configurador HTML oficial de [Google Identity](https://developers.google.com/identity/branding-guidelines), guardados localmente sin metadatos, scripts ni fuentes remotas. Se conservan proporciones y fondo blanco.
- `google-login.test.mjs` y `access-ui.test.mjs`: regresiones de motivos OAuth y ciclo de interfaz; esta última ejecuta el TypeScript real con dobles de DOM y red mediante Node, sin dependencias. Se incorpora a `test:proyectos:workspace` y al CI existente.

No se modifican permisos, Sheets, roles, scopes, PKCE, nonce, cookies, origen, duración de sesión, Google Cloud, CMS ni animaciones públicas.

## Validación local

Node 22.23.4 / npm 10.9.9, distribución local ya existente:

- `npm run test:proyectos:workspace`: 33/33. Incluye docente autorizado, cuentas inactivas/no registradas, cuenta personal, cancelación válida/falsificada, indisponibilidad, aviso persistente con respuestas asíncronas, cierre/reintento, expiración y logout.
- `npm run test:proyectos:google`: 24/24; `npm run test:cms`: 13/13.
- `npm run build`: correcto; 31 rutas generadas, 30 páginas y 4297 referencias comprobadas. Advertencias previas: colección eventos vacía y chunk 3D de más de 500 kB.
- Navegador Chromium: interfaz estática compilada con servidor local de prueba y respuesta anónima 401 retrasada 1800 ms. Rechazo permanece después de finalizar la consulta. Comprobados foco inicial, teclado Tab/Escape, cierre con Entendido, retorno al acceso, logo cargado y botón de 52 px.
- Revisión visual en 390×844 y 768×1024, además del escritorio predeterminado: textos legibles, logo proporcionado, diálogo visible, sin desbordamiento horizontal. El árbol accesible durante el modal contiene el título, ambos párrafos y Entendido; el contenido posterior queda inerte.

Los escenarios de identidad se prueban con fixtures y el verificador oficial de tokens. Esta validación no afirma nuevos inicios de sesión reales con cuentas de docentes, pruebas en iPhone/iPad físicos ni pruebas con VoiceOver. No se modifican registros de autorización para probarlos.

## Pendientes del Entregable 1 conservados

1. Observación real del vencimiento de 60 minutos en Production pendiente; las pruebas de frontera automatizadas no la sustituyen.
2. Una copia conservada de la cookie puede reutilizarse hasta su vencimiento si mantiene autorización; logout borra la cookie del navegador, sin revocación central individual. Riesgo temporalmente aceptado por el responsable en la entrega anterior, sin afirmar nueva aceptación administrativa.

Evidencia histórica intacta: [auditoría de sesiones](PROYECTOS-SESIONES-AUDITORIA.md) y [registro de publicación](qa/proyectos-publicacion-2026-10-24.json).
