/* eslint-disable max-len */
import { fetch, timeoutSignal, AbortError } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';

import fs from 'fs';

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

/**
 * Format the path to the actual url/file.
 * Making sure URLs ending in a slash are an index file.
 * Removing .html and any query parameters or hash fragments.
 *
 * @param {string} entry - The index entry or URL
 * @returns {string} - The markdown path
 */
export function entryToPath(entry) {
  let path = entry.split(/\?|#/)[0].replace(/\/$/, '/index');
  path = path.replace(/\.html$/, ''); // Remove .html extension
  return path;
}

/**
 * Fetches a markdown file from a given URL.
 *
 * If the `url` option is provided, the function fetches the markdown from the given URL.
 * If the `mdDir` option is provided, it saves the fetched markdown to the specified local path.
 *
 * @param {string} url - The URL to fetch the markdown file from.
 * @param {function} reporter - A logging function.
 * @param {number} fetchWaitMs - The number of milliseconds to wait before fetching the markdown.
 * @returns {Promise<string>} A promise that resolves to the fetched markdown.
 */
async function fetchMarkdown(url, reporter, fetchWaitMs = 500, fetchFunction = fetch) {
  try {
    console.log(`Fetching ${url}`);
    await delay(fetchWaitMs); // Wait 500ms to avoid rate limiting, not needed for live.
    const signal = timeoutSignal(5000); // 5s timeout
    const response = await fetchFunction(url, { signal });

    if (!response.ok) {
      reporter.log('load', 'error', 'Failed to fetch markdown.', url, response.status, response.statusText);
      return '';
    }
    const text = await response.text();
    signal.clear();
    return text;
  } catch (e) {
    if (e instanceof AbortError) {
      reporter.log('load', 'warn', 'Fetch timed out after 1s', url);
    } else {
      reporter.log('load', 'warn', 'Markdown not found at url', url, e.message);
    }
  }

  return '';
}

/**
 * It takes a string of Markdown text and returns a JavaScript object that represents the Markdown
 * Abstract Syntax Tree (mdast)
 * @param {string} mdTxt - The markdown text to be parsed.
 * @returns {object} mdast - The mdast is being returned.
 */
function getMdast(mdTxt, reporter) {
  const log = (message) => { reporter.log('parse', 'info', message); };
  const state = { content: { data: mdTxt }, log };

  parseMarkdown(state);
  const { mdast } = state.content;
  return mdast;
}

/**
 * Checks if a document has expired based on its modified time and cache time.
 *
 * @param {number} mtime - The modified time of the document.
 * @param {number} cacheTime - The cache time in milliseconds. Use -1 for no caching.
 * @returns {boolean} - Returns true if the document has not expired, false otherwise.
 */
export function hasExpired(mtime, cacheTime, date = Date.now()) {
  const modifiedTime = new Date(mtime).getTime();
  const expiryTime = cacheTime === -1 ? Infinity : modifiedTime + cacheTime;

  return expiryTime < date;
}

/**
 * Load entry markdown from a file or URL.
 *
 * If a save directory is provided in the config and a file exists at that path,
 * this function will return the contents of that file if it was modified
 * within the cache time. Otherwise, it will fetch the markdown from the
 * specified path or URL, save it to the save directory if one is provided, and
 * return the fetched markdown.
 *
 * @param {string} entry - The entry path of the document.
 * @param {Object} config - The configuration options.
 * @param {string} config.mdDir - The directory to save the fetched markdown to.
 * @param {string} config.siteUrl - The base URL for relative markdown paths.
 * @param {function} config.reporter - A logging function.
 * @param {number} config.mdCacheMs - The cache time in milliseconds. If -1, the cache never expires.
 * @param {Function} [fetchFunction=fetch] - The fetch function to use for fetching markdown.
 * @returns {Promise<Object>} An object containing the markdown content, the markdown abstract syntax tree (mdast), the entry, the markdown path, and the markdown URL.
 * @throws {Error} - If config is missing or entry is invalid.
 */
export async function loadDocument(entry, config, fetchFunction = fetch) {
  if (!config) throw new Error('Missing config');
  if (!entry || !entry.startsWith('/')) throw new Error(`Invalid path: ${entry}`);
  const { mdDir, siteUrl, reporter, fetchWaitMs, mdCacheMs = 0 } = config;
  const document = { entry, path: entryToPath(entry) };
  document.url = new URL(document.path, siteUrl).href;
  document.markdownFile = `${mdDir}${document.path}.md`;

  if (mdDir && fs.existsSync(document.markdownFile)) {
    const stats = fs.statSync(document.markdownFile);
    if (!hasExpired(stats.mtime, mdCacheMs)) {
      document.markdown = fs.readFileSync(document.markdownFile, 'utf8');
      reporter.log('load', 'success', 'Loaded markdown', document.markdownFile);
    }
  }

  if (!document.markdown) {
    document.markdown = await fetchMarkdown(`${document.url}.md`, reporter, fetchWaitMs, fetchFunction);
    reporter.log('load', 'success', 'Fetched markdown', `${document.url}.md`);

    if (document.markdown && mdDir) {
      const folder = document.markdownFile.split('/').slice(0, -1).join('/');
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(document.markdownFile, document.markdown);
    }
  }

  document.mdast = getMdast(document.markdown, reporter);

  return document;
}

/**
 * Save a mdast as a docx file to the file system.
 *
 * @param {object} mdast
 * @param {string} outputFile
 */
async function saveDocx(mdast, output) {
  const outputFolder = output.split('/').slice(0, -1).join('/');
  fs.mkdirSync(outputFolder, { recursive: true });

  const buffer = await mdast2docx(mdast);
  fs.writeFileSync(output, buffer);
}

/**
 * Saves the document as a DOCX file.
 *
 * @param {Object} document - The document to be saved.
 * @param {Object} config - The configuration options for saving the document.
 * @param {Object} document.mdast - The Markdown AST of the document.
 * @param {string} document.entry - The entry point of the document.
 * @param {Object} config.reporter - The reporter object for logging.
 * @param {string} config.outputDir - The output directory for saving the document.
 * @returns {Promise<void>} - A promise that resolves when the document is saved.
 */
export async function saveDocument(document, config) {
  const { mdast, entry } = document;
  const { reporter, outputDir } = config;
  if (!outputDir) {
    config.reporter.log('save', 'error', 'No output directory specified. Skipping save.');
    return;
  }
  const documentPath = entryToPath(entry);
  const output = `${outputDir}${documentPath}.docx`;

  try {
    await saveDocx(mdast, output);
    reporter.log('save', 'success', 'Saved docx to', `${output}`);
  } catch (e) {
    reporter.log('save', 'error', e.message, `${documentPath}.docx`);
  }
}
