import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fetch, timeoutSignal, AbortError } from '@adobe/fetch';
import { saveToFile, entryToPath } from '../bulk-update/document-manager/document-manager.js';
import { localizeStageUrl } from '../bulk-update/bulk-update.js';

dotenv.config({ path: 'download-markdown/.env' });

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

const ALLOW_SKIP = true; // Allow skipping files that already exist
const PAGE_DELAY = 500; // 500ms delay for fetching from hlx.page
const LIVE_DELAY = 0; // 0ms delay for fetching from live site
const TIMEOUT = 5000; // 5s timeout for fetching markdown
const { AUTHORIZATION_TOKEN } = process.env;

/**
 * Reads a JSON file from the specified directory.
 * @param {string} file - The name of the JSON file.
 * @param {string} directory - The directory where the file is located.
 * @returns {object} - The parsed JSON object.
 */
function readJsonFile(file, directory) {
  const filePath = path.join(directory, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Fetches markdown content from the specified URL.
 *
 * @param {string} url - The URL of the markdown file to fetch.
 * @param {number} fetchWaitMs - The delay in milliseconds before making the fetch request.
 * @param {function} fetchFn - The fetch function to use.
 * @returns {Promise<string>} A promise that resolves to the fetched markdown content as a string.
 */
export async function fetchMarkdown(url, fetchWaitMs, fetchFn = fetch) {
  try {
    console.log(`Fetching markdown ${url}, delay ${fetchWaitMs}ms, timeout ${TIMEOUT}ms`);
    await delay(fetchWaitMs); // Wait 500ms to avoid rate limiting, not needed for live.
    const signal = timeoutSignal(TIMEOUT); // 5s timeout
    const headers = {};
    if (AUTHORIZATION_TOKEN) {
      headers.Authorization = AUTHORIZATION_TOKEN;
    }

    const response = await fetchFn(url, { signal, headers });

    if (!response.ok) {
      console.warn('Failed to fetch markdown.', response.status, response.statusText);
      signal.clear();
      return '';
    }
    const text = await response.text();
    signal.clear();
    return text;
  } catch (e) {
    if (e instanceof AbortError) {
      console.warn(`Fetch timed out after ${TIMEOUT}ms`);
    } else {
      console.warn('Markdown not found at url', e.message);
    }
  }

  return '';
}

/**
 * Downloads a markdown file from a given document URL and saves it to a specified folder.
 *
 * @param {string} documentUrl - The URL of the markdown document to download.
 * @param {string} folderPath - Folder where the downloaded markdown file will be saved.
 * @param {string} entry - The name of the downloaded markdown file (without the file extension).
 * @param {Function} [fetchFn=fetch] - The fetch function to use for making HTTP requests.
 * @returns {Promise<boolean>} - true if the download is successful, or false otherwise.
 */
export async function downloadMD(documentUrl, folderPath, entry, fetchFn = fetch) {
  if (ALLOW_SKIP && fs.existsSync(path.join(folderPath, `${entry}.md`))) {
    console.log(`Skipping ${entry}.md`);
    return true;
  }

  const waitMs = documentUrl.includes('hlx.page') ? PAGE_DELAY : LIVE_DELAY;
  const markdown = await fetchMarkdown(`${documentUrl}.md`, waitMs, fetchFn);
  const markdownFile = path.join(folderPath, `${entry}.md`);

  if (!markdown) {
    return false;
  }

  console.log(`Saving ${markdownFile}`);
  saveToFile(markdownFile, markdown);

  return true;
}

/**
 * Downloads multiple markdown files from the specified URLs and saves them to a specified folder.
 *
 * @param {Map<string, string>} stagedUrls - A map of entry names to their corresponding URLs.
 * @param {string} folderPath - The path of the folder where the markdown files will be saved.
 * @param {Function} [fetchFn=fetch] - The fetch function to use for downloading the files.
 * @returns {Promise<string[]>} - A list of entries that failed to download.
 */
export async function downloadMDs(stagedUrls, folderPath, fetchFn = fetch) {
  const failedEntries = [];
  for (const [entry, stageUrl] of stagedUrls) {
    const success = await downloadMD(stageUrl, folderPath, entry, fetchFn);

    if (!success) {
      console.warn(`No markdown found for ${entry}`);
      failedEntries.push(entry);
    }
  }
  return failedEntries;
}

/**
 * Downloads markdown files from a list of URLs and saves them to a specified folder.
 *
 * @param {string} folder - The folder path where the markdown files will be saved.
 * @param {Array} list - The list of entries to be downloaded.
 * @param {Array} locales - The locales to be used for localizing the staged URLs.
 * @param {string} siteURL - The base URL of the website.
 * @param {string} stagePath - The path to the staging environment.
 * @returns {Promise<void>} A promise that resolves when the download process is complete.
 */
export function downloadMarkdown(folder, list, locales, siteURL, stagePath, fetchFn = fetch) {
  const stagedUrls = list.map((entry) => {
    const entryPath = entryToPath(entry);
    return [entryPath, localizeStageUrl(siteURL, entryPath, stagePath, locales)];
  });

  fs.mkdirSync(folder, { recursive: true });
  // save the list of entries to a file
  saveToFile(path.join(folder, 'download-list.json'), JSON.stringify(stagedUrls.map(([, stageUrl]) => stageUrl), null, 2));
  saveToFile(path.join(folder, 'preview.txt'), stagedUrls.map(([, stageUrl]) => stageUrl).join('\n'));

  return downloadMDs(stagedUrls, folder, fetchFn);
}

/**
 * Initializes the download process for markdown files.
 *
 * @param {string} migrationDir - The directory path for the migration.
 * @param {string} outputDir - The directory path for the output markdown files.
 * @param {string} siteUrl - The base URL of the website.
 * @param {string} stagePath - The path to the staging environment.
 * @returns {Promise<void>} A promise that resolves when the download process is complete.
 */
async function main(migrationDir, outputDir, siteUrl, stagePath = '') {
  const list = readJsonFile('output/list.json', migrationDir);
  const locales = readJsonFile('locales.json', migrationDir);

  if (!list) {
    console.error('Missing list');
    process.exit(1);
  }

  if (!locales) {
    console.error('Missing locales.json, continuing without localization');
  }

  if (!siteUrl) {
    console.error('Missing siteUrl');
    process.exit(1);
  }

  if (AUTHORIZATION_TOKEN) {
    console.log('Using authorization token for fetching markdown');
  } else {
    console.log('No authorization token found, fetching markdown without token');
  }

  const markdownFolder = path.join(migrationDir, 'md', outputDir);
  const failed = await downloadMarkdown(markdownFolder, list, locales, siteUrl, stagePath);

  console.log('Download complete');
  if (failed.length) {
    console.warn('Failed entries:', failed);
  }
}

/**
 * Run the markdown downloader
 * Example usage: node download-markdown/download-markdown.js 'blog-test' 'uploaded' 'https://main--bacom-blog--adobecom.hlx.page' '/drafts/staged-content'
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  // defaults for debugging
  const DEFAULTS = ['blog-test', 'uploaded', 'https://main--bacom-blog--adobecom.hlx.page', '/drafts/staged-content'];
  const [folder, outputDir, siteUrl, stagePath] = args.length ? args : DEFAULTS;

  await main(folder, outputDir, siteUrl, stagePath);
  process.exit(0);
}
