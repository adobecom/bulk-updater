import path from 'path';
import fs from 'fs';
import { fetch, timeoutSignal, AbortError } from '@adobe/fetch';
import { saveToFile, entryToPath } from '../../bulk-update/document-manager/document-manager.js';
import { localizeStageUrl } from '../../bulk-update/bulk-update.js';

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

const SKIP = true;

async function fetchMarkdown(url, fetchWaitMs = 500, fetchFunction = fetch) {
  try {
    console.log(`Fetching markdown ${url}, delay ${fetchWaitMs}ms, timeout 5s`);
    await delay(fetchWaitMs); // Wait 500ms to avoid rate limiting, not needed for live.
    const signal = timeoutSignal(5000); // 5s timeout
    const response = await fetchFunction(url, { signal });

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
      console.warn('Fetch timed out after 1s');
    } else {
      console.warn('Markdown not found at url', e.message);
    }
  }

  return '';
}

async function downloadMD(documentUrl, folderPath, entry) {
  if (SKIP && fs.existsSync(path.join(folderPath, `${entry}.md`))) {
    console.log(`Skipping ${entry}.md`);
    return;
  }

  const waitMs = documentUrl.includes('hlx.live') ? 0 : 500;
  const markdown = await fetchMarkdown(`${documentUrl}.md`, waitMs);
  const markdownFile = path.join(folderPath, `${entry}.md`);

  if (!markdown) {
    console.warn(`No markdown found for ${entry}`);
    fs.appendFileSync('failed-entries.txt', `${entry}\n`);
    return;
  }

  console.log(`Saving ${markdownFile}`);
  saveToFile(markdownFile, markdown);
}

async function downloadMDs(stagedUrls, folderPath) {
  for (const [entry, stageUrl] of stagedUrls) {
    await downloadMD(stageUrl, folderPath, entry);
  }
}

/**
 * Downloads markdown files from a list of URLs and saves them to a specified folder.
 *
 * @param {string} folder - The folder path where the markdown files will be saved.
 * @param {Array} list - The list of URLs of the markdown files to be downloaded.
 * @param {Array} locales - The locales to be used for localizing the staged URLs.
 * @param {string} siteURL - The base URL of the website.
 * @param {string} stagePath - The path to the staging environment.
 */
function downloadMarkdown(folder, list, locales, siteURL, stagePath) {
  // eslint-disable-next-line arrow-body-style
  const stagedUrls = list.map((entry) => {
    const entryPath = entryToPath(entry);
    return [entryPath, localizeStageUrl(siteURL, entryPath, stagePath, locales)];
  });

  fs.mkdirSync(folder, { recursive: true });
  return downloadMDs(stagedUrls, folder);
}

function readJsonFile(file, directory) {
  const filePath = path.join(directory, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Initializes the download process for markdown files.
 *
 * @param {string} migrationDir - The directory path for the migration.
 * @param {string} [outputDir='output'] - The directory path for the output files.
 * @returns {Promise<void>} A promise that resolves when the download process is complete.
 */
async function init(migrationDir, outputDir = 'output', siteUrl = 'https://main--bacom-blog--adobecom.hlx.page', stagePath = '/drafts/staged-content') {
  // const config = readJsonFile('config.json', migrationDir);
  const list = readJsonFile('output/list.json', migrationDir);
  const locales = readJsonFile('locales.json', migrationDir);

  // const { siteUrl, stagePath } = config;

  if (!siteUrl || !stagePath) {
    console.error('Missing siteUrl or stagePath in config');
    process.exit(1);
  }

  const mdDir = path.join(migrationDir, 'md', outputDir);
  await downloadMarkdown(mdDir, list, locales, siteUrl, stagePath);
}

// example usage: node tools/download-markdown/download-markdown.js 'blog-test' 'uploaded'
if (import.meta.url === `file://${process.argv[1]}`) {
  // const args = process.argv.slice(2);
  // const [folder, outputDir] = args;
  const [folder, outputDir] = ['blog-test', 'uploaded'];

  await init(folder, outputDir);
  process.exit(0);
}
