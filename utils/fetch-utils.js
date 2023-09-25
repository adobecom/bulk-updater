import { writeFile, readFile, mkdir } from 'fs/promises';
import { fetch } from '@adobe/fetch';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchIndex(url) {
    console.log('Fetching entries and saving locally');
    const index = await fetch(url);
    if (!index.ok) throw new Error(`Error fetching index: ${index.status}`);
    const indexData = await index.json();

    return indexData.data;
}

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
        const entriesJson = await readFile(filePath, 'utf8');
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

async function fetchMarkdown(url) {
    try {
        console.log(`Fetching markdown and saving locally: ${url}`);
        await delay(500);
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`Failed to fetch markdown. Status: ${response.status} ${response.statusText}`);
            return null;
        }
        
        return await response.text();
    } catch (error) {
        console.error('Error fetching markdown:', error);
        return null;
    }
}

async function readMarkdown(path) {
    try {
        return await readFile(path, 'utf8');
    } catch (err) {
        throw err;
    }
}

async function fetchAndWriteMarkdown(url, path) {
    try {
        const markdown = await fetchMarkdown(url);
        const folder = path.split('/').slice(0, -1).join('/');
        await mkdir(folder, { recursive: true });
        console.log(`Saving markdown to ${path}`);
        if (markdown) await writeFile(path, markdown);
        return markdown;
    } catch (error) {
        console.error('Error fetching and writing markdown:', error);
        return null;
    }
}

export async function loadMarkdown(url, path, cached = true) {
    const markdownUrl = `${url.split(/\?|#/)[0].replace(/\/$/, '/index')}.md`;
    const markdownPath = `${path.split(/\?|#/)[0].replace(/\/$/, '/index')}.md`;
    if (!cached) {
        return fetchAndWriteMarkdown(markdownUrl, markdownPath);
    }

    try {
        return await readMarkdown(markdownPath);
    } catch (err) {
        return fetchAndWriteMarkdown(markdownUrl, markdownPath);
    }
}
/**
 * 
 * @param {string} site 
 * @param {string} folder 
 * @param {Array} entries 
 * @param {boolean} cached 
 * @param {function(string, string, number)} callback 
 */
export async function loadMarkdowns(site, folder, entries, cached = true, callback = null) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const markdown = await loadMarkdown(`${site}${entry}`, `${folder}${entry}`, cached);
        if (callback && typeof callback === 'function') {
            await callback(markdown, entry, i);
        }
    }
}
