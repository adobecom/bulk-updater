import fs from 'fs';
import { expect } from '@esm-bundle/chai';

import { loadListData } from '../../bulk-update/bulk-update.js';
import { getMdast } from '../../bulk-update/document-manager/document-manager.js';

import {
  getMarkdownLinks,
  getLinkLists,
  exactMatch,
  deepCompare,
  reportAnomalies,
  comparePageLinks,
  comparePage,
  comparePages,
} from '../../validation/link-validator.js';

import {
  MATCH,
  EMPTY,
  BOTH_EMPTY,
  LENGTHS_MATCH,
  SIMILARITY,
  SIMILARITY_PERCENTAGE,
  SIMILARITY_HIGH,
  SIMILARITY_EXACT,
  DOUBLE_HASH,
  WHITESPACE,
  ASCII,
  VALID_URL,
  HASH_MATCH,
  HOST_MATCH,
  PATHNAME_MATCH,
  SEARCH_MATCH,
} from '../../validation/deep-compare.js';

const { pathname } = new URL('.', import.meta.url);

describe('Link Validator', () => {
  const comparison = ['source', 'updated'];
  const entry = '/entry';

  describe('getMarkdownLinks', () => {
    it('should return an object with sourceLinks and updatedLinks', async () => {
      const sourceMdast = {};
      const updatedMdast = {};
      const expected = {
        sourceLinks: [],
        updatedLinks: [],
      };

      const result = await getMarkdownLinks(sourceMdast, updatedMdast);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('getLinkLists', () => {
    it('should return an array of link objects', () => {
      const sourceLinks = [
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
      ];
      const updatedLinks = [
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
      ];
      const expected = [
        {
          oldLink: { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
          oldText: 'Link 1',
          oldUrl: 'https://example.com',
          newLink: { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
          newText: 'Link 1',
          newUrl: 'https://example.com',
        },
        {
          oldLink: { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
          oldText: 'Link 2',
          oldUrl: 'https://example.com',
          newLink: { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
          newText: 'Link 2',
          newUrl: 'https://example.com',
        },
      ];

      const result = getLinkLists(sourceLinks, updatedLinks);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('exactMatch', () => {
    it('should return true when all links match', () => {
      const linkLists = [
        {
          oldUrl: 'https://example.com',
          newUrl: 'https://example.com',
        },
        {
          oldUrl: 'https://example.com',
          newUrl: 'https://example.com',
        },
      ];

      const result = exactMatch(linkLists);

      expect(result).to.be.true;
    });

    it('should return false when at least one link does not match', () => {
      const linkLists = [
        {
          oldUrl: 'https://example.com',
          newUrl: 'https://example.com',
        },
        {
          oldUrl: 'https://example.com',
          newUrl: 'https://example.org',
        },
      ];

      const result = exactMatch(linkLists);

      expect(result).to.be.false;
    });
  });

  describe('deepCompare', () => {
    it('should return an array of observations', () => {
      const linkLists = [
        {
          oldUrl: 'https://example.com',
          newUrl: 'https://example.com',
          oldText: 'Link 1',
          newText: 'Link 1',
        },
        {
          oldUrl: 'https://example.com',
          newUrl: 'https://example.org',
          oldText: 'Link 2',
          newText: 'Link 2',
        },
      ];
      const expected = [
        {
          newText: 'Link 2',
          newUrl: 'https://example.org',
          oldText: 'Link 2',
          oldUrl: 'https://example.com',
          text: {
            [MATCH]: true,
            [EMPTY]: false,
            [BOTH_EMPTY]: false,
            [LENGTHS_MATCH]: true,
            [SIMILARITY_PERCENTAGE]: '100%',
            [SIMILARITY]: SIMILARITY_EXACT,
            [WHITESPACE]: true,
            [ASCII]: false,
          },
          url: {
            [MATCH]: false,
            [EMPTY]: false,
            [BOTH_EMPTY]: false,
            [ASCII]: false,
            [DOUBLE_HASH]: false,
            [HOST_MATCH]: false,
            [HASH_MATCH]: true,
            [LENGTHS_MATCH]: true,
            [PATHNAME_MATCH]: true,
            [SEARCH_MATCH]: true,
            [SIMILARITY_PERCENTAGE]: '84%',
            [SIMILARITY]: SIMILARITY_HIGH,
            [WHITESPACE]: false,
            [VALID_URL]: true,
          },
        },
      ];

      const result = deepCompare(linkLists, comparison, entry);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('comparePageLinks', () => {
    it('should return comparisons and anomalies when links do not match', () => {
      const sourceLinks = [
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
      ];
      const updatedLinks = [
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
        { url: 'https://example.com/entry', children: [{ type: 'text', value: 'Link 2' }] },
      ];
      const expected = {
        comparisons: 1,
        anomalies: 0,
      };

      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal(expected);
    });

    it('should return zero comparisons and anomalies when links match', () => {
      const sourceLinks = [
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
      ];
      const updatedLinks = [
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 1' }] },
        { url: 'https://example.com', children: [{ type: 'text', value: 'Link 2' }] },
      ];
      const expected = {
        comparisons: 0,
        anomalies: 0,
      };

      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('reportAnomalies', () => {
    it('should return an array of anomalies', () => {
      const observations = [{
        text: {
          [MATCH]: true,
          [ASCII]: false,
        },
        url: {
          [MATCH]: false,
          [ASCII]: true,
        },
      }];

      const anomalies = reportAnomalies(observations, ['source', 'updated'], '/entry');

      expect(anomalies).to.deep.equal(['ASCII URL corruption']);
    });
  });
});

describe('Validate Markdown MDAST', () => {
  const comparison = ['source', 'updated'];
  const entry = '/entry';

  const sourceMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-source.md`, 'utf-8');
  const updatedMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-updated.md`, 'utf-8');
  const mismatchMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-updated-mismatched.md`, 'utf-8');
  const shuffledMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-shuffled.md`, 'utf-8');

  let sourceMdast;
  let updatedMdast;
  let mismatchedMdast;
  let shuffledMdast;

  beforeEach(() => {
    sourceMdast = getMdast(sourceMd);
    updatedMdast = getMdast(updatedMd);
    mismatchedMdast = getMdast(mismatchMd);
    shuffledMdast = getMdast(shuffledMd);
  });

  describe('getMarkdownLinks', () => {
    it('Gets markdown links', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);

      expect(sourceLinks).to.be.an('array');
      expect(updatedLinks).to.be.an('array');

      expect(sourceLinks.length).to.equal(31);
      expect(updatedLinks.length).to.equal(31);
    });
  });

  describe('getLinkLists', () => {
    it('Gets link lists', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      expect(linkLists).to.be.an('array');
      expect(linkLists.length).to.equal(31);
      expect(linkLists[0]).to.contain({
        oldUrl: 'https://main--business-website--adobe.hlx.page/blog/basics/adobe-experience-manager#what-is-adobe-experience-manager',
        newUrl: 'https://main--business-website--adobe.hlx.page/blog/basics/adobe-experience-manager#what-is-adobe-experience-manager',
        oldText: 'What Adobe Experience Manager is',
        newText: 'What Adobe Experience Manager is',
      });
    });
  });

  describe('exactMatch', () => {
    it('All links match when updated correctly', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      const match = exactMatch(linkLists);
      expect(match).to.equal(true);
    });

    it('All links do not match when links are mismatched', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, mismatchedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      const match = exactMatch(linkLists);
      expect(match).to.equal(false);
    });
  });

  describe('deepCompare', () => {
    it('Returns an empty array when there are no differences in links', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      const observations = deepCompare(linkLists, comparison, entry);
      expect(observations).to.be.an('array');
      expect(observations.length).to.equal(0);
    });

    it('Returns an array of observations when there are differences in links', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, mismatchedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);
      const observations = deepCompare(linkLists, comparison, entry);

      expect(observations).to.be.an('array');
      expect(observations.length).to.equal(5);
      expect(observations[0].url).to.be.an('object');
      expect(observations[0].text).to.be.an('object');
      expect(observations[0]).to.contain({
        newText: 'Getting started',
        newUrl: 'https://main--business-website--adobe.hlx.page/blog/basics/adobe-experience-manager#mismatched-hash',
        oldText: 'Getting started',
        oldUrl: 'https://main--business-website--adobe.hlx.page/blog/basics/adobe-experience-manager#getting-started',
      });
    });
  });

  describe('reportAnomalies', () => {
    it('Returns an array of anomalies', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, shuffledMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);
      const observations = deepCompare(linkLists, comparison, entry);
      const anomalies = reportAnomalies(observations, comparison, entry);

      expect(anomalies).to.be.an('array');
      expect(anomalies.length).to.equal(4);
      expect(anomalies).to.deep.equal(['ASCII URL corruption', 'ASCII URL corruption', 'ASCII URL corruption', 'Missing link']);
    });
  });

  describe('comparePageLinks', () => {
    it('should return comparisons and anomalies when links do not match', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, shuffledMdast);
      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal({ comparisons: 30, anomalies: 4 });
    });
  });
});

describe('Validate Mock Folders', () => {
  const listPath = `${pathname}/mocks/list.json`;
  const mdPath = `${pathname}/mocks/md-mocks`;

  describe('comparePage', () => {
    it('should return comparisons and anomalies when links match', async () => {
      const entry = '/affinity-diagram-guide';
      const comparison = ['source', 'updated'];
      const result = await comparePage(mdPath, comparison, entry);
      expect(result).to.deep.equal({ comparisons: 0, anomalies: 0 });
    });

    it('should return comparisons and anomalies when links do not match', async () => {
      const entry = '/affinity-diagram-guide';
      const comparison = ['source', 'mismatch'];
      const result = await comparePage(mdPath, comparison, entry);
      expect(result).to.deep.equal({ comparisons: 3, anomalies: 0 });
    });
  });

  describe('comparePages', async () => {
    it('should return comparisons and anomalies when links match', async () => {
      const comparison = ['source', 'updated'];
      const listData = await loadListData(listPath);

      const results = await comparePages(listData, mdPath, comparison);
      expect(results).to.deep.equal({
        pages: 5,
        pageAnomalies: 0,
        comparisons: 0,
        anomalies: 0,
      });
    });

    it('should return comparisons and anomalies when links do not match', async () => {
      const comparison = ['source', 'mismatch'];
      const listData = await loadListData(listPath);

      const results = await comparePages(listData, mdPath, comparison);
      expect(results).to.deep.equal({
        pages: 5,
        pageAnomalies: 0,
        comparisons: 3,
        anomalies: 0,
      });
    });
  });
});
