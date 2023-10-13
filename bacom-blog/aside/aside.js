import { readFile } from 'fs/promises';
import { select, selectAll } from 'unist-util-select';
import { getMdast, moveNodeParent } from '../../utils/mdast-utils.js';
import { STATUS_SUCCESS } from '../../utils/migration-utils.js';

export const BANNERS_PATH = '/banners';
export const FRAGMENTS_PATH = '/fragments';

/**
 * Converts banner page to aside fragment.
 *
 * @param {object} mdast 
 * @returns {Promise<object>} - report { status, message, output }
 */
export async function bannerToAside(mdast, outputDocxFile) {
    const report = {};
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

    const fragmentDocxFile = outputDocxFile.replace(BANNERS_PATH, FRAGMENTS_PATH);
    report.output = fragmentDocxFile;

    report.status = STATUS_SUCCESS;
    report.message = `Banner converted to aside ${image ? 'with' : 'without'} image`;

    return report;
}
