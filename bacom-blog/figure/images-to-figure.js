import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select'

/**
 * Convert all images to figures by change table name from "Images" to "Figure"
 *
 * @param {object} mdast - markdown tree
 * @returns {Array}
 */
export async function imageToFigure(mdast) {
  let imageCount = 0;

  return selectAllBlocks(mdast, 'Images').map((imageBlock) => {
    select('text', imageBlock).value = 'Figure';
    imageCount++;
    return `Image ${imageCount} converted to figure`;
  });
}

