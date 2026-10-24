# Investigación CEDHU: panel, recuperación y rendimiento

Referencia: `8bdb73b4e14828d04c19063408e38775f8d0e89a`. Fecha: 24 de octubre de 2026.

## Panel de trabajo

El encabezado autenticado reúne logo proporcional, Investigación CEDHU, enlace
al sitio, rol y cierre de sesión. Se conservan el acceso Google y los avisos
accesibles; se retiran las introducciones y confirmaciones permanentes del panel.
La barra de trabajo agrupa registro, carga múltiple, historial y eliminados.
Las dos últimas acciones son exclusivas de ADMIN. Las tarjetas conservan sus
metadatos con menos separación vertical.

La búsqueda se aplica tras 350 ms, cancela solicitudes anteriores y descarta
respuestas obsoletas. Enter y cambios de filtros no duplican una consulta idéntica.
Mientras se actualiza, quedan visibles los resultados anteriores con aria-busy.
Los filtros se despliegan con aria-expanded/aria-controls, se cierran con Escape
y muestran un contador de filtros activos. Restablecer actualiza los controles
antes de construir la consulta, evitando la lectura de sus valores anteriores.

## Eliminación recuperable

Se conserva el esquema de 18 columnas. Se revisaron los estados implementados
FINALIZADO/ARCHIVADO y se añade ELIMINADO; no hay migración masiva de valores.
La comprobación institucional documentada de la entrega anterior no encontró
estados previos. Los estados históricos distintos, incluidos valores vacíos,
se conservan cuando se elimina y restaura un registro por estas nuevas rutas.
Esta intervención no inspeccionó ni modificó filas reales para realizar pruebas.

- DOCENTE elimina únicamente registros de su correo institucional validado.
- ADMIN elimina cualquier registro y dispone de Proyectos eliminados y Restaurar.
- La confirmación muestra el título; Cancelar recibe el foco inicial.
- Los catálogos normales, las fichas y los PDF rechazan ELIMINADO incluso para
  ADMIN. Solo la consulta administrativa específica devuelve su ficha, sin PDF.
- No se cambia ni se elimina el archivo de Drive. La fila mantiene código,
  responsable, fecha de registro, hash y relación con su documento.
- El estado anterior se guarda en developerMetadata de Sheets, en el mismo
  batch atómico que cambia la fila y registra la operación. Su clave depende de
  la revisión eliminada. No se añaden columnas ni encabezados.
- Restaurar exige ADMIN, revisión vigente y ese recibo íntegro. Recupera el
  estado exacto: un archivo académico vuelve a ARCHIVADO. Un ELIMINADO escrito
  manualmente sin recibo requiere verificación de Tecnología CEDHU.
- Se conservan el guardado atómico por operación y la exclusión por revisión.
  Reintentar la misma eliminación no repite la modificación ni los eventos.
  Repetirla con otra operación sobre una fila aún eliminada no altera datos.
  Reenviar una eliminación antigua después de restaurar no vuelve a eliminar.
- fecha_modificacion avanza al menos un milisegundo por cambio: una secuencia
  rápida eliminar/restaurar no puede reutilizar una revisión anterior.
- Se registran intención, éxito o incidencia con usuario, fecha e identificador.
  No se registran cookies, credenciales ni sesiones de transferencia.

Los eliminados no se revelan en avisos de duplicados ni impiden un nuevo registro.
Restaurar vuelve a comprobar coincidencias contra registros disponibles; si
corresponde, ADMIN debe revisarlas y confirmar explícitamente antes de continuar.

Las modificaciones simultáneas realizadas por la aplicación se excluyen mediante
los marcadores atómicos de Sheets. La edición o reordenación manual de filas
durante una operación no proporciona un compare-and-swap de Sheets y requiere
coordinación administrativa; no se promete bloqueo de editores externos.

## Diagnóstico y comparación

Se confirmó por ejecución del código que la validación del usuario y la apertura
del catálogo repetían identidad, unidad y carpetas de Drive, y creaban dos clientes
WIF. Ahora un contexto local a la petición reutiliza esas comprobaciones y el
cliente de lectura. Cada petición sigue leyendo Usuarios_Autorizados completo,
verificando rol/estado vigente, vencimiento y ubicación/encabezados de cada hoja.
No existe caché persistente de identidades, permisos, filas ni documentos del servidor.

Medición repetible con el backend original y el nuevo, mismos datos sintéticos,
20 ms por operación Google y 40 ms por autenticación; mediana de tres ejecuciones.
El original se ejecutó desde una copia de src/server extraída del commit de
referencia. Estos tiempos modelan la red y **no son latencias reales de Google**.

| Operación | Google antes → después | Autenticaciones | Tiempo mediano antes → después |
| --- | --- | --- | --- |
| Catálogo | 14 → 11 | 2 → 1 | 553 → 367 ms |
| Ficha | 14 → 11 | 2 → 1 | 537 → 395 ms |
| Metadatos PDF | 20 → 18 | 2 → 1 | 728 → 600 ms |
| Fragmento PDF | 27 → 24 | 2 → 1 | 944 → 784 ms |

