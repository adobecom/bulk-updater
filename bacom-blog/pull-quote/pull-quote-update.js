import { selectAll } from 'unist-util-select';
import {
  STATUS_SUCCESS,
  STATUS_WARNING,
  STATUS_ERROR,
} from '../../utils/migration-utils.js';
import { getLeaf } from '../../utils/mdast-utils.js';

export const QUOTE_BLOCK_NAME = 'quote (borders, align left)';

/**
 * Generates a row string without author information.
 *
 * @param {Array<object>} quotes - The quote object.
 * @returns {object} - The generated row.
 */
function noAuthorQuoteRow(quotes = [{}]) {
  const emptyNode = { type: 'text', value: '' };

  return {
    type: 'gtRow',
    children: [
      {
        type: 'gtCell',
        children: [...(quotes || emptyNode)],
        valign: 'middle',
      },
    ],
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
  const emptyNode = { type: 'text', value: '' };

  return {
    type: 'gtRow',
    children: [
      {
        type: 'gtCell',
        children: [
          {
            type: 'paragraph',
            children: [...(quotes || emptyNode)],
          },
          {
            type: 'paragraph',
            children: [authorObj || emptyNode],
          },
          {
            type: 'paragraph',
            children: [attributionObj || emptyNode],
          },
        ],
        valign: 'middle',
      },
    ],
  };
}

function splitQuoteAttribution(node, replacement) {
  const attribution = node?.value;
  if (!attribution) {
    return 'No attribution found. ';
  }
  const splitAttr = attribution.split(',');

  if (splitAttr.length === 1) {
    replacement.author = { type: 'text', value: splitAttr[0] };
    return 'No company found. ';
  }

  /* eslint-disable-next-line prefer-const */
  let [author, ...attr] = splitAttr;
  attr = attr.join(',');

  replacement.author = { type: 'text', value: author };
  replacement.company = { type: 'text', value: attr };
  return 'Author and company found. ';
}

function getAllValues(nodeList) {
  let allValues = '';

  nodeList.forEach((node) => {
    if (node.value) {
      allValues += node.value;
    } else if (node.children?.length) {
      allValues += getAllValues(node.children);
    }
  });

  return allValues;
}

/**
 * Takes the current mdast, finds all instances of pull quote, and changes them to quote.
 * Likewise modifies content into formats expected by Milo.
 *
 * @param {object} mdast - markdown tree
 * @returns {Promise<Array>} - report [{ status, message}]
 */
export async function convertPullQuote(mdast) {
  const quoteMap = mdast.children.reduce((rdx, child, index) => {
    const header = getLeaf(child, 'text');

    if (!header) return rdx;
    if (typeof header.value !== 'string') return rdx;
    if (!header.value.toLowerCase().includes('pull quote')) return rdx;

    rdx.push(index);

    return rdx;
  }, []);

  // Go through each quote found, and process
  return quoteMap.map((quoteBlockIdx) => {
    const report = { message: `Quote, index ${quoteBlockIdx}: ` };
    const replacementContent = {};
    const currentQuoteBlock = mdast.children[quoteBlockIdx];

    // Change the block name
    const heading = getLeaf(currentQuoteBlock, 'text');
    if (heading?.value) heading.value = QUOTE_BLOCK_NAME;

    // Determine if there is content
    const quoteBody = currentQuoteBlock?.children
      ? currentQuoteBlock?.children[0]
      : false;
    const quoteRow = quoteBody?.children ? quoteBody?.children[1] : false;
    const quoteCell = quoteRow?.children ? quoteRow?.children[0] : false;

    if (!quoteBody || !quoteRow || !quoteCell) {
      report.status = STATUS_ERROR;
      report.message = 'Failed to find expected mdast structure.';
      const quoteHeader = currentQuoteBlock?.children.some(
        (node) => node.type === 'gtHeader',
      );
      if (quoteHeader) report.message += ' Has Table Header.';
      return report;
    }

    if (quoteCell.type !== 'gtCell') {
      report.status = STATUS_ERROR;
      report.message = `Expected gtCell but found ${quoteCell.type}.`;
      return report;
    }

    if (selectAll('list', quoteCell).length) {
      report.status = STATUS_ERROR;
      report.message = 'Invalid content - list.';
      return report;
    }

    const originalValue = getAllValues(quoteCell.children);

    if (selectAll('strong + *', quoteCell).length) {
      report.status = STATUS_WARNING;
      report.message = 'Paritally bolded text. ';
    }

    const imgLeng = selectAll('image', quoteCell).length;

    if (imgLeng === 1) {
      report.status = STATUS_WARNING;
      report.message += 'Contains image. ';
    } else if (imgLeng > 1) {
      report.status = STATUS_ERROR;
      report.message += `Too many images (${imgLeng}). `;
      return report;
    }

    const otherNodes = selectAll(
      ':not(gtCell, text, link, image, paragraph, strong, emphasis, heading, blockquote)',
      quoteCell,
    );

    if (otherNodes.length) {
      report.status = STATUS_WARNING;
      report.message += `Unusual content type: ${otherNodes[0].type}. `;
    }

    const textNodes = selectAll('text', quoteCell);
    const linkNodes = selectAll('link', quoteCell);
    let quote = [textNodes[0]];

    if (textNodes.length > 2) {
      report.status = STATUS_WARNING;
      report.message += `Too many text nodes (${textNodes.length}). `;
    }

    // Currently only grabs a single link in a quote. Will review with authoring
    if (linkNodes.length) {
      if (linkNodes.length > 1) {
        report.status = STATUS_WARNING;
        report.message += `Too many links (${linkNodes.length}). `;
      }
      const linkNode = linkNodes[0];
      const linkedText = linkNode.children[0].value;

      const textReplacmentIndex = textNodes.findIndex((node) => node.value === linkedText);

      textNodes[textReplacmentIndex] = linkNode;
      quote = textNodes;
    }

    // Set the quote
    replacementContent.quote = quote;
    let replacementRow = noAuthorQuoteRow(replacementContent.quote);

    let attribution = null;
    // Check if it is an author node, then modify row
    if (textNodes.length === 2) {
      attribution = splitQuoteAttribution(textNodes[1], replacementContent);
      report.message += attribution;
      replacementRow = authorQuoteRow(
        replacementContent?.quote,
        replacementContent?.author,
        replacementContent?.company,
      );
    }

    const newValue = getAllValues(replacementRow.children);
    const charDiff = originalValue && newValue ? originalValue.length - newValue.length : null;
    report.characterDifference = charDiff;

    if (charDiff && Math.abs(charDiff) > 10) {
      report.status = STATUS_WARNING;
      report.message += `Large character difference: ${charDiff}. `;
    }

    // We need to access the actual mdast via properties.
    quoteBody.children[1] = replacementRow;
    report.status = report.status || STATUS_SUCCESS;
    report.message += 'Converted quote.';

    return report;
  });
}
