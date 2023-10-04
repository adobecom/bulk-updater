import { readFile } from 'fs/promises';
import { getMdast } from '../../utils/mdast-utils.js';
import { select, selectAll } from 'unist-util-select';

export async function convertTagHeader(mdast) {
    const marqueeMdPath = new URL('./marquee.md', import.meta.url);
    const marqueeMd = await readFile(marqueeMdPath, 'utf8');
    const marqueeMdast = await getMdast(marqueeMd);
    const tableRows = selectAll('gtRow', marqueeMdast);
    const tableRow = tableRows[2];
    const tableCells = selectAll('gtCell', tableRow);

    const image = select('paragraph', mdast);
    if (!image) {
        return 'No image present in tag header'
    }

    const heading = select('heading', mdast);
    if (!heading) {
        return 'No heading present in tag header'
    }

    tableCells[0].children[0] = heading;
    tableCells[1].children[0] = image;
    mdast.children.splice(mdast.children.indexOf(image), 1)
    mdast.children.splice(mdast.children.indexOf(heading), 1)
    
    mdast.children.unshift(select('gridTable', marqueeMdast));
    return 'tag header converted to marquee';
}