El fragmento sigue comprobando pertenencia, antecesores y permisos antes y
después de leer bytes. La segunda lectura reutiliza la firma ya comprobada si la
versión no cambió. Se añade una lectura final del catálogo para impedir terminar
un fragmento cuyo registro haya sido eliminado durante su transferencia. La
respuesta inicial de metadatos también vuelve a comprobar ese estado.

La sesión incluye las capacidades de la interfaz, evitando una petición inicial
adicional de autorización para ese mismo dato. El catálogo empieza a consultarse
sin esperar los módulos secundarios. Documentos y gestión se descargan después de
autenticar; el módulo inicial pasa de 24.830 a 12.722 bytes sin comprimir en la
medición de esta revisión (aproximadamente 49 % menos; el total autenticado crece
por las nuevas funciones). No se incorporan bibliotecas.

Ver y después descargar el mismo PDF en una ficha abierta reutiliza sus bytes
solo si una nueva consulta autorizada confirma versión, SHA-256 y tamaño.
En navegador sintético, un PDF de 1 MiB + 17 bytes utilizó dos fragmentos:
Ver produjo 1 consulta de metadatos + 2 fragmentos; Descargar añadió únicamente
1 consulta de metadatos. Cerrar la ficha, ocultar la página o cerrar sesión
revoca los Blob URL. No se publica ningún enlace Drive.

### Medición operativa sin datos privados

Server-Timing y X-CEDHU-Timing exponen únicamente duraciones y números de
operaciones: sesión local, autorización, autenticación Google, Drive, Sheets,
catálogo, búsqueda, verificación/bytes PDF y servidor. Las fases envolventes se
solapan con las llamadas Google: no deben sumarse como tiempos independientes.
No contienen URL, ID de archivo, consulta, correo, filas ni tokens.

En el navegador, Performance contiene cedhu:catalog-render. Los atributos
data-fetch-ms/data-render-ms del catálogo y data-modules-ms del acceso permiten
inspección sin guardar registros ni mostrar conceptos técnicos a docentes.
fetch-ms incluye red/servidor y decodificación JSON; las cabeceras permiten
separar el trabajo de servidor. Resource Timing/Network permite medir descarga
y tamaño del JavaScript durante una sesión real.

En el navegador sintético de escritorio: consulta 144,2 ms (incluye demora
intencional de 120 ms del servidor de pruebas), render DOM 1,6 ms y módulos
secundarios 26,0 ms. Son observaciones locales, no una garantía de Production.
Una descarga pública del JavaScript anterior tardó 4.551 ms desde este equipo:
incluye red/TLS y no toca Google. No basta para atribuir la lentitud a Drive.
No se dispone de una comparación autenticada real antes/después con las mismas
condiciones de red; la instrumentación queda disponible para medirla.

Reproducción: node scripts/proyectos/performance-probe.mjs. Evidencia numérica
en docs/qa/proyectos-ux-recuperacion-2026-10-24.json.

## Validación

107 casos: acceso heredado 14, Workspace 33, Google 24, CMS 13,
catálogo/documentos/rendimiento 9 y gestión/red 14. Compilación Astro,
comprobación de contenido, separación de estilos, salida pública y TypeScript.
Las pruebas de escritura usan exclusivamente el simulador Google en memoria.

El navegador recorrió cancelación, eliminación, vista administrativa, restauración
con advertencia de duplicados e historial. DOCENTE no ve edición/eliminación en
una ficha ajena y sí en una propia. Se comprobaron cuatro cambios rápidos del
buscador con una sola petición, restablecimiento de filtros y respuesta antigua
de 3 segundos frente a una consulta nueva de 120 ms, sin sustitución del resultado.

| Viewport | Primer proyecto (y aproximada) | Desbordamiento horizontal |
| --- | --- | --- |
| 375 × 812, ADMIN | 478 px | No |
| 768 × 1024, ADMIN | 421 px | No |
| 1024 × 768, ADMIN | 369 px | No |
| 1440 × 900, ADMIN | 333 px | No |

Se emularon tamaños de iPhone/iPad; no se certificaron dispositivos Safari físicos.
La preparación y descarga protegida del PDF funcionaron; el visor integrado
depende del soporte PDF del navegador y conserva su enlace para guardar.

## Conservación y eventual liberación de almacenamiento

No hay endpoint ni botón de eliminación irreversible. Una futura intervención
administrativa separada debe definir y obtener aprobación de la política de
retención y del inventario exacto de documentos; verificar permisos vigentes
de la cuenta institucional en Drive sin ampliarlos implícitamente; conservar
copia institucional autorizada de catálogo, historial y recibos de recuperación;
comprobar estado ELIMINADO, ausencia de otras referencias al mismo archivo,
pertenencia a la unidad/carpeta permitida, tamaño y hash; documentar el resultado.
Debe preferirse primero la papelera recuperable. Un purgado definitivo requiere
autorización específica y comprobación de la política de conservación, dejando
la trazabilidad de la fila y señalando que el PDF ya no podrá restaurarse.
Este procedimiento no se ejecutó ni se habilitó como operación ordinaria.
