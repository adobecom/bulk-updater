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

import { writeFile, mkdir, access } from 'fs/promises';
import xlsx from 'xlsx';
import { getMdast, getTableMap } from './utils/mdast-utils.js';
import { saveDocx, saveUpdatedDocx } from './utils/docx-utils.js';
import { loadMarkdowns, readIndex } from './utils/fetch-utils.js';
import { convertPullQuote } from './bacom-blog/pull-quote/pull-quote-update.js';
import { imageToFigure } from './bacom-blog/figure/images-to-figure.js';
import { convertEmbed } from './bacom-blog/embed/embed.js';
import convertBanner, { BANNERS_PATH, FRAGMENTS_PATH } from './bacom-blog/banner/banner.js';
import { bannerToAside } from './bacom-blog/aside/aside.js';
import { convertTagHeader, TAGS_PATH } from './bacom-blog/tag-header/tag-header.js';

const PROJECT = 'bacom-blog';
const SITE = 'https://main--business-website--adobe.hlx.page';
const INDEX = 'bacom-blog/bacom-blog-all.json';
const USE_CACHE = true;
const FORCE_SAVE = true;

const MD_DIR = 'md';
const OUTPUT_DIR = 'output';
const DOCX_DIR = 'docx';
const REPORT_DIR = 'reports';
const MIGRATION = {
    'pull quote': convertPullQuote,
    'embed': convertEmbed,
    'images': imageToFigure,
    'banner': convertBanner,
}

async function updateSave(outputDocxFile, cached, mdast, sourceDocxFile, force, report, entry) {
    console.log(`Saving ${outputDocxFile}`);
    if (cached) {
        try {
            await saveUpdatedDocx(mdast, sourceDocxFile, outputDocxFile, force);
        } catch (e) {
            console.warn(`Error updating ${sourceDocxFile} ${e.message}`);
            report.warned.push({ entry, message: `Error updating ${sourceDocxFile} ${e.message}` });
            await saveDocx(mdast, outputDocxFile, force);
        }
    } else {
        await saveDocx(mdast, outputDocxFile, force);
    }
}

function getDateString() {
    return new Date().toLocaleString('en-US', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(/\/|,|:| /g, '-').replace('--', '_');
}

function reportData({ entry, ...data }, site) {
    const destinationUrl = `${site}${entry}`;
    const importUrl = `${SITE}${entry}`;
    const flattened = {};

    Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.flat(Infinity).forEach((val, index) => {
                flattened[`${key}${index + 1}`] = val;
            });
        } else {
            flattened[key] = value;
        }
    });

    return { entry, importUrl, destinationUrl, ...flattened };
}

async function createReport(project, site, { report, totals }) {
    const reportFile = `${REPORT_DIR}/${project}/Migration ${getDateString()}.xlsx`;
    const workbook = xlsx.utils.book_new();

    Object.entries(report).forEach(([key, data]) => {
        const flattenedData = data.map(item => reportData(item, site));
        xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(flattenedData), key);
    });

    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(totals), 'totals');

    const reportDir = reportFile.substring(0, reportFile.lastIndexOf('/'));
    await mkdir(reportDir, { recursive: true });
    await xlsx.writeFile(workbook, reportFile);
    console.log(`Report written to ${reportFile}`)
}

export async function main(index, cached, output, force) {
    const reportDir = `${REPORT_DIR}/${PROJECT}`;
    const mdDir = `${MD_DIR}/${PROJECT}`;
    const docxDir = `${DOCX_DIR}/${PROJECT}`;
    const outputDir = `${output}/${PROJECT}`;
    const report = { succeed: [], skipped: [], failed: [], warned: [] };
    const entries = await readIndex(index);
    Object.keys(MIGRATION).map((key) => report[key] = []);

    await loadMarkdowns(SITE, mdDir, entries, cached, async (markdown, entry, i) => {
        if (markdown === null) {
            console.warn(`${i}/${entries.length} Skipping ${entry} as markdown could not be fetched.`);
            report.failed.push({ entry, message: 'Markdown could not be fetched.' });
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
            const tableBlocks = tableMap.map((block) => block.blockName)
            const migrationMap = tableMap.filter((block) => Object.keys(MIGRATION).includes(block.blockName));
            const migrationBlocks = migrationMap.map((block) => block.blockName);

            if (migrationMap.length === 0 && !entry.includes(BANNERS_PATH) && !entry.includes(TAGS_PATH)) {
                console.log(`${i}/${entries.length} Skipping ${entry}`, tableBlocks);
                report.skipped.push({ entry, message: 'No blocks to migrate', tableBlocks });
                return;
            }

            if (cached) {
                try {
                    await access(sourceDocxFile);
                } catch (e) {
                    console.log(`Creating ${sourceDocxFile}`);
                    await saveDocx(mdast, sourceDocxFile, force);
                }
            }

            console.log(`${i}/${entries.length} Migrating ${entry}`);

            // Migrate blocks
            for (const [block, migrate] of Object.entries(MIGRATION)) {
                if (migrationBlocks.includes(block)) {
                    try {
                        const blockReport = await migrate(mdast);
                        console.log(block, blockReport);
                        report[block].push({ entry, blockReport });
                    } catch (e) {
                        console.error(`Error migrating ${block} in ${entry}`, e.message);
                        report.failed.push({ entry, message: `${block}: ${e.message}` });
                        report[block].push({ entry, message: e.message });
                        return;
                    }
                }
            }

            // Migrate banner content
            if (path.includes(BANNERS_PATH)) {
                const asideReport = await bannerToAside(mdast);
                console.log('banner-content', asideReport);
                report['aside'] = report['aside'] ? report['aside'].concat({ entry, asideReport }) : [{ entry, asideReport }];
                const fragmentPath = path.replace(BANNERS_PATH, FRAGMENTS_PATH);
                const fragmentDocxFile = `${outputDir}${fragmentPath}/${docxFile}`;
                await updateSave(fragmentDocxFile, cached, mdast, sourceDocxFile, force, report, entry);
                report.succeed.push({ entry, migratedBlocks: ['banner-content', ...migrationBlocks] });
                return;
            }

            if (path.includes(TAGS_PATH)) {
                const tagReport = await(convertTagHeader(mdast));
                console.log('tag-header', tagReport);
                report['tagReport'] = report['tagReport'] ? report['tagReport'].concat({ entry, tagReport }) : [{ entry, tagReport }];
                await updateSave(outputDocxFile, cached, mdast, sourceDocxFile, force, report, entry);
                report.succeed.push({ entry, migratedBlocks: ['tag-headers', ...migrationBlocks] });
                return;
            }

            await updateSave(outputDocxFile, cached, mdast, sourceDocxFile, force, report, entry);

            report.succeed.push({ entry, migratedBlocks: migrationBlocks });
        } catch (e) {
            console.error(`Error migrating ${entry}`, e.message);
            report.failed.push({ entry, message: e.message });
        }
    });

    const totals = Object.entries(report).map(([key, value]) => [key, value.length]);
    console.log('totals', totals);

    const dateStr = getDateString();
    const migrationReport = `${reportDir}/Migration ${dateStr}.json`;
    await writeFile(migrationReport, JSON.stringify({ report, totals }, null, 2));
    console.log(`Report written to ${migrationReport}`);
    await createReport(PROJECT, 'https://main--bacom-blog--adobecom.hlx.page', { report, totals });
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
