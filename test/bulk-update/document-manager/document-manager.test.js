import { expect } from '@esm-bundle/chai';
import fs from 'fs';
import { loadDocument, saveDocument, entryToPath } from '../../../bulk-update/document-manager/document-manager.js';
import BaseReporter from '../../../bulk-update/reporter/reporter.js';

const { pathname } = new URL('.', import.meta.url);

const config = {
  mdDir: `${pathname}mock/`,
  siteUrl: 'https://main--bacom--adobecom.hlx.live',
  reporter: new BaseReporter(),
  mdCacheMs: 0,
  outputDir: `${pathname}output/`,
};

const markdown = 'Test file\n';
const mdast = {
  type: 'root',
  children: [
    {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          value: 'Test file',
        },
      ],
    },
  ],
};

describe('DocumentManager', () => {
  beforeEach(() => {
    config.reporter = new BaseReporter();
  });

  describe('entryToPath', () => {
    const tests = [
      ['/', '/index'],
      ['/test-file', '/test-file'],
      ['/test-path/', '/test-path/index'],
      ['/test-path/test-file', '/test-path/test-file'],
      ['/test-file.html', '/test-file'],
      ['/test-file.html#anchor', '/test-file'],
      ['/test-file.html?query=string', '/test-file'],
      ['/test-file.html?query=string#anchor', '/test-file'],
    ];

    tests.forEach(([entry, path]) => {
      it(`converts ${entry} to ${path}`, () => {
        expect(entryToPath(entry)).to.equal(path);
      });
    });
  });

  describe('loadDocument', () => {
    it('loads a local file', async () => {
      const entry = 'test-file';
      config.mdCacheMs = -1;

      const document = await loadDocument(entry, config);
      expect(document).to.deep.equal({
        entry,
        path: 'test-file',
        markdown,
        mdast,
        markdownFile: `${pathname}mock/test-file.md`,
        url: 'https://main--bacom--adobecom.hlx.live/test-file',
      });
    });

    it('loads a mock file');

    it.skip('loads a draft file', async () => {
      const entry = '/';
      config.mdDir = null;
      config.siteUrl = 'https://main--bacom--adobecom.hlx.page';
      config.waitMs = 0;

      const document = await loadDocument(entry, config);
      expect(document.url).to.equal('https://main--bacom--adobecom.hlx.page/index');
      expect(document.markdown).to.not.be.empty;
      expect(document.mdast).to.not.be.empty;
    });

    it('loads a live file', async () => {
      const entry = '/';
      config.mdDir = null;
      config.siteUrl = 'https://main--bacom--adobecom.hlx.live';
      config.waitMs = 0;

      const document = await loadDocument(entry, config);
      expect(document.url).to.equal('https://main--bacom--adobecom.hlx.live/index');
      expect(document.markdown).to.not.be.empty;
      expect(document.mdast).to.not.be.empty;
    });
  });

  describe('saveDocument', () => {
    it('saves a file', async () => {
      const document = {
        entry: 'test-file',
        mdast,
      };
      await saveDocument(document, config);
      const report = config.reporter.getReport();
      expect(report.logs.save).to.have.lengthOf(1);
      expect(report.logs.save[0]).to.deep.equal({
        status: 'success',
        message: 'Saved docx to',
        0: `${config.outputDir}test-file.docx`,
      });

      const filepath = `${config.outputDir}${document.entry}.docx`;
      expect(fs.existsSync(filepath)).to.be.true;
    });
  });
});
