import { createGoogleClient, authenticateGoogle } from './auth.js';
import { googleRepositoryConfig } from './config.js';
import { createGoogleRepository } from './repository.js';
import { parseProjects } from '../projects/catalog.js';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Each invocation verifies configured institutional resources before reading.
 * No client-supplied file IDs or sheet ranges are accepted. No shared cache.
 */
export async function openProjectStore({ env = process.env, clientFactory = createGoogleClient, write = false } = {}) {
  const config = googleRepositoryConfig(env);
  const client = clientFactory({ env, write });
  await authenticateGoogle(client);
  const repository = createGoogleRepository(client, config);
  await repository.checkServiceAccount();
  await repository.checkDrive();
  const systemId = await repository.checkStructure();
  const catalogInfo = await repository.checkSheet('catalog', systemId);
  const sheet = config.sheets.find(s => s.key === 'catalog');
  const sheetInfo = new Map();
  if (Number.isSafeInteger(catalogInfo?.tabId)) sheetInfo.set('catalog', { ...sheet, tabId: catalogInfo.tabId });
  async function projects() {
    const response = await client.request({ url: `${SHEETS}/${sheet.id}/values/${encodeURIComponent("'Proyectos'!A2:R")}`,
      params: { majorDimension: 'ROWS', valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
      method: 'GET', timeout: 8000, retry: false, maxRedirects: 0, maxContentLength: 16 * 1024 * 1024 });
    return parseProjects(response.data?.values ?? [], sheet.headers);
  }
  return { projects, client, config, repository, systemId, sheetInfo };
}
