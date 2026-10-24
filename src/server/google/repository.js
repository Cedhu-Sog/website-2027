import { GoogleConnectionError, safeGoogleFailure } from './config.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const FOLDER = 'application/vnd.google-apps.folder';
const SPREADSHEET = 'application/vnd.google-apps.spreadsheet';
const FOLDERS = ['00_Sistema', '01_Investigaciones', '02_Importaciones_Temporales'];
const FILE_FIELDS = 'id,name,mimeType,parents,driveId,trashed';

/** A deliberately narrow read service. Resource IDs and ranges come exclusively
 * from validated server configuration, never from a browser request.
 */
export function createGoogleRepository(client, config, { signal } = {}) {
  async function get(url, params) {
    try {
      const response = await client.request({ url, params, method: 'GET', responseType: 'json',
        timeout: 4000, retry: false, maxRedirects: 0, maxContentLength: 262144, signal });
      return response.data;
    } catch (error) {
      const service = url.startsWith(`${DRIVE}/`) ? 'drive' : 'sheets';
      throw new GoogleConnectionError(`${service}_${safeGoogleFailure(error).code.replace(/^google_/, '')}`);
    }
  }

  async function checkServiceAccount() {
    const data = await get(`${DRIVE}/about`, { fields: 'user(emailAddress)' });
    if (data.user?.emailAddress !== config.identity.serviceAccount) throw new GoogleConnectionError('service_account_mismatch');
  }

  async function checkDrive() {
    const drive = await get(`${DRIVE}/drives/${config.rootId}`, { fields: 'id,name', useDomainAdminAccess: false });
    if (drive.id !== config.rootId || drive.name !== 'Repo Investigación') throw new GoogleConnectionError('drive_mismatch');
  }

  async function checkStructure() {
    const folders = [];
    let pageToken;
    // Query only the three configured top-level names in this shared drive.
    // Bound pagination and fail closed on incomplete results/ambiguous names.
    for (let page = 0; page < 10; page++) {
      const data = await get(`${DRIVE}/files`, {
        corpora: 'drive', driveId: config.rootId, includeItemsFromAllDrives: true, supportsAllDrives: true,
        q: `'${config.rootId}' in parents and trashed = false and mimeType = '${FOLDER}' and (${FOLDERS.map(name => `name = '${name}'`).join(' or ')})`,
        fields: `nextPageToken,incompleteSearch,files(${FILE_FIELDS})`, pageSize: 100, ...(pageToken ? { pageToken } : {}),
      });
      if (data.incompleteSearch || !Array.isArray(data.files)) throw new GoogleConnectionError('structure_incomplete');
      folders.push(...data.files);
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    if (pageToken) throw new GoogleConnectionError('structure_incomplete');
    for (const name of FOLDERS) {
      const matches = folders.filter(folder => folder.name === name);
      if (matches.length !== 1 || !/^[A-Za-z0-9_-]{10,200}$/.test(matches[0].id) ||
          matches[0].mimeType !== FOLDER || matches[0].trashed || matches[0].driveId !== config.rootId ||
          matches[0].parents?.length !== 1 || matches[0].parents[0] !== config.rootId) {
        throw new GoogleConnectionError('structure_mismatch');
      }
    }
    return folders.find(folder => folder.name === '00_Sistema').id;
  }

  async function checkSheet(key, systemFolderId) {
    const sheet = config.sheets.find(item => item.key === key);
    if (!sheet) throw new GoogleConnectionError('sheet_not_allowed');
    const file = await get(`${DRIVE}/files/${sheet.id}`, { fields: FILE_FIELDS, supportsAllDrives: true });
    if (file.id !== sheet.id || file.name !== sheet.name || file.mimeType !== SPREADSHEET || file.trashed ||
        file.driveId !== config.rootId || file.parents?.length !== 1 || file.parents[0] !== systemFolderId) {
      throw new GoogleConnectionError('sheet_outside_repository_or_mismatch');
    }
    // Check membership BEFORE accessing Sheets. No shortcuts, external sheets,
    // named ranges, arbitrary tabs or row data are followed.
    const spreadsheet = await get(`${SHEETS}/${sheet.id}`, { fields: 'sheets(properties(sheetId,title,sheetType))', includeGridData: false });
    const tabs = spreadsheet.sheets?.filter(item => item.properties?.title === sheet.tab);
    if (tabs?.length !== 1 || tabs[0].properties.sheetType !== 'GRID') throw new GoogleConnectionError('sheet_tab_mismatch');
    const range = encodeURIComponent(`'${sheet.tab}'!1:1`);
    const row = await get(`${SHEETS}/${sheet.id}/values/${range}`, {
      majorDimension: 'ROWS', valueRenderOption: 'UNFORMATTED_VALUE', fields: 'values',
    });
    const headers = row.values?.[0];
    if (row.values?.length !== 1 || !Array.isArray(headers) || headers.length !== sheet.headers.length ||
        headers.some((value, index) => value !== sheet.headers[index])) throw new GoogleConnectionError('sheet_headers_mismatch');
    // No headers or metadata leave this server-side check.
    return { tabId: tabs[0].properties.sheetId };
  }

  return { checkServiceAccount, checkDrive, checkStructure, checkSheet };
}
