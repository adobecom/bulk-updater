import fs from 'fs';
import { selectAll } from 'unist-util-select';
import { ExcelReporter, loadListData } from '../bulk-update/index.js';
import { getMdast } from '../bulk-update/document-manager/document-manager.js';

export const LINKS_MATCH = 'all links match';
export const LINKS_DO_NOT_MATCH = 'links mismatch mapping';
export const LENGTHS_DO_NOT_MATCH = 'source and updated list do not have the same length';

export async function getLinksLists(sourceMd, updatedMd) {
  return {
    sourceLinks: selectAll('link', sourceMd),
    updatedLinks: selectAll('link', updatedMd),
  };
}

export function deepCompare(sourceLinks, updateLinks, entry) {
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

  return ['Deep Compare Links', LINKS_DO_NOT_MATCH, entry, { log: linkLog }];
}

export function compareLinkLists(sourceLinks, updatedLinks, path) {
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

export async function validateMigratedPageLinks(list, mdPath, reporter) {
  const listData = await loadListData(list);

  for (const path of listData) {
    const pathToSourceMd = path.endsWith('/') ? `${mdPath}/source${path}index.md` : `${mdPath}/source${path}.md`;
    const pathToUpdateMd = path.endsWith('/') ? `${mdPath}/updated${path}index.md` : `${mdPath}/updated${path}.md`;
    let sourceMd;
    let updatedMd;
    try {
      sourceMd = fs.readFileSync(pathToSourceMd, 'utf-8');
    } catch (e) {
      reporter.log('Error', 'File does not exist at provided path:', pathToSourceMd);
      continue;
    }
    try {
      updatedMd = fs.readFileSync(pathToUpdateMd, 'utf-8');
    } catch (e) {
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

export async function validateBulkUpdate(listPath, mdPath) {
  const { pathname } = new URL('.', import.meta.url);
  const dateString = ExcelReporter.getDateString();
  const myReporter = new ExcelReporter(`${pathname}validation-${dateString}.xlsx`, false);

  await validateMigratedPageLinks(listPath, mdPath, myReporter);
  myReporter.generateTotals();
  myReporter.saveReport();
}

validateBulkUpdate('./blog-test/output/list.json', 'blog-test/md');
