/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { writeFile } from 'fs/promises';
import { mdast2docx } from '@adobe/helix-md2docx';
import { mkdir } from 'fs'; 
import {
    fetchText,
    getMdast,
    getTable,
  } from '../utils/mdast-utils.js';

async function setEntries(entry) {
    const entries = await import(`./path-files/${entry}`, {assert: {type: 'json'}});

    return entries.default.paths;
}

function getLocaleFromEntry(entry) {
    return entry.split('-')[0];
}

/**
 * A variation of the "getLeaf" function. Removes the second conditional check for
 * "!node.children", which was returning the incorrect item
 * 
 * 
 * @param {object} node / mdast json object with children
 * @param {string} type / a type, like "link"
 * @returns 
 */
const getLink = (node, type) => {
    if (node?.type === type) return node;
  
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const item = getLink(node.children[i], type);
        if (item) return item;
      }
    }
    return undefined;
};

async function generateFixedDocs(entry = '') {
    if (entry === '' || typeof entry !== 'string') {
        console.log('No valid entry input');
        return;
    }

    console.time('running-generateFixedDocs');
    const entries = await setEntries(entry);
    const locale = getLocaleFromEntry(entry);

    console.log(`Creating sub directory for locale: ${locale}`);
    await mkdir(`./docs/${locale}`, (err) => {
        if (err) {
            return console.error(err);
        }
        console.log(`${locale} directory created successfully!`);
     });

    const incorrectURL = `https://business.adobe.com/${locale}`;
    console.log(`Setting the URL to fix: ${incorrectURL}`);

    console.log('Fetching entries and saving locally');
    for (const entry of entries) {
        console.log(`Working on ${entry}, saving to subdirectory under locale: ${locale}`);

        const text = await fetchText(entry);
        const mdast = await getMdast(text);
        const breadcrumbs = getTable(mdast, 'breadcrumbs');
        const homeLink = getLink(breadcrumbs[0].table, 'link');
        let linkToChange;

        if (homeLink) linkToChange = homeLink.url;

        console.log('Looking at link', homeLink, linkToChange, linkToChange == incorrectURL);

        if (homeLink && homeLink.url === incorrectURL) {
            console.log('Changing homeLink')
            homeLink.url = 'https://business.adobe.com/'
            console.log(`Changed: ${homeLink.url}`)
        }

        const fileName = `${entry.split('/').pop().split('.md').shift()}.docx`;
        const buffer = await mdast2docx(mdast);

        await writeFile(`./docs/${locale}/${fileName}`, buffer);

        console.log(`Saved ${fileName}`);
    };
    console.timeEnd('running-generateFixedDocs');
    process.exit(0);
}

async function main() {
    // To replace w/ list parsing through 'path-files/a-path-key.json. See example below'
    const testIndex = 'it-customer-success-stories-query-index.json';

    await generateFixedDocs(testIndex);

    // const queryPaths = await import(`./path-files/a-path-key.json`, {assert: {type: 'json'}});

    // queryPaths.default.forEach((path) => {
    //     await generateFixedDocs(path);
    // })
}

await main();
