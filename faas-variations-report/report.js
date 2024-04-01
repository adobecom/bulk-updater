import fs from 'fs';
import { select, selectAll } from 'unist-util-select';
import { visitParents } from 'unist-util-visit-parents';
import { createHash } from 'crypto';
import { BulkUpdate, ExcelReporter, loadListData } from '../bulk-update/index.js';
import { loadDocument } from '../bulk-update/document-manager/document-manager.js';

const reportVariations = {};
const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const config = {
  list: [
    `${pathname}query-indexes-row.json`,
  ],
  siteUrl: 'https://main--bacom--adobecom.hlx.live',
  reporter: new ExcelReporter(`${pathname}reports/faas-report-${dateString}.xlsx`, false),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  fetchWaitMs: 20,
};

/**
 * Retrieves the block information from a string and normalizes it.
 * For example, the input `Block(option1, Option2)` returns
 * `{ block: 'block', options: ['option1', 'option2'], variant: 'block (option1, option2)' }`
 * And `block` returns `{ block: 'block', options: [], variant: 'block' }`
 *
 * @param {string} str - The input block string.
 * @returns {Object} - An object containing the block name and options.
 */
export const getBlockInfo = (str) => {
  const blockInfo = {};
  const regex = /(\w+)\s*(?:\(([^)]*)\))?/;
  const match = regex.exec(str.toLowerCase());
  const [, blockName, optionsRaw] = match.map((t) => (t ? t.trim() : undefined));

  blockInfo.blockName = blockName;
  blockInfo.options = optionsRaw ? optionsRaw.split(',').map((option) => option.trim()) : [];
  blockInfo.variant = blockInfo.options.length > 0 ? `${blockName} (${blockInfo.options.join(', ')})` : blockName;

  return blockInfo;
};

/**
 * Maps the ancestors array and returns an array of ancestor types.
 * If the ancestor type is 'gridTable', it finds the first text node in the table
 * and extracts the block variant from it.
 *
 * @param {Array} ancestors - The array of ancestors to map.
 * @returns {Array} - The array of mapped ancestor types.
 */
const mapAncestors = (ancestors) => ancestors.map((ancestor) => {
  if (ancestor.type !== 'gridTable') {
    return ancestor.type;
  }
  // find the first text node in the table
  const cell = select('text', ancestor);
  const { variant } = getBlockInfo(cell.value);
  return `${ancestor.type} '${variant}'`;
});

/**
 * Loads fragments from the given document.
 *
 * @param {Document} document - The document containing the fragments.
 * @returns {Promise<void>} - A promise that resolves when all fragments are loaded.
 */
export async function loadFragments(document, fetchFunction = fetch) {
  const links = selectAll('link', document.mdast).filter((node) => node.url.includes('/fragments/'));
  await Promise.all(links.map(async (node) => {
    config.reporter.log('fragments', 'info', 'Found Fragment Link', { entry: document.entry, url: node.url });
    const fragmentUrl = new URL(node.url, config.siteUrl);
    console.log(`Loading fragment: ${fragmentUrl.pathname}`);
    const fragment = await loadDocument(fragmentUrl.pathname, config, fetchFunction);
    if (fragment && fragment.mdast) {
      config.reporter.log('fragments', 'success', 'Loaded Fragment', { entry: fragment.entry, url: fragment.url });
      delete node.url;
      node.type = fragment.mdast.type;
      node.children = fragment.mdast.children;
    }
  }));
}

/**
 * Returns the variant corresponding to the given index.
 * The variant is a string of capital letters,
 * starting from 0 = 'A' and going to 'Z', then 'AA' to 'ZZ', etc.
 *
 * @param {number} number - The index of the variant.
 * @returns {string} The variant.
 */
export const getLetterScheme = (number) => {
  let result = '';
  let index = number;
  if (typeof number !== 'number') return result;
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
};

/**
 * Retrieves the variant information for a given node and its ancestors.
 *
 * @param {Node} node - The node for which to retrieve the variant information.
 * @param {Array<Node>} ancestors - The ancestors of the node.
 * @returns {Object} - The variant information object.
 */
const getVariant = (node, ancestors) => {
  const variation = {};

  variation.structure = `${mapAncestors(ancestors).join(' > ')} > ${node.type}`;
  variation.hash = createHash('sha256').update(variation.structure).digest('hex');
  variation.variant = reportVariations[variation.hash]?.variant
    || getLetterScheme(Object.keys(reportVariations).length);

  return variation;
};

/**
 * Find the mdast structure variation for the faas link, "https://milo.adobe.com/tools/faas#...", and report it.
 * Loop through the parent node types to analyze the structure.
 * The structure is a list of all the parent node types from the perspective of the link.
 *
 * @param {Object} document - The document object
 */
export async function report(document) {
  const pageVariations = [];
  const { mdast, entry } = document;
  const faasTool = 'https://milo.adobe.com/tools/faas#';
  await loadFragments(document);
  const faasLinks = selectAll('link', mdast).filter((node) => node.url.startsWith(faasTool));
  if (faasLinks.length === 0) return pageVariations;

  visitParents(mdast, 'link', (node, ancestors) => {
    if (node.url.startsWith(faasTool)) {
      const variation = getVariant(node, ancestors);
      pageVariations.push(variation);

      if (!reportVariations[variation.hash]) {
        reportVariations[variation.hash] = { ...variation, count: 0, example: entry };
      }
      reportVariations[variation.hash].count += 1;
      config.reporter.log('faas', 'info', 'Found FaaS Link', { ...variation, entry, url: node.url });
    }
  });

  return pageVariations;
}

export async function init(list) {
  const entryList = await loadListData(list || config.list);
  config.list = entryList.filter((entry) => entry && (entry.includes('/resources/') || entry.includes('/fragments/')));
  fs.mkdirSync(`${pathname}reports/`, { recursive: true });
  fs.writeFileSync(`${pathname}reports/config-list.json`, JSON.stringify(config.list, null, 2));

  return config;
}

export function migration(document) {
  report(document);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [list] = args;

  await init(list);
  await BulkUpdate(config, report);

  const sortedVariations = Object.entries(reportVariations).sort((a, b) => b[1].count - a[1].count);
  sortedVariations.forEach(([hash, { count, structure, example, variant }]) => {
    const exampleURL = new URL(example, config.siteUrl).toString().replace(/\.html$/, '');
    config.reporter.log('faas-variations', 'info', 'Found Variation', { variant, count, hash, structure, example: exampleURL });
  });

  config.reporter.saveReport();
  process.exit(0);
}
