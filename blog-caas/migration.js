import fs from 'fs';
import { select } from 'unist-util-select';
import { u } from 'unist-builder';
import { BulkUpdate, ExcelReporter, loadListData, saveDocument } from '../bulk-update/index.js';
import { selectBlock, blockToObject } from '../bulk-update/migration-tools/select.js';

const DRY_RUN = false; // do not save documents
const MAX_CARD_TITLE_LENGTH = 48;
const WARNING_CARD_DESCRIPTION_LENGTH = 108;
const MAX_CARD_DESCRIPTION_LENGTH = 178;
const PRIMARY_TAG = 'caas:content-type/blog';
const ADDITIONAL_TAGS = ['caas:cta/read-article'];

const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const missingTags = {};

const config = {
  list: [
    'https://main--bacom-blog--adobecom.hlx.live/de/blog/query-index.json',
    'https://main--bacom-blog--adobecom.hlx.live/fr/blog/query-index.json',
    'https://main--bacom-blog--adobecom.hlx.live/au/blog/query-index.json',
    'https://main--bacom-blog--adobecom.hlx.live/uk/blog/query-index.json',
    'https://main--bacom-blog--adobecom.hlx.live/blog/query-index.json',
    'https://main--bacom-blog--adobecom.hlx.live/jp/blog/query-index.json',
    'https://main--bacom-blog--adobecom.hlx.live/kr/blog/query-index.json',
  ],
  siteUrl: 'https://main--bacom-blog--adobecom.hlx.live',
  prodSiteUrl: 'https://business.adobe.com',
  reporter: new ExcelReporter(`${pathname}reports/caas-${dateString}.xlsx`, false),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: 1 * 24 * 60 * 60 * 1000, // 1 day(s)
  fetchWaitMs: 20,
  validateMigration: !DRY_RUN,
};

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

/**
 * Maps tags to their corresponding values in the CaaS system.
 *
 * @param {Object} metadata - The metadata block object.
 * @param {string} entry - The entry object.
 * @returns {string[]} - The mapped tags in the CaaS system.
 */
function mapTags(metadata, entry) {
  const tags = metadata.Tags ? metadata.Tags.split(',') : [];
  const caasMappings = loadCaasMappings();

  const caasTags = tags.map((tag) => {
    const cleanedTag = tag.replace(/\s+/g, ' ').trim();
    const caasTag = caasMappings[cleanedTag.toLowerCase()] ?? null;
    if (cleanedTag && caasTag === null) {
      missingTags[cleanedTag] = true;
      config.reporter.log('Tags', 'error', 'Missing tag mapping', { tag: cleanedTag, entry });
    }

    return caasTag;
  });

  if (entry.startsWith('/blog/the-latest/')) caasTags.push('caas:topic/news');
  if (entry.startsWith('/blog/perspectives/')) caasTags.push('caas:topic/trends');

  return caasTags.filter((tag, index) => caasTags.indexOf(tag) === index);
}

/**
 * Retrieves card metadata for a given mdast and entry.
 *
 * @param {Object} mdast - The mdast object.
 * @param {string} entry - The entry URL.
 * @returns {Object} - The card metadata object.
 */
export function getCardMetadata(mdast, entry) {
  const cardMetadata = { };
  const pageTitle = select('heading[depth="1"] text', mdast);
  const pageImage = select('image', mdast);
  const metadataBlock = selectBlock(mdast, 'metadata');

  if (pageTitle?.value) cardMetadata.Title = pageTitle.value;
  if (pageImage) {
    cardMetadata.CardImage = { ...pageImage };
    const altText = pageImage.alt ? `${pageImage.alt} card image` : `${cardMetadata.Title} card image`;
    cardMetadata.CardImage.alt = altText;
    cardMetadata.CardImageAltText = altText;
  }

  if (metadataBlock) {
    const metadata = blockToObject(metadataBlock);
    const caasTags = mapTags(metadata, entry);

    if (!cardMetadata.Title && metadata.Title) {
      cardMetadata.Title = metadata.Title;
    }
    if (metadata['Publication Date']) {
      try {
        const publicationDate = new Date(metadata['Publication Date']);
        const [date] = publicationDate.toISOString().split('T');
        cardMetadata.CardDate = date;
      } catch (error) {
        config.reporter?.log('Card Metadata', 'Error', 'Error parsing publication date', { Value: metadata['Publication Date'], entry });
      }
    }
    if (metadata.Description) cardMetadata.CardDescription = metadata.Description;

    cardMetadata.PrimaryTag = PRIMARY_TAG;
    cardMetadata.Tags = [PRIMARY_TAG, ...ADDITIONAL_TAGS, ...caasTags].filter((tag) => tag);
  }

  return cardMetadata;
}

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

