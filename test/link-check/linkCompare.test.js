import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import { stub } from 'sinon';
import { compare, compareLink, compareLinks, extractLinks } from '../../link-check/linkCompare.js';
import createMocks from './createMocks.js';

const { pathname } = new URL('.', import.meta.url);

const linkURLs = [
  'https://www.adobe.com/creativecloud.html',
  'https://www.adobe.com/products/photoshop.html',
  'https://www.adobe.com/products/illustrator.html',
  'https://www.adobe.com/products/premiere.html',
  'https://www.adobe.com/products/acrobat.html',
];

describe('Link comparison', () => {
  before(async () => {
    let links1 = '# Links';
    linkURLs.forEach((link) => {
      links1 += `\n- [Adobe](${link})`;
    });
    createMocks(links1, 'links1');
    let links2 = '# Links';
    linkURLs.slice().reverse().forEach((link) => {
      links2 += `\n- [Adobe](${link})`;
    });
    createMocks(links2, 'links2');
  });

  describe('compareLink', () => {
    it('returns true when comparing two identical links', () => {
      const link1 = 'https://business.adobe.com';
      const link2 = 'https://business.adobe.com';
      const result = compareLink(link1, link2);

      expect(result).to.be.true;
    });

    it('returns false when comparing two links with different paths', () => {
      const link1 = 'https://business.adobe.com/path1';
      const link2 = 'https://business.adobe.com/path2';
      const result = compareLink(link1, link2);
      expect(result).to.be.false;
    });

    it('returns false when comparing two different links', () => {
      const link1 = 'https://www.adobe.com';
      const link2 = 'https://business.adobe.com';
      const result = compareLink(link1, link2);
      expect(result).to.be.false;
    });

    it('returns true when comparing two links with different casing', () => {
      const link1 = 'https://Business.Adobe.COM';
      const link2 = 'https://business.adobe.com';
      const result = compareLink(link1, link2);

      expect(result).to.be.true;
    });

    it('returns true when comparing two links with different query parameters', () => {
      const link1 = 'https://business.adobe.com?param1=value1';
      const link2 = 'https://business.adobe.com?param2=value2';
      const result = compareLink(link1, link2);

      expect(result).to.be.true;
    });

    it('returns true when comparing two links with different hashes', () => {
      const link1 = 'https://business.adobe.com#hash1';
      const link2 = 'https://business.adobe.com#hash2';
      const result = compareLink(link1, link2);

      expect(result).to.be.true;
    });

    it('returns true when comparing two links with different query parameters and hashes', () => {
      const link1 = 'https://www.adobe.com?param1=value1#hash1';
      const link2 = 'https://www.adobe.com?param2=value2#hash2';
      const result = compareLink(link1, link2);

      expect(result).to.be.true;
    });
  });

  describe('compareLinks', () => {
    it('returns true when comparing list of links with same paths', async () => {
      const links1 = ['https://www.adobe.com', 'https://business.adobe.com'];
      const links2 = ['https://www.adobe.com', 'https://business.adobe.com'];
      const result = await compareLinks(links1, links2);

      expect(result.match).to.be.true;
    });

    it('returns false when comparing list of links with different paths', async () => {
      const links1 = ['https://www.adobe.com/path1', 'https://business.adobe.com'];
      const links2 = ['https://www.adobe.com/path2', 'https://business.adobe.com'];
      const result = await compareLinks(links1, links2);

      expect(result.match).to.be.false;
    });

    it('returns false when comparing list of links with different order', async () => {
      const links1 = ['https://business.adobe.com', 'https://www.adobe.com'];
      const links2 = ['https://www.adobe.com', 'https://business.adobe.com'];
      const result = await compareLinks(links1, links2);

      expect(result.match).to.be.false;
    });
  });

  describe('extractLinks', () => {
    it('Extracts links from a Markdown file', async () => {
      const source = `${pathname}mock/links1.md`;
      const links = await extractLinks(source);

      expect(links).to.deep.equal(linkURLs);
    });

    it('Extracts links from a Docx file', async () => {
      const source = `${pathname}mock/links1.docx`;
      const links = await extractLinks(source);

      expect(links).to.deep.equal(linkURLs);
    });

    it('Extracts links from an HTML URL', async () => {
      const source = 'https://busness.adobe.com/test.html';
      const content = fs.readFileSync(`${pathname}mock/links1.html`, 'utf8');
      const stubFetch = stub().resolves({ ok: true, text: stub().resolves(content) });
      const links = await extractLinks(source, stubFetch);

      expect(links).to.deep.equal(linkURLs);
    });
  });

  describe('compare', () => {
    it('Compares links from same Markdown file', async () => {
      const source = `${pathname}mock/links1.md`;
      const result = await compare(source, source);

      expect(result.match).to.be.true;
      expect(result.unique).to.have.lengthOf(0);
      expect(result.links).to.have.lengthOf(5);
    });

    it('Compares links from different Markdown files', async () => {
      const source1 = `${pathname}mock/links1.md`;
      const source2 = `${pathname}mock/links2.md`;
      const result = await compare(source1, source2);

      expect(result.match).to.be.false;
      expect(result.unique).to.have.lengthOf(4);
      expect(result.links).to.deep.equal([
        { index: 0, link1: linkURLs[0], link2: linkURLs[4], match: false },
        { index: 1, link1: linkURLs[1], link2: linkURLs[3], match: false },
        { index: 2, link1: linkURLs[2], link2: linkURLs[2], match: true },
        { index: 3, link1: linkURLs[3], link2: linkURLs[1], match: false },
        { index: 4, link1: linkURLs[4], link2: linkURLs[0], match: false },
      ]);
    });

    it('Compares links from Markdown and HTML files', async () => {
      const source1 = `${pathname}mock/links1.md`;
      const source2 = 'https://business.adobe.com/links1.html';
      const html = fs.readFileSync(`${pathname}mock/links1.html`, 'utf8');
      const stubFetch = stub().resolves({ ok: true, text: stub().resolves(html) });
      const result = await compare(source1, source2, stubFetch);

      expect(result.match).to.be.true;
      expect(result.unique).to.have.lengthOf(0);
      expect(result.links).to.have.lengthOf(5);
    });

    it('Compares links from Markdown and Docx files', async () => {
      const source1 = `${pathname}mock/links1.md`;
      const source2 = `${pathname}mock/links1.docx`;
      const result = await compare(source1, source2);

      expect(result.match).to.be.true;
      expect(result.unique).to.have.lengthOf(0);
      expect(result.links).to.have.lengthOf(5);
    });

    it('Compares links from Docx and HTML files', async () => {
      const source1 = `${pathname}mock/links2.docx`;
      const source2 = 'https://business.adobe.com/links2.html';
      const html = fs.readFileSync(`${pathname}mock/links2.html`, 'utf8');
      const stubFetch = stub().resolves({ ok: true, text: stub().resolves(html) });
      const result = await compare(source1, source2, stubFetch);

      expect(result.match).to.be.true;
      expect(result.unique).to.have.lengthOf(0);
      expect(result.links).to.have.lengthOf(5);
    });
  });

  describe('Compares real files', () => {
    it('omnichannel-retail-trends business website to bacom', async () => {
      const source1 = `${pathname}mock/omnichannel-retail-trends-business.md`;
      const source2 = `${pathname}mock/omnichannel-retail-trends-bacom.md`;
      const result = await compare(source1, source2);

      expect(result.match).to.be.false;
      expect(result.unique).to.have.lengthOf(29);
      expect(result.links).to.have.lengthOf(36);
      expect(result.unique).to.deep.equal([
        {
          index: 0,
          link1: 'https://www.statista.com/topics/871/online-shopping/#topicHeader__wrapper',
          link2: 'https://business.adobe.com/blog/the-latest/7-data-analytics-trends-for-2022#topicHeader__wrapper',
          match: false,
        },
        {
          index: 2,
          link1: 'https://business.adobe.com/blog/basics/omnichannel-retail-trends#the-omnichannel-journey-expands',
          link2: 'https://venturebeat.com/ai/report-76-of-consumers-would-stop-doing-business-with-a-company-after-just-one-bad-customer-experience/#the-omnichannel-journey-expands',
          match: false,
        },
        {
          index: 8,
          link1: 'https://www.census.gov/library/stories/2022/04/ecommerce-sales-surged-during-pandemic.html#:\\~:text=According%20to%20the%20most%20recent,to%20%24815.4%20billion%20in%202020.',
          link2: 'https://main--bacom-blog--adobecom.hlx.page/blog/fragments/increasing-digital-commerce-sales-using-ar-and-3d-s608',
          match: false,
        },
        {
          index: 9,
          link1: 'https://delighted.com/blog/omnichannel-retail-consumer-trends',
          link2: 'https://business.adobe.com/blog/basics/omnichannel-retail-trends#:~:text=According%20to%20the%20most%20recent,to%20%24815.4%20billion%20in%202020.',
          match: false,
        },
        {
          index: 10,
          link1: 'https://nrf.com/media-center/press-releases/retail-returns-increased-761-billion-2021-result-overall-sales-growth',
          link2: 'https://delighted.com/blog/omnichannel-retail-consumer-trends',
          match: false,
        },
        {
          index: 11,
          link1: 'https://mint.intuit.com/blog/money-etiquette/buying-local-statistics-survey/',
          link2: 'https://nrf.com/media-center/press-releases/retail-returns-increased-761-billion-2021-result-overall-sales-growth',
          match: false,
        },
        {
          index: 12,
          link1: 'https://www.barilliance.com/10-reasons-shopping-cart-abandonment/',
          link2: 'https://mint.intuit.com/blog/money-etiquette/buying-local-statistics-survey/',
          match: false,
        },
        {
          index: 13,
          link1: 'https://www.nosto.com/ecommerce-statistics/return-rate/',
          link2: 'https://www.barilliance.com/10-reasons-shopping-cart-abandonment/',
          match: false,
        },
        {
          index: 14,
          link1: 'https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/how-covid-19-has-pushed-companies-over-the-technology-tipping-point-and-transformed-business-forever',
          link2: 'https://www.census.gov/library/stories/2022/04/ecommerce-sales-surged-during-pandemic.html',
          match: false,
        },
        {
          index: 15,
          link1: 'https://www.grocerydive.com/news/pandemic-fueled-omnichannel-shopping-surge-here-to-stay-nielsen/592748/',
          link2: 'https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/how-covid-19-has-pushed-companies-over-the-technology-tipping-point-and-transformed-business-forever',
          match: false,
        },
        {
          index: 16,
          link1: 'https://www.mckinsey.com/business-functions/growth-marketing-and-sales/our-insights/survey-us-consumer-sentiment-during-the-coronavirus-crisis',
          link2: 'https://www.nosto.com/ecommerce-statistics/return-rate/',
          match: false,
        },
        {
          index: 17,
          link1: 'https://www.statista.com/statistics/1251145/social-commerce-sales-worldwide/',
          link2: 'https://main--bacom-blog--adobecom.hlx.page/blog/fragments/digital-trends-report',
          match: false,
        },
        {
          index: 18,
          link1: 'https://business.adobe.com/blog/basics/social-media-marketing-strategy',
          link2: 'https://www.thinkwithgoogle.com/consumer-insights/consumer-trends/trending-visual-stories/augmented-reality-shopping-data',
          match: false,
        },
        {
          index: 19,
          link1: 'https://www.thinkwithgoogle.com/marketing-strategies/video/in-store-video-shopping-behavior/',
          link2: 'https://www.grocerydive.com/news/pandemic-fueled-omnichannel-shopping-surge-here-to-stay-nielsen/592748/',
          match: false,
        },
        {
          index: 20,
          link1: 'https://business.adobe.com/blog/basics/personalization',
          link2: 'https://www.statista.com/statistics/1251145/social-commerce-sales-worldwide/',
          match: false,
        },
        {
          index: 21,
          link1: 'https://www.epsilon.com/us/about-us/pressroom/new-epsilon-research-indicates-80-of-consumers-are-more-likely-to-make-a-purchase-when-brands-offer-personalized-experiences',
          link2: 'https://business.adobe.com/blog/basics/personalization',
          match: false,
        },
        {
          index: 22,
          link1: 'https://venturebeat.com/ai/report-76-of-consumers-would-stop-doing-business-with-a-company-after-just-one-bad-customer-experience/',
          link2: 'https://www.epsilon.com/us/about-us/pressroom/new-epsilon-research-indicates-80-of-consumers-are-more-likely-to-make-a-purchase-when-brands-offer-personalized-experiences',
          match: false,
        },
        {
          index: 23,
          link1: 'https://www.omnisend.com/blog/omnichannel-statistics/',
          link2: 'https://www.statista.com/topics/871/online-shopping/',
          match: false,
        },
        {
          index: 24,
          link1: 'https://business.adobe.com/products/analytics/attribution.html',
          link2: 'https://www.omnisend.com/blog/omnichannel-statistics/',
          match: false,
        },
        {
          index: 26,
          link1: 'https://business.adobe.com/uk/blog/perspectives/the-future-of-retail-in-a-cookie-free-world',
          link2: 'https://business.adobe.com/products/magento/magento-commerce.html',
          match: false,
        },
        {
          index: 27,
          link1: 'https://www.mckinsey.com/business-functions/growth-marketing-and-sales/our-insights/survey-us-consumer-sentiment-during-the-coronavirus-crisis',
          link2: 'https://business.adobe.com/uk/blog/perspectives/the-future-of-retail-in-a-cookie-free-world',
          match: false,
        },
        {
          index: 28,
          link1: 'https://marketplace.magento.com/magecomp-magento-2-out-of-stock-notification.html',
          link2: 'https://business.adobe.com/products/analytics/attribution.html',
          match: false,
        },
        {
          index: 29,
          link1: 'https://business.adobe.com/blog/basics/inventory-management',
          link2: 'https://marketplace.magento.com/magecomp-magento-2-out-of-stock-notification.html',
          match: false,
        },
        {
          index: 30,
          link1: 'https://business.adobe.com/blog/basics/just-in-time-inventory-management-learn-what-it-is-and-why-its-important',
          link2: 'https://www.mckinsey.com/business-functions/growth-marketing-and-sales/our-insights/survey-us-consumer-sentiment-during-the-coronavirus-crisis',
          match: false,
        },
        {
          index: 31,
          link1: 'https://business.adobe.com/blog/basics/vendor-managed-inventory-benefits-risks-best-practices',
          link2: 'https://business.adobe.com/blog/basics/just-in-time-inventory-management-learn-what-it-is-and-why-its-important',
          match: false,
        },
        {
          index: 32,
          link1: 'https://www.thinkwithgoogle.com/consumer-insights/consumer-trends/trending-visual-stories/augmented-reality-shopping-data',
          link2: 'https://business.adobe.com/blog/basics/vendor-managed-inventory-benefits-risks-best-practices',
          match: false,
        },
        {
          index: 33,
          link1: 'https://business.adobe.com/products/magento/magento-commerce.html',
          link2: 'https://www.mckinsey.com/business-functions/growth-marketing-and-sales/our-insights/survey-us-consumer-sentiment-during-the-coronavirus-crisis',
          match: false,
        },
        {
          index: 34,
          link1: 'https://business.adobe.com/products/magento/magento-commerce.html#adobe-commerce-features',
          link2: 'https://business.adobe.com/blog/basics/social-media-marketing-strategy',
          match: false,
        },
        {
          index: 35,
          link1: 'https://business.adobe.com/resources/experience-magento.html',
          link2: 'https://business.adobe.com/products/magento/magento-commerce.html#watch-video',
          match: false,
        },
      ]);
    });

    it('8-wastes-of-lean bacom US to FR', async () => {
      const source1 = `${pathname}mock/8-wastes-of-lean.md`;
      const source2 = `${pathname}mock/8-wastes-of-lean-fr.md`;
      const result = await compare(source1, source2);

      expect(result.match).to.be.false;
      expect(result.unique).to.have.lengthOf(14);
      expect(result.links).to.have.lengthOf(14);
      expect(result.links).to.deep.equal([
        {
          index: 0,
          link1: 'https://business.adobe.com/blog/basics/lean',
          link2: 'https://www.workfront.com/project-management/methodologies/lean#_dnt',
          match: false,
        },
        {
          index: 1,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#transportation',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean#transports',
          match: false,
        },
        {
          index: 2,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#inventory',
          link2: 'https://business.adobe.com/fr/products/workfront/tour.html#surstockage',
          match: false,
        },
        {
          index: 3,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#motion',
          link2: 'https://business.adobe.com/blog/basics/lean#mouvements-inutiles',
          match: false,
        },
        {
          index: 4,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#waiting',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean#temps-dattente',
          match: false,
        },
        {
          index: 5,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#overproduction',
          link2: 'https://business.adobe.com/blog/basics/product-backlogs-and-how-they-optimize-your-agile-experience#surproduction',
          match: false,
        },
        {
          index: 6,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#overprocessing',
          link2: 'https://business.adobe.com/fr/products/workfront/main.html#traitements-inutiles',
          match: false,
        },
        {
          index: 7,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#defects',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean#défauts',
          match: false,
        },
        {
          index: 8,
          link1: 'https://business.adobe.com/blog/basics/8-wastes-of-lean#skills-or-unused-talent',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean#sous-utilisation-des-compétences-ou-talents-non-utilisés',
          match: false,
        },
        {
          index: 9,
          link1: 'https://business.adobe.com/blog/basics/what-is-kanban',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean',
          match: false,
        },
        {
          index: 10,
          link1: 'https://business.adobe.com/blog/basics/product-backlogs-and-how-they-optimize-your-agile-experience',
          link2: 'https://www.workfront.com/project-management/methodologies/lean/gemba-walk#_dnt',
          match: false,
        },
        {
          index: 11,
          link1: 'https://business.adobe.com/products/workfront/main.html',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean',
          match: false,
        },
        {
          index: 12,
          link1: 'https://business.adobe.com/products/workfront/main.html#main',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean#_dnt',
          match: false,
        },
        {
          index: 13,
          link1: 'https://business.adobe.com/products/workfront/tour.html',
          link2: 'https://business.adobe.com/fr/blog/basics/8-wastes-of-lean',
          match: false,
        },
      ]);
    });
  });
});
