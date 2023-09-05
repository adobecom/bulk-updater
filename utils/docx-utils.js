
import { readFile, writeFile, mkdir } from 'fs/promises';
import { mdast2docx } from '@adobe/helix-md2docx';
import yauzl from 'yauzl';
import docx from 'docx';

import all from '@adobe/helix-md2docx/src/mdast2docx/all.js';
import handlers from '@adobe/helix-md2docx/src/mdast2docx/handlers/index.js';
import numbering from '@adobe/helix-md2docx/src/mdast2docx/default-numbering.js';
import sanitizeHtml from '@adobe/helix-md2docx/src/mdast2docx/mdast-sanitize-html.js';
import { findXMLComponent } from '@adobe/helix-md2docx/src/mdast2docx/utils.js';

import crypto from 'crypto';
import { visit } from 'unist-util-visit';
import getDimensions from 'image-size';
import mime from 'mime';

const { Document, Packer } = docx;

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

async function documentSection(mdast) {
    const ctx = {
        handlers,
        style: {},
        paragraphStyle: '',
        images: {},
        listLevel: -1,
        lists: [],
        console,
    };

    mdast = sanitizeHtml(mdast);
    return await all(ctx, mdast);
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

    const children = await documentSection(mdast);
    const doc = new Document({
        numbering,
        externalStyles: styles,
        sections: [{
            children,
        }],
    });

    // temporary hack for problems with online word
    const cn = doc.numbering.concreteNumberingMap.get('default-bullet-numbering');
    cn.root[0].root.numId = 1;
    cn.numId = 1;

    // temporary hack for problems with lists in online word
    for (const nb of doc.numbering.abstractNumberingMap.values()) {
        nb.root.forEach((attr) => {
            if (attr.rootKey !== 'w:lvl') {
                return;
            }
            const jc = findXMLComponent(attr, 'w:lvlJc');
            if (jc) {
                const idx = attr.root.indexOf(jc);
                attr.root.splice(idx, 1);
                attr.root.push(jc);
            }
        });
    }

    return Packer.toBuffer(doc);
}
