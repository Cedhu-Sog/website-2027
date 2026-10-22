import { googleRepositoryConfig, safeGoogleFailure } from '../../src/server/google/config.js';

// Local format validation only. The temporary Production probe was retired.
if (process.argv.length === 2) {
  try {
    googleRepositoryConfig();
    console.log('PASS: configuración local completa y válida en formato. No se contactó Google ni Vercel; IDs y encabezados aún requieren validación real.');
  } catch (error) {
    console.error(JSON.stringify(safeGoogleFailure(error)));
    process.exitCode = 1;
  }
} else {
  console.error('Usa npm run check:proyectos:google para validar formato sin red. El diagnóstico HTTP temporal fue retirado.');
  process.exitCode = 1;
}
