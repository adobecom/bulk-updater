import { readFile } from 'fs/promises';
import { getMdast, moveNodeParent } from '../../utils/mdast-utils.js';
import { select, selectAll } from 'unist-util-select';

export async function convertTagHeader(mdast) {
    const marqueeMdPath = new URL('./marquee.md', import.meta.url);
    const marqueeMd = await readFile(marqueeMdPath, 'utf8');
    const marqueeMdast = await getMdast(marqueeMd);


    const tableRows = selectAll('gtRow', marqueeMdast);
    const tableRow = tableRows[2];
    const tableCells = selectAll('gtCell', tableRow);

    const image = select('paragraph', mdast);
    const heading = select('heading', mdast);
    tableCells[0].children[0] = heading;
    tableCells[1].children[0] = image;
    mdast.children.splice(mdast.children.indexOf(image), 1)
    mdast.children.splice(mdast.children.indexOf(heading), 1)
    
    mdast.children.unshift(select('gridTable', marqueeMdast));

    // console.log(JSON.stringify(marqueeMdast), "\n\n\n", JSON.stringify(tableCells))

    console.log('-------\n\n\n',JSON.stringify(mdast));
    // const imageCell = tableCells[0];
    // const contentCell = tableCells[1];

    // moveNodeParent(mdast, 'image', 'paragraph', imageCell);
    // const image = select('image', imageCell);
    // if (!image) {
    //     tableRow.children = [contentCell];
    // }

    // contentCell.children = mdast.children;
    // mdast.children = asideMdast.children;

    console.log('converting tag header');
    return;
}