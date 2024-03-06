import { expect } from '@esm-bundle/chai';
import { checkAltText } from '../../../bulk-update/validation/images.js';

describe('checkAltText', () => {
  it('returns an empty array when all images have alt text', () => {
    const markdown = `
      ![Image 1](https://example.com/image1.jpg)
      ![Image 2](https://example.com/image2.jpg)
    `;
    const result = checkAltText(markdown);
    expect(result).to.deep.equal([]);
  });

  it('returns an array of missing alt text URLs', () => {
    const markdown = `
      ![Image 1](https://example.com/image1.jpg)
      ![](https://example.com/image2.jpg)
      ![Image 3](https://example.com/image3.jpg)
    `;
    const result = checkAltText(markdown);
    expect(result).to.deep.equal([
      'https://example.com/image2.jpg',
    ]);
  });

  it('returns an empty array when there are no images', () => {
    const markdown = 'This is a sample markdown with no images.';
    const result = checkAltText(markdown);
    expect(result).to.deep.equal([]);
  });

  it('does not include base64 images', () => {
    const markdown = `
      This is a sample markdown with a base64 image:
      ![Image 1](data:image/png;base64,i)
    `;
    const result = checkAltText(markdown);
    expect(result).to.deep.equal([]);
  });
});
