# Hero CEDHU: movimiento y verificación local

Fecha: 23 de octubre de 2026. Trabajo exclusivamente local, sin dependencias, commits, push ni despliegues.

## Auditoría

El controlador anterior asignaba cada SVG a puntero o scroll, con una interpolación común de 90 ms. El lápiz, la onda y las figuras solo se movían con scroll; los puntos seguían el puntero en dirección normal. La polaroid flotaba mediante `translate`, tenía rotación/hover mediante `transform` y no pertenecía al tracking. No había entradas diferenciadas para estos motivos. Se preservaron las entradas principales, fotografías, textos, botones y el controlador del `#1`.

La referencia ICFES se consultó como página, sin medir su movimiento. Los parámetros siguientes son decisiones propias para CEDHU, basadas en la descripción solicitada.

## Comportamiento final

Amplitudes máximas por eje en píxeles CSS, relativas al neutro. Respuesta: constante de amortiguación exponencial, no un temporizador de espera. Valores completos desde 1200 px; entre 992 y 1199 px se aplica un factor de 0,65. En anchos menores o sin hover/puntero fino no hay tracking ni movimiento decorativo con scroll.

| Elemento | Entrada (inicio / duración) | Puntero X/Y | Respuesta | Scroll | Tamaño base y ubicación |
| --- | --- | --- | --- | --- | --- |
| Spark | Pop 88%, giro −5° (180 / 450 ms) | Invertido 7/5 px | 130 ms | Ninguno | 1,5 → 1,8 rem; parte superior izquierda del collage, fuera de su etiqueta |
| Bombillo | Pop 90%, ascenso 6 px (240 / 450 ms) | Normal 8/6 px | 120 ms | X, hasta 14 px | 2,25 → 2,65 rem; centro superior, con margen horizontal |
| Lápiz | Diagonal 8/10 px, giro 4° (310 / 450 ms) | Normal 6/5 px | 75 ms | Ninguno | 1,4 → 1,6 rem; espacio entre columnas; oculto hasta 1024 px |
| Onda | Dibujo SVG con `pathLength` y dash (370 / 500 ms) | Normal 9/6 px | 220 ms | Ninguno | 1,1 → 1,375 rem; separación lateral inferior; oculta hasta 1024 px |
| Figuras | Pop 90%, tres nodos cada 60 ms (450 / 400 ms por nodo) | Invertido 6/7 px | 190 ms | Y, hasta 12 px | 3,6 rem móvil, 3 rem escritorio; variantes compactas de 2,75 rem; bolsillo inferior del collage |
| Asterisco | Pop 86%, giro −8° (430 / 400 ms) | Invertido 8/5 px | 85 ms | Ninguno | 1,25 → 1,55 rem; perímetro derecho; visible desde 992 px |
| Puntos | Pop secuencial cada 60 ms (500 / 400 ms por nodo) | Invertido 5/5 px | 145 ms | Ninguno | 1,5 → 1,75 rem; 2,5 → 2,875 rem en collage de portátil; debajo del mosaico, separado de subtítulos |
| Polaroid | Asentamiento 12/10 px, giro adicional 3° (580 / 600 ms) | Invertido 3/2 px | 240 ms | Ninguno | Aumento aproximado del 5–8%, adaptable; parte superior derecha con espacio reservado cuando el collage está apilado |

En 320 px el bombillo se reduce a 2,25 rem y se desplaza hacia la izquierda para separarlo de la polaroid. En móvil/tablet se muestran spark, bombillo, figuras y polaroid. Las entradas terminan como máximo a los 1180 ms; la presentación principal no se retrasa.

## Arquitectura y conservación de la composición

- `hero-motion.ts` centraliza amplitudes, signos, ejes de scroll, límites e interpolación. Es independiente del DOM y tiene pruebas nativas de Node.
- `hero-parallax.ts` amplía el mismo custom element. Un listener de puntero, un listener de scroll y un RAF compartido. La geometría se mide al inicializar, redimensionar o cambiar visibilidad; no en el RAF. La animación se detiene al estabilizarse, ocultar la pestaña o salir el hero del viewport. Se limpian listeners y observadores al desconectar.
- En SVG, `translate` recibe tracking + scroll; `transform` pertenece a la entrada. Los nodos de figuras/puntos tienen entradas propias y después se desplazan como grupo.
- En la polaroid, `transform` combina tracking, ángulo base y el offset ambiental tipado `--hero-float-y`; la entrada usa `translate`/`rotate` y opacidad. Hover/foco enderezan el ángulo y pausan la flotación, sin reemplazar el tracking. El foco cancela la entrada pendiente.
- Cada elemento espera a sus animaciones finitas antes de responder al puntero. La flotación infinita queda excluida de esa espera. Un marcador impide repetir las entradas al cambiar preferencias.
- Las posiciones siguen el contenedor fotográfico, sin detección de colisiones por JavaScript. Se reserva espacio inferior para figuras/puntos y un bolsillo superior proporcional a la polaroid en los collages apilados. El título admite nuevas líneas dentro de su columna. No se añadieron contenedores HTML.
- Decoraciones SVG sin eventos ni foco, con el `aria-hidden` original. La polaroid conserva enlace, fotografía, marco y texto. Corona/subrayado no forman parte del tracking. P1/P2 no fueron modificadas por esta tarea.

