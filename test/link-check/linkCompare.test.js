import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import { stub } from 'sinon';
import {
  compare,
  compareLink,
  compareLinks,
  extractLinks,
  extractLinksFromHtml,
  extractLinksFromMarkdown,
} from '../../link-check/linkCompare.js';

const { pathname } = new URL('.', import.meta.url);

const linkURLs = [
  'https://www.adobe.com/creativecloud.html',
  'https://www.adobe.com/products/photoshop.html',
  'https://www.adobe.com/products/illustrator.html',
  'https://www.adobe.com/products/premiere.html',
  'https://www.adobe.com/products/acrobat.html',
];

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
        { link: 0, link1: linkURLs[0], link2: linkURLs[4], match: false },
        { link: 1, link1: linkURLs[1], link2: linkURLs[3], match: false },
        { link: 2, link1: linkURLs[2], link2: linkURLs[2], match: true },
        { link: 3, link1: linkURLs[3], link2: linkURLs[1], match: false },
        { link: 4, link1: linkURLs[4], link2: linkURLs[0], match: false },
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
    it('compares omnichannel-retail-trends business website to bacom', async () => {
      const source1 = `${pathname}mock/omnichannel-retail-trends-business.md`;
      const source2 = `${pathname}mock/omnichannel-retail-trends-bacom.md`;
      const result = await compare(source1, source2);
      const json = fs.readFileSync(`${pathname}mock/omnichannel-retail-trends.json`, 'utf8');
      const expected = JSON.parse(json);

      expect(result.match).to.be.false;
      expect(result.unique).to.have.lengthOf(29);
      expect(result.links).to.have.lengthOf(36);
      expect(result.unique).to.deep.equal(expected);
    });

    it('compares 8-wastes-of-lean bacom US to FR', async () => {
      const source1 = `${pathname}mock/8-wastes-of-lean.md`;
      const source2 = `${pathname}mock/8-wastes-of-lean-fr.md`;
      const result = await compare(source1, source2);

      const json = fs.readFileSync(`${pathname}mock/8-wastes-of-lean.json`, 'utf8');
      const expected = JSON.parse(json);
      expect(result.match).to.be.false;
      expect(result.unique).to.have.lengthOf(14);
      expect(result.links).to.have.lengthOf(14);
      expect(result.links).to.deep.equal(expected);
    });
  });

  describe('extractLinksFromHtml', () => {
    it('Extracts links from HTML content', () => {
      const content = `
        <a href="https://www.adobe.com/creativecloud.html">Creative Cloud</a>
        <a href="https://www.adobe.com/products/photoshop.html">Photoshop</a>
        <a href="https://www.adobe.com/products/illustrator.html">Illustrator</a>
        <a href="https://www.adobe.com/products/premiere.html">Premiere</a>
        <a href="https://www.adobe.com/products/acrobat.html">Acrobat</a>
      `;
      const expectedLinks = [
        'https://www.adobe.com/creativecloud.html',
        'https://www.adobe.com/products/photoshop.html',
        'https://www.adobe.com/products/illustrator.html',
        'https://www.adobe.com/products/premiere.html',
        'https://www.adobe.com/products/acrobat.html',
      ];

      const links = extractLinksFromHtml(content);

      expect(links).to.deep.equal(expectedLinks);
    });

    it('Extracts links from HTML content with different attribute order', () => {
      const content = `
        <a href="https://www.adobe.com/creativecloud.html" target="_blank">Creative Cloud</a>
        <a target="_blank" href="https://www.adobe.com/products/photoshop.html">Photoshop</a>
        <a href="https://www.adobe.com/products/illustrator.html" target="_blank">Illustrator</a>
        <a target="_blank" href="https://www.adobe.com/products/premiere.html">Premiere</a>
        <a href="https://www.adobe.com/products/acrobat.html" target="_blank">Acrobat</a>
      `;
      const expectedLinks = [
        'https://www.adobe.com/creativecloud.html',
        'https://www.adobe.com/products/photoshop.html',
        'https://www.adobe.com/products/illustrator.html',
        'https://www.adobe.com/products/premiere.html',
        'https://www.adobe.com/products/acrobat.html',
      ];

      const links = extractLinksFromHtml(content);

      expect(links).to.deep.equal(expectedLinks);
    });
  });

  describe('extractLinksFromMarkdown', () => {
    it('Extracts links from Markdown content', () => {
      const content = `
        [Creative Cloud](https://www.adobe.com/creativecloud.html)
        [Photoshop](https://www.adobe.com/products/photoshop.html)
        [Illustrator](https://www.adobe.com/products/illustrator.html)
        [Premiere](https://www.adobe.com/products/premiere.html)
        [Acrobat](https://www.adobe.com/products/acrobat.html)
        [LinkedIn](https://www.linkedin.com/in/test/#_blank)
      `;
      const expectedLinks = [
        'https://www.adobe.com/creativecloud.html',
        'https://www.adobe.com/products/photoshop.html',
        'https://www.adobe.com/products/illustrator.html',
        'https://www.adobe.com/products/premiere.html',
        'https://www.adobe.com/products/acrobat.html',
        'https://www.linkedin.com/in/test/#_blank',
      ];

      const links = extractLinksFromMarkdown(content);

      expect(links).to.deep.equal(expectedLinks);
    });
  });
});
