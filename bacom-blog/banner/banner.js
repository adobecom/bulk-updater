import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select'

export const BANNERS_PATH = '/banners';
export const FRAGMENTS_PATH = '/fragments';

/**
 * Convert banner block to fragment link
 * 
 * @param {object} mdast
 * @returns {Array}
 */
export default function convertBanner(mdast) {
    return selectAllBlocks(mdast, 'Banner').map((block) => {
        const link = select('link', block);
        if (!link) {
            return 'No link found in banner block';
        }
        const { pathname, search, hash } = new URL(link.url, 'https://main--bacom-blog--adobecom.hlx.page');

        if (pathname.includes(BANNERS_PATH)) {
            const fragmentUrl = `https://main--bacom-blog--adobecom.hlx.page${pathname.replace(BANNERS_PATH, FRAGMENTS_PATH)}${search}${hash}`;
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
