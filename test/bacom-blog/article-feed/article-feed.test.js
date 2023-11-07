import updateArticleFeed from '../../../bacom-blog/article-feed/article-feed.js';
import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../utils/mdast-utils.js';

describe('Article Feed', () => {
    it('adds feed url to au pages', async () => {
        const input = new URL('./mocks/input.md', import.meta.url);
        const inputMd = await readFile(input, 'utf8');
        const inputMdast = await getMdast(inputMd);
        const output = new URL('./mocks/output.json', import.meta.url);
        const outputJson = await readFile(output, 'utf8');
        const outputMdast = JSON.parse(outputJson);

        updateArticleFeed(inputMdast, '/au/blog/');
        expect(outputMdast).to.deep.equal(inputMdast);
    });

    it('adds feed url to uk pages', async () => {
        const input = new URL('./mocks/input.md', import.meta.url);
        const inputMd = await readFile(input, 'utf8');
        const inputMdast = await getMdast(inputMd);
        const output = new URL('./mocks/outputUk.json', import.meta.url);
        const outputJson = await readFile(output, 'utf8');
        const outputMdast = JSON.parse(outputJson);

        updateArticleFeed(inputMdast, '/uk/blog/');
        expect(outputMdast).to.deep.equal(inputMdast);
    });

    it('makes no change to non-uk or -au pages', async () => {
        const input = new URL('./mocks/input.md', import.meta.url);
        const inputMd = await readFile(input, 'utf8');
        const inputMdast = await getMdast(inputMd);

        updateArticleFeed(inputMdast, '/blog/');
        expect(inputMdast).to.deep.equal(inputMdast);
    });
});
