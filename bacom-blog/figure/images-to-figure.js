import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select'

/**
 * Convert all images to figures by change table name from "Images" to "Figure"
 *
 * @param {object} mdast - mdast tree
 * @returns {object} mdast tree
 */
export async function imageToFigure(mdast) {
  selectAllBlocks(mdast, 'Images').forEach((imageBlock) => {
    select('text', imageBlock).value = 'Figure';
  });

  return mdast;
}

