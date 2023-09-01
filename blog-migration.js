/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { writeFile, access } from 'fs/promises';
import { getMdast, getTableMap } from './utils/mdast-utils.js';
import { saveDocx, saveUpdatedDocx } from './utils/docx-utils.js';
import { loadMarkdowns, loadIndex } from './utils/fetch-utils.js';

const PROJECT = 'bacom-blog';
const SITE = 'https://main--business-website--adobe.hlx.page';
const INDEX = '/blog/query-index.json?limit=3000';
const USE_CACHE = true;
const FORCE_SAVE = true;

const MD_DIR = 'md';
const OUTPUT_DIR = 'output';
const DOCX_DIR = 'docx';
const REPORT_DIR = 'reports';
const MIGRATION = {
    'pull quote': 'quote',
    'embed': 'embed',
    'image': 'image',
}

export async function main(index, cached, output, force) {
    const reportDir = `${REPORT_DIR}/${PROJECT}`;
    const mdDir = `${MD_DIR}/${PROJECT}`;
    const docxDir = `${DOCX_DIR}/${PROJECT}`;
    const outputDir = `${output}/${PROJECT}`;
    const totals = { succeed: 0, skipped: 0, failed: 0 };
    const failed = [];
    const indexUrl = `${SITE}${index}`;
    const entries = await loadIndex(PROJECT, indexUrl, cached);
    
    await loadMarkdowns(SITE, mdDir, entries, cached, async (markdown, entry, i) => {
        if (markdown === null) {
            console.warn(`Skipping ${entry} as markdown could not be fetched.`);
            failed.push(entry);
            totals.failed++;
            return;
        }
        try {
            const file = entry.split('/').slice(-1)[0];
            const docxFile = `${file}.docx`;
            const path = entry.split('/').slice(0, -1).join('/');
            const sourceFolder = `${docxDir}${path}`;
            const outputFolder = `${outputDir}${path}`
            const sourceDocxFile = `${sourceFolder}/${docxFile}`;
            const outputDocxFile = `${outputFolder}/${docxFile}`;

            const mdast = await getMdast(markdown);
            const tableMap = getTableMap(mdast);
            if (!tableMap.reduce((acc, block) => {
                return acc || Object.keys(MIGRATION).includes(block.blockName);
            }, false)) {
                console.log('Skipping', entry, tableMap.map(block => block.blockName));
                totals.skipped++;
                return;
            }

            if (cached) {
                try {
                    await access(sourceDocxFile);
                    console.log(`Found ${sourceDocxFile}`);
                } catch (e) {
                    console.log(`Creating ${sourceDocxFile}`);
                    await saveDocx(mdast, sourceDocxFile, force);
                }
            }

            // TODO: Migration Part 1 - Pull Quote

            // TODO: Migration Part 2 - Embed

            // TODO: Migration Part 3 - Images

            console.log(`Saving ${outputDocxFile}`);
            if (cached) {
                try {
                    await saveUpdatedDocx(mdast, sourceDocxFile, outputDocxFile, force);
                } catch (e) {
                    console.warn(`Error updating ${sourceDocxFile}`, e.message);
                    await saveDocx(mdast, outputDocxFile, force);
                }
            } else {
                await saveDocx(mdast, outputDocxFile, force);
            }

            totals.succeed++;
            console.log(`${i}/${entries.length}`, entry);
        } catch (e) {
            console.error(`Error migrating ${entry}`, e.message);
            failed.push(entry);
            totals.failed++;
        }
    });

    console.log('totals', totals);
    console.log('failed', failed);

    const migrationReport = `${reportDir}/migration.json`;
    await writeFile(migrationReport, JSON.stringify({ totals, failed }, null, 2));
    console.log(`Report written to ${migrationReport}`);
}

// node blog-migration.js <index> <cached> <output> <force>
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const [
        index = INDEX,
        cached = USE_CACHE,
        output = OUTPUT_DIR,
        force = FORCE_SAVE
    ] = args;

    await main(index, cached, output, force);
    process.exit(0);
}
