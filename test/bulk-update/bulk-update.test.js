import { expect } from '@esm-bundle/chai';
import { loadListData } from '../../bulk-update/bulk-update.js';

const { pathname } = new URL('.', import.meta.url);

describe('BulkUpdater', () => {
  describe('loadFromUrl', () => {
    it('should load data from a URL');
  });

  describe('loadListData', () => {
    it('should handle array input', async () => {
      const data = await loadListData(['/test/path1', '/test/path2']);

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('should handle .json file input', async () => {
      const data = await loadListData(`${pathname}mock/entries.json`);

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('should handle .txt file input', async () => {
      const data = await loadListData(`${pathname}mock/entries.txt`);

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('should handle comma-separated string input', async () => {
      const data = await loadListData('/test/path1,/test/path2');

      const expectedData = ['/test/path1', '/test/path2'];

      expect(data).to.deep.equal(expectedData);
    });

    it('should handle single string input', async () => {
      const data = await loadListData('/test/path1');

      const expectedData = ['/test/path1'];

      expect(data).to.deep.equal(expectedData);
    });

    it('should throw an error for unsupported list format', async () => {
      try {
        await loadListData('unsupported');
      } catch (err) {
        expect(err).to.exist;
        expect(err.message).to.contain('Unsupported list format or entry');
      }
    });
  });

  describe('main', () => {
    it('should call migration.init');

    it('should call migration.migrate');
  });
});
