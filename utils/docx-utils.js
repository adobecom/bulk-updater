
import { readFile, writeFile, mkdir } from 'fs/promises';
import { mdast2docx } from '@adobe/helix-md2docx';

/**
 * Save a docx file to the file system.
 * @param {object} mdast 
 * @param {string} outputFolder 
 * @param {string} outputFile 
 * @param {boolean} force 
 * @returns 
 */
export async function saveDocx(mdast, outputFolder, outputFile, force = false) {
    const output = `${outputFolder}/${outputFile}`;
    await mkdir(outputFolder, { recursive: true });

    if (force) {
        const buffer = await mdast2docx(mdast);
        await writeFile(output, buffer);
        return;
    }

    try {
        await readFile(output);
        console.log(`Skipping ${output} as docx already exists.`);
        return;
    } catch (err) {
        const buffer = await mdast2docx(mdast);
        await writeFile(output, buffer);
    }
}
