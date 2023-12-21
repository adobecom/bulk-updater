import { select } from 'unist-util-select';
import { selectAllBlocks, extractLink } from '../../utils/mdast-utils.js';
import {
  STATUS_SUCCESS,
  STATUS_WARNING,
  STATUS_ERROR,
} from '../../utils/migration-utils.js';

const EMBED_URLS = [
  'https://video.tv.adobe.com',
  'https://gist.github.com',
  'https://www.instagram.com',
  'https://www.slideshare.net',
  'https://www.tiktok.com',
  'https://twitter.com',
  'https://vimeo.com',
  'https://player.vimeo.com',
  'https://www.youtube.com',
  'https://youtu.be',
];

/**
 * Convert all embeds to links or iframes by renaming or removing the embed table
 * and replacing it with a link
 *
 * @param {object} mdast - markdown tree
 * @returns {Promise<Array>} - report [{ status, message}]
 */

/* eslint-disable-next-line import/prefer-default-export */
export async function convertEmbed(mdast) {
  const embedBlocks = selectAllBlocks(mdast, 'Embed');

  return embedBlocks.map((embedBlock, index) => {
    const link = extractLink(embedBlock);

    if (!link) {
      return {
        status: STATUS_WARNING,
        message: `No link found in embed block ${index}`,
      };
    }

    const linkURL = link.url || link.value;
    let hostname;

    try {
      hostname = new URL(linkURL).hostname;
    } catch (error) {
      return {
        status: STATUS_ERROR,
        message: `Invalid URL in embed block ${linkURL}`,
      };
    }

    if (EMBED_URLS.includes(`https://${hostname}`)) {
      embedBlock.type = 'paragraph';
      embedBlock.children = [link];
      return {
        status: STATUS_SUCCESS,
        message: `Embed ${linkURL} converted to link`,
      };
    }

    const textNode = select('text', embedBlock);
    textNode.value = 'Iframe';
    return {
      status: STATUS_SUCCESS,
      message: `Embed ${linkURL} converted to iframe`,
    };
  });
}
