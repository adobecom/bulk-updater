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
import { STATUS_SUCCESS, STATUS_FAILURE, STATUS_SKIPPED } from './utils/migration-utils.js';
import { convertPullQuote } from './bacom-blog/pull-quote/pull-quote-update.js';
import { imageToFigure } from './bacom-blog/figure/images-to-figure.js';
import { convertEmbed } from './bacom-blog/embed/embed.js';
import convertBanner, { BANNERS_PATH } from './bacom-blog/banner/banner.js';
import { bannerToAside } from './bacom-blog/aside/aside.js';
import { convertTagHeader, TAGS_PATH } from './bacom-blog/tag-header/tag-header.js';

const SOURCE_CACHE = 'cache';
const SOURCE_FETCH = 'fetch';
const PROJECT = 'bacom-blog';
const FROM_SITE = 'https://main--business-website--adobe.hlx.page';
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
 * Process report data for Excel by organizing and flattening data
 * 
 * @param {Array} data - report status or migration
 * @returns {Array}
 */
function reportData(data) {
    return data.map(page => {
        const { entry, destinationUrl, ...rest } = page;
        if (!destinationUrl) {
            console.warn(`No destination URL for ${entry}`);
        }
        const importUrl = `${FROM_SITE}${entry}`;
        const flattenedData = flattenObject(rest);

        return { entry, importUrl, destinationUrl, ...flattenedData };
    });
}

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
    const { statusReports, migrationReports, totals } = reports;
    const workbook = xlsx.utils.book_new();

    appendReportsToWorkbook(workbook, statusReports);
    appendReportsToWorkbook(workbook, migrationReports);
    Object.entries(totals).forEach(([reportType, data]) => {
        xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(data), reportType);
    });

    const reportDir = reportFile.substring(0, reportFile.lastIndexOf('/'));
    await mkdir(reportDir, { recursive: true });
    await xlsx.writeFile(workbook, reportFile);
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
    let index = 0;
    const destinationUrl = `${TO_SITE}${entry}`;
    if (!markdown) {
        console.warn(`${pageIndex} failed '${entry}': 'Markdown could not be fetched.'`);
        return [{
            status: { status: STATUS_FAILURE, entry, message: 'Markdown could not be fetched.', destinationUrl },
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
            status: { status: STATUS_SKIPPED, entry, message: 'No blocks or paths to migrate.', destinationUrl },
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

        if (blockReport.status.status === STATUS_FAILURE) {
            console.warn(`${pageIndex}.${index} migration ${blockReport.status.status} '${entry}' - blocks: '${blocks}'`);
            console.warn(`${pageIndex}.${index} ${STATUS_FAILURE}: '${blockReport.status.message}'`);
            blockReport.status.save = STATUS_SKIPPED;
        } else {
            console.log(`${pageIndex}.${index} migration ${blockReport.status.status} '${entry}' - blocks: '${blocks}'`);
            const save = await updateSave(mdast, sourceDocxFile, outputDocxFile);
            blockReport.status.save = save.status;
            blockReport.status.message = save.message;
        }

        blockReport.status.destinationUrl = destinationUrl;
        blockReport.migrations.forEach(migration => { migration.destinationUrl = destinationUrl; });
        if (blockReport.status.save !== STATUS_SUCCESS) {
            console.warn(`${pageIndex}.${index} ${blockReport.status.save} save to '${outputDocxFile}'`);
        }

        pageReports.push(blockReport);
    }

    // Handle path migrations
    if (pathMigrations.length > 0) {
        const pathReports = await migratePaths(mdast, pathMigrations, entry, sourceDocxFile, outputDocxFile);
        pathReports.forEach(async (pageReport) => {
            index++;
            const { path, status, output } = pageReport;
            const outputEntry = output?.replace(`${outputDir}/${PROJECT}`, '').replace('.docx', '');
            const destinationUrl = `${TO_SITE}${outputEntry}`;
            pageReport.status.destinationUrl = destinationUrl;

            pageReport.migrations.forEach(pageMigration => {
                pageMigration.newPath = outputEntry ?? '';
                pageMigration.destinationUrl = destinationUrl;
            });
            status.destinationUrl = destinationUrl;

            console.log(`${pageIndex}.${index} migration ${pageReport.status.status} '${entry}' - path: '${path}'`);
            if (status.save !== STATUS_SUCCESS) {
                console.warn(`${pageIndex}.${index} ${status.save} save to '${output}'`);
            }
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
 * Append report to workbook
 * 
 * @param {object} workbook - workbook object
 * @param {object} report - report object with keys as sheet name and values array of data
 */
function appendReportsToWorkbook(workbook, report) {
    Object.entries(report).forEach(([reportType, data]) => {
        const pageData = reportData(data);
        xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(pageData), reportType);
    });
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

    const statusReports = {};
    const migrationReports = {};
    if (source === SOURCE_CACHE) {
        console.log('Loading markdown from cache');
    } else if (source === SOURCE_FETCH) {
        console.log('Fetching markdown');
    } else {
        console.error(`Invalid source: ${source}`);
        console.error(`Expected: ${SOURCE_CACHE} or ${SOURCE_FETCH}`);
        process.exit(1);
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i].trim();
        const url = `${FROM_SITE}${entry}`
        const path = `${MD_DIR}/${PROJECT}${entry}`;
        let markdown = '';
        if (source === SOURCE_CACHE) {
            markdown = await loadMarkdown(path);
        } else if (source === SOURCE_FETCH) {
            markdown = await loadOrFetchMarkdown(url, path);
        }

        const pageReports = await handleMigration(markdown, entry, i, outputDir);

        pageReports.forEach(({ entry, status, migrations }) => {
            const reportStatus = status.status;
            statusReports[reportStatus] ??= [];
            statusReports[reportStatus].push({ entry, ...status });

            migrations.forEach((migration) => {
                const key = migration.key;
                migrationReports[key] ??= [];
                migrationReports[key].push(migration);
            });
        });
    }

    // Count totals for each status and migration
    const pageTotals = [];
    const migrationTotals = [];

    Object.entries(statusReports).forEach(([key, value]) => {
        pageTotals.push({ status: key, count: value.length });
    });
    Object.entries(migrationReports).forEach(([key, value]) => {
        migrationTotals.push({ migration: key, count: value.length });
    });
    const totals = {pageTotals, migrationTotals};
    console.log('totals', JSON.stringify(totals, null, 2));

    const dateStr = getDateString();
    const migrationReportFile = `${REPORT_DIR}/${PROJECT}/Migration ${dateStr}`;
    await writeFile(`${migrationReportFile}.json`, JSON.stringify({ statusReport: statusReports, migrationReport: migrationReports, totals }, null, 2));
    console.log(`Report written to ${migrationReportFile}.json`);

    await createReport({ statusReports, migrationReports, totals }, `${migrationReportFile}.xlsx`);
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
