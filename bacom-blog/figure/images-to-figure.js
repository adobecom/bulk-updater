import { selectAllBlocks } from '../../utils/mdast-utils.js';
import { select } from 'unist-util-select';
import { STATUS_SUCCESS, STATUS_WARNING } from '../../utils/migration-utils.js';

/**
 * Convert all images to figures by change table name from "Images" to "Figure"
 *
 * @param {object} mdast - markdown tree
 * @returns {Array<object>} - report
 */
export async function imageToFigure(mdast) {
  const imageBlocks = selectAllBlocks(mdast, 'Images');

  if (!imageBlocks || imageBlocks.length === 0) {
    return [{ status: STATUS_WARNING, message: 'No image blocks found.' }];
  }

  return imageBlocks.map((imageBlock, index) => {
    const textNode = select('text', imageBlock);
    textNode.value = 'Figure';
    return {
      status: STATUS_SUCCESS,
      message: `Image ${index} converted to figure`,
    };
  });
}
