
import { mkdir, readFile, writeFile } from 'fs/promises';
// import  { paths } from './path-files/resources-paths.js';
const paths = [
    // 'https://main--bacom--adobecom.hlx.page/resources/articles/arrival-of-personalized-learning.md',
    // 'https://main--bacom--adobecom.hlx.page/resources/webinars/elearning-world.md',
    'https://main--bacom--adobecom.hlx.page/resources/promotion/customer-journey-analytics-three-months-offer.md'
]
import { fetch } from '@adobe/fetch';
import { clear } from 'node:console';
import {
    fetchText,
    getMdast,
    getTable,
    getTableMap,
    getLeaf
  } from '../utils/mdast-utils.js';
import { docx2md } from '@adobe/helix-docx2md';
import { mdast2docx } from '@adobe/helix-md2docx';

/**
 * A variation of the "getLeaf" function. Removes the second conditional check for
 * "!node.children", which was returning the incorrect item
 * 
 * 
 * @param {object} node / mdast json object with children
 * @param {string} type / a type, like "link"
 * @returns 
 */
const getByType = (node, type) => {
    if (node?.type === type) return node;
  
    if (node?.children) {
      for (let i = 0; i < node.children.length; i++) {
        const item = getByType(node.children[i], type);
        if (item) return item;
      }
    }
    return undefined;
};

const rootUrl = 'https://main--bacom--adobecom.hlx.page';
const testFolder = '../../../../resources';
const faasLink = 'milo.adobe.com/tools/faas#'

const isFaasInBlock = async (mdast, blockName) => {
    const table = await getTable(mdast, blockName);
    if (table.length === 0) return false;

    const linkInTable = getByType(table[0].table, 'link');
    if (linkInTable?.url.includes(faasLink)) {
        return {
            blockName: blockName,
            table: table,
            node: linkInTable,
        }
    }
    return false;
}

async function main() {
    for (const path in paths) {
        let faasFound;

        console.log(path, paths[path])
        // const url = `${rootUrl}/resources${paths[path].substring(1, paths[path].length -  4)}md`;
        const url = paths[path]
        console.log(url)
        const docText = await fetchText(url);
        if (!docText) {
            console.log(`Issue with fetchText, see: ${docText}`);
            return;
        }
       
        console.log('Converting to mdast');
        const mdast = await getMdast(docText);
        console.log('Mdast converted');

        const tmap = getTableMap(mdast);

        console.log(tmap, mdast)

        // console.log(
        // mdast.children[1], '\n -- \n',
        // mdast.children[1].children[0], '\n -- \n',
        // mdast.children[1].children[0].children[0].children[0], '\n -- \n',
        // mdast.children[1].children[0].children[0].children[0].children[0], '\n -- \n',
        // mdast.children[1].children[0].children[0].children[0].children[0].children[0], '\n -- \n',
        // )
        const faasInTextTable = await isFaasInBlock(mdast, 'text');
        const faasInColumnsTable = await isFaasInBlock(mdast, 'columns');

        // console.log(faasInTextTable, 'text table', '\n\n\n', faasInColumnsTable, 'columns');

        // if (faasInTextTable) {
        //     faasFound = faasInTextTable;
        // }

        // if (faasInColumnsTable) {
        //     faasFound = faasInColumnsTable
        // }

        // mdast.children.splice(0, 2)



        // const texttable = getTable(mdast, 'text');
        // console.log(texttable, texttable[0].table.children[0].children[1].children[0].children[0].children, '\n new \n')
        // const leaf = getByType(texttable[0].table, 'link');
        // console.log(leaf)


        // leaf.url = 'https://www.google.com'

        // const fileName = `${paths[path].split('/').pop().split('.md').shift()}.docx`;
        // const buffer = await mdast2docx(mdast);

        // await writeFile(`./test-docs/${fileName}`, buffer);

        // console.log(`Saved ${fileName}`);
    }
}

console.time('Running main');
await main();
console.timeEnd('Running main');
process.exit(0)
