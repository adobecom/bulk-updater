import path from 'path';
import fs from 'fs';
import { fetch, timeoutSignal, AbortError } from '@adobe/fetch';
import { saveToFile } from '../../bulk-update/document-manager/document-manager.js';
import { localizeStageUrl } from '../../bulk-update/bulk-update.js';

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

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
  const waitMs = documentUrl.includes('hlx.live') ? 0 : 500;
  const markdown = await fetchMarkdown(`${documentUrl}.md`, waitMs);
  const markdownFile = path.join(folderPath, `${entry}.md`);

  if (!markdown) {
    console.warn(`No markdown found for ${entry}`);
    return;
  }

  console.log(`Saving ${markdownFile}`);
  saveToFile(markdownFile, markdown);
}

async function downloadMDs(stagedUrls, folderPath) {
  for (const [entry, stageUrl] of stagedUrls) {
    await downloadMD(stageUrl, folderPath, entry);
    // process.exit(0);
  }
}

/**
 * Takes a list of URLs and downloads the markdown files to the specified folder.
 *
 * @param {string} listJson - The file path of the JSON file containing the list of URLs.
 * @param {string} folder - The folder where the markdown files will be downloaded.
 */
function init(folder, listJson, localesJson, siteURL, stagePath) {
  const entryList = JSON.parse(fs.readFileSync(listJson, 'utf8'));
  const locales = JSON.parse(fs.readFileSync(localesJson, 'utf8'));

  // eslint-disable-next-line arrow-body-style
  const stagedUrls = entryList.map((entry) => {
    return [entry, localizeStageUrl(siteURL, entry, stagePath, locales)];
  });

  fs.mkdirSync(folder, { recursive: true });
  downloadMDs(stagedUrls, folder);
}

// example usage: node tools/download-markdown/download-markdown.js 'blog-test/md/uploaded' 'blog-test/output/list.json' 'blog-test/locales.json' 'https://main--bacom-blog--adobecom.hlx.live' '/drafts/staged-content'
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [folder, listJson, localesJson, siteURL, stagePath] = args;

  if (!folder || !listJson || !localesJson || !siteURL || !stagePath) {
    console.error('Usage: node download-markdown.js <folder> <listJson> <localesJson> <siteURL> <stagePath>');
    process.exit(1);
  }

  init(folder, listJson, localesJson, siteURL, stagePath);
}
