/**
 * Example Migration using the bulk-update library.
 */

import { BulkUpdate, ExcelReporter, saveDocument } from '../bulk-update/index.js';

const { pathname } = new URL('.', import.meta.url);
const config = {
  list: ['/'], // The list of entries to migrate.
  siteUrl: 'https://main--bacom--adobecom.hlx.live', // The site URL.
  reporter: new ExcelReporter(`${pathname}reports/example.xlsx`, true), // The logging type, save location and autosave.
  outputDir: `${pathname}output`, // The output directory for the docx files.
  mdDir: `${pathname}md`, // The directory for storing the fetched markdown.
  mdCacheMs: 0, // The markdown cache time in milliseconds.
};

/**
 * Adds a "Hello World" heading to the given mdast.
 *
 * @param {Object} mdast - The mdast object to modify.
 */
function addHelloWorld(mdast, entry) {
  const helloWorld = {
    type: 'heading',
    depth: 1,
    children: [
      {
        type: 'text',
        value: 'Hello World',
      },
    ],
  };

  mdast.children.unshift(helloWorld);

  // Log the migration to the hello world tab with a status of success.
  config.reporter.log('hello world', 'success', 'Added Hello World', { entry });
}

/**
 * Example Migration
 *
 * @param {Object} document - The document to be migrated.
 * @param {string} document.entry - The entry path of the document.
 * @param {Object} document.mdast - The Markdown AST of the document.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  // Additional filtering base on content can be done here.

  // Helper functions, add a heading to the document.
  addHelloWorld(mdast, entry);

  // Save the document after migrating.
  await saveDocument(document, config);
}

/**
 * Run using `npm run bulk-update 'migration-example'`
 *
 * @returns {Object} - The configuration object for the migration.
 */
export function init() {
  // Any file path filtering of the list can be done here.
  return config;
}

/**
 * Run using `node migration-example/custom-migration.js`
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  await BulkUpdate(init(), migrate);
  process.exit();
}
