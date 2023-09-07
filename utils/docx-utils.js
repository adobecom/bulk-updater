
import { readFile, writeFile, mkdir } from 'fs/promises';
import { mdast2docx } from '@adobe/helix-md2docx';
import yauzl from 'yauzl';

import crypto from 'crypto';
import { visit } from 'unist-util-visit';
import getDimensions from 'image-size';
import mime from 'mime';

/**
 * Save a docx file to the file system.
 *
 * @param {object} mdast 
 * @param {string} outputFolder 
 * @param {string} outputFile 
 * @param {boolean} force 
 * @returns
 */
export async function saveDocx(mdast, outputFile, force = false) {
    const outputFolder = outputFile.split('/').slice(0, -1).join('/');
    await mkdir(outputFolder, { recursive: true });

    if (force) {
        const buffer = await mdast2docx(mdast);
        await writeFile(outputFile, buffer);
        return;
    }

    try {
        await readFile(outputFile);
        console.log(`Skipping ${outputFile} as docx already exists.`);
        return;
    } catch (err) {
        const buffer = await mdast2docx(mdast);
        await writeFile(outputFile, buffer);
    }
}

/**
 * Save an updated docx file to the file system.
 *
 * @param {object} mdast 
 * @param {string} outputFolder 
 * @param {string} outputFile 
 * @param {boolean} force 
 * @returns
 */
export async function saveUpdatedDocx(mdast, sourceFile, outputFile, force = false) {
    const outputFolder = outputFile.split('/').slice(0, -1).join('/');
    await mkdir(outputFolder, { recursive: true });

    if (force) {
        const buffer = await updateDocx(mdast, sourceFile);
        await writeFile(outputFile, buffer);
        return;
    }

    try {
        await readFile(outputFile);
        console.log(`Skipping ${outputFile} as docx already exists.`);
        return;
    } catch (err) {
        const buffer = await updateDocx(mdast, sourceFile);
        await writeFile(outputFile, buffer);
    }
}

const openZipFile = (filePath) => new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => err ? reject(err) : resolve(zipfile));
});

const processStream = (readStream) => {
    const dataChunks = [];
    return new Promise((resolve, reject) => {
        readStream.on('data', chunk => dataChunks.push(chunk));
        readStream.on('end', () => resolve(Buffer.concat(dataChunks)));
        readStream.on('error', reject);
    });
};

const processEntry = (zipfile, entry) => new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, async (err, readStream) => {
        err ? reject(err) : resolve(await processStream(readStream))
    })
});

/**
 * Read and process docx specific entries.
 *
 * @param {Object} file
 * @returns {Promise}
 */
const readDocxEntries = async (file) => {
    const data = [];
    const mediaFiles = {};

    return new Promise((resolve, reject) => {
        file.on('entry', async (entry) => {
            try {
                if (entry.fileName.startsWith('word/media/') && entry.fileName !== 'word/media/') {
                    mediaFiles[entry.fileName] = await processEntry(file, entry);
                } else if (entry.fileName === 'word/styles.xml') {
                    data.push(await processEntry(file, entry));
                }
                file.readEntry();
            } catch (err) {
                reject(err);
            }
        });

        file.once('end', () => resolve({ styles: Buffer.concat(data).toString(), mediaFiles }));
        file.readEntry();
    });
};

function loadImages(mediaFiles, tree) {
    visit(tree, (node) => {
        if (node.type === 'image' && node.url) {
            const ref = crypto.createHash('sha1').update(node.url).digest('hex');
            const cleanUrl = node.url.replace(/[\?|#].*/g, '');
            const ext = cleanUrl.split('.').pop();
            const matchingFile = Object.keys(mediaFiles).find(f => f.includes(ref));
            const buffer = mediaFiles[matchingFile];

            if (!buffer) {
                throw new Error(`Image not found: ${node.url}`);
            }

            let dimensions = {};
            let type = '';
            try {
                dimensions = getDimensions(buffer);
                type = mime.getType(dimensions.type);
            } catch (e) {
                throw new Error(`Error reading dimensions: ${e} ${node.url}`);
            }

            node.url = '';
            node.data = {
                ext,
                key: `${ref}.${ext}`,
                buffer,
                type,
                dimensions,
            };
        }
        return visit.CONTINUE;
    });
}

export async function updateDocx(mdast, sourceDocxPath) {
    const sourceZip = await openZipFile(sourceDocxPath);
    const { styles, mediaFiles } = await readDocxEntries(sourceZip);

    try {
        loadImages(mediaFiles, mdast);
    } catch (e) {
        console.warn(e.message);
        return null;
    }

    return await mdast2docx(mdast, {stylesXML: styles});
}
