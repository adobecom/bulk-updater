/**
 * Compares two links and checks if they have the same host and pathname.
 *
 * @param {string} link1 - The first link to compare.
 * @param {string} link2 - The second link to compare.
 * @returns {boolean} - Returns true if the links have the same host and pathname, otherwise false.
 */
export function compareLink(link1, link2, site) {
  const url1 = new URL(link1.trim(), site);
  const url2 = new URL(link2.trim(), site);

  return (url1.host === url2.host) && (url1.pathname === url2.pathname);
}
/**
 * Extracts links from markdown content.
 *
 * @param {string} content - The markdown content.
 * @returns {string[]} - An array of links extracted from the content.
 */
export function extractLinks(content) {
  const regex = /\[.*?\]\((.*?)\)/g;
  const links = [];
  let match = regex.exec(content);
  while (match !== null) {
    const link = match[1];
    if (link.startsWith('http')) {
      links.push(link);
    }
    match = regex.exec(content);
  }
  return links;
}

/**
 * Compares two arrays of links and returns an object indicating if they match and the unique links.
 *
 * @param {Array} links1 - The first array of links.
 * @param {Array} links2 - The second array of links.
 * @returns {Promise<object>} - Match status and unique links.
 */
export function compareLinks(links1, links2) {
  const result = { match: false, unique: [] };

  result.links = links1.map((link1, index) => {
    const link2 = links2[index];
    const match = (link1 && link2) ? compareLink(link1, link2) : false;

    return { link: index, link1, link2, match };
  });

  result.unique = result.links.filter((link) => !link.match);
  result.match = result.unique.length === 0;

  return result;
}

export function compareMarkdown(content1, content2, site = 'https://business.adobe.com/') {
  const links1 = extractLinks(content1);
  const links2 = extractLinks(content2);

  return compareLinks(links1, links2, site);
}
