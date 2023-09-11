import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select'

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
  'https://youtu.be'
];

/**
 * Convert all embeds to links or iframes by renaming or removing the embed table and replacing it with a link
 * 
 * @param {object} mdast - markdown tree
 * @returns {number} number of embeds converted to links
 */
export async function convertEmbed(mdast) {
  let embedCount = 0;

  selectAllBlocks(mdast, 'Embed').forEach((embedBlock) => {
    const link = select('link', embedBlock);
    const { hostname } = new URL(link.url);

    if (EMBED_URLS.includes(`https://${hostname}`)) {
      embedBlock.type = 'paragraph';
      embedBlock.children = [link];
      embedCount++;
    } else {
      select('text', embedBlock).value = 'Iframe';
    }
  });

  return embedCount;
}
