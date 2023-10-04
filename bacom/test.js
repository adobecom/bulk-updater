import {
    fetchText,
    getMdast
  } from '../utils/mdast-utils.js';

async function main() {
    const url = 'https://main--bacom--adobecom.hlx.page/drafts/slavin/md2dox-examples/bold-v-not.md'
    // const url = 'https://main--bacom--adobecom.hlx.page/drafts/slavin/md2dox-examples/simple-table.md'
    // const url = 'https://main--bacom--adobecom.hlx.page/drafts/slavin/marketo-block.md'

    const docText = await fetchText(url);
        if (!docText) {
            console.log(`Issue with fetchText, see: ${docText}`);
            return;
        }

    console.log('Converting to mdast');
    const mdast = await getMdast(docText);
    console.group(mdast)

    const stringy = JSON.stringify(mdast)
    console.log(stringy)
} 

main()