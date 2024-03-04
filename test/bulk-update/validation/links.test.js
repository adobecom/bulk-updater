import { expect } from '@esm-bundle/chai';
import {
  compareLink,
  compareLinks,
  extractLinks,
} from '../../../bulk-update/validation/links.js';

describe('Link comparison', () => {
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
      const link1 = 'https://business.adobe.com';
      const link2 = 'https://business.adobe.com/path1';
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
      const link1 = 'https://business.adobe.com?param1=value1#hash1';
      const link2 = 'https://business.adobe.com?param2=value2#hash2';
      const result = compareLink(link1, link2);

      expect(result).to.be.true;
    });
  });

  describe('compareLinks', () => {
    it('returns true when comparing list of links with same paths', async () => {
      const links1 = ['https://business.adobe.com', 'https://business.adobe.com'];
      const links2 = ['https://business.adobe.com', 'https://business.adobe.com'];
      const result = await compareLinks(links1, links2);

      expect(result.match).to.be.true;
    });

    it('returns false when comparing list of links with different paths', async () => {
      const links1 = ['https://business.adobe.com/path1', 'https://business.adobe.com'];
      const links2 = ['https://business.adobe.com/path2', 'https://business.adobe.com'];
      const result = await compareLinks(links1, links2);

      expect(result.match).to.be.false;
    });

    it('returns false when comparing list of links with different order', async () => {
      const links1 = ['https://business.adobe.com/path1', 'https://business.adobe.com'];
      const links2 = ['https://business.adobe.com', 'https://business.adobe.com/path1'];
      const result = await compareLinks(links1, links2);

      expect(result.match).to.be.false;
    });
  });

  describe('extractLinksFromMarkdown', () => {
    it('Extracts links from Markdown content', () => {
      const content = `
        [Adobe Experience Cloud](https://business.adobe.com/)
        [Adobe Experience Cloud Blog](https://business.adobe.com/blog)
        [Resource Center](https://business.adobe.com/resources/main.html)
        [View all products](https://business.adobe.com/products/adobe-experience-cloud-products.html)
        [The Latest](https://business.adobe.com/blog/tags/the-latest)
        [LinkedIn](https://business.linkedin.com/in/test/#_blank)
      `;
      const expectedLinks = [
        'https://business.adobe.com/',
        'https://business.adobe.com/blog',
        'https://business.adobe.com/resources/main.html',
        'https://business.adobe.com/products/adobe-experience-cloud-products.html',
        'https://business.adobe.com/blog/tags/the-latest',
        'https://business.linkedin.com/in/test/#_blank',
      ];

      const links = extractLinks(content);

      expect(links).to.deep.equal(expectedLinks);
    });
  });
});
