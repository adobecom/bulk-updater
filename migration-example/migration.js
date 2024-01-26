import ExcelReporter from '../bulk-update/reporter/excel-reporter.js';
import { saveDocument } from '../bulk-update/document-manager/document-manager.js';

const { pathname } = new URL('.', import.meta.url);
const config = {
  list: ['/'], // The list of entries to migrate
  siteUrl: 'https://main--bacom--adobecom.hlx.live', // The site URL
  reporter: new ExcelReporter(`${pathname}reports/example.xlsx`), // The logging type
  outputDir: `${pathname}output`, // The output directory for the docx files
  mdDir: `${pathname}md`, // The directory for storing the fetched markdown.
  mdCacheMs: 0, // The markdown cache time in milliseconds.
};

/**
 * Example Migration, run using `npm run bulk-update 'migration-example'`
 *
 * @returns {Object} - The configuration object for the migration.
 */
export function init() {
  return config;
}

/**
 * Example Migration
 * @param {Object} document - The document to be migrated.
 * @param {string} document.entry - The entry path of the document.
 * @param {Object} document.mdast - The Markdown AST of the document.
 */
export async function migrate(document) {
  const { mdast } = document;

  mdast.children.unshift({
    type: 'heading',
    depth: 1,
    children: [
      {
        type: 'text',
        value: 'Hello World',
      },
    ],
  });

  config.reporter.log('hello world', 'success', 'Added Hello World', document.entry);
  await saveDocument(document, config);
}
