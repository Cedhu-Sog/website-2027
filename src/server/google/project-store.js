import { createGoogleClient, authenticateGoogle } from './auth.js';
import { googleRepositoryConfig } from './config.js';
import { createGoogleRepository } from './repository.js';
import { parseProjects } from '../projects/catalog.js';
import { measuredGoogleClient } from '../projects/timing.js';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Each invocation verifies configured institutional resources before reading.
 * No client-supplied file IDs or sheet ranges are accepted. No shared cache.
 */
export async function openRepositoryContext({ env = process.env, clientFactory = createGoogleClient, signal, timing } = {}) {
  const config = googleRepositoryConfig(env);
  const client = measuredGoogleClient(clientFactory({ env, signal }), timing);
  await authenticateGoogle(client);
  const repository = createGoogleRepository(client, config, { signal });
  await repository.checkServiceAccount();
  await repository.checkDrive();
  const systemId = await repository.checkStructure();
  return { client, config, repository, systemId, sheetInfo: new Map(), timing };
}

export async function openProjectStore({ env = process.env, clientFactory = createGoogleClient, write = false, context, timing } = {}) {
  // Passed only by the current server-side session guard; never shared between
  // requests. Live user authorization was still read on this very request.
  const base = context?.store || await openRepositoryContext({ env, clientFactory, timing });
  const { config, repository, systemId, sheetInfo } = base;
  let client = base.client;
  if (write) {
    client = measuredGoogleClient(clientFactory({ env, write: true }), timing);
    await authenticateGoogle(client);
  }
  const catalogInfo = await repository.checkSheet('catalog', systemId);
  const sheet = config.sheets.find(s => s.key === 'catalog');
  if (Number.isSafeInteger(catalogInfo?.tabId)) sheetInfo.set('catalog', { ...sheet, tabId: catalogInfo.tabId });
  async function projects() {
    const response = await client.request({ url: `${SHEETS}/${sheet.id}/values/${encodeURIComponent("'Proyectos'!A2:R")}`,
      params: { majorDimension: 'ROWS', valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
      method: 'GET', timeout: 8000, retry: false, maxRedirects: 0, maxContentLength: 16 * 1024 * 1024 });
    return parseProjects(response.data?.values ?? [], sheet.headers);
  }
  return { projects, client, config, repository, systemId, sheetInfo, timing };
}
