import fs from 'fs';
import { select } from 'unist-util-select';
import { u } from 'unist-builder';
import { BulkUpdate, ExcelReporter, loadListData, saveDocument } from '../bulk-update/index.js';
import { selectBlock, blockToObject } from '../bulk-update/migration-tools/select.js';

const { pathname } = new URL('.', import.meta.url);
const DRY_RUN = false; // do not save documents
const SHORT_RUN = true; // first 50 entries for testing

const MAX_CARD_TITLE_LENGTH = 48;
const WARNING_CARD_DESCRIPTION_LENGTH = 108;
const MAX_CARD_DESCRIPTION_LENGTH = 178;
const PRIMARY_TAG = 'caas:content-type/blog';

function loadCaasMappings() {
  try {
    const json = fs.readFileSync(`${pathname}caas-mappings.json`, 'utf8');
    const mappings = JSON.parse(json);
    const lowercaseMappings = Object.fromEntries(
      Object.entries(mappings).map(([key, value]) => [key.toLowerCase(), value]),
    );

    return lowercaseMappings;
  } catch (error) {
    console.error('Error loading caas-mappings.json:', error);
    return {};
  }
}

const caasMappings = loadCaasMappings();
const dateString = ExcelReporter.getDateString();

const skipList = [
  '/blog/perspectives/a-quick-start-guide-to-web-performance',
  '/blog/how-to/how-to-accelerate-content-production-with-adobe-experience-manager-headless',
  '/blog/perspectives/how-hanesbrands-and-adobe-built-one-of-the-fastest-ecommerce-websites-in-the-world',
  '/blog/the-latest/digital-experiences-with-adobe-experience-manager-sites',
  '/blog/basics/a-brief-overview-of-headless-cms',
  '/blog/how-to/personalizing-ecommerce-merchandising-with-ai-in-adobe-commerce',
  '/blog/how-to/the-usual-suspects-5-configuration-issues-to-maximize-your-peak-sales',
  '/blog/basics/digital-asset-management',
  '/blog/how-to/get-started-with-marketo-engage-program-templates',
  '/blog/the-latest/streamlining-adobe-experience-manager-sites-content-creation-process-unleashing-efficiency-with-adobe-workfront',
  '/blog/basics/kanban-boards',
];

const missingTags = {};

const config = {
  list: ['https://main--bacom-blog--adobecom.hlx.live/blog/query-index.json'],
  siteUrl: 'https://main--bacom-blog--adobecom.hlx.live',
  prodSiteUrl: 'https://business.adobe.com',
  reporter: new ExcelReporter(`${pathname}reports/caas-${dateString}.xlsx`, false),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: 24 * 60 * 60 * 1000, // 1 day
  fetchWaitMs: 20,
};

export async function init(list) {
  const entryList = await loadListData(list || config.list);
  config.list = entryList.filter((entry) => entry && !skipList.includes(entry));
  if (SHORT_RUN) config.list = config.list.slice(0, 50);
  return config;
}

function mapTags(tags, entry) {
  const caasTags = tags.map((tag) => {
    const cleanedTag = tag.replace(/\s+/g, ' ').trim();
    const caasTag = caasMappings[cleanedTag.toLowerCase()] ?? '';
    if (cleanedTag && !caasTag) {
      missingTags[cleanedTag] = true;
      config.reporter.log('Tags', 'error', 'Missing tag mapping', { tag: cleanedTag, entry });
    }
    return caasTag;
  });

  return caasTags;
}

/**
 * Retrieves card metadata for a given mdast and entry.
 *
 * @param {Object} mdast - The mdast object.
 * @param {string} entry - The entry URL.
 * @returns {Object} - The card metadata object.
 */
export function getCardMetadata(mdast, entry) {
  const pageTitle = select('heading[depth="1"] text', mdast);
  const pageImage = select('image', mdast);
  const metadataBlock = selectBlock(mdast, 'metadata');
  const cardMetadata = { ContentType: 'blog' };

  if (pageTitle?.value) cardMetadata.CardTitle = pageTitle.value;
  if (pageImage) {
    cardMetadata.CardImage = pageImage.url;
    cardMetadata.CardImageAltText = pageImage.alt;
    cardMetadata.CardImageLabel = pageImage.label;
  }

  if (metadataBlock) {
    const metadata = blockToObject(metadataBlock);
    const blogTags = metadata.Tags ? metadata.Tags.split(',') : [];
    const caasTags = mapTags(blogTags, entry);

    if (!cardMetadata.CardTitle && metadata.Title) {
      cardMetadata.CardTitle = metadata.Title;
    }
    if (metadata['Publication Date']) {
      const [date] = new Date(metadata['Publication Date']).toISOString().split('T');
      cardMetadata.CardDate = date;
    }
    if (metadata.Description) cardMetadata.CardDescription = metadata.Description;

    cardMetadata.PrimaryTag = PRIMARY_TAG;
    cardMetadata.Tags = [PRIMARY_TAG, ...caasTags].filter((tag) => tag);
  }

  return cardMetadata;
}

