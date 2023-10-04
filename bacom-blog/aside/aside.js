import { readFile } from 'fs/promises';
import { getMdast, moveNodeParent } from '../../utils/mdast-utils.js';
import { select, selectAll } from 'unist-util-select';

/**
 * Converts banner page to aside
 *
 * @param {object} mdast 
 * @returns {Array}
 */
export async function bannerToAside(mdast) {
    const asideMdPath = new URL('./aside.md', import.meta.url);
    const asideMd = await readFile(asideMdPath, 'utf8');
    const asideMdast = await getMdast(asideMd);
    const tableRows = selectAll('gtRow', asideMdast);
    const tableRow = tableRows[2];
    const tableCells = selectAll('gtCell', tableRow);
    const imageCell = tableCells[0];
    const contentCell = tableCells[1];

    moveNodeParent(mdast, 'image', 'paragraph', imageCell);
    const image = select('image', imageCell);
    if (!image) {
        tableRow.children = [contentCell];
    }

    contentCell.children = mdast.children;
    mdast.children = asideMdast.children;
    return image ? 'Banner converted to aside' : 'Banner converted to aside without image';
}
