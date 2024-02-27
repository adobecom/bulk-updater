import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../bulk-update/document-manager/document-manager.js';
import { getBlockInfo, selectAllBlocks, selectBlock, mapBlock, blockToObject } from '../../../bulk-update/migration-tools/select.js';

const { pathname } = new URL('.', import.meta.url);

describe('Select', () => {
  describe('getBlockInfo', () => {
    const tests = [
      ['Block(option1)', { blockName: 'block', options: ['option1'], variant: 'block (option1)' }],
      ['Block(option1, Option2)', { blockName: 'block', options: ['option1', 'option2'], variant: 'block (option1, option2)' }],
      ['block', { blockName: 'block', options: [], variant: 'block' }],
      ['block-name', { blockName: 'block-name', options: [], variant: 'block-name' }],
      ['block-name(option1)', { blockName: 'block-name', options: ['option1'], variant: 'block-name (option1)' }],
      ['block-name(option1, Option2)', { blockName: 'block-name', options: ['option1', 'option2'], variant: 'block-name (option1, option2)' }],
      ['Block Name', { blockName: 'block-name', options: [], variant: 'block-name' }],
      ['Block Name(option1)', { blockName: 'block-name', options: ['option1'], variant: 'block-name (option1)' }],
      ['Block Name(option1, Option2)', { blockName: 'block-name', options: ['option1', 'option2'], variant: 'block-name (option1, option2)' }],
    ];

    tests.forEach(([input, expectedOutput]) => {
      it(`converts correct block information from '${input}' to '${expectedOutput.variant}'`, () => {
        expect(getBlockInfo(input)).to.deep.equal(expectedOutput);
      });
    });
  });

  describe('selectAllBlocks', () => {
    it('selects all grid tables with the specified block name', () => {
      const md = fs.readFileSync(`${pathname}mock/select.md`, 'utf-8');
      const mdast = getMdast(md);
      const blockName = 'section-metadata';
      const result = selectAllBlocks(mdast, blockName);
      expect(result.length).to.equal(2);
      expect(result[0].type).to.equal('gridTable');
      expect(result[1].type).to.equal('gridTable');
    });
  });

  describe('selectBlock', () => {
    it('selects the first grid table with the specified block name', () => {
      const md = fs.readFileSync(`${pathname}mock/select.md`, 'utf-8');
      const mdast = getMdast(md);
      const blockName = 'aside';
      const result = selectBlock(mdast, blockName);
      expect(result).to.not.be.null;
      expect(result.type).to.equal('gridTable');
    });
  });

  describe('mapBlock', () => {
    it('maps the block into an array of arrays', () => {
      const md = fs.readFileSync(`${pathname}mock/select.md`, 'utf-8');
      const mdast = getMdast(md);
      const block = selectBlock(mdast, 'section-metadata');
      const result = mapBlock(block);
      expect(result).to.deep.equal([
        ['Style', 'xl spacing'],
      ]);
    });
  });

  describe('blockToObject', () => {
    it('maps the block into an object', () => {
      const md = fs.readFileSync(`${pathname}mock/select.md`, 'utf-8');
      const mdast = getMdast(md);
      const block = selectBlock(mdast, 'section-metadata');
      const result = blockToObject(block);
      expect(result).to.deep.equal({ Style: 'xl spacing' });
    });
  });
});