## Pruebas ejecutadas

- `npm run build`: correcto; CMS y comprobación del sitio correctos (31 rutas construidas; comprobador de sitio: 30 páginas, 4294 referencias, 9 PDF).
- `npm run check:proyectos:build`: correcto, incluidas comprobaciones de salida pública. No se modificaron fuentes de `/proyectos`.
- `node --test scripts/animations/*.test.mjs`: 16 pruebas correctas (10 del reveal y 6 del hero). Incluyen cuadrantes, límites, ejes de scroll, retorno al neutro, amortiguación entre tasas de refresco, ausencia de mediciones en RAF, parada al estabilizarse, inicialización repetida, reducción de movimiento y limpieza.
- `git diff --check`: sin errores de espacios; Git informa normalización CRLF/LF de archivos editados.
- Navegador local: 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×844 y comprobación adicional de 1920×1080. Sin desbordamiento horizontal ni colisiones detectadas con las zonas protegidas en el estado final revisado.
- Puntero real mediante posicionamiento nativo: cuatro esquinas y centro del hero. Bombillo/lápiz/onda positivos y spark/asterisco/figuras/puntos/polaroid negativos. Salida del hero: retorno suave al neutro, conservando solo scroll del bombillo y las figuras. Scroll combinado y reversible. Las pruebas automatizadas verifican además los máximos completos.
- Coreografía comprobada al recargar mediante estilos calculados: inicios 180/240/310/370/430/450/500/580 ms, secuencias internas de 60 ms y flotación de 7,5 s de la polaroid.
- Escenarios temporales: B, línea adicional al título; C, párrafo aproximadamente un 50% más largo; D, título/párrafo y ambos enlaces extendidos. B/C comprobados en 1440 y 390 px; D en 1440, 1024, 768, 390 y 320 px. Se ajustó el margen lateral de lápiz/onda y se repitió la comprobación con D. Contenido original restaurado antes de las compilaciones finales; no hay textos de prueba en los archivos finales.
- Preferencia de movimiento del sitio: cambio en sesión y recarga con preferencia guardada. Todos los motivos visibles, animación desactivada y variables de tracking eliminadas. Cambio de preferencia del SO cubierto por prueba del controlador con dobles de navegador.
- Tab, foco de la polaroid, enlaces originales, click del `#1` y ancla `#por-que-cedhu` comprobados. El ancla dejó visibles las experiencias de P1. Consola sin errores ni advertencias registradas durante la prueba final.
- Sin código de página: se abrió una copia temporal del HTML SSG con todas las etiquetas `script` eliminadas, servida con Astro preview. Navegador: 0 scripts, 0 marcadores JS de entrada, 47 objetivos reveal sin opacidad cero; las cuatro imágenes del hero cargadas y con alternativas; 13 objetivos P2 con opacidad 1. La copia se eliminó y el servidor temporal se detuvo. Esto no equivale a cambiar la configuración global de JavaScript del navegador.

## Límites de la validación

No se ejecutaron Lighthouse, mediciones comparativas de LCP ni pruebas en dispositivos físicos o varios motores de navegador. Se conservaron el `priority`/`fetchpriority`, las fotografías y el markup de carga originales. No hay comprobador estático TypeScript/Astro independiente instalado; la compilación Astro y las pruebas nativas de TypeScript mediante Node pasaron.

Permanecen las advertencias conocidas de colección `eventos` vacía y chunk mayor de 500 kB. No aparecieron advertencias nuevas de compilación.

## Evidencia visual

Las capturas muestran la composición final con contenido original, no demuestran por sí mismas el movimiento. Las interacciones realmente ejecutadas se documentan arriba. La captura móvil incluye el hero completo; la barra fija conserva su posición del viewport de 844 px durante la captura.

![Escritorio 1440×900](desktop-1440.jpg)

![Hero móvil 390 px](mobile-390.jpg)
