# CEDHU — versión con identidad institucional

24 de septiembre de 2026.

`cedhu-institucional.blend` es el editable nuevo y contiene la textura empacada.
`cedhu-institucional.glb` es la exportación web autónoma, con una sola imagen
PNG de 768 × 355 incorporada. No necesita archivos de textura externos.
`original/` conserva el GLB y el póster anteriores a este trabajo.

## Cambios visuales

- Logo oficial sobre la franja blanca de la fachada derecha, centrado sobre
  el portón intermedio: ancho 3 unidades, centro a altura 5,5, debajo del alero
  existente para que no tape la parte superior del logo.
- Logo oficial en el paño blanco alto del edificio principal: ancho 2,1,
  centro a altura 10,2, entre las ventanas altas.
- Logo horizontal de ancho 1,72 centrado en la cancha, sobre una marca
  circular blanca de radio 1,04 dentro del círculo azul existente. La lectura
  sigue el eje longitudinal de la cancha; la parte superior mira hacia el
  edificio principal. El círculo blanco es una superficie de pintura plana.
- Logo pequeño sobre la zona superior de cada uno de los dos tableros
  existentes, mirando hacia la cancha, encima del recuadro de tiro.

La fuente gráfica exclusiva es `Logo cedhu R.jpg`, proporcionada por el usuario.
El fondo blanco del JPG se convirtió en alfa y el archivo se recortó y redujo
conservando las proporciones del contenido. No se reconstruyeron letras ni se
usaron fotografías como texturas. La textura preparada pesa 27.291 bytes.

Se sustituyeron cinco elementos de señalización provisional: `CEDHU | rotulo`,
`Descriptor rotulo`, `Acento rotulo`, `Identidad pabellon` y
`Nombre sobre ingreso`. Sus textos y placa decorativa se reemplazaron por el
arte oficial; el muro del pabellón permanece intacto. La nueva señalización
está agrupada en `08 | Logos institucionales`.

Las posiciones y escalas son aproximaciones visuales de las fotografías
aportadas, ajustadas a la geometría estilizada existente; no son medidas de
levantamiento. No se añadieron otras señales cuya ubicación fuese dudosa.

## Conservación y exportación

Los 915 objetos restantes conservan nombres, colecciones, padres, geometría,
materiales y matrices. El archivo Blender conserva su cámara y luces. Las
cámaras de comprobación se crearon después de guardar y no están en el editable.
El Blender original del paquete anterior no fue modificado.

Se mantienen los 18 nombres de objetos exportados originales, sus matrices,
los materiales arquitectónicos y las dimensiones globales. La exportación
conserva el pivote original `(1, 2, 0)` y la conversión de Blender a glTF con
Y vertical. No exporta cámaras, luces, extras ni animaciones. Se habilitan UV
para la nueva textura y se añade un único material de logos.

El GLB tiene 19 mallas, 15.614 triángulos y pesa 889.256 bytes, frente a los
920.120 del anterior. La reducción proviene de retirar letras geométricas.
La geometría arquitectónica no se simplificó ni se reconstruyó.

## Comprobación

`qa/validation.json` registra la conservación de objetos y los rayos lanzados
desde las cuatro esquinas de cada logo hacia su soporte. Las distancias son
0,003 unidades en fachadas y 0,002 en tableros y sobre el disco central.
La pintura circular está 0,002 unidades por encima del disco azul original.
Los valores equivalen a milímetros según las unidades métricas de Blender,
pero las dimensiones del campus son estilizadas.

`qa/glb-validation.json` comprueba estructura GLB, textura incorporada única,
nombres y transformaciones originales, materiales y límites globales iguales.
Las vistas PNG muestran ambos ángulos aéreos, la vista superior, las fachadas
y el detalle de la cancha. La carga también se comprobó con el controlador
Three.js existente del sitio, sus luces y cámara, sin errores de consola.

Se reabrió el `.blend` nuevo: textura empacada, cámara original y seis
superficies nuevas confirmadas (cinco logos y una marca circular plana).
El GLB y el póster verificados están incorporados en las rutas originales de
`public/models/cedhu/`, sin cambios de código en el sitio. La compilación
`npm run build` finalizó correctamente, con sus avisos existentes por dos
colecciones vacías y el tamaño del módulo de Three.js. `npm run check:site`
pasó: 27 páginas, 3.916 referencias locales y 9 PDF.

## Reproducir

Los scripts están en `scripts/blender/` desde la raíz del repositorio:

1. `prepare_cedhu_logo.py ORIGINAL.jpg assets/3d/cedhu/textures/cedhu-logo.png`
   prepara la textura con Pillow ya instalado.
2. Abrir el `.blend` original mediante Blender en segundo plano y ejecutar
   `add_cedhu_logos.py -- assets/3d/cedhu`. El script guarda un editable nuevo,
   exporta y genera las vistas de comprobación. No usar como entrada la versión
   ya modificada.
3. `validate_cedhu_glb.py` compara la exportación con la copia en `original/`.

Los scripts no instalan dependencias y no modifican archivos de la aplicación.
Los recursos de producción se sustituyen únicamente después de verificarlos.
