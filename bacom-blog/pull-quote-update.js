import { getMdast, getTableMap, fetchText, getLeaf, getNodesByType } from '../utils/mdast-utils.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { mdast2docx } from '@adobe/helix-md2docx';


/**
 * Code up here
 */

const entry = './md/bacom-blog/blog/basics/business-case.md';
const urlEntry = 'https://main--bacom-blog--adobecom.hlx.page/drafts/bulk-update/MWPW-135375-pull-quote/document.md'
const tester2 = 'https://main--bacom-blog--adobecom.hlx.page/drafts/bulk-update/MWPW-135375-pull-quote/business-case.md'

///

function noAuthorQuoteRow(quoteObj = '') {
    const emptyNode = '{"type":"text","value":""}';

    return `{"type":"gtRow","children":[{"type":"gtCell","children":[{"type":"heading","depth":3,"children":[${quoteObj || emptyNode}]}],"valign":"middle"}]}`;
}

function authorQuoteRow(quoteObj = '', authorObj = '', attributionObj = '') {
    const emptyNode = '{"type":"text","value":""}';

    return `{"type":"gtRow","children":[{"type":"gtCell","children":[{"type":"paragraph","children":[${quoteObj || emptyNode}]},{"type":"paragraph","children":[${authorObj || emptyNode}]},{"type":"paragraph","children":[${attributionObj || emptyNode}]}],"valign":"middle"}]}`
}

function splitQuoteAttribution(node, replacement) {
    const attribution = node.value;
    const splitAttr = attribution.split(',');

    if (splitAttr.length === 1) {
        replacement.author = JSON.stringify({type: 'text', value: splitAttr[0]});
        return;
    }

    let [author, ...attr] = splitAttr;
    attr = attr.join(',');

    replacement.author = JSON.stringify({type: 'text', value: author});
    replacement.company = JSON.stringify({type: 'text', value: attr});;
}

/**
 * 
 * @param {*} mdast
 * 
 * Takes the current mdast, finds all instances of pull quote, and changes them to quote. Likewise modifies content into formats expected by Milo. 
 *  
 */
export async function pullQuote(mdast) {
    const QUOTE_BLOCK_NAME = 'quote (borders, align left)';
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

    quoteMap.forEach(async (quoteBlock) => {
        const replacementContent = {};
        const currQuoteIdx = quoteBlock.index;
        const currentQuoteBlock = mdast.children[currQuoteIdx];

        // Change the block name 
        const heading = getLeaf(currentQuoteBlock, 'text');
        heading.value = QUOTE_BLOCK_NAME;
        
        // Determine if there is an author 
        const quoteBody = currentQuoteBlock.children[0];
        const quoteRow = quoteBody.children[1]
        const quoteCell = quoteRow.children[0];
        if (quoteCell.type !== 'gtCell') {
            console.log(`In wrong part of tree. Working on quote index ${currQuoteIdx}`);
            return;
        }
        const textNodes = getNodesByType(quoteCell, 'text');
        const linkNodes = getNodesByType(quoteCell, 'link');
        let quote = JSON.stringify(textNodes[0]);

        // Currently only grabs a single link in a quote. Will review with authoring
        if (linkNodes.length) {
            if (linkNodes.length > 1) {
                console.log('Multiple Links per quote found');
            }
            const linkNode = linkNodes[0];
            const linkedText = linkNode.children[0].value;

            const textReplacmentIndex = textNodes.findIndex((node) => {
                return node.value === linkedText
            })

            textNodes[textReplacmentIndex] = linkNode;
            quote = textNodes.reduce((rdx, node, idx) =>  {
                if (idx < textNodes.length - 1) {
                    rdx += `${JSON.stringify(node)},`;
                    return rdx;
                }
                rdx += JSON.stringify(node);
                return rdx;
            }, '');
        }

        // Set the quote 
        replacementContent.quote = quote;
        let replacementRow = noAuthorQuoteRow(replacementContent.quote);

        // Check if it is an author node, then modify row
        if (textNodes.length === 2) {
            splitQuoteAttribution(textNodes[1], replacementContent);
            replacementRow = authorQuoteRow(replacementContent?.quote, replacementContent?.author, replacementContent?.company);
        }

        // We need to access the actual mdast via properties. 
        quoteBody.children[1] = JSON.parse(replacementRow);
    })
}


async function main() {
    const entry = './md/bacom-blog/blog/basics/business-case.md';

    const otherMd = await fetchText(urlEntry);
    const mdast2 = await getMdast(otherMd);

    const md3Entry = await fetchText(tester2);
    const mdast3 = await getMdast(md3Entry);

    const markdown = await readFile(entry, 'utf8');
    const mdast = await getMdast(markdown);

    await pullQuote(mdast3);

    const output = `pullquote-test/pull-quote-file.docx`;
    await mkdir('pullquote-test', { recursive: true });
    const buffer = await mdast2docx(mdast3);
    await writeFile(output, buffer);
    process.exit(0);
}




/** Test cases here */
main();