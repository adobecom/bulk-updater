import { expect } from '@esm-bundle/chai';
import { readFile } from 'fs/promises';
import { getMdast } from '../../../utils/mdast-utils.js';
import convertBanner from '../../../bacom-blog/banner/banner.js';

describe('banner', () => {
    it('converts banner block to fragment link', async () => {
        const inputPath = new URL('./mocks/banner.md', import.meta.url);
        const outputPath = new URL('./mocks/fragment.md', import.meta.url);
        const inputMd = await readFile(inputPath);
        const outputMd = await readFile(outputPath);
        const inputMdast = await getMdast(inputMd.toString());
        const outputMdast = await getMdast(outputMd.toString());
    
        convertBanner(inputMdast);
        expect(inputMdast).to.deep.equal(outputMdast);
    });

    it('converts banner block with text link to fragment link', async () => {
        const inputPath = new URL('./mocks/banner-text.md', import.meta.url);
        const outputPath = new URL('./mocks/fragment.md', import.meta.url);
        const inputMd = await readFile(inputPath);
        const outputMd = await readFile(outputPath);
        const inputMdast = await getMdast(inputMd.toString());
        const outputMdast = await getMdast(outputMd.toString());
        
        convertBanner(inputMdast);
        expect(inputMdast).to.deep.equal(outputMdast);
    });
});
