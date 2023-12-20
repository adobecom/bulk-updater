import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { convertTagHeader } from '../../../bacom-blog/tag-header/tag-header.js';
import { getMdast } from '../../../utils/mdast-utils.js';

describe('converTagHeader', () => {
  it('should convert a page with an image and article feed', async () => {
    const tagHeaderMdPath = new URL('./mocks/tag-header.md', import.meta.url);
    const marqueeMdPath = new URL('./mocks/marquee.md', import.meta.url);
    const tagHeaderMd = await readFile(tagHeaderMdPath, 'utf8');
    const marqueeMd = await readFile(marqueeMdPath, 'utf8');
    const tagHeaderMdast = await getMdast(tagHeaderMd);
    const marqueeMdast = await getMdast(marqueeMd);

    await convertTagHeader(tagHeaderMdast);
    expect(marqueeMdast.children.length).to.equal(2);
    expect(marqueeMdast).to.deep.equal(tagHeaderMdast);
  });
});
