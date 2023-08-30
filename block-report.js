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
import { loadMarkdown, loadIndex } from './utils/fetch-utils.js';

const MD_DIR = 'md';
const REPORT_DIR = 'reports';

export async function runReport(project, site, indexUrl, cached = true) {
    const blocks = {};
    const variants = {};
    const allLinks = {};
    const blockLinks = {};
    const totals = { blocks: {}, variants: {} };
    const entries = await loadIndex(project, indexUrl, cached);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        blocks[entry] = {};
        const folder = `./${MD_DIR}/${project}${entry.split('/').slice(0, -1).join('/')}`;
        await mkdir(`./${folder}`, { recursive: true });

        const markdown = await loadMarkdown(`${site}${entry}`, `./${MD_DIR}/${project}${entry}`, cached);

        if (markdown === null) {
            console.warn(`Skipping ${entry} as markdown could not be fetched.`);
            continue;
        }

        const mdast = await getMdast(markdown);
        const tableMap = getTableMap(mdast);

        for (let j = 0; j < tableMap.length; j++) {
            const table = tableMap[j];
            const { blockName, options } = table;
            if (options) {
                const variant = blockName + ' (' + options.join(', ') + ')';
                variants[entry] = variants[entry] || {};
                variants[entry][variant] = (variants[entry][variant] || 0) + 1;
                totals.variants[variant] = (totals.variants[variant] || 0) + 1;
            }
            blocks[entry][blockName] = (blocks[entry][blockName] || 0) + 1;
            totals.blocks[blockName] = (totals.blocks[blockName] || 0) + 1;

            const links = getNodesByType(table.table, 'link');
            const name = entry + ',' + blockName + ',' + j;
            blockLinks[name] = blockLinks[name] || [];
            links.forEach((link) => {
                const { url } = link;
                blockLinks[name].push(url);
            });
        };

        const links = getNodesByType(mdast, 'link');
        if (links) {
            links.forEach((link) => {
                const { url } = link;
                allLinks[entry] = allLinks[entry] || [];
                allLinks[entry].push(url);
            });
        }

        console.log(`${i}/${entries.length}`, entry, blocks[entry]);
    }

    return { blocks, variants, allLinks, blockLinks, totals };
}

export async function createReport(site, project, report) {
    const { blocks, variants, allLinks, blockLinks, totals } = report;
    const allBlocks = Object.keys(totals.blocks).sort();
    const ws_data = [['Path', 'URL', ...allBlocks]];

    for (const entry in blocks) {
        const blockValues = allBlocks.map((key) => blocks[entry][key] || 0);
        const row = [entry, `${site}${entry}`, ...blockValues];
        ws_data.push(row);
    }

    const wb = xlsx.utils.book_new();
    const ws_entries = xlsx.utils.aoa_to_sheet(ws_data);
    xlsx.utils.book_append_sheet(wb, ws_entries, 'Entries');

    const allVariants = Object.keys(totals.variants).sort();
    const variantsData = [['Path', 'URL', ...allVariants]];
    for (const entry in variants) {
        const blocks = allVariants.map((key) => variants[entry][key] || 0);
        const row = [entry, `${site}${entry}`, ...blocks];
        variantsData.push(row);
    }
    const ws_variants = xlsx.utils.aoa_to_sheet(variantsData);
    xlsx.utils.book_append_sheet(wb, ws_variants, 'Variants');

    const linksData = [['Path', 'URL', 'Links']];
    for (const entry in allLinks) {
        const row = [entry, `${site}${entry}`, ...allLinks[entry]];
        linksData.push(row);
    }
    const ws_links = xlsx.utils.aoa_to_sheet(linksData);
    xlsx.utils.book_append_sheet(wb, ws_links, 'All Links');

    const blockLinksData = [['Path', 'URL', 'Block', 'Index', 'Links']];
    for (const entry in blockLinks) {
        const [entryName, blockName, index] = entry.split(',');
        const row = [entryName, `${site}${entryName}`, blockName, index, ...blockLinks[entry]];
        blockLinksData.push(row);
    }
    const ws_blocklinks = xlsx.utils.aoa_to_sheet(blockLinksData);
    xlsx.utils.book_append_sheet(wb, ws_blocklinks, 'Block Links');

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

    await createReport(site, project, report);
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
