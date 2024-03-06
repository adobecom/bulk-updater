/* eslint-disable import/prefer-default-export */
/**
 * Checks the alt text of images in a markdown string.
 *
 * @param {string} markdown - The markdown string to check.
 * @returns {string[]} - An array of URLs of images with missing alt text.
 */
export function checkAltText(markdown) {
  const regex = /!\[(.*?)\]\((.*?)\)/g;
  const matches = markdown.match(regex);
  const missingAltTextUrls = [];

  if (!matches) return missingAltTextUrls;

  for (const match of matches) {
    const [, altText, url] = match.match(/\[(.*?)\]\((.*?)\)/);
    if (!altText && url.startsWith('http')) {
      missingAltTextUrls.push(url);
    }
  }

  return missingAltTextUrls;
}
