import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { extractLink } from '../../utils/mdast-utils.js';

export const BANNERS_PATH = '/banners';
export const FRAGMENTS_PATH = '/fragments';

const SITE = 'https://main--bacom-blog--adobecom.hlx.page';

/**
 * Convert banner block to fragment link
 * 
 * @param {object} mdast
 * @returns {Array}
 */
export default function convertBanner(mdast) {
    return selectAllBlocks(mdast, 'Banner').map((block) => {
        const link = extractLink(block);
        if (!link) {
            return 'No link found in banner block';
        }
        const { pathname, search, hash } = new URL(link.url, SITE);

        if (pathname.includes(BANNERS_PATH)) {
            const fragmentUrl = `${SITE}${pathname.replace(BANNERS_PATH, FRAGMENTS_PATH)}${search}${hash}`;
            link.url = fragmentUrl;
            link.children[0].value = fragmentUrl;
            block.type = 'paragraph';
            block.children = [link];
        } else {
            return `Link: ${pathname} does not contain "${BANNERS_PATH}"`;
        }

        return `Banner converted to fragment link`;
    });
}
