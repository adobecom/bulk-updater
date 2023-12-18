import { readFile, writeFile, mkdir } from "fs/promises";
import { mdast2docx } from "@adobe/helix-md2docx";
import yauzl from "yauzl";

import crypto from "crypto";
import { visit } from "unist-util-visit";
import getDimensions from "image-size";
import mime from "mime";

/**
 * Save a mdast as a docx file to the file system.
 *
 * @param {object} mdast
 * @param {string} outputFile
 * @returns {Promise<boolean>} - success
 */
export async function saveDocx(mdast, outputFile) {
  const outputFolder = outputFile.split("/").slice(0, -1).join("/");
  await mkdir(outputFolder, { recursive: true });

  try {
    const buffer = await mdast2docx(mdast);
    await writeFile(outputFile, buffer);

    return true;
  } catch (e) {
    console.warn(e.message);
    return false;
  }
}

/**
 * Save an updated mdast with source docx to the file system.
 *
 * @param {object} mdast
 * @param {string} outputFolder
 * @param {string} outputFile
 * @returns {Promise<boolean>} - success
 */
export async function updateDocx(mdast, sourceFile, outputFile) {
  const outputFolder = outputFile.split("/").slice(0, -1).join("/");
  await mkdir(outputFolder, { recursive: true });

  try {
    await readFile(sourceFile);
    const buffer = await mergeDocx(mdast, sourceFile);
    await writeFile(outputFile, buffer);
    return true;
  } catch (e) {
    console.warn(e.message);
    return false;
  }
}

/**
 * Merge mdast with source docx file.
 *
 * @param {object} mdast
 * @param {string} sourceDocxPath
 * @returns {Promise<Buffer>}
 */
async function mergeDocx(mdast, sourceDocxPath) {
  const mergeMdast = JSON.parse(JSON.stringify(mdast));
  const sourceZip = await openZipFile(sourceDocxPath);
  const { styles, mediaFiles } = await readDocxEntries(sourceZip);

  try {
    loadImages(mediaFiles, mergeMdast);
  } catch (e) {
    console.warn(e.message);
    return null;
  }

  return await mdast2docx(mergeMdast, { stylesXML: styles });
}

const openZipFile = (filePath) =>
  new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) =>
      err ? reject(err) : resolve(zipfile)
    );
  });

const processStream = (readStream) => {
  const dataChunks = [];
  return new Promise((resolve, reject) => {
    readStream.on("data", (chunk) => dataChunks.push(chunk));
    readStream.on("end", () => resolve(Buffer.concat(dataChunks)));
    readStream.on("error", reject);
  });
};

const processEntry = (zipfile, entry) =>
  new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, async (err, readStream) => {
      err ? reject(err) : resolve(await processStream(readStream));
    });
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
    file.on("entry", async (entry) => {
      try {
        if (
          entry.fileName.startsWith("word/media/") &&
          entry.fileName !== "word/media/"
        ) {
          mediaFiles[entry.fileName] = await processEntry(file, entry);
        } else if (entry.fileName === "word/styles.xml") {
          data.push(await processEntry(file, entry));
        }
        file.readEntry();
      } catch (err) {
        reject(err);
      }
    });

    file.once("end", () =>
      resolve({ styles: Buffer.concat(data).toString(), mediaFiles })
    );
    file.readEntry();
  });
};

function loadImages(mediaFiles, tree) {
  visit(tree, (node) => {
    if (node.type === "image" && node.url) {
      const ref = crypto.createHash("sha1").update(node.url).digest("hex");
      const cleanUrl = node.url.replace(/[\?|#].*/g, "");
      const ext = cleanUrl.split(".").pop();
      const matchingFile = Object.keys(mediaFiles).find((f) => f.includes(ref));
      const buffer = mediaFiles[matchingFile];

      if (!buffer) {
        throw new Error(`Image not found: ${node.url}`);
      }

      let dimensions = {};
      let type = "";
      try {
        dimensions = getDimensions(buffer);
        type = mime.getType(dimensions.type);
      } catch (e) {
        throw new Error(`Error reading dimensions: ${e} ${node.url}`);
      }

      node.url = "";
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
