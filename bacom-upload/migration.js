/* eslint-disable max-len */
import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';
import { u } from 'unist-builder';
import { fetch } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import { BulkUpdate, ExcelReporter, loadListData, saveDocument } from '../bulk-update/index.js';
import { selectBlock } from '../bulk-update/migration-tools/select.js';
import { localizeStagePath } from '../bulk-update/bulk-update.js';
import { entryToPath } from '../bulk-update/document-manager/document-manager.js';

dotenv.config({ path: 'bacom-upload/.env' });

const { SITE_ID, DRIVE_ID, BEARER_TOKEN } = process.env;
const GRAPH_UPLOAD = true;
const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const config = {
  list: [
    'https://main--bacom--adobecom.hlx.live/query-index.json',
  ],
  siteUrl: 'https://main--bacom--adobecom.hlx.live',
  stagePath: '/drafts/staged-content',
  locales: JSON.parse(fs.readFileSync(`${pathname}locales.json`, 'utf8')),
  prodSiteUrl: 'https://business.adobe.com',
  reporter: new ExcelReporter(`${pathname}reports/${dateString}.xlsx`, false),
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
 * Uploads a chunk of data to the specified upload URL.
 *
 * @param {string} uploadUrl - The URL to upload the chunk to.
 * @param {Buffer} buffer - The buffer containing the data to be uploaded.
 * @param {number} chunkStart - The start index of the chunk in the buffer.
 * @param {number} chunkEnd - The end index of the chunk in the buffer.
 * @returns {Promise<Object|boolean>} - A promise that resolves to the upload data if successful, or false if an error occurs.
 */
async function uploadChunk(uploadUrl, buffer, chunkStart, chunkEnd) {
  const headers = { 'Content-Range': `bytes ${chunkStart}-${chunkEnd - 1}/${buffer.length}` };
  const body = buffer.slice(chunkStart, chunkEnd);

  try {
    const res = await fetch(uploadUrl, { method: 'PUT', body, headers });
    console.log(res);
    const uploadData = await res.json();
    console.log(uploadData);
    return uploadData;
  } catch (e) {
    console.error(e.message);
    return false;
  }
}

async function verifyBearerToken(bearerToken) {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${bearerToken}` } });
    if (!res.ok) {
      return { success: false, message: 'Invalid bearer token' };
    }

    switch (res.status) {
      case 401:
        return { success: false, message: 'Bearer token expired' };
      case 200:
        return { success: true, message: 'Bearer token verified' };
      default:
        return { success: false, message: 'Unknown error' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Retrieves the bearer token for authentication.
 * If the bearer token is not already set, prompts the user to enter it.
 *
 * @param {string} token - The bearer token to use.
 * @returns {Promise<string>} A promise that resolves to the bearer token.
 */
async function getBearerToken(token = '') {
  let success = false;
  let bearerToken = token;

  while (!success) {
    if (!bearerToken) {
      console.log('To get the bearer token, please follow the instructions:');
      console.log('Navigate to https://developer.microsoft.com/en-us/graph/graph-explorer');
      console.log('Run the "my profile" sample query https://graph.microsoft.com/v1.0/me');
      console.log('Copy the "Access token" from the request and paste it below:');

      bearerToken = await new Promise((resolve) => {
        rl.question('Bearer token: ', resolve);
      });
    }

    const verification = await verifyBearerToken(bearerToken);

    console.log(`Verification: ${verification.message}`);
    success = verification.success;
    if (!success) {
      bearerToken = '';
    }
  }

  return bearerToken;
}

/**
 * Uploads a document to a session URL in chunks.
 *
 * @param {string} sessionUrl - The URL of the session to upload the document to.
 * @param {Buffer} buffer - The buffer containing the document data.
 * @returns {Promise<boolean>} - A promise that resolves to true if the document is uploaded successfully, false otherwise.
 */
async function uploadDocument(sessionUrl, buffer, bearerToken) {
  console.error('NOT IMPLEMENTED!'); process.exit(0);
  const chunkSize = 1024 * 10240; // 10 MB

  const headers = {
    Authorization: `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(sessionUrl, { method: 'POST', headers });
  const { uploadUrl } = await res.json();

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunkStart = i;
    const chunkEnd = Math.min(i + chunkSize, buffer.length);

    const uploadData = await uploadChunk(uploadUrl, buffer, chunkStart, chunkEnd);
    if (!uploadData) {
      return false;
    }
  }

  return true;
}

/**
 * Uploads a document to Microsoft SharePoint.
 *
 * @param {string} entry - The entry name.
 * @param {Object} mdast - The mdast object.
 * @returns {Promise<boolean>} - Returns true if the document upload is successful, otherwise false.
 */
async function upload(entry, mdast) {
  const bearerToken = await getBearerToken(BEARER_TOKEN);
  const documentPath = entryToPath(entry);
  const stagedEntry = localizeStagePath(documentPath, config.stagePath, config.locales);
  const SPFileName = `website${stagedEntry}`;
  const createSessionUrl = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drives/${DRIVE_ID}/root:/${SPFileName}.docx:/createUploadSession`;

  console.log(`Uploading ${entry} to ${stagedEntry} in SharePoint...`);
  console.log(`URL: ${createSessionUrl}`);

  const shouldContinue = await new Promise((resolve) => {
    rl.question('Type \'y\' to continue with upload (ctrl-c to quit): ', resolve);
  });

  if (shouldContinue.toLowerCase() !== 'y') return false;

  console.log('Uploading document...');

  const buffer = await mdast2docx(mdast);
  const success = await uploadDocument(createSessionUrl, buffer, bearerToken);

  if (success) {
    console.log('Document uploaded successfully');
  } else {
    console.error('Document upload failed');
  }

  return success;
}

/**
 * Create or replace a hidden block, hide-block, with the entry and migration date
 *
 * @param {Object} document - The document to be migrated.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  if (!mdast || !mdast.children) return;

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

  await saveDocument(document, config);
  if (GRAPH_UPLOAD) {
    await upload(entry, mdast);
  }
}

/**
 * Initializes the migration process.
 *
 * @param {Array} list - The list of data to be migrated.
 * @returns {Promise} - A promise that resolves to the configuration object.
 */
export async function init(list) {
  config.list = await loadListData(list || config.list);

  if (!SITE_ID) {
    console.error('The Site ID not set');
  } else {
    console.log(`Site ID: ${SITE_ID}`);
  }

  if (!DRIVE_ID) {
    console.error('The Drive ID not set');
  } else {
    console.log(`Drive ID: ${DRIVE_ID}`);
  }

  if (BEARER_TOKEN) {
    console.log('Bearer Token set');
  }

  await BulkUpdate(config, migrate);
}

/**
 * Run the migration process.
 * Example usage: node bacom-upload/migration.js 'bacom-upload/list.json'
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const DEFAULTS = ['bacom-upload/list.json'];
  const [list] = args.length ? args : DEFAULTS;

  await init(list);
  process.exit(0);
}
