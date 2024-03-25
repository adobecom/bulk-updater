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

  describe('validateMdast', () => {
    it('returns an array of invalid nodes', () => {
      const mdast = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text' },
            ],
          },
        ],
      };

      expect(validateMdast(mdast)).to.deep.equal(['Invalid text node root > paragraph > text: {"type":"text"}']);
    });

    it('returns an empty array for valid nodes', () => {
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

      expect(validateMdast(mdast)).to.deep.equal([]);
    });
  });
});