/** Create a Card Metadata block gridtable
 *
 * @param {object} cardMetadata
 * @returns {object} Card Metadata block mdast
 */
export function createCardMetadataBlock(cardMetadata) {
  const fields = [
    [u('text', 'Title'), u('text', cardMetadata.Title ?? '')],
    [u('text', 'CardDate'), u('text', cardMetadata.CardDate ?? '')],
    [u('text', 'CardImage'), cardMetadata.CardImage],
    [u('text', 'CardImageAltText'), u('text', cardMetadata.CardImageAltText ?? '')],
    [u('text', 'CardDescription'), u('text', cardMetadata.CardDescription ?? '')],
    [u('text', 'primaryTag'), u('text', cardMetadata.PrimaryTag ?? '')],
    [u('text', 'Tags'), u('text', cardMetadata.Tags.join(', '))],
  ];

  if (cardMetadata.cta1Text) fields.push([u('text', 'cta1Text'), u('text', cardMetadata.cta1Text)]);
  if (cardMetadata.cta1URL) fields.push([u('text', 'cta1URL'), u('link', { url: cardMetadata.cta1URL }, [u('text', cardMetadata.cta1URL)])]);

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
  const requiredFields = ['Title', 'CardDate', 'Tags', 'CardImage'];
  let valid = true;

  const missingFields = requiredFields.filter((field) => !cardMetadata[field]);
  if (missingFields.length > 0) {
    reporter?.log('Card Metadata', 'Error', 'Missing required fields', { Fields: missingFields, entry });
    valid = false;
  }

  if (cardMetadata.CardDate && !/^\d{4}-\d{2}-\d{2}$/.test(cardMetadata.CardDate)) {
    reporter?.log('Card Metadata', 'Error', 'Card Date should be in YYYY-MM-DD format.', { Value: cardMetadata.CardDate, entry, CardDate: cardMetadata.CardDate });
    valid = false;
  }

  if (cardMetadata.Tags && cardMetadata.Tags.length <= ADDITIONAL_TAGS.length + 1) {
    reporter?.log('Card Metadata', 'Warning', 'No tags found.', { Value: cardMetadata.Tags, entry });
  }

  const { Title, CardDescription } = cardMetadata;
  if (Title && Title.length > MAX_CARD_TITLE_LENGTH) {
    reporter?.log('Card Metadata', 'Warning', `Card Title should be a maximum of ${MAX_CARD_TITLE_LENGTH} characters.`, { Value: Title, entry });
  }

  if (CardDescription && CardDescription.length > MAX_CARD_DESCRIPTION_LENGTH) {
    reporter?.log('Card Metadata', 'Warning', `Card Description should be a maximum of ${MAX_CARD_DESCRIPTION_LENGTH} characters.`, { Value: CardDescription, entry });
  } else if (CardDescription && CardDescription.length > WARNING_CARD_DESCRIPTION_LENGTH) {
    reporter?.log('Card Metadata', 'Info', `Card Description exceeds ${WARNING_CARD_DESCRIPTION_LENGTH} characters.`, { Value: CardDescription, entry });
  }
  if (!CardDescription) {
    reporter?.log('Missing Description', 'Info', 'Card Description is required', { entry, CardDate: cardMetadata.CardDate });
  }

  return valid;
}

/**
 * Performs migration that adds card metadata to a page.
 *
 * @param {Object} document - The document to be migrated.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  if (selectBlock(mdast, 'Card Metadata')) {
    config.reporter.log('save', 'skip', 'Card metadata already exists', { entry });

    return false;
  }

  const cardMetadata = getCardMetadata(mdast, entry);
  const isValid = validateCardMetadata(cardMetadata, config.reporter, entry);
  if (!isValid) return false;

  const cardMetadataBlock = createCardMetadataBlock(cardMetadata);
  mdast.children.push(cardMetadataBlock);
  if (DRY_RUN) {
    config.reporter.log('save', 'skip', 'DRY RUN', { entry });

    return false;
  }

  await saveDocument(document, config);

  return true;
}

/**
 * Initializes the migration process.
 *
 * @param {Array} list - The list of data to be migrated.
 * @returns {Promise<Object>} - A promise that resolves to the configuration object.
 */
export async function init(list) {
  const entryList = await loadListData(list || config.list);
  config.list = entryList.filter((entry) => entry && !entry.match(/^\/\w{0,2}\/?blog\/$/));

  return config;
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
