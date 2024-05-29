import fs from 'fs';
import path from 'path';
import { select, selectAll } from 'unist-util-select';
import { ExcelReporter, loadListData } from '../bulk-update/index.js';
import { entryToPath, getMdast } from '../bulk-update/document-manager/document-manager.js';
import { observeLinks, detectAnomalies } from './deep-compare.js';

export const LINKS_MATCH = 'all links match';
export const LINKS_DO_NOT_MATCH = 'links mismatch';
export const LENGTHS_DO_NOT_MATCH = 'source and updated list do not have the same length';

const VERBOSE = false;

const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const standardReport = new ExcelReporter(`${pathname}output/validation-${dateString}.xlsx`, false);
const deepReport = new ExcelReporter(`${pathname}output/deep-compare-${dateString}.xlsx`, false);

/**
 *
 * @param {mdast} sourceMd
 * @param {mdast} updatedMd
 * @returns {Object} an object with mdast collections of links from both files
 */
export function getMarkdownLinks(sourceMdast, updatedMdast) {
  return {
    sourceLinks: selectAll('link', sourceMdast),
    updatedLinks: selectAll('link', updatedMdast),
  };
}

/**
 * Get an array of objects containing information about the old and new links.
 *
 * @param {Array} sourceLinks - The array of source links.
 * @param {Array} updatedLinks - The array of updated links.
 * @returns {Array} - An array of objects containing information about the old and new links.
 */
export function getLinkLists(sourceLinks, updatedLinks) {
  const maxLength = Math.max(sourceLinks.length, updatedLinks.length);

  return Array.from({ length: maxLength }, (_, i) => {
    const oldLink = sourceLinks[i];
    const newLink = updatedLinks[i];
    const oldText = select('text', oldLink)?.value;
    const newText = select('text', newLink)?.value;
    const oldUrl = oldLink?.url;
    const newUrl = newLink?.url;

    return {
      oldLink, oldText, oldUrl, newLink, newText, newUrl,
    };
  });
}

async function readAndProcessMarkdownFile(pathToMd) {
  let md;
  try {
    md = fs.readFileSync(pathToMd, 'utf-8');
  } catch (e) {
    console.log(`File does not exist at provided path: ${pathToMd}`);
    standardReport?.log('Errors', 'File does not exist', 'File does not exist at provided path:', pathToMd);
    return '';
  }

  const mdast = await getMdast(md);

  return mdast;
}

export function exactMatch(linkLists) {
  const linkMatch = linkLists.every((link) => {
    const { oldUrl, newUrl } = link;
    return oldUrl === newUrl;
  });

  return linkMatch;
}

function reportLinks(linkLists, comparison, entry) {
  const oldTexts = linkLists.map((link) => link.oldText);
  const newTexts = linkLists.map((link) => link.newText);
  const oldUrls = linkLists.map((link) => link.oldUrl);
  const newUrls = linkLists.map((link) => link.newUrl);

  deepReport?.log('All Links', `${comparison[0]} Text`, entry, { length: oldTexts.length }, oldTexts);
  deepReport?.log('All Links', `${comparison[1]} Text`, entry, { length: newTexts.length }, newTexts);
  deepReport?.log('All Links', `${comparison[0]} Links`, entry, { length: oldUrls.length }, oldUrls);
  deepReport?.log('All Links', `${comparison[1]} Links`, entry, { length: newUrls.length }, newUrls);
}

export function deepCompare(linkLists, comparison, entry) {
  const allObservations = [];

  linkLists.forEach((links) => {
    const { oldUrl, newUrl, oldText, newText } = links;

    if ((oldUrl !== newUrl) || (oldText !== newText)) {
      const observations = observeLinks(oldUrl, newUrl, oldText, newText);
      allObservations.push(observations);
      const urls = { [comparison[0]]: oldUrl, [comparison[1]]: newUrl };
      const texts = { [comparison[0]]: oldText, [comparison[1]]: newText };
      deepReport?.log('URL Observations', 'Observations', entry, urls, observations.url);
      deepReport?.log('Text Observations', 'Observations', entry, texts, observations.text);
    }
  });

  return allObservations;
}

export function reportAnomalies(observations, comparison, entry) {
  const anomalies = detectAnomalies(observations);

  if (anomalies.length === 0) {
    for (let i = 0; i < observations.length; i += 1) {
      const observation = observations[i];
      const urls = { [comparison[0]]: observation.oldUrl, [comparison[1]]: observation.newUrl };
      const texts = { [comparison[0]]: observation.oldText, [comparison[1]]: observation.newText };
      deepReport?.log('Unknown Anomalies', 'Text', `Anomaly #${i}`, { entry }, texts, observation.text);
      deepReport?.log('Unknown Anomalies', 'URL', `Anomaly #${i}`, { entry }, urls, observation.url);
    }

    standardReport?.log('Anomalies', 'Unknown', entry, `Observations: ${observations.length}; see deep comparison report for details.`);

    return anomalies;
  }

  for (const anomaly of anomalies) {
    deepReport?.log('Anomalies', 'Anomaly', entry, anomaly);
  }

  const summary = [...new Set(anomalies)].map((value) => {
    const count = anomalies.filter((a) => a === value).length;
    return `${value} (${count})`;
  });

  console.log(`Anomalies: ${summary.join(', ')}`);
  standardReport?.log('Anomalies', 'Anomalies', entry, summary);

  return anomalies;
}