/**
 * Creates a block with the given name and fields.
 *
 * @param {string} name - The name of the block.
 * @param {Object} fields - The fields of the block.
 * @returns {Object} - The created block.
 */
export function createBlock(name, fields) {
  const blockName = name.replace(/\s+/g, '-').toLowerCase();
  const block = u('gridTable', [
    u('gtBody', [
      u('gtRow', [
        u('gtCell', { colSpan: 2 }, [u('paragraph', [u('text', blockName)])]),
      ]),
      ...Object.entries(fields).map(([key, value]) => u('gtRow', [
        u('gtCell', [u('paragraph', [u('text', key ?? '')])]),
        u('gtCell', [u('paragraph', [value ?? u('text', '')])]),
      ])),
    ]),
  ]);

  return block;
}

/** Create a Card Metadata block gridtable
 *
 * @param {object} cardMetadata
 * @returns {object} Card Metadata block mdast
 */
export function createCardMetadataBlock(cardMetadata) {
  const fields = {
    CardTitle: u('text', cardMetadata.CardTitle),
    CardDate: u('text', cardMetadata.CardDate),
    CardImage: u('image', { url: cardMetadata.CardImage, title: cardMetadata.CardImageLabel, alt: cardMetadata.CardImageAltText }),
    CardImageAltText: u('text', cardMetadata.CardImageAltText),
    CardDescription: u('text', cardMetadata.CardDescription),
    ContentType: u('text', cardMetadata.ContentType),
    primaryTag: u('text', cardMetadata.PrimaryTag),
    Tags: u('text', cardMetadata.Tags.join(', ')),
  };

  if (cardMetadata.cta1Text) fields.cta1Text = u('text', cardMetadata.cta1Text);
  if (cardMetadata.cta1URL) fields.cta1URL = u('link', { url: cardMetadata.cta1URL }, [u('text', cardMetadata.cta1URL)]);

  return createBlock('Card Metadata', fields);
}

/**
 * Validate the card metadata fields
 *
 * @param {Object} cardMetadata - The card metadata fields.
 * @param {ExcelReporter} reporter - The reporter object for logging and reporting errors.
 * @returns {bool} - True if the metadata is valid, false otherwise.
 */
export function validateCardMetadata(cardMetadata, reporter, entry) {
  const requiredFields = ['CardTitle', 'CardDescription', 'CardDate', 'Tags', 'CardImage'];
  let valid = true;

  const missingFields = requiredFields.filter((field) => !cardMetadata[field]);
  if (missingFields.length > 0) {
    reporter?.log('Card Metadata', 'Error', 'Missing required fields', { Fields: missingFields, entry });
    valid = false;
  }

  if (cardMetadata.CardDate && !/^\d{4}-\d{2}-\d{2}$/.test(cardMetadata.CardDate)) {
    reporter?.log('Card Metadata', 'Error', 'Card Date should be in YYYY-MM-DD format.', { Value: cardMetadata.CardDate, entry });
    valid = false;
  }

  if (cardMetadata.Tags && cardMetadata.Tags.length <= 1) {
    reporter?.log('Card Metadata', 'Warning', 'No tags found.', { Value: cardMetadata.Tags, entry });
  }

  const { CardTitle, CardDescription } = cardMetadata;
  if (CardTitle && CardTitle.length > MAX_CARD_TITLE_LENGTH) {
    reporter?.log('Card Metadata', 'Error', `Card Title should be a maximum of ${MAX_CARD_TITLE_LENGTH} characters.`, { Value: CardTitle, entry });
    valid = false;
  }

  if (CardDescription && CardDescription.length > MAX_CARD_DESCRIPTION_LENGTH) {
    reporter?.log('Card Metadata', 'Error', `Card Description should be a maximum of ${MAX_CARD_DESCRIPTION_LENGTH} characters.`, { Value: CardDescription, entry });
    valid = false;
  } else if (CardDescription && CardDescription.length > WARNING_CARD_DESCRIPTION_LENGTH) {
    reporter?.log('Card Metadata', 'Warning', `Card Description exceeds ${WARNING_CARD_DESCRIPTION_LENGTH} characters.`, { Value: CardDescription, entry });
  }

  return valid;
}

/**
 * Performs migration for a adding card metadata.
 *
 * @param {Object} document - The document to be migrated.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  const cardMetadata = getCardMetadata(mdast, entry);
  validateCardMetadata(cardMetadata, config.reporter, entry);
  const cardMetadataBlock = createCardMetadataBlock(cardMetadata);
  mdast.children.push(cardMetadataBlock);
  if (!DRY_RUN) {
    await saveDocument(document, config);
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [list] = args;

  await init(list);
  await BulkUpdate(config, migrate);
  Object.keys(missingTags).forEach((tag) => {
    config.reporter.log('Missing Tags', 'Missing tag', tag);
  });

  config.reporter.saveReport();
  process.exit(0);
}
