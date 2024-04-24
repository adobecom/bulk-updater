import fs from 'fs';
import { fetch } from '@adobe/fetch';
import { docx2md } from '@adobe/helix-docx2md';

const DEFAULT_HOST = 'business.adobe.com';

export function comparison(url1, url2) {
  return (url1.host === url2.host) && (url1.pathname === url2.pathname);
}

/**
 * Compares two links and checks if they have the same host and pathname.
 *
 * @param {URL} url1 - The first link to compare.
 * @param {URL} url2 - The second link to compare.
 * @param {Function} [comparisonFn=comparison] - The function used to compare the links.
 * @returns {boolean} - Returns true if the links have the same host and pathname, otherwise false.
 */
export function compareLink(url1, url2, comparisonFn = comparison) {
  if (!url1 || !url2) return false;

  return comparisonFn(url1, url2);
}

/**
 * Retrieves the content from a source.
 *
 * @param {string} source - The source URL or file path.
 * @param {Function} fetchFn - The function used to fetch the content from the source.
 * @returns {Promise<string>} - A promise that resolves to the content of the source.
 */
async function getContent(source, fetchFn) {
  if (source.startsWith('http')) {
    const response = await fetchFn(source);
    return response.text();
  }
  if (source.endsWith('.docx')) {
    return fs.promises.readFile(source);
  }

  return fs.promises.readFile(source, 'utf-8');
}

/**
 * Determines the file type based on the source.
 *
 * @param {string} source - The source URL or file path.
 * @returns {string} - The file type.
 */
function getFileType(source) {
  if (source.startsWith('http')) {
    return source.endsWith('.md') ? 'md' : 'html';
  }

  return source.split('.').pop() || null;
}

/**
 * Extracts links from markdown content.
 *
 * @param {string} content - The markdown content.
 * @returns {string[]} - An array of links extracted from the content.
 */
function extractLinksFromMarkdown(content) {
  const regex = /\[.*?\]\((.*?)\)/g;
  const links = [];
  let match = regex.exec(content);
  while (match !== null) {
    links.push(match[1]);
    match = regex.exec(content);
  }
  return links;
}

/**
 * Extracts links from HTML content.
 *
 * @param {string} content - The HTML content.
 * @returns {string[]} - An array of links extracted from the content.
 */
function extractLinksFromHtml(content) {
  const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g;
  const links = [];
  let match = regex.exec(content);
  while (match !== null) {
    links.push(match[2]);
    match = regex.exec(content);
  }
  return links;
}

/**
 * Make sure the links are formatted correctly.
 *
 * @param {string} source - The source URL or file path.
 * @param {string} link - The link to format.
 * @returns {URL} - The formatted link.
 */
export function formatURL(source, link) {
  const url = new URL(link.trim(), `https://${DEFAULT_HOST}/`);

  if (link.startsWith('#')) {
    url.pathname = new URL(source, `https://${DEFAULT_HOST}/`).pathname;
  }

  if (url.host.includes('.hlx.live')) {
    url.host = 'business.adobe.com';
  }

  return url;
}

export function formatURLs(links, source) {
  return links.map((link) => formatURL(source, link));
}

/**
 * Extracts links from a source based on its file type.
 *
 * @param {string} source - The source URL or file path.
 * @param {string} content - The content of the source.
 * @returns {URL[]} - An array of urls extracted from the source.
 * @throws {Error} - Throws an error if the file type is unsupported.
 */
export async function extractLinks(source, fetchFn = fetch) {
  const fileType = getFileType(source);
  const links = [];
  try {
    const content = await getContent(source, fetchFn);
    switch (fileType) {
      case 'md':
        links.push(...extractLinksFromMarkdown(content));
        break;
      case 'docx': {
        const md = await docx2md(content, { listener: null });
        links.push(...extractLinksFromMarkdown(md));
        break;
      }
      case 'html':
        links.push(...extractLinksFromHtml(content));
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    return formatURLs(links, source);
  } catch (e) {
    console.error('Error occurred while extracting links:', e.message);
    throw e;
  }
}

/**
 * Finding all the URLs that are in list1 and list2 but in different order
 *
 * @param {URL[]} urls1 - The first array of urls.
 * @param {URL[]} urls2 - The second array of urls.
 * @returns {object[]} - An array of objects containing the shuffled links.
 */
function shuffledLinks(list1, list2) {
  const shuffled = [];
  for (let i = 0; i < list1.length; i += 1) {
    const url1 = list1[i];
    for (let j = 0; j < list2.length; j += 1) {
      const url2 = list2[j];
      if (i !== j && compareLink(url1, url2)) {
        shuffled.push({ index1: i, index2: j, link1: url1.href, link2: url2.href });
      }
    }
  }

  return shuffled;
}

/**
 * Compares two arrays of links and returns an object indicating if they match and the unique links.
 *
 * @param {URL[]} urls1 - The first array of urls.
 * @param {URL[]} urls2 - The second array of urls.
 * @returns {Promise<object>} - Match status and unique links.
 */
export async function compareLinks(urls1, urls2, comparisonFn = comparison) {
  const result = { match: false, broken: [], unique: [], links: [], shuffled: [] };

  const maxLength = Math.max(urls1.length, urls2.length);
  for (let i = 0; i < maxLength; i += 1) {
    const url1 = urls1[i];
    const url2 = urls2[i];

    const match = compareLink(url1, url2, comparisonFn);

    result.links.push({
      index: i,
      link1: url1?.href,
      link2: url2?.href,
      match,
    });

    if (!match) {
      result.broken.push(url1?.href || url2?.href);
    }
  }

  result.broken = result.links.filter((link) => !link.match);
  // All of the links that only appear in one list
  const links1 = result.links.map((link) => link.link1);
  const links2 = result.links.map((link) => link.link2);
  result.unique = [...new Set([...links1, ...links2])]
    .filter((link) => !links1.includes(link) || !links2.includes(link));
  // List of links that are found but in different order
  result.shuffled = shuffledLinks(urls1, urls2);

  result.match = result.broken.length === 0;

  return result;
}

/**
 * Compares the links extracted from two sources.
 *
 * @param {string} source1 - The first source URL.
 * @param {string} source2 - The second source URL.
 * @param {Function} [fetchFn=fetch] - The function used to fetch the content from the sources.
 * @param {Function} [comparisonFn=comparison] - The function used to compare the links.
 * @returns {Promise<object>}
 */
export async function compare(source1, source2, fetchFn = fetch, comparisonFn = comparison) {
  const links1 = await extractLinks(source1, fetchFn);
  const links2 = await extractLinks(source2, fetchFn);

  return compareLinks(links1, links2, comparisonFn);
}
