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

import { saveDocx, updateDocx } from '../utils/docx-utils.js';

export const STATUS_SUCCESS = 'success';
export const STATUS_WARNING = 'warning';
export const STATUS_FAILED = 'failed';
export const STATUS_ERROR = 'error';
export const STATUS_SKIPPED = 'skipped';

/**
 * Update and save docx file
 * 
 * @param {object} mdast - mdast object
 * @param {string} sourceDocxFile - source docx file
 * @param {string} outputDocxFile - output docx file
 * @returns {Promise<Object>}
 */
export async function updateSave(mdast, sourceDocxFile, outputDocxFile) {
    if (!mdast) return { status: STATUS_FAILED, message: `No mdast object` };
    if (!sourceDocxFile) return { status: STATUS_FAILED, message: `No source docx file` };
    if (!outputDocxFile) return { status: STATUS_FAILED, message: `No output docx file` };

    try {
        const updated = await updateDocx(mdast, sourceDocxFile, outputDocxFile);

        if (updated) {
            return { status: STATUS_SUCCESS, message: 'Updated docx file' };
        }
    } catch (e) {
        console.error(`Error updating ${sourceDocxFile} ${e.message}`);
    }

    try {
        const saved = await saveDocx(mdast, outputDocxFile);
        if (saved) {
            return { status: STATUS_SUCCESS, message: 'Saved docx file' };
        } else {
            return { status: STATUS_FAILED, message: `Error saving ${outputDocxFile}` };
        }
    } catch (e) {
        return { status: STATUS_FAILED, message: `Error updating and saving ${sourceDocxFile} ${e.message}` };
    }
}

/**
 * Get date string in the format of YYYY-MM-DD_HH-MM
 * 
 * @returns {string} - date string
 */
export function getDateString() {
    return new Date().toLocaleString('en-US', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(/\/|,|:| /g, '-').replace('--', '_');
}

/** 
 * Migrate block and create report
 * Output: { status, message, block, key, outputDir }
 * 
 * @param {object} mdast - mdast object
 * @param {string} block - block name
 * @param {function} migrate - block migration function
 * @returns {Promise<object>} - block report
*/
const migrateBlock = async (mdast, block, migrate) => {
    const baseReport = { status: STATUS_SUCCESS, migrations: [] };

    try {
        const migrationReport = await migrate(mdast);
        const blockReports = Array.isArray(migrationReport) ? migrationReport : [migrationReport];
        
        blockReports.forEach((blockReport) => {
            blockReport.status = blockReport.status ?? STATUS_SUCCESS;
            // Capture warning or failure
            if (blockReport.status !== STATUS_SUCCESS) {
                baseReport.status = blockReport.status === STATUS_ERROR ? STATUS_FAILED : blockReport.status;
                baseReport.message = blockReport.message;
            }

            baseReport.migrations.push(blockReport);
        });
    } catch (e) {
        console.error(`Error migrating ${block}`, e.message);
        baseReport.status = STATUS_FAILED;
        baseReport.migrations.push({ status: STATUS_ERROR, message: e.message });
    }

    return baseReport;
}

/**
 * Migrate blocks and collect reports
 * Output: { status: { status, blocks }, migrations: [ { status, message, block, key, outputDir } ] }
 * 
 * @param {object} mdast - mdast object
 * @param {Array<string, function>} migrationMap - blocks to migrate
 * @param {string} entry - entry path
 * @returns {Promise<object>} - page report
 */
export const migrateBlocks = async (mdast, migrationMap, entry) => {
    const blocks = migrationMap.map(([block]) => block).join(', ');
    const pageReport = { status: { entry, status: STATUS_SUCCESS, blocks }, migrations: [] };

    for (const [block, migrate] of migrationMap) {
        const key = `block ${block}`;
        const blockReport = await migrateBlock(mdast, block, migrate);

        if (blockReport.status !== STATUS_SUCCESS) {
            pageReport.status.status = blockReport.status;
            pageReport.status.message = blockReport.message;
        }

        blockReport.migrations.forEach((migration) => {
            Object.assign(migration, { entry, block, key });
            pageReport.migrations.push(migration);
        });
    }

    return pageReport;
}

/**
 * Migrate path to a new page and create report
 * Output: { status, message, output, migrations: [ { status, message, block, key, outputDir } ] }
 * 
 * @param {object} mdast - mdast object
 * @param {string} key - path
 * @param {function} migrate - path migration function
 * @param {string} outputDocxFile - output docx file
 * @returns {Promise<object>} - page report
 */
export const migratePath = async (mdast, path, key, migrate, outputDocxFile) => {
    const baseReport = { status: STATUS_SUCCESS, migrations: [] };
    try {
        const migrationReport = await migrate(mdast, outputDocxFile);
        const pathReports = Array.isArray(migrationReport) ? migrationReport : [migrationReport];

        pathReports.forEach((pathReport) => {
            const outputFile = pathReport.output ?? outputDocxFile
            delete pathReport.output;

            baseReport.output ??= outputFile;
            Object.assign(pathReport, { path, key, output: baseReport.output });
            pathReport.status = pathReport.status ?? STATUS_SUCCESS;
            // Capture warning or failure
            if (pathReport.status !== STATUS_SUCCESS) {
                baseReport.status = pathReport.status === STATUS_ERROR ? STATUS_FAILED : pathReport.status;
                baseReport.message = pathReport.message;
            }

            baseReport.migrations.push(pathReport);
        });
    } catch (e) {
        console.error(`Error migrating path '${path}': `, e.message);
        baseReport.status = STATUS_FAILED;
        baseReport.migrations.push({ status: STATUS_ERROR, message: e.message });
    }

    return baseReport;
};

/**
 * Migrate paths and collect reports
 * Each path creates a new docx file in the migrate function
 * Output: [ { status: { entry, status, save, message, output }, migrations: [ { status, message, path, key, outputDocxFile } ] }
 * 
 * @param {object} mdast - mdast object
 * @param {Array<string, function>} migrationMap - paths to migrate
 * @param {string} entry - entry path
 * @returns {Promise<Array>} - reports for each page
 */
export const migratePaths = async (mdast, migrationMap, entry, sourceDocxFile, outputDocxFile) => {
    const reports = [];

    for (const [path, migrate] of migrationMap) {
        // Migrate to a new page
        const key = `path ${path.replaceAll('/', ' ').trim()}`
        const pageReport = { status: { entry, status: STATUS_SUCCESS, path }, migrations: [] };

        // Deep copy mdast object
        const pathMdast = JSON.parse(JSON.stringify(mdast));
        const pathMigration = await migratePath(pathMdast, path, key, migrate, outputDocxFile);

        const outputFile = pathMigration.output || outputDocxFile;

        pageReport.status.output = outputFile;
        pathMigration.migrations.forEach((migration) => {
            migration.entry = entry;
            pageReport.migrations.push(migration);
        });

        if (pathMigration.status === STATUS_FAILED) {
            pageReport.status.status = pathMigration.status;
            pageReport.status.message = pathMigration.message;
            pageReport.status.save = STATUS_FAILED;
        } else {
            const save = await updateSave(mdast, sourceDocxFile, outputFile);
            pageReport.status.save = save.status;
            pageReport.status.saveMessage = save.message;
        }

        reports.push(pageReport);
    }

    return reports;
};
