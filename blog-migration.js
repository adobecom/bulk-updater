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
import { saveDocx } from './utils/docx-utils.js';
import { loadMarkdown, loadOrFetchMarkdown, readIndex } from './utils/fetch-utils.js';
import { getDateString, updateSave, migrateBlocks, migratePaths } from './utils/migration-utils.js';
import { STATUS_SUCCESS, STATUS_FAILED, STATUS_SKIPPED } from './utils/migration-utils.js';
import { convertPullQuote } from './bacom-blog/pull-quote/pull-quote-update.js';
import { imageToFigure } from './bacom-blog/figure/images-to-figure.js';
import { convertEmbed } from './bacom-blog/embed/embed.js';
import convertBanner, { BANNERS_PATH } from './bacom-blog/banner/banner.js';
import { bannerToAside } from './bacom-blog/aside/aside.js';
import { convertTagHeader, TAGS_PATH } from './bacom-blog/tag-header/tag-header.js';

const SOURCE_CACHE = 'cache';
const SOURCE_FETCH = 'fetch';
const PROJECT = 'bacom-blog';
const FROM_SITE = 'https://main--business-website--adobe.hlx.live';
const TO_SITE = 'https://main--bacom-blog--adobecom.hlx.page';
const INDEX = 'bacom-blog/bacom-blog-all.json';
const MD_DIR = 'md';
const OUTPUT_DIR = 'output';
const DOCX_DIR = 'docx';
const REPORT_DIR = 'reports';
const MIGRATION_BLOCKS = {
    'pull quote': convertPullQuote,
    'embed': convertEmbed,
    'images': imageToFigure,
    'banner': convertBanner,
};
const MIGRATION_PATHS = {
    [BANNERS_PATH]: bannerToAside,
    [TAGS_PATH]: convertTagHeader,
};

/**
 * Flatten object using key as prefix.
 * Example: obj = { blocks: ["banner"] }, prefix = '' -> return = { "blocks-0": "banner" }
 * 
 * @param {object|array} obj - object or array to flatten
 * @param {string} [prefix=''] - prefix for the keys
 * @returns {object}
 */
function flattenObject(obj, prefix = '') {
    if (typeof obj !== 'object' || obj === null) {
        return {};
    }

    return Object.entries(obj).reduce((acc, [key, value]) => {
        const newKey = prefix ? `${prefix}-${key}` : key;
        if (typeof value === 'object' && value !== null) {
            Object.assign(acc, flattenObject(value, newKey));
        } else {
            acc[newKey] = value;
        }
        return acc;
    }, {});
}

/**
 * Create Excel report
 * 
 * @param {string} project - project name
 * @param {object} report - report data
 * @returns {Promise}
 */
async function createReport(reports, reportFile) {
    const excelData = formatReportData(reports);
    const workbook = xlsx.utils.book_new();
    Object.entries(excelData).forEach(([sheetName, data]) => {
        xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(data), sheetName);
    });

    const reportDir = reportFile.substring(0, reportFile.lastIndexOf('/'));
    await mkdir(reportDir, { recursive: true });
    await xlsx.writeFile(workbook, reportFile);
}

function formatReportData(reports) {
    const statusReports = {};
    const migrationReports = {};
    const PAGE_TOTAL = 'page total';
    const MIGRATION_TOTAL = 'migration total';
    const totals = { [PAGE_TOTAL]: [], [MIGRATION_TOTAL]: [] };

    reports.forEach(({ entry, status, migrations }) => {
        const reportKey = status.save;
        statusReports[reportKey] ??= [];

        status.importUrl = `${FROM_SITE}${status.entry}`;
        const flattenedStatus = flattenObject(status);
        statusReports[reportKey].push({ entry, ...flattenedStatus });

        migrations.forEach((migration) => {
            const reportKey = migration.key;
            delete migration.key;
            migration.importUrl = `${FROM_SITE}${migration.entry}`;
            const flattenedMigration = flattenObject(migration);

            migrationReports[reportKey] ??= [];
            migrationReports[reportKey].push(flattenedMigration);
        });
    });
    let pageTotal = 0;
    let migrationTotal = 0;

    Object.entries(statusReports).forEach(([key, value]) => {
        pageTotal += value.length;
        totals[PAGE_TOTAL].push({ status: key, count: value.length });
    });
    Object.entries(migrationReports).forEach(([key, value]) => {
        migrationTotal += value.length;
        totals[MIGRATION_TOTAL].push({ migration: key, count: value.length });
    });

    totals[PAGE_TOTAL].push({ status: PAGE_TOTAL, count: pageTotal });
    totals[MIGRATION_TOTAL].push({ migration: MIGRATION_TOTAL, count: migrationTotal });
    console.log('totals', JSON.stringify(totals, null, 2));

    return { ...statusReports, ...migrationReports, ...totals };
}

/**
 * Handle migration of a page
 * 
 * @param {string} markdown - markdown content
 * @param {string} entry - page entry
 * @param {number} pageIndex - index
 * @param {boolean} cached - use cached docx files
 * @param {string} outputDir - output directory
 * @returns {Promise<Array>}
 */
