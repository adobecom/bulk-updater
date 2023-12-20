import { readFile } from 'fs/promises';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { select, selectAll } from 'unist-util-select';
import { getMdast } from '../../utils/mdast-utils.js';
import { STATUS_SUCCESS, STATUS_WARNING } from '../../utils/migration-utils.js';

export const TAGS_PATH = '/tags';

/**
 * Convert tag header to marquee
 *
 * @param {object} mdast - markdown tree
 * @returns {object} - report
 */
export async function convertTagHeader(mdast) {
  const marqueeMdPath = new URL('./marquee.md', import.meta.url);
  const marqueeMd = await readFile(marqueeMdPath, 'utf8');
  const marqueeMdast = await getMdast(marqueeMd);
  const tableRows = selectAll('gtRow', marqueeMdast);
  const tableRow = tableRows[2];
  const tableCells = selectAll('gtCell', tableRow);

  const image = select('paragraph', mdast);
  if (!image) {
    return {
      status: STATUS_WARNING,
      message: 'No image present in tag header',
    };
  }

  const heading = select('heading', mdast);
  if (!heading) {
    return {
      status: STATUS_WARNING,
      message: 'No heading present in tag header',
    };
  }

  tableCells[0].children[0] = heading;
  tableCells[1].children[0] = image;
  mdast.children.splice(mdast.children.indexOf(image), 1);
  mdast.children.splice(mdast.children.indexOf(heading), 1);

  mdast.children.unshift(select('gridTable', marqueeMdast));
  return { status: STATUS_SUCCESS, message: 'Tag header converted to marquee' };
}
