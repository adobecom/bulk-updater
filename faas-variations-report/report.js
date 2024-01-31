/* eslint-disable import/no-extraneous-dependencies */
import { select, selectAll } from 'unist-util-select';
import { visitParents } from 'unist-util-visit-parents';
import { createHash } from 'crypto';
import { BulkUpdate, ExcelReporter, loadListData } from '../bulk-update/index.js';
import { loadDocument } from '../bulk-update/document-manager/document-manager.js';

const variations = {};

const { pathname } = new URL('.', import.meta.url);
const config = {
  list: [
    `${pathname}query-indexes.json`,
  ],
  siteUrl: 'https://main--bacom--adobecom.hlx.live',
  reporter: new ExcelReporter(`${pathname}reports/${ExcelReporter.getDateString()}.xlsx`),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: -1,
  fetchWaitMs: 20,
};

/**
 * Retrieves the block information from a string and normalizes it.
 * For example the input `Block(option1, Option2)` returns
 * `{ block: 'block', options: ['option1', 'option2'] , variant: 'block (option1, option2)'}`
 * And `block` returns `{ block: 'block', options: [], variant: 'block'}`
 *
 * @param {string} str - The input block string.
 * @returns {Object} - An object containing the block name and options.
 */
export const getBlockInfo = (str) => {
  const [, blockName, optionsRaw] = str.toLowerCase().match(/(\w+)\s*(?:\((.*)\))?/).map((t) => (t ? t.trim() : undefined));
  const options = optionsRaw ? optionsRaw.split(',').map((option) => option.trim()) : [];
  const variant = options.length > 0 ? `${blockName} (${options.join(', ')})` : blockName;
  return { blockName, options, variant };
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

async function loadFragments(document) {
  const links = selectAll('link', document.mdast).filter((node) => node.url.includes('/fragments/'));
  await Promise.all(links.map(async (node) => {
    config.reporter.log('fragments', 'info', 'Found Fragment Link', { entry: document.entry, url: node.url });
    const fragmentUrl = new URL(node.url, config.siteUrl);
    console.log(`Loading fragment: ${fragmentUrl.pathname}`);
    const fragment = await loadDocument(fragmentUrl.pathname, config);
    if (fragment && fragment.mdast) {
      config.reporter.log('fragments', 'success', 'Loaded Fragment', { entry: fragment.entry, url: fragment.url });
      delete node.url;
      node.type = fragment.mdast.type;
      node.children = fragment.mdast.children;
    }
  }));
}

/**
 * Find the mdast structure variation for the faas link, "https://milo.adobe.com/tools/faas#...", and report it.
 * Loop through the parent node types to analyze the structure.
 * The structure is a list of all the parent node types from the perspective of the link.
 *
 * @param {Object} document - The document object
 */
export async function report(document) {
  const pageVariations = {};
  const { mdast, entry } = document;
  const faasTool = 'https://milo.adobe.com/tools/faas#';
  await loadFragments(document);
  const faasLinks = selectAll('link', mdast).filter((node) => node.url.startsWith(faasTool));
  if (faasLinks.length === 0) return pageVariations;

  visitParents(mdast, 'link', (node, ancestors) => {
    if (node.type === 'link' && node.url.startsWith(faasTool)) {
      const structure = `${mapAncestors(ancestors).join(' > ')} > ${node.type}`;
      const hash = createHash('sha1').update(structure).digest('hex').slice(0, 5);
      pageVariations[hash] = pageVariations[hash] || { count: 0, structure };
      pageVariations[hash].count += 1;
      config.reporter.log('faas', 'info', 'Found FaaS Link', { variation: hash, structure, entry, url: node.url });
    }
  });

  Object.entries(pageVariations).forEach(([hash, { count, structure }]) => {
    variations[hash] = variations[hash] || { count: 0, structure };
    variations[hash].count += count;
  });

  return pageVariations;
}

export async function init(list = null) {
  const entryList = await loadListData(list || config.list);
  config.list = entryList.filter((entry) => entry && (entry.includes('/resources/') || entry.includes('/fragments/')));

  return config;
}

export function migration(document) {
  report(document);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [list = null] = args;

  await init(list);
  await BulkUpdate(config, report);
  // log each variant in variations
  Object.entries(variations).forEach(([hash, { count, structure }]) => {
    config.reporter.log('faas-variations', 'info', 'Variation', { hash, count, structure });
  });

  process.exit(0);
}
