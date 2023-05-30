
import { mkdir, readFile, writeFile } from 'fs/promises';
import  { paths } from './path-files/resources-paths.js';
import { fetch } from '@adobe/fetch';
import { clear } from 'node:console';
import {
    fetchText,
    getMdast,
    getTable,
  } from '../utils/mdast-utils.js';
import { docx2md } from '@adobe/helix-docx2md';

const rootUrl = 'https://main--bacom--adobecom.hlx.page';
const testFolder = '../../../../resources';

async function main() {
    for (const path in paths) {
        console.log(path, paths[path])
        const url = `${rootUrl}/resources${paths[path].substring(1, paths[path].length -  4)}md`;
        console.log(url)
        const text = await fetchText(url);
        if (text) {
            console.log('Converting to mdast');
            const mdast = await getMdast(text);
            console.log('Mdast converted');
        }
    }
}

console.time('Running main');
await main2();
console.timeEnd('Running main');
process.exit(0)
