import fs from 'fs';
import { fetch } from '@adobe/fetch';
import { docx2md } from '@adobe/helix-docx2md';

export function comparison(url1, url2) {
  return (url1.host === url2.host) && (url1.pathname === url2.pathname);
}

/**
 * Compares two links and checks if they have the same host and pathname.
 *
 * @param {string} link1 - The first link to compare.
 * @param {string} link2 - The second link to compare.
 * @param {Function} [comparisonFn=comparison] - The function used to compare the links.
 * @returns {boolean} - Returns true if the links have the same host and pathname, otherwise false.
 */
export function compareLink(link1, link2, comparisonFn = comparison) {
  if (!link1 || !link2) return false;

  const url1 = new URL(link1.trim(), 'https://business.adobe.com/');
  const url2 = new URL(link2.trim(), 'https://business.adobe.com/');

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
 * Extracts links from a source based on its file type.
 *
 * @param {string} source - The source URL or file path.
 * @param {string} content - The content of the source.
 * @returns {string[]} - An array of links extracted from the source.
 * @throws {Error} - Throws an error if the file type is unsupported.
 */
export async function extractLinks(source, fetchFn = fetch) {
  const fileType = getFileType(source);
  try {
    const content = await getContent(source, fetchFn);
    switch (fileType) {
      case 'md':
        return extractLinksFromMarkdown(content);
      case 'docx': {
        const md = await docx2md(content, { listener: null });
        return extractLinksFromMarkdown(md);
      }
      case 'html':
        return extractLinksFromHtml(content);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (e) {
    console.error('Error occurred while extracting links:', e.message);
    throw e;
  }
}

/**
 * Compares two arrays of links and returns an object indicating if they match and the unique links.
 *
 * @param {Array} links1 - The first array of links.
 * @param {Array} links2 - The second array of links.
 * @returns {Promise<object>} - Match status and unique links.
 */
export async function compareLinks(links1, links2, comparisonFn = comparison) {
  const result = { match: false, unique: [] };

  result.links = links1.map((link1, index) => {
    const link2 = links2[index];
    return { index, link1, link2, match: compareLink(link1, link2, comparisonFn) };
  });

  result.unique = result.links.filter((link) => !link.match);
  result.match = result.unique.length === 0;

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
