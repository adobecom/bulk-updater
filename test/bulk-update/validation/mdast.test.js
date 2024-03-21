import { expect } from '@esm-bundle/chai';
import validateMdast, { mapAncestors } from '../../../bulk-update/validation/mdast.js';

describe('MDAST validation', () => {
  describe('mapAncestors', () => {
    it('maps the ancestors array and returns an array of ancestor types', () => {
      const ancestors = [
        { type: 'root' },
        { type: 'paragraph' },
        { type: 'text', value: 'Some text' },
      ];

      const result = mapAncestors(ancestors);
      expect(result).to.deep.equal(['root', 'paragraph', 'text']);
    });
  });
  it('throws an error for an empty text node', () => {
    const mdast = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '',
            },
          ],
        },
      ],
    };

    expect(() => validateMdast(mdast)).to.throw('Invalid text node root > paragraph > text: {"type":"text","value":""}');
  });

  it('does not throw an error for a non-empty text node', () => {
    const mdast = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'Some text',
            },
          ],
        },
      ],
    };

    expect(() => validateMdast(mdast)).to.not.throw();
  });
});
