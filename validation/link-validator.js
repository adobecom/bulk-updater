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

    return { oldText, oldUrl, newText, newUrl };
  });
}

/**
 * Reads and processes a markdown file.
 *
 * @param {string} pathToMd - The path to the markdown file.
 * @returns {Promise<Object>} The parsed Markdown Abstract Syntax Tree (MDAST).
 */
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

/**
 * Checks if all links in the given linkLists have exact matches.
 *
 * @param {Array} linkLists - An array of link objects.
 * @returns {boolean} - Returns true if all links have exact matches, false otherwise.
 */
export function exactMatch(linkLists) {
  const linkMatch = linkLists.every((link) => {
    const { oldUrl, newUrl, oldText, newText } = link;
    return oldUrl === newUrl && oldText === newText;
  });

  return linkMatch;
}

/**
 * Reports the links for a given entry.
 *
 * @param {Array<Object>} linkLists - An array of link objects.
 * @param {Array<string>} comparison - An array of comparison strings.
 * @param {string} entry - The entry to report links for.
 */
function reportLinks(linkLists, comparison, entry) {
  const [oldVersion, newVersion] = comparison;
  const oldTexts = linkLists.map((link) => link.oldText);
  const newTexts = linkLists.map((link) => link.newText);
  const oldUrls = linkLists.map((link) => link.oldUrl);
  const newUrls = linkLists.map((link) => link.newUrl);

  deepReport?.log('All Links', `${oldVersion} Text`, entry, { length: oldTexts.length }, oldTexts);
  deepReport?.log('All Links', `${newVersion} Text`, entry, { length: newTexts.length }, newTexts);
  deepReport?.log('All Links', `${oldVersion} URL`, entry, { length: oldUrls.length }, oldUrls);
  deepReport?.log('All Links', `${newVersion} URL`, entry, { length: newUrls.length }, newUrls);
}

export function deepCompare(linkLists, comparison, entry) {
  const allObservations = [];
  const [oldVersion, newVersion] = comparison;

  linkLists.forEach((links) => {
    const { oldUrl, newUrl, oldText, newText } = links;

    if ((oldUrl !== newUrl) || (oldText !== newText)) {
      const observations = observeLinks(oldUrl, newUrl, oldText, newText);
      allObservations.push(observations);
      const urls = { [oldVersion]: oldUrl, [newVersion]: newUrl };
      const texts = { [oldVersion]: oldText, [newVersion]: newText };
      deepReport?.log('All Text Observations', 'Observations', entry, texts, observations.text);
      deepReport?.log('All URL Observations', 'Observations', entry, urls, observations.url);
    }
  });

  return allObservations;
}

/**
 * Reports anomalies based on observations, comparison, and entry.
 *
 * @param {Array} observations - The array of observations.
 * @param {Array} comparison - The array of comparison values.
 * @param {string} entry - The entry value.
 * @returns {Array} - The array of anomalies.
 */
export function reportAnomalies(observations, comparison, entry) {
  const [oldVersion, newVersion] = comparison;
  const { known, unknown, summary } = detectAnomalies(observations);
  const count = {
    observations: observations.length,
    anomalies: known.length,
    unknownAnomalies: unknown.length,
  };

  if (summary.length === 0) {
    standardReport?.log('Anomalies', 'Unknown', entry, count, 'See deep comparison report for details.');
  } else {
    standardReport?.log('Anomalies', 'Anomalies', entry, count, summary);
  }

  for (let i = 0; i < unknown.length; i += 1) {
    const observation = unknown[i];
    const { oldUrl, newUrl, oldText, newText } = observation;
    const texts = { [oldVersion]: oldText, [newVersion]: newText };
    const urls = { [oldVersion]: oldUrl, [newVersion]: newUrl };
    deepReport?.log('Unknown Anomalies', 'Text', `Page Anomaly #${i + 1}`, { entry }, texts, observation.text);
    deepReport?.log('Unknown Anomalies', 'URL', `Page Anomaly #${i + 1}`, { entry }, urls, observation.url);
  }

  for (let i = 0; i < known.length; i += 1) {
    const { anomaly, oldUrl, newUrl, oldText, newText } = known[i];
    const texts = { [`${oldVersion} Text`]: oldText, [`${newVersion} Text`]: newText };
    const urls = { [`${oldVersion} URL`]: oldUrl, [`${newVersion} URL`]: newUrl };
    deepReport?.log('Anomalies', anomaly, `Page Anomaly #${i + 1}`, { entry }, urls, texts);
  }

  console.log(`Anomalies: ${summary.join(', ')}`);

  return count;
}

