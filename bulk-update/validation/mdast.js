import { visitParents } from 'unist-util-visit-parents';
import { select } from 'unist-util-select';
import { getBlockInfo } from '../migration-tools/select.js';

/**
 * Maps the ancestors array and returns an array of ancestor types.
 * If the ancestor type is 'gridTable', it finds the first text node in the table
 * and extracts the block variant from it.
 *
 * @param {Array} ancestors - The array of ancestors to map.
 * @returns {Array} - The array of mapped ancestor types.
 */
export const mapAncestors = (ancestors) => ancestors.map((ancestor) => {
  if (ancestor.type !== 'gridTable') {
    return ancestor.type;
  }
  // find the first text node in the table
  const cell = select('text', ancestor);
  const { variant } = getBlockInfo(cell.value);

  return `${ancestor.type} '${variant}'`;
});

export default function validateMdast(mdast) {
  const invalidNodes = [];
  visitParents(mdast, 'text', (node, ancestors) => {
    if (node.value === undefined) {
      const structure = `${mapAncestors(ancestors).join(' > ')} > ${node.type}`;

      invalidNodes.push(`Invalid text node ${structure}: ${JSON.stringify(node)}`);
    }
  });

  return invalidNodes;
}
