# Activación y pausa del Scroll Reveal — 23 de octubre de 2026

Este ajuste sustituye el punto de activación de P1/P2 descrito en las auditorías anteriores. No modifica ninguna animación del hero.

## Configuración definitiva

- Controlador compartido: `src/scripts/animations/scroll-reveal.ts`.
- Activación: 80 % de la altura visible; threshold 0 para admitir contenedores altos.
- `height = min(innerHeight, visualViewport.height ?? innerHeight)`.
- `rootMargin = 0px 0px -round(innerHeight - height * 0.8)px 0px`. Cuando ambas alturas coinciden a 844 px, el margen es `0px 0px -169px 0px`.
- Se usan píxeles calculados porque los porcentajes de rootMargin se resuelven respecto al ancho del root, no a su altura.
- Resize de window y visualViewport actualiza el margen; notificaciones duplicadas con el mismo margen no reconstruyen el observer. Ambos listeners se limpian con el AbortController existente. No hay listeners nuevos de scroll.

| Tipo | Pausa base después de la intersección |
| --- | --- |
| Encabezados, eyebrows, grupos pequeños, enlaces/CTA | 150 ms |
| Párrafos y bloque descriptivo de IdentityIntro | 160 ms |
| Niveles, experiencias WhyCedhu, evidencias y noticias | 180 ms |
| Fotografías de Technology y HumanFormation | 180 ms |

CSS suma la pausa al stagger existente, sin temporizadores de inicio en JavaScript. En escritorio, niveles: 180/250/320 ms; evidencias: 180/240/300/360 ms; foto Technology: 240 ms por su desfase anterior de 60 ms; foto HumanFormation: 180 ms; acciones CTA: 230 ms por su desfase anterior de 80 ms. El máximo de las configuraciones actuales es 360 ms. Bajo 48rem se conserva la activación individual sin stagger acumulado: solo se aplica la pausa base.

Las direcciones, distancias, easing y duraciones originales permanecen intactos. Las fotografías conservan 450 ms en móvil y 550/500 ms en escritorio. La fotografía de Technology conserva sus 8 px de recorrido; HumanFormation pasa de lateral a vertical en móvil como antes.

## Navegación y seguridad de visibilidad

Un elemento que llega de golpe por encima del 35 % de la altura visible omite la transición y pasa a done. También se libera una entrada que sale del área observada durante su pausa/transición. El observer se mantiene hasta finalizar para detectar esa salida; las intersecciones repetidas no reinician el efecto. Un salto que omite por completo una sección puede dejar objetivos fuera de pantalla pendientes hasta su primera visita: no se fuerza una animación ya terminada a repetirse.

Se conserva el temporizador de respaldo existente, ampliado de 800 a 1000 ms para cubrir duración más pausa/stagger. No se añadió un segundo temporizador por objetivo. La finalización normal sigue usando transitionend.

El contenido visible al inicializar no se prepara como oculto. Foco y anclas liberan los objetivos inmediatamente. Movimiento reducido cancela transiciones/pausas y deja todo visible. El HTML generado sigue sin atributos de estado de reveal; sin JS o sin IntersectionObserver no depende de una inicialización para ser legible.

## Pruebas realizadas

- `node --test scripts/animations/*.test.mjs`: 21/21 correctas. Incluyen activación al 80 %, contenedor alto, salto avanzado, salida durante transición, intersecciones repetidas, respaldo de finalización, foco y ancla durante la pausa, movimiento reducido durante la entrada, visualViewport variable, deduplicación de resize y limpieza.
- `npm run build`: correcto; comprobaciones CMS y check:site correctas.
- `npm run check:proyectos:build`: correcto, incluida su compilación final; no se modificaron fuentes de /proyectos.
- `git diff --check`: correcto. Revisado diff de los cuatro archivos de implementación/pruebas.
- Chromium integrado a 390×844: niveles, foto Technology, foto HumanFormation, evidencias y noticias seguían pending aproximadamente a y=726 (86 %) y pasaban a running alrededor de y=658 (78 %), con opacity 0 durante su pausa de 180 ms. Las duraciones calculadas fueron 450 ms para niveles/fotos y 400 ms para evidencias/noticias.
- Chromium a 320×844: nivel pending a y=726 y running a y=659 con delay 180 ms/duración 450 ms. Revisado descenso, vuelta al inicio y ausencia de overflow en las muestras.
- Escritorio 1440×900: encabezado con pausa 150 ms; niveles 180/250/320 ms. HumanFormation conserva 500 ms y entrada lateral. La lectura inmediata de Technology coincidió con el callback de IO aún pendiente; la siguiente vista y recarga mostraron su estado final correctamente.
- Móvil 390: recorrido completo en 22 pasos, 47 objetivos done al llegar al footer; segunda pasada sin reinicios. También salto rápido al footer y regreso: sin objetivos ocultos dentro del área activa revisada.
- Recarga real a scrollY 4931 en escritorio: los elementos que ya estaban visibles quedaron con opacity 1 y sin estado pending.
- Tab desde un enlace de nivel inicialmente pendiente: tarjeta done, opacity 1 y sin transición; ancla WhyCedhu: cero objetivos pendientes dentro del destino.
- Preferencia reducida del sitio durante sesión: cero objetivos ocultos/pending y transition-delay 0s; preferencia restaurada al finalizar.
- Hero: cero objetivos data-reveal; fotos siguen con 700 ms y secuencia 0/160/320 ms. Ningún archivo del hero aparece en el diff. Los seis tests de su controlador/física también pasan.
- Consola capturada sin errores ni advertencias; sin overflow horizontal en las muestras de 390, 320 y 1440 px.

## Límites de validación y Git

No se dispone de Safari/iPhone real ni de WebKit automatizado. Los tamaños móviles de Chromium **no constituyen validación en Safari**. La respuesta a cambios de visualViewport se cubre con pruebas automatizadas; queda pendiente la prueba final en iPhone con la barra de Safari mostrando/ocultándose. La preferencia del SO se cubre mediante los tests de matchMedia, no mediante emulación visual del SO. No se realizó prueba visual con JavaScript desactivado en esta revisión.

Persisten únicamente las advertencias conocidas de eventos vacíos y chunk superior a 500 kB. No se instalaron dependencias ni se modificaron contenidos, componentes Astro, CMS o /proyectos. El estado de Git inicial estaba limpio; las fases previas están preservadas. Solo se modificaron controlador, motion.css, tokens y pruebas, y se añadió este informe. Sin commits, push ni despliegues.
