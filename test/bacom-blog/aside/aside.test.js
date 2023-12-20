import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import { select } from 'unist-util-select';
import { getMdast, mdast2md } from '../../../utils/mdast-utils.js';
import { bannerToAside } from '../../../bacom-blog/aside/aside.js';

const OUTPUT_FILE = 'test/bacom-blog/aside/aside.docx';

describe('convertBannerToAside', () => {
  describe('Aside Structure', () => {
    it('should create table row and cells', async () => {
      const bannerMd = await readFile(
        new URL('./mocks/banner-with-image.md', import.meta.url),
        'utf8',
      );
      const bannerMdast = await getMdast(bannerMd);

      await bannerToAside(bannerMdast, OUTPUT_FILE);

      const mdastBody = select('gtBody', bannerMdast);
      const headerRow = mdastBody.children[0];
      const tableName = select('gtCell paragraph text', headerRow);

      const tableRow = select('gtRow', bannerMdast);
      const tableCell = select('gtCell', tableRow);

      expect(tableRow).to.not.be.null;
      expect(tableCell).to.not.be.null;
      expect(tableName.value).to.equal('aside (inline)');
    });

    it('should move image correctly', async () => {
      const bannerMdPath = new URL(
        './mocks/banner-with-image.md',
        import.meta.url,
      );
      const bannerMd = await readFile(bannerMdPath, 'utf8');
      const bannerMdast = await getMdast(bannerMd);

      await bannerToAside(bannerMdast, OUTPUT_FILE);

      const mdastBody = select('gtBody', bannerMdast);
      const contentRow = mdastBody.children[2];
      const contentCell = contentRow.children[0];
      const image = select('image', contentCell);

      expect(image).to.not.be.null;
      expect(image.type).to.equal('image');
    });
  });

  describe('Banner Conversion', () => {
    it('should convert banner to aside with image', async () => {
      const bannerMdPath = new URL(
        './mocks/banner-with-image.md',
        import.meta.url,
      );
      const asideMdPath = new URL(
        './mocks/aside-with-image.md',
        import.meta.url,
      );
      const bannerMd = await readFile(bannerMdPath, 'utf8');
      const asideMd = await readFile(asideMdPath, 'utf8');

      const bannerMdast = await getMdast(bannerMd);
      const asideMdast = await getMdast(asideMd);

      await bannerToAside(bannerMdast, OUTPUT_FILE);

      expect(bannerMdast.type).to.equal('root');

      const imageNode = select('image', bannerMdast);
      expect(imageNode).to.not.be.null;

      const mdast = await getMdast(mdast2md(bannerMdast));
      expect(mdast).to.deep.equal(asideMdast);
    });

    it('should convert banner to aside without image', async () => {
      const bannerMdPath = new URL(
        './mocks/banner-without-image.md',
        import.meta.url,
      );
      const asideMdPath = new URL(
        './mocks/aside-without-image.md',
        import.meta.url,
      );
      const bannerMd = await readFile(bannerMdPath, 'utf8');
      const asideMd = await readFile(asideMdPath, 'utf8');
      const bannerMdast = await getMdast(bannerMd);
      const asideMdast = await getMdast(asideMd);

      await bannerToAside(bannerMdast, OUTPUT_FILE);

      expect(bannerMdast.type).to.equal('root');

      const imageNode = select('image', bannerMdast);
      expect(imageNode).to.be.null;

      const mdast = await getMdast(mdast2md(bannerMdast));
      expect(mdast).to.deep.equal(asideMdast);
    });
  });
});
