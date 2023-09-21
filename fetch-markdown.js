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
import { loadMarkdowns, loadIndex } from './utils/fetch-utils.js';

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
    const totals = { succeed: 0, failed: 0 };
    const report = { failed: [], succeed: [] };
    const entries = await loadIndex(project, indexUrl, cached);
    const mdFolder = `./${MD_DIR}/${project}`;

    await loadMarkdowns(site, mdFolder, entries, cached, (markdown, entry, i) => {
        if (markdown === null) {
            console.warn(`Skipping ${entry} as markdown could not be fetched.`);
            report.failed.push(entry);
            totals.failed++;
        } else {
            report.succeed.push(entry);
            totals.succeed++;
            console.log(`${i}/${entries.length}`, entry);
        }
    });

    return { totals, report };
}

async function main(project, site, index, cached) {
    const indexUrl = `${site}${index}`;
    const { totals, report } = await fetchMarkdown(project, site, indexUrl, cached);
    console.log('totals', totals);
    console.log('failed', report.failed);

    const dateStr = new Date().toLocaleString('en-US', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\/|,|:| /g, '-').replace('--', '_');
    const reportDir = `./${REPORT_DIR}/${project}`;
    const reportFile = `${reportDir}/markdown ${dateStr}.json`;
    await mkdir(reportDir, { recursive: true });
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`Report written to ${reportFile}`);
}

// node fetch-markdown.js <project> <site> <index> <cached>
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
