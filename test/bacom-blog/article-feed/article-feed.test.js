import updateArticleFeed from '../../../bacom-blog/article-feed/article-feed.js';
import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../utils/mdast-utils.js';

describe('Article Feed', () => {
    it('adds feed url to au and uk pages', async () => {
        const input = new URL('./mocks/input.md', import.meta.url);
        const inputMd = await readFile(input, 'utf8');
        const inputMdast = await getMdast(inputMd);
        const output = new URL('./mocks/output.json', import.meta.url);
        const outputJson = await readFile(output, 'utf8');
        const outputMdast = JSON.parse(outputJson);

        updateArticleFeed(inputMdast, '/au/blog/');
        expect(outputMdast).to.deep.equal(inputMdast);
    })
});
