import { expect } from '@esm-bundle/chai';
import { getBlockInfo, init, report } from '../../faas-variations-report/report.js';
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

  describe('test variations', () => {
    const tests = [
      ['/au/resources/webinars/extending-content-for-every-interaction', [{
        count: 1,
        structure: "root > gridTable 'text' > gtBody > gtRow > gtCell > paragraph > link",
      }]],
      ['/au/resources/ebooks/5-ai-powered-strategies-for-ecommerce-personalization', [{
        count: 1,
        structure: "root > gridTable 'text (mobile max width)' > gtBody > gtRow > gtCell > paragraph > link",
      }]],
      ['/au/resources/ebooks/elements-of-engagement-marketing', [{
        count: 1,
        structure: "root > gridTable 'text' > gtBody > gtRow > gtCell > paragraph > link",
      }]],
      ['/au/resources/webinars/marketos-secrets-to-social-media-marketing', [{
        count: 1,
        structure: "root > gridTable 'columns (contained)' > gtBody > gtRow > gtCell > paragraph > link",
      }]],
      ['/au/resources/webinars/winning-strategies-for-b2b-ecommerce-in-2023', [{
        count: 1,
        structure: "root > gridTable 'marquee (small, light)' > gtBody > gtRow > gtCell > paragraph > strong > root > paragraph > link",
      }]],
      ['/au/resources/digital-trends-report', [{
        count: 1,
        structure: 'root > paragraph > link',
      }]],
    ];
    tests.forEach(async ([entry, result]) => {
      it(`reports variations for ${entry}`, async () => {
        const config = await init(entry);
        config.siteUrl = 'https://main--bacom--adobecom.hlx.test';
        config.mdDir = `${pathname}mock`;
        config.mdCacheMs = -1;
        config.reporter = new BaseReporter();

        const document = await loadDocument(entry, config);
        const variations = await report(document);
        expect(Object.values(variations)).to.deep.equal(result);
      });
    });
  });
});
