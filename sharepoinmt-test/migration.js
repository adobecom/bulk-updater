import fs from 'fs';
import { u } from 'unist-builder';
import { BulkUpdate, ExcelReporter, loadListData, saveDocument } from '../bulk-update/index.js';
import { selectBlock } from '../bulk-update/migration-tools/select.js';
import { mdast2docx } from '@adobe/helix-md2docx';

const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();

const config = {
  list: [
    '/drafts/slavin/blog/8-reasons-why-your-marketing-campaign-failed',
    '/drafts/slavin/blog/adobe-experience-manager',
    '/drafts/slavin/blog/business-case',
    '/drafts/slavin/blog/creative-brief',
    '/drafts/slavin/blog/digital-asset-management',
    '/drafts/slavin/blog/test-doc-1',
  ],
  siteUrl: 'https://main--bacom-blog--adobecom.hlx.live',
  stagePath: '/drafts/slavin',
  locales: JSON.parse(fs.readFileSync(`${pathname}locales.json`, 'utf8')),
  prodSiteUrl: 'https://business.adobe.com',
  reporter: new ExcelReporter(`${pathname}reports/blog-${dateString}.xlsx`, false),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: 1 * 24 * 60 * 60 * 1000, // 1 day(s)
  fetchWaitMs: 20,
};

/**
 * Creates a block with the given name and fields.
 *
 * @param {string} name - The name of the block.
 * @param {Object} fields - The fields of the block.
 * @returns {Array} - The created block.
 */
export function createBlock(name, fields) {
  const block = u('gridTable', [
    u('gtBody', [
      u('gtRow', [
        u('gtCell', { colSpan: 2 }, [u('paragraph', [u('text', name)])]),
      ]),
      ...fields.map((values) => u('gtRow', values.map((value) => u('gtCell', [u('paragraph', [value ?? u('text', '')])])))),
    ]),
  ]);

  return block;
}

/**
 * Create or replace a hidden block, hide-block, with the entry and migration date
 *
 * @param {Object} document - The document to be migrated.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  // console.log(mdast, entry)
  if (!mdast || !mdast.children) return;

  // bacom blog specific id
  const siteId = '';
  // bizweb specific drive id
  const driveId = '';
  const SPFileName = `website${entry}`;
  const createSessionUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${SPFileName}.docx:/createUploadSession`;

  const headers = {
    'Authorization': `Bearer `,
    'Content-Type': 'application/json',
  };

  // Modify the mdast
  const fields = [
    [u('text', 'Entry'), u('text', entry)],
    [u('text', 'Date'), u('text', new Date().toISOString().split('T')[0])],
  ];
  const hiddenBlock = createBlock('Hide Block', fields); // This block is display none in Milo projects
  const existingBlock = selectBlock(mdast, 'Hide Block');

  if (existingBlock) {
    existingBlock.children = hiddenBlock.children;
    config.reporter.log('migration', 'update', 'Updated hide block');
  } else {
    mdast.children.push(hiddenBlock);
    config.reporter.log('migration', 'create', 'Created hide block');
  }

  const buffer = await mdast2docx(mdast);

  await fetch(createSessionUrl, { method: 'POST', headers }).then(async (response) => {
    const data = await response.json();
    const { uploadUrl } = data;

    const chunkSize = 1024 * 10240; // 10 MB
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunkStart = i;
      const chunkEnd = Math.min(i + chunkSize, buffer.length);
      const head = { 'Content-Range': `bytes ${chunkStart}-${chunkEnd-1}/${buffer.length}` };

      await fetch(uploadUrl, { method: 'PUT', body: buffer, headers: head }).then(async (res) => {
        console.log(res);
        const uploadData = await res.json();
        console.log(uploadData);
      }).catch((e) => console.log('error:', e));
    }
  }).catch((e) => console.log(e));
}

/**
 * Initializes the migration process.
 *
 * @param {Array} list - The list of data to be migrated.
 * @returns {Promise} - A promise that resolves to the configuration object.
 */
export async function init(list) {
  config.list = await loadListData(list || config.list);

  await BulkUpdate(config, migrate);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [list] = args;

  await init(list);
  process.exit(0);
}
