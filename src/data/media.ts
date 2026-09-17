import type { ImageMetadata } from 'astro';
import type { mediaKeys } from './media-keys';
import aulaCedhu from '../assets/fotos-cedhu/aprendizaje-en-el-aula.webp';
import lecturaCedhu from '../assets/fotos-cedhu/lectura-en-primaria.webp';
import instalacionesCedhu from '../assets/fotos-cedhu/instalaciones-vista-aerea.webp';
import comunidadCedhu from '../assets/fotos-cedhu/encuentro-musical-comunidad.webp';
import encuentroCedhu from '../assets/fotos-cedhu/reconocimiento-institucional.webp';
import convivenciaCedhu from '../assets/fotos-cedhu/convivencia-juego-respeto.webp';
import cienciaCedhu from '../assets/fotos-cedhu/feria-cientifica-experimentacion.webp';
import logo from '../assets/images/logo.avif';
import inicial from '../assets/images/inicial.jpg';
import primaria from '../assets/images/primaria.jpg';
import bachillerato from '../assets/images/bachillerato.png';
import valores from '../assets/images/valores.jpeg';
import musica from '../assets/images/musica.jpeg';
import laboratorio from '../assets/images/laboratorio.jpg';
import ingles from '../assets/images/ingles.jpeg';
import robotica from '../assets/images/robotica.jpeg';
import investigacion from '../assets/images/investigacion.jpeg';
import danzas from '../assets/images/danzas.jpeg';
import familias from '../assets/images/familias.jpeg';
import horizonte from '../assets/images/horizonte.jpeg';
import bandera from '../assets/images/bandera.png';
import lema from '../assets/images/lema.avif';
import deportes from '../assets/images/deportes.jpeg';
import tecnologiaNoticia from '../assets/images/tecnologia-noticia.png';
import marcaNoticia from '../assets/images/marca-noticia.png';
import ludicasNoticia from '../assets/images/ludicas-noticia.png';
import emocionesNoticia from '../assets/images/emociones-noticia.png';
import director from '../assets/images/director.avif';
import administradora from '../assets/images/administradora.avif';
import rectora from '../assets/images/rectora.jpg';

// Fotografías oficiales. Procedencia: docs/CONTENT-SOURCES.md.
export const media = {
  // Selección editorial del lote: docs/FOTOGRAFIAS-CEDHU.md.
  aulaCedhu: { src: aulaCedhu, alt: 'Educandos del CEDHU escriben en sus cuadernos durante una actividad de aula.' },
  lecturaCedhu: { src: lecturaCedhu, alt: 'Un educando del CEDHU trabaja en su libro junto a sus compañeros de primaria.' },
  instalacionesCedhu: { src: instalacionesCedhu, alt: 'Vista aérea del CEDHU en Sogamoso, con la entrada principal, los edificios y el patio central.' },
  comunidadCedhu: { src: comunidadCedhu, alt: 'Una educanda y un adulto interpretan instrumentos de cuerda durante un encuentro del CEDHU.' },
  encuentroCedhu: { src: encuentroCedhu, alt: 'Integrantes de la comunidad del CEDHU reciben menciones de honor en un encuentro institucional.' },
  convivenciaCedhu: { src: convivenciaCedhu, alt: 'Educandos del CEDHU forman la palabra respeto con tarjetas de colores durante una actividad de convivencia.' },
  cienciaCedhu: { src: cienciaCedhu, alt: 'Participantes de la feria científica del CEDHU exploran juntos un montaje con tubos en el patio del colegio.' },
  logo: { src: logo, alt: 'CEDHU — Centro de Desarrollo Humano. Orden es Bienestar.' },
  inicial: { src: inicial, alt: 'Educandos de preescolar en una actividad de aula del CEDHU.' },
  primaria: { src: primaria, alt: 'Educandos de primaria trabajando en su salón de clase.' },
  bachillerato: { src: bachillerato, alt: 'Educandos del CEDHU durante una actividad académica.' },
  valores: { src: valores, alt: 'Educandos compartiendo una actividad en el aula.' },
  musica: { src: musica, alt: 'Presentación musical de la Tuna del CEDHU.' },
  laboratorio: { src: laboratorio, alt: 'Educandos realizando una práctica en el laboratorio del CEDHU.' },
  ingles: { src: ingles, alt: 'Participantes en una actividad del área de inglés del CEDHU.' },
  robotica: { src: robotica, alt: 'Educandos del CEDHU presentan un proyecto tecnológico junto a su computador.' },
  investigacion: { src: investigacion, alt: 'Educandos presentan un proyecto de investigación en el CEDHU.' },
  danzas: { src: danzas, alt: 'Grupo de danzas del CEDHU en una presentación artística.' },
  familias: { src: familias, alt: 'Familias reunidas en un taller de padres en el CEDHU.' },
  horizonte: { src: horizonte, alt: 'Encuentro formativo con educandos en el CEDHU.' },
  bandera: { src: bandera, alt: 'Bandera del CEDHU: blanco, verde, rojo y amarillo, con el emblema institucional.' },
  lema: { src: lema, alt: 'Comunidad cedhuista reunida en el patio de la institución.' },
  deportes: { src: deportes, alt: 'Equipo de baloncesto del CEDHU en la cancha del colegio.' },
  tecnologiaNoticia: { src: tecnologiaNoticia, alt: 'Comunicado del 3 de febrero de 2026: tecnología en los salones del CEDHU, Apple TV, iPads y routers.' },
  marcaNoticia: { src: marcaNoticia, alt: 'Comunicado de Gestión Directiva sobre el registro de la marca CEDHU. Su contenido se resume en este artículo.' },
  ludicasNoticia: { src: ludicasNoticia, alt: 'Publicación institucional sobre las actividades lúdicas de 2026.' },
  emocionesNoticia: { src: emocionesNoticia, alt: 'Invitación institucional al Picnic de las emociones para los grados décimo.' },
  director: { src: director, alt: 'Juan Carlos Ruiz, director general del CEDHU.' },
  administradora: { src: administradora, alt: 'Celia Elena Fajardo Garavito, administradora del CEDHU.' },
  rectora: { src: rectora, alt: 'Nancy Cabrera Bravo, rectora del CEDHU.' },
} satisfies Record<(typeof mediaKeys)[number], { src: ImageMetadata; alt: string }>;
export type MediaKey = keyof typeof media;
