import { loadDocument, saveDocument } from '../bulk-update/document-manager/document-manager.js';
import ConsoleReporter from '../bulk-update/reporter/console-reporter.js';

/**
 * Example Migration, run using `node migration-example/custom-migration.js`
 *
 * @returns {Object} - The configuration object for the migration.
 */
async function main() {
  const list = ['/'];
  const { pathname } = new URL('.', import.meta.url);
  const config = {
    siteUrl: 'https://main--bacom--adobecom.hlx.live',
    reporter: new ConsoleReporter(),
    outputDir: `${pathname}output`,
    mdDir: `${pathname}md`,
    mdCacheMs: 0,
  };

  config.reporter.log('migration', 'info', 'Starting migration');

  for (const entry of list) {
    config.reporter.log('migration', 'info', `migrating ${entry}`);

    const document = await loadDocument(entry, config);
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
    config.reporter.log('hello world', 'success', 'Added Hello World', entry);
    await saveDocument(document, config);
  }

  config.reporter.log('migration', 'info', 'Finished migration');
  config.reporter.generateTotals();
}

await main();
process.exit();
