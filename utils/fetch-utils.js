import { writeFile, readFile, mkdir } from "fs/promises";
import { fetch } from "@adobe/fetch";

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Index */

/**
 * Fetches index from a given URL.
 *
 * @param {string} url - The url to fetch the index file
 * @returns {Promise<Array<string>>} - The index data
 */
async function fetchIndex(url) {
  const urlObj = new URL(url);
  console.log(`Fetching index from ${urlObj.toString()}`);
  const index = await fetch(urlObj.toString());
  if (!index.ok) throw new Error(`Error fetching index: ${index.status}`);
  const indexData = await index.json();

  return indexData.data;
}

/**
 * Fetches index from a given URL and saves it locally.
 *
 * @param {string} url - The url to fetch the index file
 * @param {string} filePath - The path to save the index file
 * @returns {Promise<Array<string>>} - The index entries
 */
async function fetchAndWriteIndex(url, filePath) {
  const entries = await fetchIndex(url);
  const paths = entries.map((entry) => entry.path);
  await writeFile(filePath, JSON.stringify(paths, null, 2));

  return paths;
}

/**
 * Read the index file and return the paths.
 *
 * @param {string} filePath
 * @returns {Promise<Array<string>>}
 */
export async function readIndex(filePath) {
  try {
    const entriesJson = await readFile(filePath, "utf8");
    return JSON.parse(entriesJson);
  } catch (err) {
    throw err;
  }
}

/**
 * Load the index file. If the cached flag is true, it will try to read the index file
 *
 * @param {string} project
 * @param {string} url
 * @param {boolean} cached
 * @returns {Promise<Array<string>>}
 */
export async function loadIndex(project, url, cached = true) {
  const filePath = `./${project}.json`;

  if (!cached) {
    return fetchAndWriteIndex(url, filePath);
  }

  try {
    return await readIndex(filePath);
  } catch (err) {
    return fetchAndWriteIndex(url, filePath);
  }
}

/** Markdown */

/**
 * Format the markdown path.
 *
 * @param {string} entry - The index entry or URL
 * @returns {string} - The markdown path
 */
function formatMarkdownPath(entry) {
  // Make sure URLs ending in a slash are fetched as index
  return `${entry.split(/\?|#/)[0].replace(/\/$/, "/index")}.md`;
}

/**
 * Fetches or reads a markdown file from a given URL or local path, and optionally saves it locally.
 *
 * If the `readPath` option is provided, the function tries to read the markdown from the local filesystem.
 * If the `url` option is provided, the function fetches the markdown from the given URL.
 * If the `savePath` option is provided, and the markdown is fetched from a URL, it saves the markdown to the specified local path.
 *
 * @param {object} options - The options object.
 * @param {string} [options.url] - The URL to fetch the markdown file from.
 * @param {string} [options.readPath] - The local path to read the markdown file from.
 * @param {string} [options.savePath] - The local path to save the fetched markdown to.
 * @returns {Promise<string|null>} - The markdown content as a string or null if not found or an error occurred.
 */
async function getMarkdown(options = {}) {
  const { url, readPath, savePath } = options;

  if (readPath) {
    try {
      return await readFile(readPath, "utf8");
    } catch {
      console.warn(`Markdown not found at path '${readPath}'`);
    }
  }

  if (url) {
    let markdown = null;
    try {
      await delay(500); // Wait 500ms to avoid rate limiting
      const urlObj = new URL(url);
      const response = await fetch(urlObj.href);

      if (!response.ok) {
        console.error(
          `Failed to fetch markdown. '${urlObj.href}' '${response.status}' '${response.statusText}'`
        );
        return null;
      }
      markdown = await response.text();
      if (markdown && savePath) {
        const folder = savePath.split("/").slice(0, -1).join("/");
        await mkdir(folder, { recursive: true });
        await writeFile(savePath, markdown);
        console.log(`Saved markdown to '${savePath}'`);
      }

      return markdown;
    } catch (e) {
      console.warn(`Markdown not found at url '${url}' '${e.message}'`);
    } finally {
      return markdown || null;
    }
  }

  return null;
}

/**
 * Read the markdown file and return the markdown string.
 *
 * @param {string} entry - The index entry
 * @returns {Promise<string>} - The markdown string
 */
export async function loadMarkdown(entry) {
  const markdownPath = formatMarkdownPath(entry);
  return await getMarkdown({ readPath: markdownPath });
}

/**
 * Fetches markdown files from a given URL and saves them locally.
 *
 * @param {string} url - The url to fetch the markdown file
 * @param {string} entry - The index entry
 */
export async function loadOrFetchMarkdown(url, entry) {
  const markdownUrl = formatMarkdownPath(url);
  const markdownPath = formatMarkdownPath(entry);

  return await getMarkdown({
    url: markdownUrl,
    readPath: markdownPath,
    savePath: markdownPath,
  });
}

/**
 * Load the markdown file and save it.
 *
 * @param {string} url - The url to fetch the markdown file
 * @param {string} entry - The index entry
 * @param {boolean} cached - Use cached markdown files
 * @returns {Promise<string>} - The markdown string
 */
export async function fetchMarkdown(url, entry) {
  const markdownUrl = formatMarkdownPath(url);
  const markdownPath = formatMarkdownPath(entry);

  return await getMarkdown({ url: markdownUrl, savePath: markdownPath });
}
/**
 *
 * @param {string} site
 * @param {string} folder
 * @param {Array} entries
 * @param {boolean} cached
 * @param {function(string, string, number)} callback
 */
export async function loadMarkdowns(site, folder, entries, callback = null) {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const url = `${site}${entry}`;
    const path = `${folder}${entry}`;
    const markdown = await loadMarkdown({ url, entry: path, output: path });
    if (callback && typeof callback === "function") {
      await callback(markdown, entry, i);
    }
  }
}
