import { getPageSection } from '../lib/content';

export const site = await getPageSection('contacto', 'contact');
export const navigation = [
  { label: 'CEDHU', href: '/nosotros/', children: [
    { label: 'Nosotros', href: '/nosotros/' },
    { label: 'Identidad, principios y valores', href: '/nosotros/identidad/' },
    { label: 'Pedagogía de la Felicidad', href: '/nosotros/pedagogia-de-la-felicidad/' },
    { label: 'Nuestros espacios', href: '/nosotros/espacios/' },
    { label: 'Equipo institucional', href: '/nosotros/equipo/' },
    { label: 'Nuestra historia', href: '/historia/' },
  ] },
  { label: 'Educación', href: '/oferta-educativa/', children: [
    { label: 'Nuestra propuesta', href: '/oferta-educativa/' },
    { label: 'Inicial y preescolar', href: '/oferta-educativa/inicial/' },
    { label: 'Primaria', href: '/oferta-educativa/primaria/' },
    { label: 'Bachillerato', href: '/oferta-educativa/bachillerato/' },
    { label: 'Inglés', href: '/oferta-educativa/ingles/' },
    { label: 'Ciencia y tecnología', href: '/oferta-educativa/ciencia-tecnologia/' },
    { label: 'Investigación', href: '/oferta-educativa/investigacion/' },
    { label: 'Robótica', href: '/oferta-educativa/robotica/' },
    { label: 'Formación integral', href: '/oferta-educativa/formacion-integral/' },
    { label: 'Lúdicas', href: '/ludicas/' },
  ] },
  { label: 'Actualidad', href: '/noticias/' },
  { label: 'Servicios', href: '/servicios-en-linea/' },
  { label: 'Contacto', href: '/contacto/' },
];
