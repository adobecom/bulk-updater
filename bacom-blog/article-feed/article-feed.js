import { selectAllBlocks, moveNode } from '../../utils/mdast-utils.js';
import { STATUS_SKIPPED, STATUS_SUCCESS } from '../../utils/migration-utils.js';

function getFeedRow(feedURL) {
  return {
    type: 'gtRow',
    children: [
      {
        type: 'gtCell',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                value: 'Feed',
              },
            ],
          },
        ],
      },
      {
        type: 'gtCell',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                value: feedURL,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Update AU and UK Article Feeds
 *
 * @param {object} mdast - markdown tree
 * @param {string} entry - entry path
 * @returns {object} - report
 */
export default function updateArticleFeed(mdast, entry) {
  const AU_PATH = '/au/blog/';
  const UK_PATH = '/uk/blog/';
  let feedURL;

  if (entry.includes(AU_PATH))
    feedURL =
      'https://main--bacom-blog--adobecom.hlx.page/au/us-au-query-index.json';
  if (entry.includes(UK_PATH))
    feedURL =
      'https://main--bacom-blog--adobecom.hlx.page/uk/us-uk-query-index.json';
  if (!feedURL) {
    return {
      status: STATUS_SKIPPED,
      message: 'Entry does not contain AU or UK path.',
    };
  }

  const feeds = selectAllBlocks(mdast, 'Article Feed');
  const feed = feeds[0];
  let header;
  let body;

  if (feed.children[0].type === 'gtHeader') header = feed.children[0];

  if (header) {
    body = feed.children[1];
  } else {
    body = feed.children[0];
  }

  if (header?.children?.length === 2)
    moveNode(header.children[1], header, body);
  body.children.push(getFeedRow(feedURL));

  return {
    status: STATUS_SUCCESS,
    message: 'Custom feed link added to Article Feed',
  };
}
