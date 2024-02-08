import { expect } from '@esm-bundle/chai';
import { getBlockInfo, init, report, loadFragments, getLetterScheme } from '../../faas-variations-report/report.js';
import { loadDocument } from '../../bulk-update/document-manager/document-manager.js';
import BaseReporter from '../../bulk-update/reporter/reporter.js';

const { pathname } = new URL('.', import.meta.url);

describe('FaaS Variations Report', () => {
  describe('getBlockInfo', () => {
    const tests = [
      ['Block(option1, Option2)', { blockName: 'block', options: ['option1', 'option2'], variant: 'block (option1, option2)' }],
      ['Block(option1)', { blockName: 'block', options: ['option1'], variant: 'block (option1)' }],
      ['block', { blockName: 'block', options: [], variant: 'block' }],
    ];

    tests.forEach(([input, expectedOutput]) => {
      it(`converts correct block information from '${input}' to '${expectedOutput.variant}'`, () => {
        expect(getBlockInfo(input)).to.deep.equal(expectedOutput);
      });
    });
  });

  describe('getVariantName', () => {
    const tests = [[0, 'A'], [25, 'Z'], [26, 'AA'], [51, 'AZ'], [52, 'BA'], [77, 'BZ'], [78, 'CA'], [701, 'ZZ'], [702, 'AAA']];
    tests.forEach(([input, expectedOutput]) => {
      it(`converts correct variant number from '${input}' to '${expectedOutput}'`, () => {
        expect(getLetterScheme(input)).to.equal(expectedOutput);
      });
    });

    const unexpectedInput = [-1, -100, '', 'A', '1'];
    unexpectedInput.forEach((input) => {
      it(`converts unexpected input "${input}" to an empty string`, () => {
        expect(getLetterScheme(input)).to.eql('');
      });
    });
  });

  describe('variations', () => {
    const initConfig = async (entry) => {
      const config = await init(entry);
      config.siteUrl = 'https://main--bacom--adobecom.hlx.test';
      config.mdDir = `${pathname}mock`;
      config.mdCacheMs = -1;
      config.reporter = new BaseReporter();
      return config;
    };

    const getReport = async (entry) => {
      const config = await initConfig(entry);
      const document = await loadDocument(entry, config);
      const variations = await report(document);
      return variations;
    };

    it('reports variations text block with paragraph link', async () => {
      const entry = '/au/resources/webinars/extending-content-for-every-interaction';
      const result = [{
        hash: '47e05f2b52a71da3eb4ce6c63f995997408d4401',
        structure: "root > gridTable 'text' > gtBody > gtRow > gtCell > paragraph > link",
        variant: 'A',
      }];

      const variations = await getReport(entry);
      expect(Object.values(variations)).to.deep.equal(result);
    });

    it('reports variations for text block, mobile max width variation, with paragraph link', async () => {
      const entry = '/au/resources/ebooks/5-ai-powered-strategies-for-ecommerce-personalization';
      const result = [{
        hash: '062f5c942cb9e5f80fd3d37b969740e9d5640a5c',
        structure: "root > gridTable 'text (mobile max width)' > gtBody > gtRow > gtCell > paragraph > link",
        variant: 'B',
      }];

      const variations = await getReport(entry);
      expect(Object.values(variations)).to.deep.equal(result);
    });

    it('reports variations for text block with paragraph link', async () => {
      const entry = '/au/resources/ebooks/elements-of-engagement-marketing';
      const result = [{
        hash: '47e05f2b52a71da3eb4ce6c63f995997408d4401',
        structure: "root > gridTable 'text' > gtBody > gtRow > gtCell > paragraph > link",
        variant: 'A',
      }];

      const variations = await getReport(entry);
      expect(Object.values(variations)).to.deep.equal(result);
    });

    it('reports variations for columns contained block with paragraph link', async () => {
      const entry = '/au/resources/webinars/marketos-secrets-to-social-media-marketing';
      const result = [{
        hash: 'dfa6662d4da27970a8e3b9b2c437b19617b2e0b3',
        structure: "root > gridTable 'columns (contained)' > gtBody > gtRow > gtCell > paragraph > link",
        variant: 'C',
      }];

      const variations = await getReport(entry);
      expect(Object.values(variations)).to.deep.equal(result);
    });

    it('reports variations for marquee small light block with paragraph strong link', async () => {
      const entry = '/au/resources/webinars/winning-strategies-for-b2b-ecommerce-in-2023';
      const result = [{
        hash: '022145c3a934096fc1f46b647d472e6ebc01dce1',
        structure: "root > gridTable 'marquee (small, light)' > gtBody > gtRow > gtCell > paragraph > strong > root > paragraph > link",
        variant: 'D',
      }];

      const variations = await getReport(entry);
      expect(Object.values(variations)).to.deep.equal(result);
    });

    it('reports variations for a paragraph link', async () => {
      const entry = '/au/resources/digital-trends-report';
      const result = [{
        hash: '6aac3fa46842107c5dae7739b3b378015de78928',
        structure: 'root > paragraph > link',
        variant: 'E',
      }];

      const variations = await getReport(entry);
      expect(Object.values(variations)).to.deep.equal(result);
    });
  });

  describe('loadFragments', () => {
    const document = {
      mdast: {
        children: [
          { type: 'link', url: '/fragments/fragment1' },
          { type: 'link', url: '/fragments/fragment2' },
        ],
      },
      entry: '/test-file',
    };

    it('loads fragments and update the document', async () => {
      const config = {
        siteUrl: 'https://main--bacom--adobecom.hlx.test',
        mdDir: `${pathname}mock`,
        mdCacheMs: -1,
        reporter: new BaseReporter(),
      };

      await loadFragments(document, config);

      expect(document.mdast.children[0]).to.deep.equal({
        type: 'root',
        children: [{
          type: 'paragraph',
          children: [{
            type: 'text',
            value: 'Fragment 1 content',
          }],
        }],
      });

      expect(document.mdast.children[1]).to.deep.equal({
        type: 'root',
        children: [{
          type: 'paragraph',
          children: [{
            type: 'text',
            value: 'Fragment 2 content',
          }],
        }],
      });
    });
  });
});
