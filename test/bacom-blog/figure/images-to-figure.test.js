import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../utils/mdast-utils.js';
import { imageToFigure } from '../../../bacom-blog/figure/images-to-figure.js';

describe('imageToFigure', () => {
  it('should convert images to figures', async () => {
    const imagesMdPath = new URL('./mocks/images-block.md', import.meta.url);
    const figureMdPath = new URL('./mocks/figure-block.md', import.meta.url);
    const imagesMd = await readFile(imagesMdPath);
    const figureMd = await readFile(figureMdPath);

    const imagesMdast = await getMdast(imagesMd.toString());
    const figureMdast = await getMdast(figureMd.toString());

    await imageToFigure(imagesMdast);
    expect(imagesMdast).to.deep.equal(figureMdast);
  });
});
