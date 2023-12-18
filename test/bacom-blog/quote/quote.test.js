import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { select } from 'unist-util-select';
import {
  convertPullQuote,
  QUOTE_BLOCK_NAME,
} from '../../../bacom-blog/pull-quote/pull-quote-update.js';
import { getMdast } from '../../../utils/mdast-utils.js';

describe('convertPullQuote', () => {
  it('adds the correct heading', async () => {
    const pullQuotePath = new URL('./mocks/single-quote.md', import.meta.url);
    const pullQuoteMd = await readFile(pullQuotePath, 'utf-8');
    const pullQuoteMdast = await getMdast(pullQuoteMd);

    await convertPullQuote(pullQuoteMdast);

    const mdastBody = select('gtBody', pullQuoteMdast);
    const headerRow = mdastBody.children[0];
    const textNode = select('gtCell paragraph text', headerRow);

    expect(textNode.type).to.equal('text');
    expect(textNode.value).to.equal(QUOTE_BLOCK_NAME);
  });

  it('converts a single line pull quotes to a single line quote', async () => {
    const pullQuotePath = new URL('./mocks/single-quote.md', import.meta.url);
    const pullQuoteMd = await readFile(pullQuotePath, 'utf-8');
    const pullQuoteMdast = await getMdast(pullQuoteMd);

    await convertPullQuote(pullQuoteMdast);

    const mdastBody = select('gtBody', pullQuoteMdast);
    const contentRow = mdastBody.children[1];
    const contentCell = select('gtCell', contentRow);

    expect(contentCell.children[0].type).to.equal('text');
  });

  it('converts link pull quotes to a single line quote', async () => {
    const pullQuotePath = new URL('./mocks/link-quote.md', import.meta.url);
    const pullQuoteMd = await readFile(pullQuotePath, 'utf-8');
    const pullQuoteMdast = await getMdast(pullQuoteMd);

    await convertPullQuote(pullQuoteMdast);

    const mdastBody = select('gtBody', pullQuoteMdast);
    const contentRow = mdastBody.children[1];
    const contentCell = select('gtCell', contentRow);

    expect(contentCell.children.length).to.equal(3);
    expect(contentCell.children[0].type).to.equal('text');
  });

  it('converts attributed pull quotes to multi line quote', async () => {
    const pullQuotePath = new URL(
      './mocks/attributed-quote.md',
      import.meta.url,
    );
    const pullQuoteMd = await readFile(pullQuotePath, 'utf-8');
    const pullQuoteMdast = await getMdast(pullQuoteMd);

    await convertPullQuote(pullQuoteMdast);

    const mdastBody = select('gtBody', pullQuoteMdast);
    const contentRow = mdastBody.children[1];
    const contentCell = contentRow.children[0];

    expect(contentCell.children[0].type).to.equal('paragraph');
    expect(contentCell.children.length).to.equal(3);
    expect(contentCell.children[0].children[0].type).to.equal('text');
  });
});
