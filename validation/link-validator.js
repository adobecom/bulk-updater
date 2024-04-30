import fs from 'fs';
import { selectAll } from 'unist-util-select';
import { BulkUpdate, ExcelReporter, loadListData, saveDocument } from '../bulk-update/index.js';
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

export function deepCompare(sourceList, updateList) {
  const linkLog = [];

  sourceList.forEach((link, index) => {
    const updateLink = updateList[index];
    const currentCompareLog = {
      hostMatch: '',
      hashMatch: '',
      pathMatch: '',
      searchMatch: '',
      textMatch: '',
      partialUrlMatch: '',
    };

    let sourceUrl;
    let updateUrl;
    try {
      sourceUrl = new URL(link.url);
    } catch (e) {
      sourceUrl = false;
      linkLog.push({ error: 'Invalid URL', index, link: link.url });
    }
    try {
      updateUrl = new URL(updateLink.url);
    } catch (e) {
      updateUrl = false;
      linkLog.push({ error: 'Invalid URL', index, link: updateLink.url });
    }

    // Partial matches are not fully qualified urls
    if (!sourceUrl || !updateUrl) {
      currentCompareLog.partialUrlMatch = link.url === updateLink.url;
      currentCompareLog.textMatch = link?.children[0]?.value === updateLink?.children[0]?.value;

      linkLog.push({ links: [link, updateList[index], currentCompareLog] });
    }

    currentCompareLog.hashMatch = sourceUrl ? sourceUrl.hash === updateUrl.hash : '';
    currentCompareLog.hostMatch = sourceUrl ? sourceUrl.host === updateUrl.host : '';
    currentCompareLog.pathMatch = sourceUrl ? sourceUrl.pathname === updateUrl.pathname : '';
    currentCompareLog.searchMatch = sourceUrl ? sourceUrl.search === updateUrl.search : '';
    currentCompareLog.textMatch = link.children[0].value === updateLink?.children[0]?.value;
    linkLog.push({
      sourceLink: link.url,
      sourceText: link.children[0].value,
      updateLink: updateList[index].url,
      updateText: updateList[index]?.children[0]?.value,
      ...currentCompareLog,
    });
  });

  return ['Deep Compare Lists', 'log', LINKS_DO_NOT_MATCH, { log: linkLog }];
}

export function compareLinkLists(sourceList, updatedList) {
  if (sourceList.length !== updatedList.length) {
    return ['Compare Lists', 'list length', LENGTHS_DO_NOT_MATCH];
  }

  const linksMatch = !sourceList.map((link, i) => {
    const updated = updatedList[i];
    return link.url === updated.url
    && link?.children[0]?.value === updated?.children[0]?.value;
  }).includes(false);

  if (!linksMatch) {
    return deepCompare(sourceList, updatedList);
  }

  return ['Compare Lists', 'links match', LINKS_MATCH];
}

export async function validateMigratedPageLinks(list, reporter) {
  console.log('yes');
  const listData = await loadListData(list);

  for (const path of listData) {
    const pathToSourceMd = `blog-test/md/source${path}.md`;
    const pathToUpdateMd = `blog-test/md/updated${path}.md`;
    let sourceMd;
    let updatedMd;
    try {
      sourceMd = fs.readFileSync(pathToSourceMd, 'utf-8');
    } catch (e) {
      continue;
    }
    try {
      updatedMd = fs.readFileSync(pathToUpdateMd, 'utf-8');
    } catch (e) {
      continue;
    }
    const sourceMdast = await getMdast(sourceMd);
    const updatedMdast = await getMdast(updatedMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, updatedMdast);
    const message = compareLinkLists(sourceLinks, updatedLinks);
    console.log(message);
    reporter.log(message[0], message[1], message[2], message[3] || '');
  }
}

const pathToListShort = './blog-test/output/list.json';
const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const myReporter = new ExcelReporter(`${pathname}validation-${dateString}.xlsx`, false);

(async () => {
  await validateMigratedPageLinks(pathToListShort, myReporter);
  myReporter.saveReport();
})();
