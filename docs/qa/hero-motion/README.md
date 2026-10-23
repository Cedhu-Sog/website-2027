# Hero CEDHU: movimiento expresivo e inercia

Verificación local: 23 de octubre de 2026. Esta revisión modifica el hero existente; conserva P1/P2, contenidos, fotografías, enlaces y las animaciones del #1. No se crearon commits ni se ejecutaron push o despliegues durante esta tarea.

## Auditoría y cambio realizado

La versión anterior usaba una interpolación exponencial de primer orden: empezaba a moverse con la velocidad más alta y frenaba después. Sus amplitudes nominales eran 3–9 px. Todos los SVG dependían del contenedor fotográfico derecho. Se sustituyó esa respuesta por un resorte crítico de segundo orden con posición y velocidad persistentes, y se trasladó la misma capa decorativa al hero completo.

La estructura de las columnas, los textos, la prioridad de carga de la fotografía principal y la disposición de las fotografías no se modificaron para crear espacio a decoraciones.

## Coreografía y perfiles

Las amplitudes son máximos nominales en píxeles CSS, no desplazamientos acumulativos. La respuesta es el tiempo orientativo para aproximarse al destino; no hay temporizadores artificiales por elemento. Las amplitudes efectivas se limitan al espacio libre medido, especialmente en Y. Entre 992 y 1199 px también se aplica un factor de 0,72. Sin puntero fino/hover o por debajo de 992 px no hay tracking ni scroll decorativo.

| Elemento | Entrada: inicio / duración | Tracking X/Y | Respuesta | Scroll | Región |
| --- | --- | --- | --- | --- | --- |
| Spark | 120 / 750 ms; desplazamiento radial 55 px, escala 65%, giro −15°, asentamiento 107% | Invertido 42/32 px | 600 ms | Ninguno | Superior izquierda |
| Bombillo | 240 / 850 ms; diagonal desde abajo, escala 65→110→100% | Normal 45/32 px | 680 ms | X, 30 px | Bolsillo superior central entre etiqueta y polaroid |
| Lápiz | 360 / 800 ms; diagonal hasta 80 px y giro 15° | Normal 38/28 px | 520 ms | Ninguno | Superior central, en la transición desde la izquierda |
| Onda | 480 / 900 ms; trazo SVG más llegada lateral hasta 65 px | Normal 55/38 px | 900 ms | Ninguno | Inferior izquierda |
| Figuras | 720 ms; 650 ms por figura, inicios separados 90 ms; escala 70%, desplazamientos opuestos hasta 50 px | Invertido 35/45 px | 820 ms | Y, 30 px | Inferior izquierda, separadas de la onda |
| Asterisco | 600 / 700 ms; llegada de 50 px, escala 65→108→100%, giro 18° | Invertido 48/34 px | 460 ms | Ninguno | Inferior derecha, fuera de fotos y subtítulos |
| Puntos | 840 ms; 550 ms por punto, separados 90 ms; cadena de llegadas alternas | Invertido 38/30 px | 700 ms | Ninguno | Inferior derecha, separados del asterisco |
| Polaroid | 960 / 950 ms; diagonal de 70/20 px en escritorio, escala 75%, giro adicional 12° y asentamiento | Invertido 12/9 px | 950 ms | Ninguno | Superior derecha; conserva flotación y hover |

Los recorridos de entrada también se ajustan al espacio. Por ejemplo, a 1440×900 el bombillo dispone de aproximadamente 59 px horizontales y 33 px verticales para su entrada diagonal; no se fuerza un recorrido vertical de 70 px que atravesaría la fotografía. El lápiz conserva 80/15 px y la onda 65 px horizontales. Las entradas se solapan y terminan aproximadamente a los 1910 ms; no añaden retraso al texto ni a la fotografía principal.

Tamaños: spark 1,9 rem; bombillo 2,75 rem; lápiz 1,7 rem; onda 1,45 rem; figuras 3,2 rem; asterisco 1,65 rem; puntos 2,875 rem. Se conservó el aumento moderado previo de la polaroid. Los tamaños compactos se reducen según el espacio.

## Arquitectura y protección del contenido

- Un único custom element/controlador del hero, un listener de puntero y el listener de scroll existente. No se creó un sistema paralelo.
- Solución analítica de un resorte críticamente amortiguado: velocidad inicial cero, aceleración, frenado y reposo. Al cambiar el objetivo se conserva la velocidad; no se reinicia una transición CSS. Intervalos extremos limitados a 64 ms. Al estabilizar posición y velocidad se detiene el RAF.
- `hero-motion.ts` centraliza signos, amplitudes, respuesta, scroll, límites y física. Las pruebas verifican consistencia entre pasos de 8 y 16 ms.
- El mismo ResizeObserver observa hero, texto y collage. La geometría se actualiza al cambiar tamaño/disposición, preferencias o visibilidad. No se miden rectángulos ni se calculan colisiones en pointermove o RAF.
- Se calculan rectángulos libres por encima y debajo del contenido izquierdo y alrededor de las fotografías. Se preserva un margen nominal de 20 px respecto a esas zonas. Las variables CSS ubican los motivos dentro de los espacios; los límites de viaje restringen la envolvente completa de tracking/scroll. Se normaliza el estado al redimensionar para no pintar un desplazamiento antiguo fuera del nuevo espacio.
- En escritorio actual hay cuatro motivos a la izquierda del centro: spark, lápiz, onda y figuras. No se mueve la tipografía ni el collage para lograrlo.
- Si un espacio no admite un motivo, se retira esa decoración. En 1024×768 se retiran asterisco y puntos porque no cabe su bolsillo inferior derecho. En móvil/tablet se conservan spark, bombillo y figuras, además de la polaroid; las entradas tienen distancias menores.
- Transformaciones independientes: SVG `translate` recibe la posición interactiva; `transform` realiza la entrada. En la polaroid se conservan orientación, offset ambiental tipado, hover/foco y flotación, separados del asentamiento y tracking. La entrada espera a animaciones finitas; nunca espera la flotación infinita. Los marcadores de entrada impiden repetirla al regresar o cambiar preferencias.
- Decoraciones sin eventos ni foco y con el aria-hidden original. La polaroid conserva su enlace. La corona y el subrayado no pertenecen al tracking.

