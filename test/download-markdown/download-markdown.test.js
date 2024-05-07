import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import { downloadMarkdown, downloadMDs, downloadMD, fetchMarkdown } from '../../download-markdown/download-markdown.js';

const { pathname } = new URL('.', import.meta.url);

const fetchFn = async (url) => {
  const markdownContent = '# Sample Markdown Content';
  const parsedUrl = new URL(url);
  switch (parsedUrl.pathname) {
    case '/staged/file.md':
    case '/fr/staged/file.md':
      return new Promise((resolve) => {
        resolve({ ok: true, text: () => markdownContent });
      });
    default:
      return new Promise((resolve) => {
        resolve({ ok: false });
      });
  }
};

describe('download-markdown', () => {
  const outputDir = `${pathname}output`;

  describe('fetchMarkdown', () => {
    it('fetch the content of a markdown file from a specified URL', async () => {
      const url = 'https://business.adobe.com/staged/file.md';
      const fetchWaitMs = 0;

      const markdownContent = await fetchMarkdown(url, fetchWaitMs, fetchFn);
      expect(markdownContent).to.be.a('string');
      expect(markdownContent).to.not.be.empty;
    });
  });

  describe('downloadMD', () => {
    it('download a single markdown file from a specified URL and save it to a folder', async () => {
      const entry = 'file';
      const url = `https://business.adobe.com/staged/${entry}`;

      const success = await downloadMD(url, outputDir, entry, fetchFn);
      expect(success).to.be.true;
      expect(fs.existsSync(`${outputDir}/file.md`)).to.be.true;
    });
  });

  describe('downloadMDs', () => {
    it('download multiple markdown files from a list of staged URLs and save them to a specified folder', async () => {
      const stagedUrls = [
        ['file', 'https://business.adobe.com/staged/file'],
        ['fr/file', 'https://business.adobe.com/fr/staged/file']];

      const failed = await downloadMDs(stagedUrls, outputDir, fetchFn);
      expect(failed).to.be.empty;
      expect(fs.existsSync(`${outputDir}/file.md`)).to.be.true;
      expect(fs.existsSync(`${outputDir}/fr/file.md`)).to.be.true;
    });
  });

  describe('downloadMarkdown', () => {
    it('download markdown files from a list of URLs and save them to a specified folder', async () => {
      const list = ['/file', '/fr/file'];
      const locales = ['fr'];
      const siteURL = 'https://business.adobe.com';
      const stagePath = '/staged';

      const failed = await downloadMarkdown(outputDir, list, locales, siteURL, stagePath, fetchFn);
      expect(failed).to.be.empty;
      expect(fs.existsSync(`${outputDir}/file.md`)).to.be.true;
      expect(fs.existsSync(`${outputDir}/fr/file.md`)).to.be.true;
    });
  });
});