/**
 * Compares the links between the sourceLinks and updatedLinks arrays.
 * Generates a report on the comparisons and anomalies found.
 *
 * @param {Array<string>} sourceLinks - The array of source links.
 * @param {Array<string>} updatedLinks - The array of updated links.
 * @param {string} comparison - The type of comparison to perform.
 * @param {string} entry - The entry path being compared.
 * @returns {Object} - report containing the number of comparisons, known and unknown anomalies.
 */
export function comparePageLinks(sourceLinks, updatedLinks, comparison, entry) {
  if (VERBOSE) console.log(`Comparing links at this path: ${entry}`);
  const lengthsMatch = sourceLinks.length === updatedLinks.length;
  const linkLists = getLinkLists(sourceLinks, updatedLinks);
  const linksMatch = exactMatch(linkLists);

  if (lengthsMatch && linksMatch) {
    standardReport?.log('Compare Links', LINKS_MATCH, entry);

    return { comparisons: 0, anomalies: 0, unknown: 0 };
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
  const count = reportAnomalies(observations, comparison, entry);
  console.log(`Identified ${count.anomalies} anomalies out of ${observations.length} observations`);

  deepReport?.log('Page Report', 'Page', entry, {
    Anomalies: count.anomalies,
    'Unknown Anomalies': count.unknownAnomalies,
    Links: linkLists.length,
    'Link Count Match': lengthsMatch,
    'Deep Compared': deepCompared,
    Observations: count.observations,
  });

  return {
    comparisons: observations.length,
    anomalies: count.anomalies,
    unknown: count.unknownAnomalies,
  };
}

/**
 * Compares two markdown files and checks for differences in the links.
 *
 * @param {string} mdPath - The path to the directory containing the markdown files.
 * @param {Array<string>} comparison - An array containing the versions to compare.
 * @param {string} entry - The entry to compare.
 * @returns {Promise<Object>} - The results of the comparison.
 */
export async function comparePage(mdPath, comparison, entry) {
  const [oldVersion, newVersion] = comparison;
  const entryPath = entryToPath(entry);
  const oldMdPath = path.join(mdPath, oldVersion, `${entryPath}.md`);
  const newMdPath = path.join(mdPath, newVersion, `${entryPath}.md`);
  const oldMdast = await readAndProcessMarkdownFile(oldMdPath);
  const newMdast = await readAndProcessMarkdownFile(newMdPath);
  if (!oldMdast || !newMdast) {
    console.log('Error reading markdown files');
    return false;
  }

  const { sourceLinks, updatedLinks } = await getMarkdownLinks(oldMdast, newMdast);

  return comparePageLinks(sourceLinks, updatedLinks, comparison, entry);
}

/**
 * Compares a list of pages with a given markdown path and comparison object.
 * @param {Array} pageList - The list of pages to compare.
 * @param {string} mdPath - The path to the markdown file.
 * @param {Object} comparison - The comparison object.
 * @returns {Promise<Object>} - The results of the comparison.
 */
export async function comparePages(pageList, mdPath, comparison) {
  const results = { pages: 0, pageAnomalies: 0, comparisons: 0, anomalies: 0, unknown: 0 };

  for (const entry of pageList) {
    const result = await comparePage(mdPath, comparison, entry);
    if (result) {
      results.pages += 1;
      results.pageAnomalies += result.anomalies ? 1 : 0;
      results.comparisons += result.comparisons;
      results.anomalies += result.anomalies;
      results.unknown += result.unknown;
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
  console.log(`Unknown Anomalies: ${results.unknown}`);
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
