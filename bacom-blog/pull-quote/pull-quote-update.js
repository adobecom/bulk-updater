import { getLeaf } from '../../utils/mdast-utils.js';
import { selectAll } from 'unist-util-select'
import { STATUS_SUCCESS, STATUS_WARNING, STATUS_ERROR, STATUS_INFO } from '../../utils/migration-utils.js';

export const QUOTE_BLOCK_NAME = 'quote (borders, align left)';

/**
 * Generates a row string without author information.
 *
 * @param {Array<object>} quotes - The quote object.
 * @returns {object} - The generated row.
 */
function noAuthorQuoteRow(quotes = [{}]) {
    const emptyNode = { type: "text", value: "" };

    return {
        type: "gtRow",
        children: [{
            type: "gtCell",
            children: [...quotes || emptyNode],
            valign: "middle"
        }]
    };
}

/**
 * Generates a row string with author and attribution information.
 *
 * @param {Array<object>} quotes - The quote object.
 * @param {object} authorObj - The author object.
 * @param {object} attributionObj - The attribution object.
 * @returns {object} - The generated row.
 */
function authorQuoteRow(quotes, authorObj, attributionObj) {
    const emptyNode = { type: "text", value: "" };

    return {
        type: "gtRow",
        children: [{
            type: "gtCell",
            children: [{
                type: "paragraph",
                children: [...quotes || emptyNode]
            },
            {
                type: "paragraph",
                children: [authorObj || emptyNode]
            },
            {
                type: "paragraph",
                children: [attributionObj || emptyNode]
            }],
            valign: "middle"
        }]
    };
}

function splitQuoteAttribution(node, replacement) {
    const attribution = node?.value;
    if (!attribution) {
        return 'No attribution found';
    }
    const splitAttr = attribution.split(',');

    if (splitAttr.length === 1) {
        replacement.author = ({ type: 'text', value: splitAttr[0] });
        return 'No company found';
    }

    let [author, ...attr] = splitAttr;
    attr = attr.join(',');

    replacement.author = ({ type: 'text', value: author });
    replacement.company = ({ type: 'text', value: attr });
    return 'Author and company found';
}

/**
 * Takes the current mdast, finds all instances of pull quote, and changes them to quote. Likewise modifies
 * content into formats expected by Milo. 
 * 
 * @param {object} mdast - markdown tree
 * @returns {Array} report
 */
export async function convertPullQuote(mdast) {
    const report = [];
    const quoteMap = mdast.children.reduce((rdx, child, index) => {
        const header = getLeaf(child, 'text');

        if (!header) return rdx;
        if (typeof header.value !== 'string') return rdx;
        if (!header?.value.toLowerCase().includes("quote")) return rdx;

        rdx.push(index)

        return rdx;
    }, [])

    // Go through each quote found, and process
    return quoteMap.map((quoteBlockIdx) => {
        const replacementContent = {};
        const currentQuoteBlock = mdast.children[quoteBlockIdx];

        // Change the block name 
        const heading = getLeaf(currentQuoteBlock, 'text');
        if (heading?.value) heading.value = QUOTE_BLOCK_NAME;

        // Determine if there is an author 
        const quoteBody = currentQuoteBlock?.children ? currentQuoteBlock?.children[0] : false;
        const quoteRow = quoteBody?.children ? quoteBody?.children[1] : false;
        const quoteCell = quoteRow?.children ? quoteRow?.children[0] : false;

        if (!quoteBody || !quoteRow || !quoteCell) {
            report.push({ status: STATUS_ERROR, message: `Quote ${quoteBlockIdx}: Failed to find expected mdast structure` });
            return report;
        }

        if (quoteCell.type !== 'gtCell') {
            report.push({ status: STATUS_ERROR, message: `Quote ${quoteBlockIdx}: Expected gtCell but found ${quoteCell.type}` })
            return report;
        }

        const textNodes = selectAll('text', quoteCell);
        const linkNodes = selectAll('link', quoteCell);
        let quote = [textNodes[0]];

        // Currently only grabs a single link in a quote. Will review with authoring
        if (linkNodes.length) {
            if (linkNodes.length > 1) {
                report.push({ status: STATUS_WARNING, message: `Quote ${quoteBlockIdx}: Multiple links found in quote: ${linkNodes.length}` });
            }
            const linkNode = linkNodes[0];
            const linkedText = linkNode.children[0].value;

            const textReplacmentIndex = textNodes.findIndex((node) => {
                return node.value === linkedText;
            })

            textNodes[textReplacmentIndex] = linkNode;
            quote = textNodes;
        }

        // Set the quote 
        replacementContent.quote = quote;
        let replacementRow = noAuthorQuoteRow(replacementContent.quote);

        let attributionStatus = null;
        // Check if it is an author node, then modify row
        if (textNodes.length === 2) {
            attributionStatus = splitQuoteAttribution(textNodes[1], replacementContent);
            report.push({ status: STATUS_INFO, message: `Quote ${quoteBlockIdx}: ${attributionStatus}` });
            replacementRow = authorQuoteRow(replacementContent?.quote, replacementContent?.author, replacementContent?.company);
        }

        // We need to access the actual mdast via properties. 
        quoteBody.children[1] = replacementRow;
        report.push({ status: STATUS_SUCCESS, message: `Quote ${quoteBlockIdx}: Converted quote` })
        return report;
    });
}
