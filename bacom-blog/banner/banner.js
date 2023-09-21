import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select'

export const BANNERS_PATH = '/banners';
export const FRAGMENTS_PATH = '/fragments';

/**
 * Convert banner block to fragment link
 * 
 * @param {object} mdast
 */
export default function convertBanner(mdast) {
    selectAllBlocks(mdast, 'Banner').forEach((block) => {
        const link = select('link', block);
        const { pathname, search, hash } = new URL(link.url);

        if (pathname.includes(BANNERS_PATH)) {
            const fragmentUrl = `https://main--bacom-blog--adobecom.hlx.page${pathname.replace(BANNERS_PATH, FRAGMENTS_PATH)}${search}${hash}`;
            link.url = fragmentUrl;
            link.children[0].value = fragmentUrl;
            block.type = 'paragraph';
            block.children = [link];
        } else {
            console.log(`Link: ${bannerUrl} does not contain "${BANNERS_PATH}"`);
        }
    });
}
