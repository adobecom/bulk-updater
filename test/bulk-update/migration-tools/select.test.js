import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import { select } from 'unist-util-select';
import { getMdast } from '../../../bulk-update/document-manager/document-manager.js';
import {
  getBlockInfo,
  isBlockMatch,
  selectAllBlocks,
  selectBlock,
  mapBlock,
  blockToObject,
} from '../../../bulk-update/migration-tools/select.js';

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
      ['', { blockName: '', options: [], variant: '' }],
    ];

    tests.forEach(([input, expectedOutput]) => {
      it(`converts correct block information from '${input}' to '${expectedOutput.variant}'`, () => {
        expect(getBlockInfo(input)).to.deep.equal(expectedOutput);
      });
    });
  });

  describe('isBlockMatch', () => {
    const tests = [
      ['Block', 'block', true],
      ['Block ', 'Block', true],
      ['Block', 'block (option1)', true],
      ['Block', 'Block (option1, option2)', true],
      ['block-name', 'block-name ', true],
      ['block name', 'Block-Name (option1)', true],
      ['Block Name', 'block name (option1)', true],
      ['Block-Name', 'block-name (option1, option2)', true],
      ['Blocks', 'Block (option1)', false],
      ['block false', 'block name', false],
    ];

    tests.forEach(([block, table, expected]) => {
      it(`${expected ? 'matchs' : 'does not match'} block '${block}' and the table '${table}'`, () => {
        const result = isBlockMatch(block, { type: 'gridTable', children: [{ type: 'gtRow', children: [{ type: 'gtCell', children: [{ type: 'text', value: table }] }] }] });
        expect(result).to.equal(expected);
      });
    });
  });

  describe('selectAllBlocks', () => {
    const tests = [
      ['Marquee', 1, 'marquee (split, small, light)'],
      ['Section Metadata', 2, 'section-metadata'],
      ['Aside', 1, 'aside (inline)'],
      ['Metadata', 1, 'Metadata'],
    ];

    tests.forEach(([blockName, expectedCount, expectedVariant]) => {
      it(`selects ${expectedCount} grid table(s) with the ${blockName} block name`, () => {
        const md = fs.readFileSync(`${pathname}mock/select.md`, 'utf-8');
        const mdast = getMdast(md);

        const result = selectAllBlocks(mdast, blockName);
        expect(result.length).to.equal(expectedCount);
        expect(select('text', result[0])?.value).to.equal(expectedVariant);
      });
    });
  });

  describe('selectBlock', () => {
    const tests = [
      ['Marquee', 'marquee (split, small, light)'],
      ['Section Metadata', 'section-metadata'],
      ['Aside', 'aside (inline)'],
      ['Metadata', 'Metadata'],
    ];

    tests.forEach(([blockName, expectedVariant]) => {
      it(`selects the first grid table with the ${blockName} block name`, () => {
        const md = fs.readFileSync(`${pathname}mock/select.md`, 'utf-8');
        const mdast = getMdast(md);

        const result = selectBlock(mdast, blockName);
        expect(result).to.not.be.undefined;
        expect(result.type).to.equal('gridTable');
        expect(select('text', result)?.value).to.equal(expectedVariant);
      });
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
