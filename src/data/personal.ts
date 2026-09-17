export const staffCategoryIds = ['directivas', 'coordinadores', 'docentes', 'administrativos', 'servicios-generales'] as const;
export type StaffCategory = (typeof staffCategoryIds)[number];
export const staffCategoryLabels: Record<StaffCategory, string> = {
  directivas: 'Directivas CEDHU',
  coordinadores: 'Coordinadores Académicos y de Convivencia',
  docentes: 'Docentes',
  administrativos: 'Administrativos',
  'servicios-generales': 'Servicios Generales',
};

export const staffGroupIds = ['preescolar', 'lengua-castellana', 'ingles', 'matematicas', 'ciencias-naturales', 'ciencias-sociales', 'religion-educacion-emocional', 'educacion-fisica', 'sistemas-robotica', 'musica'] as const;
export const staffGroupLabels: Record<(typeof staffGroupIds)[number], string> = {
  preescolar: 'Preescolar',
  'lengua-castellana': 'Lengua Castellana',
  ingles: 'Inglés',
  matematicas: 'Matemáticas',
  'ciencias-naturales': 'Ciencias Naturales, Biología, Física, Química y áreas relacionadas',
  'ciencias-sociales': 'Ciencias Sociales y Filosofía',
  'religion-educacion-emocional': 'Religión y Educación Emocional',
  'educacion-fisica': 'Educación Física',
  'sistemas-robotica': 'Sistemas y Robótica',
  musica: 'Música',
};
