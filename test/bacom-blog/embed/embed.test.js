import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../utils/mdast-utils.js';
import { convertEmbed } from '../../../bacom-blog/embed/embed.js';

describe('embedToLink', () => {
  it('should convert embeds to links', async () => {
    const embedMdPath = new URL('./mocks/embed-block-youtube.md', import.meta.url);
    const linkMdPath = new URL('./mocks/auto-link.md', import.meta.url);
    const embedMd = await readFile(embedMdPath);
    const linkMd = await readFile(linkMdPath);

    const embedMdast = await getMdast(embedMd.toString());
    const linkMdast = await getMdast(linkMd.toString());

    await convertEmbed(embedMdast);
    expect(embedMdast).to.deep.equal(linkMdast);
  });

  it('should convert embeds to iframes', async () => {
    const embedMdPath = new URL('./mocks/embed-block-adobe.md', import.meta.url);
    const iframeMdPath = new URL('./mocks/iframe-block.md', import.meta.url);
    const embedMd = await readFile(embedMdPath);
    const iframeMd = await readFile(iframeMdPath);

    const embedMdast = await getMdast(embedMd.toString());
    const linkMdast = await getMdast(iframeMd.toString());

    await convertEmbed(embedMdast);
    expect(embedMdast).to.deep.equal(linkMdast);
  });

  it('should convert embeds with text links', async () => {
    const embedMdPath = new URL('./mocks/embed-block-adobe-text.md', import.meta.url);
    const iframeMdPath = new URL('./mocks/iframe-block.md', import.meta.url);
    const embedMd = await readFile(embedMdPath);
    const iframeMd = await readFile(iframeMdPath);

    const embedMdast = await getMdast(embedMd.toString());
    const linkMdast = await getMdast(iframeMd.toString());

    await convertEmbed(embedMdast);
    expect(embedMdast).to.deep.equal(linkMdast);
  });
});
