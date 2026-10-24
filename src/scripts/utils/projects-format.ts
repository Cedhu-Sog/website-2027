export const gradeLabel = (value: string) => /^\d+$/.test(value) ? 'Grado ' + value : value;
export function dateLabel(value: string, includeTime = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', ...(includeTime ? { timeStyle: 'short' as const } : {}), timeZone: 'America/Bogota' }).format(date);
}
const actions: Record<string, string> = { CREACION_PROYECTO: 'Registro de proyecto', EDICION_PROYECTO: 'Edición de información', ARCHIVO_PROYECTO: 'Archivo histórico', CARGA_MASIVA: 'Importación de proyectos', RESULTADO_IMPORTACION: 'Resultado de importación', INCIDENCIA_IMPORTACION: 'Incidencia de carga', INCIDENCIA_GESTION: 'Incidencia de gestión', INCIDENCIA_RESUELTA: 'Resolución de incidencia' };
const results: Record<string, string> = { INICIADO: 'Operación iniciada', EXITO: 'Completada', FALLIDO: 'No completada' };
export const actionLabel = (value: string) => actions[value] || value;
export const resultLabel = (value: string) => results[value] || value;
