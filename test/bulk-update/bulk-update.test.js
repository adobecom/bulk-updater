import { expect } from '@esm-bundle/chai';
import { main, loadFromUrl, loadListData } from '../../bulk-update/bulk-update.js';
import BaseReporter from '../../bulk-update/reporter/reporter.js';

const { pathname } = new URL('.', import.meta.url);

describe('BulkUpdater', () => {
  describe('loadFromUrl', () => {
    it('loads query index from a URL', async () => {
      const url = 'https://main--bacom--adobecom.hlx.live/query-index.json';
      const json = await loadFromUrl(url);

      expect(json).to.be.an('object');
      expect(json).to.have.property('data');
      expect(json.total).to.be.a('number');
    });
  });

  describe('loadListData', () => {
    it('handles array input', async () => {
      const data = await loadListData(['/test/path1', '/test/path2']);

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('handles .json file input', async () => {
      const data = await loadListData(`${pathname}mock/entries.json`);

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('handles .txt file input', async () => {
      const data = await loadListData(`${pathname}mock/entries.txt`);

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('handles comma-separated string input', async () => {
      const data = await loadListData('/test/path1,/test/path2');

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('handles single string input', async () => {
      const data = await loadListData('/test/path1');

      const expectedData = ['/test/path1'];

      expect(data).to.deep.equal(expectedData);
    });

    it('throws an error for unsupported list format', async () => {
      try {
        await loadListData('unsupported');
      } catch (err) {
        expect(err).to.exist;
        expect(err.message).to.contain('Unsupported list format or entry');
      }
    });
  });

  describe('main', () => {
    it('runs migration example', async () => {
      const reporter = new BaseReporter();
      const totals = await main('migration-example', ['/'], reporter);

      expect(totals).to.deep.equal({
        'hello world': { success: 1 },
        load: { success: 1 },
        save: { success: 1 },
      });
    });
  });
});