async function handleMigration(markdown, entry, pageIndex, outputDir) {
    let index = 1;
    const destinationUrl = `${TO_SITE}${entry}`;
    if (!markdown) {
        console.warn(`${pageIndex} failed '${entry}': 'Markdown could not be fetched.'`);
        return [{
            status: { status: STATUS_FAILED, save: STATUS_SKIPPED, entry, message: 'Markdown could not be fetched.', destinationUrl },
            migrations: []
        }];
    }

    const mdast = await getMdast(markdown);
    const blockList = getTableMap(mdast).map(({ blockName }) => blockName);
    const blockMigrations = Object.entries(MIGRATION_BLOCKS).filter(([block]) => blockList.includes(block));
    const pathMigrations = Object.entries(MIGRATION_PATHS).filter(([path]) => entry.includes(path));

    if (!blockMigrations.length && !pathMigrations.length) {
        console.warn(`${pageIndex} skipped '${entry}': 'No blocks or paths to migrate.'`);
        return [{
            status: { status: STATUS_SKIPPED, save: STATUS_SKIPPED, entry, message: 'No blocks or paths to migrate.', destinationUrl },
            migrations: []
        }];
    }

    const file = entry.split('/').pop();
    const path = entry.split('/').slice(0, -1).join('/');
    const docxFile = `${file}.docx`;
    const basePath = `${PROJECT}${path}`;
    const sourceDocxFile = `${DOCX_DIR}/${basePath}/${docxFile}`;
    const outputDocxFile = `${outputDir}/${basePath}/${docxFile}`;

    // Crete source docx before modifying mdast
    await ensureDocxFileExists(mdast, sourceDocxFile);

    // One or more page reports
    const pageReports = [];

    // Handle block migrations
    if (blockMigrations.length > 0) {
        const blocks = blockMigrations.map(([block]) => block).join(', ');
        const blockReport = await migrateBlocks(mdast, blockMigrations, entry);

        // Save docx
        if (blockReport.status.status === STATUS_FAILED) {
            console.warn(`${pageIndex} migration ${index} ${STATUS_FAILED} '${entry}' - blocks: '${blocks}'`);
            console.warn(`${pageIndex} ${STATUS_FAILED}: '${blockReport.status.message}'`);
            blockReport.status.save = STATUS_FAILED;
            blockReport.status.saveMessage = 'Migration failed, skipping save';
        } else {
            console.log(`${pageIndex} migration ${index} ${blockReport.status.status} '${entry}' - blocks: '${blocks}'`);
            const save = await updateSave(mdast, sourceDocxFile, outputDocxFile);
            blockReport.status.save = save.status;
            blockReport.status.saveMessage = save.message;
        }

        // Add extra data to report
        blockReport.status.destinationUrl = destinationUrl;
        blockReport.status.index = pageIndex;
        blockReport.migrations.forEach(blockMigration => {
            blockMigration.destinationUrl = destinationUrl;
            blockMigration.index = pageIndex;
        });

        if (blockReport.status.save !== STATUS_SUCCESS) {
            console.warn(`${pageIndex} ${blockReport.status.save} save to '${outputDocxFile}'`);
        }

        pageReports.push(blockReport);
        index++;
    }

    // Handle path migrations
    if (pathMigrations.length > 0) {
        const pathReports = await migratePaths(mdast, pathMigrations, entry, sourceDocxFile, outputDocxFile);
        // Add extra data to report
        pathReports.forEach(({ status, migrations }) => {
            const outputEntry = status.newEntry ?? entry;
            const destinationUrl = `${TO_SITE}${outputEntry}`;

            status.destinationUrl = destinationUrl;
            status.index = pageIndex;

            migrations.forEach(migration => {
                migration.destinationUrl = destinationUrl;
                migration.index = pageIndex;
            });

            console.log(`${pageIndex} migration ${index} ${status.status} '${entry}' - path: '${status.path}'`);

            if (status.save !== STATUS_SUCCESS) {
                console.warn(`${pageIndex} ${status.save} save to '${outputDocxFile}'`);
            }
            index++;
        });
        pageReports.push(...pathReports);
    }

    return pageReports;
}

async function ensureDocxFileExists(mdast, sourceDocxFile) {
    try {
        await access(sourceDocxFile);
    } catch (e) {
        await saveDocx(mdast, sourceDocxFile);
    }
}

/**
 * Main migration function
 * 
 * @param {string} index - index JSON file
 * @param {boolean} source - use cached docx files instead of fetching
 * @param {string} outputDir - output directory
 */
export async function main(index = INDEX, source = SOURCE_CACHE, outputDir = OUTPUT_DIR) {
    const entries = await readIndex(index);

    const reports = [];
    if (entries.length === 0) {
        console.error(`No entries found in ${index}`);
        process.exit(1);
    }
    if (source === SOURCE_CACHE) {
        console.log('Using cached markdown only!');
    } else if (source === SOURCE_FETCH) {
        console.log('Using cached or fetched markdown!');
    } else {
        console.error(`Invalid source: ${source}`);
        console.error(`Expected: ${SOURCE_CACHE} or ${SOURCE_FETCH}`);
        process.exit(1);
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i].trim().toLowerCase();
        const url = `${FROM_SITE}${entry}`;
        const path = `${MD_DIR}/${PROJECT}${entry}`;
        let markdown = '';
        if (source === SOURCE_CACHE) {
            markdown = await loadMarkdown(path);
        } else if (source === SOURCE_FETCH) {
            markdown = await loadOrFetchMarkdown(url, path);
        }

        const pageReports = await handleMigration(markdown, entry, i, outputDir);
        reports.push(...pageReports);
    }

    const dateStr = getDateString();
    const migrationReportFile = `${REPORT_DIR}/${PROJECT}/Migration ${dateStr}`;
    await writeFile(`${migrationReportFile}.json`, JSON.stringify({ reports }, null, 2));
    console.log(`Report written to ${migrationReportFile}.json`);

    await createReport(reports, `${migrationReportFile}.xlsx`);
    console.log(`Report written to ${migrationReportFile}.xlsx`);
}

// node blog-migration.js "bacom-blog/bacom-blog-all.json" "cache" "output"
// node blog-migration.js <index> <source> <output>
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const [index, source, output] = args;

    await main(index, source, output);
    process.exit(0);
}
