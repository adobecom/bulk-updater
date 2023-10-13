import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { extractLink } from '../../utils/mdast-utils.js';
import { STATUS_SUCCESS, STATUS_WARNING, STATUS_ERROR } from '../../utils/migration-utils.js';

export const BANNERS_PATH = '/banners';
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

        let parsedUrl;
        try {
            parsedUrl = new URL(link.url, SITE);
        } catch (error) {
            return { status: STATUS_ERROR, message: `Invalid URL - ${link.url}` };
        }
        const { pathname, search, hash } = parsedUrl;

        if (pathname.includes(BANNERS_PATH)) {
            const fragmentUrl = `${SITE}${pathname.replace(BANNERS_PATH, FRAGMENTS_PATH)}${search}${hash}`;
            link.url = fragmentUrl;
            link.children[0].value = fragmentUrl;
            block.type = 'paragraph';
            block.children = [link];
        } else {
            return { status: STATUS_ERROR, message: `${pathname} does not contain "${BANNERS_PATH}"` };
        }

        if (block.type === 'paragraph' && block.children[0] === link) {
            return { status: STATUS_SUCCESS, message: 'Banner converted to fragment link' };
        } else {
            return { status: STATUS_WARNING, message: 'Block migration might not have been successful' };
        }
    });
}
