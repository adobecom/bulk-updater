import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select'

/**
 * Convert all images to figures by change table name from "Images" to "Figure"
 *
 * @param {object} mdast - markdown tree
 * @returns {number} number of images converted to figures
 */
export async function imageToFigure(mdast) {
  let imageCount = 0;

  selectAllBlocks(mdast, 'Images').forEach((imageBlock) => {
    select('text', imageBlock).value = 'Figure';
    imageCount++;
  });

  return imageCount;
}

