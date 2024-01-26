import fs from 'fs';
import { fetch } from '@adobe/fetch';
import { loadDocument } from './document-manager/document-manager.js';

/**
 * Loads data from the specified URL.
 *
 * @param {string} url - The URL to fetch the data from.
 * @returns {Promise<any>} - A promise that resolves to the fetched data in JSON format.
 */
export async function loadFromUrl(url) {
  const response = await fetch(url);
  return response.json();
}

/**
 * Loads entries from a source. The source can be an array, a comma-separated string,
 * a string starting with '/', a URL pointing to a JSON file, a local path to a JSON file,
 * or a local path to a TXT file.
 *
 * @param {string|string[]} source - The list of entries to load from.
 * @returns {Promise<string[]>} - The loaded data as an array of strings.
 * @throws {Error} - If the list format or entry is unsupported.
 */
export async function loadListData(source) {
  if (Array.isArray(source) || source.includes(',')) {
    const entries = Array.isArray(source) ? source : source.split(',');
    return (await Promise.all(entries.map((entry) => loadListData(entry.trim())))).flat();
  }
  const extension = source.includes('.') ? source.split('.').pop() : null;

  if (!extension) {
    return [source];
  }

  switch (extension) {
    case 'json':
      return source.startsWith('http') ? loadFromUrl(source) : JSON.parse(fs.readFileSync(source, 'utf8'));
    case 'txt':
      return fs.readFileSync(source, 'utf8').trim().split('\n');
    default:
      throw new Error(`Unsupported list format or entry: ${source}`);
  }
}

/**
 * Executes a bulk update operation using a migration script, loading data from various sources
 * and executing bulk update operations from the migration script.
 *
 * @param {string} migrationFolder - Path to the folder containing the migration script.
 * @param {string|null} list - Entry list, or null to use list in the migration script's config.
 * @param {Object|null} reporter - A reporter object, or null for migration script's config.
 * @returns {Promise<object>} - Promise that resolves with bulk update totals.
 */
export async function main(migrationFolder, list = null, reporter = null) {
  const migrationFile = `${process.cwd()}/${migrationFolder}/migration.js`;
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const migration = await import(migrationFile);
  const config = migration.init();

  config.reporter = reporter || config.reporter;

  try {
    const entryList = await loadListData(list || config.list);

    await Promise.all(entryList.map(async (entry, i) => {
      console.log(`Processing entry ${i + 1} of ${entryList.length} ${entry}`);
      const document = await loadDocument(entry, config);
      await migration.migrate(document);
    }));
  } catch (e) {
    console.error(`Bulk Update Error: ${e.message}`);
  }

  return config.reporter.generateTotals();
}

// npm run bulk-update <project> <list>
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [migrationFolder, list = null] = args;

  await main(migrationFolder, list);
  process.exit(0);
}
