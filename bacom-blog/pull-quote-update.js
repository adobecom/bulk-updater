import { getLeaf, getNodesByType } from '../utils/mdast-utils.js';

function noAuthorQuoteRow(quoteObj = '') {
    const emptyNode = '{"type":"text","value":""}';

    return `{"type":"gtRow","children":[{"type":"gtCell","children":[{"type":"heading","depth":3,"children":[${quoteObj || emptyNode}]}],"valign":"middle"}]}`;
}

function authorQuoteRow(quoteObj = '', authorObj = '', attributionObj = '') {
    const emptyNode = '{"type":"text","value":""}';

    return `{"type":"gtRow","children":[{"type":"gtCell","children":[{"type":"paragraph","children":[${quoteObj || emptyNode}]},{"type":"paragraph","children":[${authorObj || emptyNode}]},{"type":"paragraph","children":[${attributionObj || emptyNode}]}],"valign":"middle"}]}`
}

function splitQuoteAttribution(node, replacement) {
    const attribution = node?.value;
    if (!attribution) {
        console.log('Issue with quote attribution');
        return;
    }
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
export const QUOTE_BLOCK_NAME = 'quote (borders, align left)';
/**
 * 
 * @param {*} mdast
 * 
 * Takes the current mdast, finds all instances of pull quote, and changes them to quote. Likewise modifies
 * content into formats expected by Milo. 
 *  
 */
export async function convertPullQuote(mdast) {
    const quoteMap = mdast.children.reduce((rdx, child, index) => {
        const header = getLeaf(child, 'text');

        if (!header) return rdx;
        if (typeof header.value !== 'string') return rdx;
        if (!header?.value.toLowerCase().includes("quote")) return rdx;

        rdx.push({
            headText: header.value,
            index: index
        });
        return rdx;
    }, [])

    // Go through each quote found, and process
    quoteMap.forEach((quoteBlock) => {
        const replacementContent = {};
        const currQuoteIdx = quoteBlock.index;
        const currentQuoteBlock = mdast.children[currQuoteIdx];

        // Change the block name 
        const heading = getLeaf(currentQuoteBlock, 'text');
        if (heading?.value) heading.value = QUOTE_BLOCK_NAME;
        
        // Determine if there is an author 
        const quoteBody = currentQuoteBlock?.children ? currentQuoteBlock?.children[0] : false;
        const quoteRow = quoteBody?.children ? quoteBody?.children[1] : false;
        const quoteCell = quoteRow?.children ? quoteRow?.children[0] : false;

        if (!quoteBody || !quoteRow || !quoteCell ) {
            console.log('Failed to find expected mdast structure');
            return;
        }

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