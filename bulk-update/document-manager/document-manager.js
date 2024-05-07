/* eslint-disable max-len */
import fs from 'fs';
import path from 'path';
import { fetch, timeoutSignal, AbortError } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import { mdast2md } from '@adobe/helix-docx2md';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';
import validateMdast from '../validation/mdast.js';

const MD_SOURCE = 'source';
const MD_UPDATED = 'updated';

const delay = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });
const { pathname } = new URL('.', import.meta.url);

/**
 * Format the path to the actual url/file.
 * Making sure URLs ending in a slash are an index file.
 * Removing .html and any query parameters or hash fragments.
 *
 * @param {string} entry - The index entry or URL
 * @returns {string} - The markdown path
 */
export function entryToPath(entry) {
  let filepath = entry.split(/\?|#/)[0].replace(/\/$/, '/index');
  filepath = filepath.replace(/\.html$/, ''); // Remove .html extension
  if (!filepath.startsWith('/')) filepath = `/${filepath}`;

  return filepath;
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
export function getMdast(mdTxt, reporter) {
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
 * Loads markdown content from a file.
 *
 * @param {string} markdownFile - The path to the markdown file.
 * @param {number} mdCacheMs - The cache duration in milliseconds.
 * @returns {string|null} The content of the markdown file, or null if the file doesn't exist or has expired in the cache.
 */
function loadMarkdownFromFile(markdownFile, mdCacheMs) {
  if (!fs.existsSync(markdownFile)) return null;

  const stats = fs.statSync(markdownFile);
  if (hasExpired(stats.mtime, mdCacheMs)) return null;

  return fs.readFileSync(markdownFile, 'utf8');
}

/**
 * Saves the provided content to a file.
 *
 * @param {string} file - The path of the file to save.
 * @param {string} content - The content to be saved.
 */
export function saveToFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
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

  if (mdDir) {
    document.markdownFile = path.join(mdDir, MD_SOURCE, `${document.path}.md`);
    document.markdown = loadMarkdownFromFile(document.markdownFile, mdCacheMs);

    if (document.markdown) {
      document.mdast = getMdast(document.markdown, reporter);
      reporter.log('load', 'success', 'Loaded file', { entry });

      return document;
    }
  }

  document.markdown = await fetchMarkdown(`${document.url}.md`, reporter, fetchWaitMs, fetchFunction);

  if (document.markdown) {
    if (mdDir) saveToFile(document.markdownFile, document.markdown);
    document.mdast = getMdast(document.markdown, reporter);
    reporter.log('load', 'success', 'Fetched entry', { entry });

    return document;
  }

  reporter.log('load', 'error', 'Failed to load or fetch entry', { entry });

  return document;
}

/**
 * Save a mdast as a md file to the specified file.
 *
 * @param {object} mdast
 * @param {string} outputFile
 * @returns {Promise<void>}
 */
async function saveMd(mdast, output) {
  const outputFolder = path.dirname(output);
  fs.mkdirSync(outputFolder, { recursive: true });

  const mdastCopy = JSON.parse(JSON.stringify(mdast));
  const md = await mdast2md(mdastCopy, { gridtables: true });
  fs.writeFileSync(output, md, 'utf-8');
}

/**
 * Save a mdast as a docx file to the specified file.
 *
 * @param {object} mdast
 * @param {string} outputFile
 * @returns {Promise<void>}
 */
async function saveDocx(mdast, output) {
  const outputFolder = path.dirname(output);
  fs.mkdirSync(outputFolder, { recursive: true });

  const stylesXML = fs.readFileSync(`${pathname}styles.xml`, 'utf8');
  const mdastCopy = JSON.parse(JSON.stringify(mdast));
  const buffer = await mdast2docx(mdastCopy, { stylesXML });
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
  const { reporter, mdDir, outputDir } = config;
  if (!outputDir) {
    reporter.log('save', 'error', 'No output directory specified. Skipping save.');
    return;
  }
  const documentPath = entryToPath(entry);
  const outputDocx = path.join(outputDir, `${documentPath}.docx`);
  const outputMd = path.join(mdDir, MD_UPDATED, `${documentPath}.md`);
  const issues = validateMdast(mdast);

  issues.forEach((issue) => {
    reporter.log('validation', 'error', issue, { entry });
  });

  try {
    await saveMd(mdast, outputMd);
    reporter.log('save', 'md success', 'Saved markdown', { entry });
  } catch (e) {
    reporter.log('save', 'md error', e.message, { entry });
  }

  try {
    await saveDocx(mdast, outputDocx);
    reporter.log('save', 'docx success', 'Saved docx', { entry });
  } catch (e) {
    reporter.log('save', 'docx error', e.message, { entry });
  }
}