export function comparePageLinks(sourceLinks, updatedLinks, comparison, entry) {
  if (VERBOSE) console.log(`Comparing links at this path: ${entry}`);
  const lengthsMatch = sourceLinks.length === updatedLinks.length;
  const linkLists = getLinkLists(sourceLinks, updatedLinks);
  const linksMatch = exactMatch(linkLists);

  if (lengthsMatch && linksMatch) {
    standardReport?.log('Compare Links', LINKS_MATCH, entry);

    return { comparisons: 0, anomalies: 0 };
  }

  console.log(`Exact match failed, performing deep comparison: ${entry}`);
  standardReport?.log('Compare Links', LINKS_DO_NOT_MATCH, entry);

  // output all the links on the pages
  reportLinks(linkLists, comparison, entry);

  // make comparisons and observations on the text and urls
  const observations = deepCompare(linkLists, comparison, entry);
  const deepCompared = observations.length;
  console.log(`Deep comparing ${observations.length}/${linkLists.length} links`);

  // detect the types of anomalies on the pages
  const anomalies = reportAnomalies(observations, comparison, entry);
  console.log(`Identified ${anomalies.length} anomalies`);

  deepReport?.log('Pages', 'Page', entry, {
    'Counts Match': lengthsMatch,
    'Link Count': linkLists.length,
    'Deep Compared': deepCompared,
    'Anomaly Count': anomalies.length,
  });

  return { comparisons: observations.length, anomalies: anomalies.length };
}

/**
 * Compares two markdown files and checks for differences in the links.
 *
 * @param {string} mdPath - The path to the directory containing the markdown files.
 * @param {Array<string>} comparison - An array containing the versions to compare.
 * @param {string} entry - The entry to compare.
 * @returns {Promise<boolean>} - Whether the links are the same or not.
 */
export async function comparePage(mdPath, comparison, entry) {
  const entryPath = entryToPath(entry);
  const oldMdPath = path.join(mdPath, comparison[0], `${entryPath}.md`);
  const newMdPath = path.join(mdPath, comparison[1], `${entryPath}.md`);
  const oldMdast = await readAndProcessMarkdownFile(oldMdPath);
  const newMdast = await readAndProcessMarkdownFile(newMdPath);
  if (!oldMdast || !newMdast) {
    console.log('Error reading markdown files');
    return false;
  }

  const { sourceLinks, updatedLinks } = await getMarkdownLinks(oldMdast, newMdast);

  return comparePageLinks(sourceLinks, updatedLinks, comparison, entry);
}

export async function comparePages(pageList, mdPath, comparison) {
  const results = { pages: 0, pageAnomalies: 0, comparisons: 0, anomalies: 0 };

  for (const entry of pageList) {
    const result = await comparePage(mdPath, comparison, entry);
    if (result) {
      results.pages += 1;
      results.pageAnomalies += result.anomalies ? 1 : 0;
      results.comparisons += result.comparisons;
      results.anomalies += result.anomalies;
    }
  }

  return results;
}

/**
 * Set up reporter and save
 *
 * @param {list of paths} listPath
 * @param {path to md files} mdPath
 * @param {comparison} compare1 - source
 * @param {comparison} compare2 - updated
 */
export async function main(listPath, mdPath, compare1, compare2) {
  const comparison = [compare1, compare2];

  const listData = await loadListData(listPath);
  console.log(`Comparing ${listData.length} pages`);
  const results = await comparePages(listData, mdPath, comparison);

  console.log('-'.repeat(50));
  console.log(`Compared ${results.pages}/${listData.length} pages`);
  console.log(`Pages with Anomalies: ${results.pageAnomalies}`);
  console.log(`Deep Compared ${results.comparisons} links`);
  console.log(`Identified Anomalies: ${results.anomalies}`);
  console.log('-'.repeat(50));

  console.log('See reports for more details');

  await standardReport.generateTotals();
  await standardReport.saveReport();
  await deepReport.generateTotals();
  await deepReport.saveReport();
}

/**
 * Run the link comparison
 * node validation/link-validator.js './blog-test/output/list.json' \
 *   './blog-test/md' 'source' 'uploaded'
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  // defaults for debugging
  const DEFAULTS = ['blog-test/output/list.json', 'blog-test/md', 'source', 'uploaded'];
  const [list, mdPath, compare1, compare2] = args.length ? args : DEFAULTS;

  await main(list, mdPath, compare1, compare2);
  process.exit(0);
}
