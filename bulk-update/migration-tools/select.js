import { select, selectAll } from 'unist-util-select';

/**
 * Retrieves the block information from a string and normalizes it.
 * For example, the input `Block(option1, Option2)` returns
 * `{ block: 'block', options: ['option1', 'option2'], variant: 'block (option1, option2)' }`
 * And `block` returns `{ block: 'block', options: [], variant: 'block' }`
 *
 * @param {string} str - The input block string.
 * @returns {Object} - An object containing the block name and options.
 */
export const getBlockInfo = (str) => {
  if (!str) return null;
  const blockInfo = {};
  const regex = /([\w\s-]+)\s*(?:\(([^)]*)\))?/;
  const match = regex.exec(str.toLowerCase());
  const [, blockName, optionsRaw] = match.map((t) => (t ? t.trim() : undefined));

  blockInfo.blockName = blockName.replace(/\s+/g, '-');
  blockInfo.options = optionsRaw ? optionsRaw.split(',').map((option) => option.trim()) : [];
  blockInfo.variant = blockInfo.options.length > 0 ? `${blockInfo.blockName} (${blockInfo.options.join(', ')})` : blockInfo.blockName;

  return blockInfo;
};

/**
 * Checks if a block matches the specified block name.
 *
 * @param {string} block - The name of the block to check.
 * @param {Object} table - The table to check against.
 * @returns {boolean} - True if the block matches, false otherwise.
 */
const isBlockMatch = (block, table) => {
  const blockInfo = getBlockInfo(select('text', table)?.value?.toLowerCase());
  const blockName = blockInfo ? blockInfo.blockName : null;
  return blockName === block.toLowerCase();
};

export const selectAllBlocks = (mdast, block) => selectAll('gridTable', mdast)
  .filter((table) => isBlockMatch(block, table));

/**
 * Finds and returns a block from the given mdast that matches the specified block name.
 *
 * @param {Object} mdast - The mdast tree to search.
 * @param {string} blockName - The name of the block to search for.
 * @returns {Object|null} - The mdast tree reference, or null if not found.
 */
export const selectBlock = (mdast, block) => selectAll('gridTable', mdast)
  .find((table) => isBlockMatch(block, table));

/**
 * Maps a block of data to a 2D array.
 *
 * @param {Object} block - The block element containing the data.
 * @returns {Array<Array<string>>} - The mapped data as a 2D array.
 */
export const mapBlock = (block) => {
  const rows = selectAll('gtRow', block).slice(1);
  const data = rows.map((row) => {
    const cells = selectAll('gtCell text', row);
    return cells.map((cell) => cell.value);
  });

  return data;
};

/**
 * Converts a block into an object.
 *
 * @param {Object} block - The block mdast to convert.
 * @returns {Object} - The converted object.
 */
export const blockToObject = (block) => {
  const data = mapBlock(block);

  return Object.fromEntries(data);
};
