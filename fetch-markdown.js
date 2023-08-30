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

import { mkdir, writeFile } from 'fs/promises';
import process from 'process';
import { loadMarkdown, loadIndex } from './utils/fetch-utils.js';

const MD_DIR = 'md';
const REPORT_DIR = 'reports';

/**
 * Fetches markdown files from a given project, site, and indexUrl.
 * @param {string} project - The project to parse
 * @param {string} site - The site where the markdown files are hosted
 * @param {string} indexUrl - The index file that contains the list of markdown files to parse
 * @param {boolean} cached - If true, it will use the cached version of the markdown files
 * @returns - An object with the totals and the list of failures
 */
export async function fetchMarkdown(project, site, indexUrl, cached = true) {
    const totals = { success: 0, failure: 0 };
    const failures = [];
    const entries = await loadIndex(project, indexUrl, cached);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const markdown = await loadMarkdown(`${site}${entry}`, `./${MD_DIR}/${project}${entry}`, cached);

        if (markdown === null) {
            console.warn(`Skipping ${entry} as markdown could not be fetched.`);
            failures.push(entry);
            totals.failure++;
            continue;
        }
        totals.success++;
        console.log(`${i}/${entries.length}`, entry);
    }

    return { totals, failures };
}

async function main(project, site, index, cached) {
    await mkdir(`./${project}`, { recursive: true });
    const indexUrl = `${site}${index}`;
    const report = await fetchMarkdown(project, site, indexUrl, cached);
    console.log('totals', report.totals);
    console.log('failures', report.failures);

    const reportDir = `./${REPORT_DIR}/${project}`;
    const reportFile = `${reportDir}/markdown.json`;
    await mkdir(reportDir, { recursive: true });
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`Report written to ${reportFile}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const PROJECT = 'bacom-blog';
    const SITE = 'https://main--business-website--adobe.hlx.page';
    const INDEX = '/blog/query-index.json?limit=3000';
    const USE_CACHE = true;

    const args = process.argv.slice(2);
    const [project = PROJECT, site = SITE, index = INDEX, cached = USE_CACHE] = args;

    await main(project, site, index, cached);
    process.exit(0);
}
