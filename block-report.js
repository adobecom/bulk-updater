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

import xlsx from 'xlsx';
import { mkdir } from 'fs/promises';
import process from 'process';
import { getMdast, getTableMap, getNodesByType } from './utils/mdast-utils.js';
import { loadMarkdowns, loadIndex } from './utils/fetch-utils.js';

const MD_DIR = 'md';
const REPORT_DIR = 'reports';

export async function runReport(project, site, indexUrl, cached = true) {
    const report = {};
    const totals = { blocks: {}, variants: {} };
    const entries = await loadIndex(project, indexUrl, cached);
    const mdFolder = `./${MD_DIR}/${project}`;

    await loadMarkdowns(site, mdFolder, entries, cached, async (markdown, entry, i) => {
        if (markdown === null) {
            console.warn(`Skipping ${entry} as markdown could not be fetched.`);
            return;
        }

        const entryReport = {
            blocks: [],
            links: [],
        };
        const mdast = await getMdast(markdown);
        const tableMap = getTableMap(mdast);

        for (let j = 0; j < tableMap.length; j++) {
            const table = tableMap[j];
            const { blockName, options } = table;
            const blockReport = {
                name: blockName,
                index: j,
                links: [],
            };
            if (options) {
                const variant = blockName + ' (' + options.join(', ') + ')';
                blockReport.variant = variant;
                totals.variants[variant] = (totals.variants[variant] || 0) + 1;
            }
            totals.blocks[blockName] = (totals.blocks[blockName] || 0) + 1;

            const links = getNodesByType(table.table, 'link');
            links.forEach(({ url }) => {
                blockReport.links.push(url);
            });
            entryReport.blocks.push(blockReport);
        };

        const links = getNodesByType(mdast, 'link');
        links?.forEach((link) => {
            const { url } = link;
            entryReport.links.push(url);
        });
        report[entry] = entryReport;
        console.log(`${i}/${entries.length}`, entry, entryReport.blocks.map(block => block.name));
    });

    return { report, totals };
}

export async function createReports(project, site, { report, totals }) {
    const allBlocks = Object.keys(totals.blocks).sort();
    const ws_data = [['Path', 'URL', ...allBlocks]];

    // Block Entries
    console.log('creating block entries sheet');
    for (const entry in report) {
        const blocks = allBlocks.map((key) => report[entry].blocks.reduce((acc, block) => {
            return acc + (block.name === key ? 1 : 0);
        }, 0));
        const row = [entry, `${site}${entry}`, ...blocks];
        ws_data.push(row);
    }
    const wb = xlsx.utils.book_new();
    const ws_entries = xlsx.utils.aoa_to_sheet(ws_data);
    xlsx.utils.book_append_sheet(wb, ws_entries, 'Entries');

    // Variants
    console.log('creating variants sheet');
    const allVariants = Object.keys(totals.variants).sort();
    const variantsData = [['Path', 'URL', ...allVariants]];
    for (const entry in report) {
        const variants = allVariants.map((key) => report[entry].blocks.reduce((acc, block) => {
            return acc + (block.variant === key ? 1 : 0);
        }, 0));
        if (variants.reduce((acc, val) => acc + val, 0) > 0) {
            const row = [entry, `${site}${entry}`, ...variants];
            variantsData.push(row);
        }
    }
    const ws_variants = xlsx.utils.aoa_to_sheet(variantsData);
    xlsx.utils.book_append_sheet(wb, ws_variants, 'Variants');

    // Links
    console.log('creating links sheet');
    const linksData = [['Path', 'URL', 'Links']];
    for (const entry in report) {
        const row = [entry, `${site}${entry}`, ...report[entry].links];
        linksData.push(row);
    }
    const ws_links = xlsx.utils.aoa_to_sheet(linksData);
    xlsx.utils.book_append_sheet(wb, ws_links, 'All Links');

    // Block Links
    console.log('creating block links sheet');
    const blockLinksData = [['Path', 'URL', 'Block', 'Index', 'Links']];
    for (const entry in report) {
        report[entry].blocks.map((block) => {
            if (block.links.length === 0) return;
            const row = [entry, `${site}${entry}`, block.name, block.index, ...block.links];
            blockLinksData.push(row);
        });
    }
    const ws_blocklinks = xlsx.utils.aoa_to_sheet(blockLinksData);
    xlsx.utils.book_append_sheet(wb, ws_blocklinks, 'Block Links');

    // Totals
    console.log('creating totals sheet');
    const ws_totals = xlsx.utils.aoa_to_sheet([['Block', 'Total'], ...Object.entries(totals.blocks)]);
    xlsx.utils.book_append_sheet(wb, ws_totals, 'Totals');

    const dateStr = new Date().toLocaleString('en-US', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\/|,|:| /g, '-').replace('--', '_');

    const reportDir = `./${REPORT_DIR}/${project}`;
    const reportFile = `${reportDir}/Report ${dateStr}.xlsx`
    await mkdir(reportDir, { recursive: true });
    await xlsx.writeFile(wb, reportFile);
    console.log(`Report written to ${reportFile}`);
}

async function main(project, site, index, cached) {
    await mkdir(`./${project}`, { recursive: true });

    const indexUrl = `${site}${index}`;
    const report = await runReport(project, site, indexUrl, cached);

    console.log('totals', report.totals);
    await createReports(project, site, report);
}

// node block-report.js <project> <site> <index> <cached>
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
