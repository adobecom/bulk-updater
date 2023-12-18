import { selectAllBlocks, extractLink } from '../../utils/mdast-utils.js';
import {
  STATUS_SUCCESS,
  STATUS_WARNING,
  STATUS_ERROR,
} from '../../utils/migration-utils.js';

export const BANNERS_PATH = '/banners';
export const BANNERS_HOSTNAMES = [
  'business.adobe.com',
  'main--business-website--adobe.hlx.page',
];
export const FRAGMENTS_PATH = '/fragments';

const SITE = 'https://main--bacom-blog--adobecom.hlx.page';

/**
 * Convert banner block to fragment link
 *
 * @param {object} mdast - markdown tree
 * @returns {Array<object>} - report [{ status, message}]
 */
export default function convertBanner(mdast) {
  const bannerBlocks = selectAllBlocks(mdast, 'Banner');

  return bannerBlocks.map((block) => {
    const link = extractLink(block);
    if (!link) {
      return { status: STATUS_ERROR, message: 'No link found in banner block' };
    }

    const bannerLink = link.url;
    let parsedUrl;
    try {
      parsedUrl = new URL(bannerLink, SITE);
    } catch (error) {
      return {
        status: STATUS_ERROR,
        message: 'Invalid URL',
        bannerLink: link.url,
      };
    }
    const { hostname, pathname, search, hash, href } = parsedUrl;

    if (!BANNERS_HOSTNAMES.includes(hostname)) {
      return {
        status: STATUS_ERROR,
        message: `${hostname} does not contain "${BANNERS_HOSTNAMES.join(
          '" or "'
        )}"`,
        bannerLink: link.url,
      };
    } else if (!pathname.includes(BANNERS_PATH)) {
      return {
        status: STATUS_ERROR,
        message: `${pathname} does not contain "${BANNERS_PATH}"`,
        bannerLink: link.url,
      };
    }

    const fragmentUrl = `${SITE}${pathname.replace(
      BANNERS_PATH,
      FRAGMENTS_PATH
    )}${search}${hash}`;
    link.url = fragmentUrl;
    link.children[0].value = fragmentUrl;
    block.type = 'paragraph';
    block.children = [link];

    const report = {
      bannerEntry: pathname,
      bannerLink: href,
      fragmentLink: fragmentUrl,
    };
    if (block.type === 'paragraph' && block.children[0] === link) {
      return {
        status: STATUS_SUCCESS,
        message: 'Banner converted to fragment link',
        ...report,
      };
    } else {
      return {
        status: STATUS_WARNING,
        message: 'Block migration might not have been successful',
        ...report,
      };
    }
  });
}
