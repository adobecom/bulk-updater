import { expect } from '@esm-bundle/chai';
import { select } from 'unist-util-select';
import {
  getMdast,
  mdast2md,
  moveNode,
  moveNodeParent,
} from '../../utils/mdast-utils.js';

describe('mdast-utils', () => {
  describe('getMdast', () => {
    it('should return a mdast object', async () => {
      const md = 'Test paragraph.\n';
      const mdast = await getMdast(md);

      expect(mdast).to.not.be.null;
      expect(mdast.type).to.equal('root');
      expect(mdast.children.length).to.equal(1);
      expect(mdast.children[0].type).to.equal('paragraph');
    });
  });

  describe('mdast2md', () => {
    it('should return a markdown string', async () => {
      const md = 'Test paragraph.\n';
      const mdast = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                value: 'Test paragraph.',
              },
            ],
          },
        ],
      };

      expect(mdast2md(mdast)).to.equal(md);
    });
  });

  describe('moveNode', () => {
    it('should move a node to a new parent', async () => {
      const fromMd = 'Test paragraph.\n';
      const toMd = '';
      const fromParent = await getMdast(fromMd);
      const toParent = await getMdast(toMd);
      const targetNode = fromParent.children[0];

      moveNode(targetNode, fromParent, toParent);

      expect(fromParent.children.length).to.equal(0);
      expect(toParent.children.length).to.equal(1);
      expect(toParent.children[0]).to.equal(targetNode);
      expect(mdast2md(toParent)).to.equal(fromMd);
    });
  });

  describe('moveNodeParent', () => {
    it('should move a node by parent type', async () => {
      const fromMd = '![image](image.jpg)';
      const toMd = '';

      const fromMdast = await getMdast(fromMd);
      const toMdast = await getMdast(toMd);

      moveNodeParent(fromMdast, 'image', 'paragraph', toMdast);

      expect(select('paragraph', toMdast)).to.not.be.null;
      expect(select('paragraph', fromMdast)).to.be.null;
    });
  });
});
