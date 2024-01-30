import { expect } from '@esm-bundle/chai';
import { stub } from 'sinon';
import BulkUpdate, { loadListData } from '../../bulk-update/bulk-update.js';

const { pathname } = new URL('.', import.meta.url);

describe('BulkUpdater', () => {
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

    it('handles a query index URL', async () => {
      const stubFetch = stub();
      stubFetch.resolves({
        ok: true,
        json: stub().resolves({
          total: 1,
          offset: 0,
          limit: 1,
          data: [
            { path: '/test/path1' },
          ],
        }),
      });
      const data = await loadListData('https://main--bacom--adobecom.hlx.live/query-index.json', stubFetch);

      expect(data).to.be.an('array');
      expect(data.length).to.equal(1);
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
      const reporter = { log: stub(), generateTotals: stub() };
      const config = {
        list: ['/', '/test-file'],
        siteUrl: 'https://main--bacom--adobecom.hlx.live',
        reporter,
        outputDir: `${pathname}output`,
        mdDir: `${pathname}mock/`,
        mdCacheMs: -1,
      };

      const migrate = stub();
      await BulkUpdate(config, migrate);
      expect(migrate.callCount).to.equal(2);
    });
  });
});
