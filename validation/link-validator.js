/* eslint-disable no-continue */
import fs from 'fs';
import { selectAll } from 'unist-util-select';
import { ExcelReporter, loadListData } from '../bulk-update/index.js';
import { getMdast } from '../bulk-update/document-manager/document-manager.js';

export const LINKS_MATCH = 'all links match';
export const LINKS_DO_NOT_MATCH = 'links mismatch mapping';
export const LENGTHS_DO_NOT_MATCH = 'source and updated list do not have the same length';

/**
 *
 * @param {mdast} sourceMd
 * @param {mdast} updatedMd
 * @returns {Object} an object with mdast collections of links from both files
 */
export async function getLinksLists(sourceMdast, updatedMdast) {
  return {
    sourceLinks: selectAll('link', sourceMdast),
    updatedLinks: selectAll('link', updatedMdast),
  };
}

/**
 * Checks the source and update link lists and compares to find the differences
 *
 * @param {list of mdast link nodes} sourceLinks
 * @param {list of mdast link nodes} updateLinks
 * @param {path to the file} entry
 * @returns Log messages for the reporter based on findings
 */
export function deepCompare(sourceLinks, updateLinks, path) {
  console.log(`Deep comparing links on source and updated files at this path: ${path}`);
  const linkLog = {};

  sourceLinks.forEach((link, index) => {
    const updateLink = updateLinks[index];

    let sourceUrl;
    let updateUrl;
    try {
      sourceUrl = new URL(link.url);
    } catch (e) {
      sourceUrl = false;
      linkLog[`relative-source-link-${index}`] = link.url;
      linkLog[`relative-source-text-${index}`] = link?.children[0].value;
    }
    try {
      updateUrl = new URL(updateLink.url);
    } catch (e) {
      updateUrl = false;
      linkLog[`relative-update-link-${index}`] = link.url;
      linkLog[`relative-update-text-${index}`] = link?.children[0].value;
    }

    // Partial matches are not fully qualified urls
    if (!sourceUrl || !updateUrl) {
      linkLog[`partialUrlMatch-${index}`] = link.url === updateLink.url;
    }

    linkLog[`sourceLink-${index}`] = link.url;
    linkLog[`updatedLink-${index}`] = link.children[0].value;
    linkLog[`sourceText-${index}`] = updateLinks[index].url;
    linkLog[`updatedText-${index}`] = updateLinks[index]?.children[0]?.value;
    linkLog[`linksMatch-${index}`] = link.url === updateLink.url;
    linkLog[`hashMatch-${index}`] = sourceUrl ? sourceUrl.hash === updateUrl.hash : '';
    linkLog[`hostMatch-${index}`] = sourceUrl ? sourceUrl.host === updateUrl.host : '';
    linkLog[`pathMatch-${index}`] = sourceUrl ? sourceUrl.pathname === updateUrl.pathname : '';
    linkLog[`searchMatch-${index}`] = sourceUrl ? sourceUrl.search === updateUrl.search : '';
    linkLog[`textMatch-${index}`] = link?.children[0]?.value === updateLink?.children[0]?.value;
  });

  return ['Deep Compare Links', LINKS_DO_NOT_MATCH, path, { log: linkLog }];
}

/**
 * Does an initial check for link matching, if it finds issue, it runs the deepCompare function
 *
 * @param {list of source links} sourceLinks
 * @param {list of updated links} updatedLinks
 * @param {path to files} path
 * @returns Returns a message for reporter
 */
export function compareLinkLists(sourceLinks, updatedLinks, path) {
  console.log(`Comparing source and update files at this path: ${path}`);
  // If not the same length, something is wrong from the start
  if (sourceLinks.length !== updatedLinks.length) {
    return ['Compare Links', 'list length', LENGTHS_DO_NOT_MATCH];
  }

  const linksMatch = !sourceLinks.map((link, i) => {
    const updated = updatedLinks[i];
    return link.url === updated.url
    && link?.children[0]?.value === updated?.children[0]?.value;
  }).includes(false);

  if (!linksMatch) {
    return deepCompare(sourceLinks, updatedLinks, path);
  }

  return ['Compare Links', LINKS_MATCH, path];
}

/**
 * Runs the primary migration and returns a message for reporter.
 * Additional logic for code failing conditions
 *
 * @param {list of paths} list
 * @param {path to md files} mdPath
 * @param {ExcelReporter} reporter
 */
export async function validateMigratedPageLinks(list, mdPath, reporter) {
  const listData = await loadListData(list);
  const source = '/source';
  const updated = '/updated';

  for (const path of listData) {
    const pathToSourceMd = path.endsWith('/') ? `${mdPath}${source}${path}index.md` : `${mdPath}${source}${path}.md`;
    const pathToUpdateMd = path.endsWith('/') ? `${mdPath}${updated}${path}index.md` : `${mdPath}${updated}${path}.md`;

    let sourceMd;
    let updatedMd;
    try {
      sourceMd = fs.readFileSync(pathToSourceMd, 'utf-8');
    } catch (e) {
      console.log(`File does not exist at provided path: ${pathToSourceMd}`);
      reporter.log('Error', 'File does not exist at provided path:', pathToSourceMd);
      continue;
    }
    try {
      updatedMd = fs.readFileSync(pathToUpdateMd, 'utf-8');
    } catch (e) {
      console.log(`File does not exist at provided path: ${pathToUpdateMd}`);
      reporter.log('Error', 'File does not exist at provided path', pathToUpdateMd);
      continue;
    }

    const sourceMdast = await getMdast(sourceMd);
    const updatedMdast = await getMdast(updatedMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, updatedMdast);
    const message = compareLinkLists(sourceLinks, updatedLinks, path);

    reporter.log(message[0], message[1], message[2], message[3]?.log);
  }
}

/**
 * Set up reporter and save
 *
 * @param {list of paths} listPath
 * @param {path to md files} mdPath
 */
export async function main(listPath, mdPath) {
  const { pathname } = new URL('.', import.meta.url);
  const dateString = ExcelReporter.getDateString();
  const myReporter = new ExcelReporter(`${pathname}output/validation-${dateString}.xlsx`, false);

  await validateMigratedPageLinks(listPath, mdPath, myReporter);
  myReporter.generateTotals();
  myReporter.saveReport();
}

export async function init(list, mdPath) {
  await main(list, mdPath);
}

// test values ./blog-test/output/list.json', './blog-test/md'
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [list, mdPath] = args;

  await init(list, mdPath);
  process.exit(0);
}
