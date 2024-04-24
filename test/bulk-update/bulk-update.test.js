import { expect } from '@esm-bundle/chai';
import { stub } from 'sinon';
import BulkUpdate, { loadListData, localizedStageUrl } from '../../bulk-update/bulk-update.js';
import BaseReporter from '../../bulk-update/reporter/reporter.js';

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
      const data = await loadListData('https://main--bacom--adobecom.hlx.test/query-index.json', stubFetch, 0);

      expect(data).to.be.an('array');
      expect(data.length).to.equal(1);
    });

    it('handles a query index url from json file', async () => {
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
      const data = await loadListData(`${pathname}mock/query-indexes.json`, stubFetch, 0);

      expect(data).to.be.an('array');
      expect(data).to.deep.equal(['/test/path1', '/test/path1']);
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

    it('return an empty array if source is not provided', async () => {
      const result = await loadListData();
      expect(result).to.be.an('array');
      expect(result).to.be.empty;
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
      const config = {
        list: ['/', '/test-file'],
        siteUrl: 'https://main--bacom--adobecom.hlx.test',
        reporter,
        outputDir: `${pathname}output`,
        mdDir: `${pathname}mock`,
        mdCacheMs: -1,
      };

      const migrate = stub();
      const totals = await BulkUpdate(config, migrate);
      expect(migrate.callCount).to.equal(2);
      expect(totals).to.deep.equal({ load: { success: 2 } });
    });
  });
  describe('localizedStageUrl', () => {
    it('generates the correct staged URL without locales', () => {
      const siteUrl = 'https://example.com';
      const entry = '/test/path';
      const stagePath = '/stage';

      const expectedUrl = 'https://example.com/stage/test/path';
      const result = localizedStageUrl(siteUrl, entry, stagePath);

      expect(result).to.equal(expectedUrl);
    });

    it('generates the correct staged URL', () => {
      const siteUrl = 'https://example.com';
      const entry = '/fr/test/path';
      const stagePath = '/staged-content';
      const locales = ['fr', 'de'];

      const expectedUrl = 'https://example.com/fr/staged-content/test/path';
      const result = localizedStageUrl(siteUrl, entry, stagePath, locales);

      expect(result).to.equal(expectedUrl);
    });
  });
});
