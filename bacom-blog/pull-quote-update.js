import { readFile, writeFile, mkdir } from 'fs/promises';
import { getMdast, getTableMap, fetchText, getLeaf, getNodesByType } from '../utils/mdast-utils.js';
import { table } from 'console';


/**
 * Code up here
 */

const entry = './md/bacom-blog/blog/basics/business-case.md';
const urlEntry = 'https://main--bacom-blog--adobecom.hlx.page/drafts/bulk-update/MWPW-135375-pull-quote/document.md'
const tester2 = 'https://main--bacom-blog--adobecom.hlx.page/drafts/bulk-update/MWPW-135375-pull-quote/business-case.md'

/**
 * Takes a gridTable node, parses it for a value, and returns the value found and the index of the grid table
 * 
 * @param {} mdast 
 */
function getByValue(node) {

}

function noAuthorQuoteRow(quoteObj) {
    return `{"type":"gtRow","children":[{"type":"gtCell","children":[{"type":"heading","depth":2,"children":[${quoteObj}]}],"valign":"middle"}]}`;
}

function authorQuoteRow(quoteObj, authorObj, attributionObj) {
    return `{"type":"gtRow","children":[{"type":"gtCell","children":[{"type":"paragraph","children":[${quoteObj}]},{"type":"paragraph","children":[{"type":"strong","children":[${authorObj}]}]},{"type":"paragraph","children":[${attributionObj}]}],"valign":"middle"}]}`
}


export async function pullQuote(mdast) {
    const QUOTE_BLOCK_NAME = 'quote (borders, align left)';

    // const tableMap = getTableMap(mdast)
    // console.log(JSON.stringify(mdast))

    // console.log(mdast.children);
    
    const quoteMap = mdast.children.reduce((rdx, child, index) => {
        const header = getLeaf(child, 'text');
  
        if (typeof header.value !== 'string') return rdx;
        if (!header?.value.toLowerCase().includes("quote")) return rdx;

        rdx.push({
            headText: header.value,
            index: index
        });
        return rdx;
    }, [])

    quoteMap.forEach((quoteBlock) => {
        const replacementContent = {};

        const currQuoteIdx = quoteBlock.index;
        const currentQuoteBlock = mdast.children[currQuoteIdx];

        // Change the block name 
        // 1. Change name from pull quote to quote
        // 2. add 'borders, align left'
        const heading = getLeaf(currentQuoteBlock, 'text');
        heading.value = QUOTE_BLOCK_NAME;
        
        // Determine if there is an author 
        const quoteBody = currentQuoteBlock.children[0];
        const quoteContent = quoteBody.children[1]
        const quoteCell = quoteContent.children[0];
        if (quoteCell.type !== 'gtCell') {
            console.log(`In wrong part of tree. Working on quote index ${currQuoteIdx}`);
            return;
        }
        const textNodes = getNodesByType(quoteCell, 'text');
        const linkNodes = getNodesByType(quoteCell, 'link');
        let quote = JSON.stringify(textNodes[0])

        // Doing the first link now, it is possible some quotes contain multiple links though....
        if (linkNodes.length) {
            if (linkNodes.length > 1) {
                console.log('Multiple Links per quote found!')
            }
            const linkNode = linkNodes[0];
            const linkedText = linkNode.children[0].value;

            const textReplacmentIndex = textNodes.findIndex((node) => {
                return node.value === linkedText
            })

            textNodes[textReplacmentIndex] = linkNode;
            quote = textNodes.reduce((rdx, node) =>  {
                rdx += JSON.stringify(node);
                return rdx;
            }, '');
        }

        replacementContent.quote = quote;

        function splitQuoteAttribution(node) {
            const attribution = node.value;
            const splitAttr = attribution.split(',');

            if (splitAttr.length === 1) {
                return node;
            }

            let [author, ...attr] = splitAttr;
            attr = attr.join(',');

            replacementContent.author = JSON.stringify({type: 'text', value: author});
            replacementContent.company = JSON.stringify({type: 'text', value: attr});;
        }

        if (textNodes.length === 2) {
            splitQuoteAttribution(textNodes[1])
        }

        console.log(replacementContent)


    })

    // 3. Cahnge text to be a heading or paragraph if one author 
    // 4. heading if does not have an author 
    // 5. if author, add spacing 
    // 6. 
}


async function main() {
    const entry = './md/bacom-blog/blog/basics/business-case.md';

    const otherMd = await fetchText(urlEntry);
    const mdast2 = await getMdast(otherMd);

    const md3Entry = await fetchText(tester2);
    const mdast3 = await getMdast(md3Entry);

    const markdown = await readFile(entry, 'utf8');
    const mdast = await getMdast(markdown);

    pullQuote(mdast3);
    process.exit(0);
}




/** Test cases here */
main();