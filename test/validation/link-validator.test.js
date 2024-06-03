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

  describe('getLinkLists', () => {
    it('array of link objects', () => {
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
          oldText: 'Link 1',
          oldUrl: 'https://example.com',
          newText: 'Link 1',
          newUrl: 'https://example.com',
        },
        {
          oldText: 'Link 2',
          oldUrl: 'https://example.com',
          newText: 'Link 2',
          newUrl: 'https://example.com',
        },
      ];

      const result = getLinkLists(sourceLinks, updatedLinks);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('exactMatch', () => {
    it('true when all links match', () => {
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

    it('false when at least one link does not match', () => {
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
    it('array of observations', () => {
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
      const expected = {
        newText: 'Link 2',
        newUrl: 'https://example.org',
        oldText: 'Link 2',
        oldUrl: 'https://example.com',
      };
      const expectedText = {
        [MATCH]: true,
        [EMPTY]: false,
        [BOTH_EMPTY]: false,
        [LENGTHS_MATCH]: true,
        [SIMILARITY_PERCENTAGE]: '100%',
        [SIMILARITY]: SIMILARITY_EXACT,
        [WHITESPACE]: true,
        [ASCII]: false,
      };
      const expectedUrl = {
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
      };

      const result = deepCompare(linkLists, comparison, entry);

      expect(result[0]).to.deep.include(expected);
      expect(result[0].text).to.deep.include(expectedText);
      expect(result[0].url).to.deep.include(expectedUrl);
    });
  });

  describe('comparePageLinks', () => {
    it('comparisons and anomalies when links do not match', () => {
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
        unknown: 1,
      };

      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal(expected);
    });

    it('zero comparisons and anomalies when links match', () => {
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
        unknown: 0,
      };

      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('reportAnomalies', () => {
    it('count of anomalies', () => {
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

      expect(anomalies).to.deep.equal({
        observations: 1,
        anomalies: 1,
        unknownAnomalies: 0,
      });
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
    it('extracts links from markdown', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);

      expect(sourceLinks).to.be.an('array');
      expect(updatedLinks).to.be.an('array');

      expect(sourceLinks.length).to.equal(31);
      expect(updatedLinks.length).to.equal(31);
      expect(sourceLinks[0]).to.deep.include({
        children: [
          {
            type: 'text',
            value: 'What Adobe Experience Manager is',
          },
        ],
        url: 'https://main--business-website--adobe.hlx.page/blog/basics/adobe-experience-manager#what-is-adobe-experience-manager',
      });
    });
  });

  describe('getLinkLists', () => {
    it('extracts link lists from markdown', async () => {
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
    it('all links match when updated correctly', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      const match = exactMatch(linkLists);
      expect(match).to.equal(true);
    });

    it('all links do not match when links are mismatched', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, mismatchedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      const match = exactMatch(linkLists);
      expect(match).to.equal(false);
    });
  });

  describe('deepCompare', () => {
    it('no observations when links match', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);

      const observations = deepCompare(linkLists, comparison, entry);
      expect(observations).to.be.an('array');
      expect(observations.length).to.equal(0);
    });

    it('array of observations when links do not match', async () => {
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
    it('multiple anomalies when links do not match', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, shuffledMdast);
      const linkLists = getLinkLists(sourceLinks, updatedLinks);
      const observations = deepCompare(linkLists, comparison, entry);
      const anomalies = reportAnomalies(observations, comparison, entry);

      expect(anomalies).to.deep.equal({
        observations: 30,
        anomalies: 4,
        unknownAnomalies: 26,
      });
    });
  });

  describe('comparePageLinks', () => {
    it('no comparisons and anomalies when links match', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, updatedMdast);
      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal({ comparisons: 0, anomalies: 0, unknown: 0 });
    });

    it('multiple comparisons and anomalies when links do not match', async () => {
      const { sourceLinks, updatedLinks } = await getMarkdownLinks(sourceMdast, shuffledMdast);
      const result = comparePageLinks(sourceLinks, updatedLinks, comparison, entry);

      expect(result).to.deep.equal({ comparisons: 30, anomalies: 4, unknown: 26 });
    });
  });
});

describe('Validate Mock Folders', () => {
  const listPath = `${pathname}/mocks/list.json`;
  const mdPath = `${pathname}/mocks/md-mocks`;

  describe('comparePage', () => {
    it('no comparisons and anomalies when links match', async () => {
      const entry = '/affinity-diagram-guide';
      const comparison = ['source', 'updated'];
      const result = await comparePage(mdPath, comparison, entry);
      expect(result).to.deep.equal({ comparisons: 0, anomalies: 0, unknown: 0 });
    });

    it('multiple comparisons and anomalies when links do not match', async () => {
      const entry = '/affinity-diagram-guide';
      const comparison = ['source', 'mismatch'];
      const result = await comparePage(mdPath, comparison, entry);
      expect(result).to.deep.equal({ comparisons: 3, anomalies: 0, unknown: 3 });
    });
  });

  describe('comparePages', async () => {
    it('no comparisons and anomalies when links match', async () => {
      const comparison = ['source', 'updated'];
      const listData = await loadListData(listPath);

      const results = await comparePages(listData, mdPath, comparison);
      expect(results).to.deep.equal({
        pages: 5,
        pageAnomalies: 0,
        comparisons: 0,
        anomalies: 0,
        unknown: 0,
      });
    });

    it('multiple comparisons and anomalies when links do not match', async () => {
      const comparison = ['source', 'mismatch'];
      const listData = await loadListData(listPath);

      const results = await comparePages(listData, mdPath, comparison);
      expect(results).to.deep.equal({
        pages: 5,
        pageAnomalies: 0,
        comparisons: 3,
        anomalies: 0,
        unknown: 3,
      });
    });
  });
});
