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

import { readFile, writeFile, mkdir } from 'fs/promises';
import { glob } from 'glob';
import { fetchMarkdown } from './fetch-markdown.js';
import { getMdast, getTableMap, getNodesByType } from './utils/mdast-utils.js';
import { saveDocx } from './utils/docx-utils.js';

const PROJECT = 'bacom-blog';
const SITE = 'https://main--business-website--adobe.hlx.page';
const INDEX = '/blog/query-index.json?limit=3000';
const USE_CACHE = true;
const FORCE_SAVE = false;

const MD_DIR = 'md';
const OUTPUT_DIR = 'output';
const REPORT_DIR = 'reports';

export async function main(index, cached, output, force) {
    const reportDir = `${REPORT_DIR}/${PROJECT}`;
    const mdDir = `${MD_DIR}/${PROJECT}`;
    const outputDir = `${output}/${PROJECT}`;
    const totals = { success: 0, failed: 0 };
    const failures = [];

    const indexUrl = `${SITE}${index}`;
    const mdReport = await fetchMarkdown(PROJECT, SITE, indexUrl, cached);

    console.log('totals', mdReport.totals);
    console.log('failures', mdReport.failures);
    const mdReportFile = `${reportDir}/markdown.json`;
    await mkdir(reportDir, { recursive: true });
    await writeFile(mdReportFile, JSON.stringify(mdReport, null, 2));
    console.log(`Report written to ${mdReportFile}`);

    const entries = glob.sync(`./${MD_DIR}/${PROJECT}/**/*.md`);
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        try {
            const markdown = await readFile(entry, 'utf8');
            const mdast = await getMdast(markdown);

            // TODO: Migration Part 1 - Pull Quote

            // TODO: Migration Part 2 - Embed

            // TODO: Migration Part 3 - Images

            const mdPath = entry.split('/').slice(0, -1).join('/');
            const outputFolder = mdPath.replace(mdDir, outputDir);

            const mdFile = entry.split('/').slice(-1)[0];
            const outputFile = `${mdFile.split('.').slice(0, -1).join('.')}.docx`;

            console.log(`Saving ${outputFile}`);
            // TODO: Merge with existing docx instead of create new one
            await saveDocx(mdast, outputFolder, outputFile, force);

            totals.success++;
            console.log(`${i}/${entries.length}`, entry);
        } catch (e) {
            console.error(`Error migrating ${entry}`, e);
            failures.push(entry);
            totals.failed++;
        }
    }
    console.log('totals', totals);
    console.log('failures', failures);

    const migrationReport = `${reportDir}/migration.json`;
    await writeFile(migrationReport, JSON.stringify({ totals, failures }, null, 2));
    console.log(`Report written to ${migrationReport}`);
}

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
