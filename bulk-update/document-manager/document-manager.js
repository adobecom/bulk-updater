/* eslint-disable max-len */
import { fetch } from '@adobe/fetch';
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
 * Fetches a markdown file from a given URL and optionally saves it locally.
 *
 * If the `url` option is provided, the function fetches the markdown from the given URL.
 * If the `mdDir` option is provided, it saves the fetched markdown to the specified local path.
 *
 * @param {string} url - The URL to fetch the markdown file from.
 * @param {string} mdDir - The local path to save the fetched markdown to.
 * @param {number} waitMs - The number of milliseconds to wait before fetching the markdown.
 * @returns {string} - The markdown content as a string or null if not found or an error occurred.
 */
async function getMarkdown(url, reporter, waitMs = 500) {
  try {
    await delay(waitMs); // Wait 500ms to avoid rate limiting
    const response = await fetch(url);

    if (!response.ok) {
      reporter.log('load', 'error', 'Failed to fetch markdown.', url, response.status, response.statusText);
      return '';
    }
    reporter.log('load', 'success', 'Loaded markdown', url);
    return await response.text();
  } catch (e) {
    reporter.log('load', 'warn', 'Markdown not found at url', url, e.message);
  }

  return '';
}

/**
 * It takes a string of Markdown text and returns a JavaScript object that represents the Markdown
 * Abstract Syntax Tree (mdast)
 * @param {string} mdTxt - The markdown text to be parsed.
 * @returns {object} mdast - The mdast is being returned.
 */
async function getMdast(mdTxt, reporter) {
  const log = (message) => { reporter.log('parse', 'info', message); };
  const state = { content: { data: mdTxt }, log };

  await parseMarkdown(state);
  const { mdast } = state.content;
  return mdast;
}

/**
 * Load markdown from a file or URL.
 *
 * If a save directory is provided in the config and a file exists at that path,
 * this function will return the contents of that file if it was modified
 * within the cache time. Otherwise, it will fetch the markdown from the
 * specified path or URL, save it to the save directory if one is provided, and
 * return the fetched markdown.
 *
 * @param {string} entry - The path or URL to fetch the markdown from.
 * @param {Object} config - The configuration options.
 * @param {string} config.mdDir - The directory to save the fetched markdown to.
 * @param {string} config.siteUrl - The base URL for relative markdown paths.
 * @param {function} config.reporter - A logging function.
 * @param {number} config.mdCacheMs - The cache time in milliseconds. If -1, the cache never expires.
 * @returns {Promise<Object>} An object containing the markdown content, the markdown abstract syntax tree (mdast), the entry, the markdown path, and the markdown URL.
 */
export async function loadDocument(entry, config) {
  if (!config) throw new Error('Missing config');
  const { mdDir, siteUrl, reporter, mdCacheMs = 0 } = config;
  const document = { entry, path: entryToPath(entry) };
  document.url = new URL(document.path, siteUrl).href;
  document.markdownFile = `${mdDir}${document.path}.md`;

  if (mdDir && fs.existsSync(document.markdownFile)) {
    const stats = fs.statSync(document.markdownFile);
    const modifiedTime = new Date(stats.mtime).getTime();
    const expiryTime = mdCacheMs === -1 ? Infinity : modifiedTime - mdCacheMs;

    if (expiryTime > Date.now()) {
      document.markdown = fs.readFileSync(document.markdownFile, 'utf8');
      reporter.log('load', 'success', 'Loaded markdown', document.markdownFile);
    }
  }

  if (!document.markdown) {
    document.markdown = await getMarkdown(`${document.url}.md`, reporter, config.waitMs);

    if (document.markdown && mdDir) {
      const folder = document.markdownFile.split('/').slice(0, -1).join('/');
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(document.markdownFile, document.markdown);
      reporter.log('save', 'success', 'Saved markdown', document.markdownFile);
    }
  }

  document.mdast = await getMdast(document.markdown, reporter);

  return document;
}

/**
 * Save a mdast as a docx file to the file system.
 *
 * @param {object} mdast
 * @param {string} outputFile
 */
async function saveDocx(mdast, output, reporter) {
  const outputFolder = output.split('/').slice(0, -1).join('/');
  fs.mkdirSync(outputFolder, { recursive: true });

  try {
    const buffer = await mdast2docx(mdast);
    fs.writeFileSync(output, buffer);

    reporter.log('save', 'success', 'Saved docx to', output);
  } catch (e) {
    reporter.log('save', 'error', e.message);
  }
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
  await saveDocx(mdast, output, reporter);
}