## Pruebas reales

- `node --test scripts/animations/*.test.mjs`: 16 pruebas correctas. Incluyen límites y signos, scroll independiente, aceleración/frenado, ausencia de oscilación sostenida, continuidad de velocidad al retarget, equivalencia 60/120 Hz, límite del intervalo, RAF que se detiene, listener compartido, limpieza y preferencias. También pasan las diez pruebas de P1.
- `npm run build`: correcto, incluidas las comprobaciones CMS y del sitio.
- `npm run check:proyectos:build`: correcto. No se modificaron fuentes de /proyectos.
- `git diff --check`: sin errores de espacios; Git advierte la normalización habitual CRLF/LF.
- Navegador a 1440×900, 1366×768, 1024×768, 768×1024, 390×844 y 320×844: sin desbordamiento horizontal ni intersecciones detectadas con las cajas de contenido protegidas en los estados revisados.
- Puntero real: centro, cuatro direcciones, diagonales entre esquinas, inversiones rápidas, desplazamientos pequeños repetidos, salida y regreso. Comprobaciones sucesivas sin cruces detectados con texto, botones, fotos ni subtítulos. Se midieron aproximadamente 43 px en bombillo, 53 px en onda, 40 px en spark invertido y 11,6 px en polaroid. Las velocidades y retardos perceptivos se complementaron con las pruebas matemáticas del resorte.
- Scroll con puntero fuera: en una muestra a scrollY 225 px solo había desplazamiento X del bombillo e Y de figuras (aproximadamente 5,1 px cada uno); los demás motivos estaban en cero. Retorno mediante Home y progresión inversa comprobados. El máximo nominal de 30 px está cubierto por pruebas.
- Entradas: nombres, duraciones, inicios y recorridos comprobados al recargar con estilos calculados; nodos secuenciales tienen animaciones propias. La foto y el texto conservan sus animaciones anteriores.
- Movimiento reducido: activado durante la sesión y recarga con preferencia guardada; motivos en su estado final, animaciones desactivadas y variables de tracking eliminadas. Preferencia del SO cubierta por el doble de navegador en pruebas; no se emuló el ajuste del SO desde la interfaz.
- Navegación: Tab, enlaces, click del #1 y ancla de WhyCedhu. P1 quedó visible tras el ancla; los siete objetivos de Technology alcanzaron done. No se modificó ningún archivo del sistema P1/P2.
- Contenido temporal: título adicional que produce tres líneas en escritorio; párrafo aproximadamente 50% mayor; etiquetas de ambos botones extendidas; combinación de los tres. Casos individuales revisados en 1440 y 390 px, con puntero extremo en escritorio. Combinación revisada en las seis resoluciones, con puntero extremo en 1440, 1366 y 1024. Sin cruces ni overflow detectados. Todo el contenido ficticio se restauró antes de la compilación final.
- Consola del navegador sin errores ni advertencias nuevas registradas.

## Limitaciones y decisiones deliberadas

Con la combinación extrema de título, párrafo y botones largos a 1366×768, el texto elimina los bolsillos libres de la izquierda. Se retiran esos motivos y permanecen bombillo, asterisco, puntos y polaroid. A 1440×900 ese escenario conserva tres motivos en la mitad izquierda, retirando la onda. Se prioriza la lectura y no se desplazan los textos para mantener una cantidad fija de decoraciones.

Las amplitudes nominales no se garantizan completas en todos los ejes y tamaños: por ejemplo, el movimiento vertical de asterisco/puntos se reduce en su bolsillo inferior. Las amplitudes horizontales principales sí son amplias donde caben. No se ejecutaron Lighthouse, mediciones comparativas de LCP, pruebas en dispositivos físicos ni varios motores. Se preservó la carga prioritaria de la fotografía. No hay comprobador estático TypeScript/Astro independiente instalado; compilación y pruebas nativas de TypeScript con Node correctas.

No se repitió la prueba visual sin scripts de la revisión previa. La capa SVG es una mejora decorativa que se muestra tras calcular espacios seguros; si no hay JavaScript puede omitirse sin ocultar textos, enlaces ni fotografías. Se conservaron las advertencias de colección eventos vacía y chunk mayor de 500 kB; no se amplió el alcance para resolverlas.

## Archivos de esta revisión

- src/components/sections/Hero.astro
- src/scripts/animations/hero-motion.ts
- src/scripts/animations/hero-parallax.ts
- src/styles/components/hero.css
- src/styles/components/hero-decorations.css
- src/styles/tokens.css
- scripts/animations/hero-motion.test.mjs
- docs/qa/hero-motion/README.md
- docs/qa/hero-motion/desktop-1440.jpg
- docs/qa/hero-motion/mobile-390.jpg

Las capturas muestran composición, no prueban por sí mismas el movimiento. Las interacciones ejecutadas se describen arriba. La captura móvil abarca el hero completo e incluye la barra fija en su posición del viewport.

![Distribución de escritorio](desktop-1440.jpg)

![Distribución móvil](mobile-390.jpg)
