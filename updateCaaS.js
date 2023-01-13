import { fetch } from '@adobe/fetch';
import {
  fetchText,
  getMdast,
  getTable,
  getKeyVals,
  saveDocx,
  updateKeyName,
  updateKeyNameAndValue,
  updateKeyValue,
} from './utils/mdast-utils.js';
import convertTags from './convertTags.js';

const TAGS_KEY = 'cq:tags';

const fetchExcelJson = async (url) => {
  const resp = await fetch(url);
  if (resp.ok) {
    const json = await resp.json();
    return json.data;
  }
  return [];
};

let go = false;

async function main() {
  const data = await fetchExcelJson(
    'https://main--milo--adobecom.hlx.page/drafts/cpeyer/cs-9-21.json'
  );

  const commerceData = await fetchExcelJson(
    'https://main--milo--adobecom.hlx.page/drafts/cpeyer/cs-9-21.json?sheet=needcommerce'
  );

  const commerceUrls = commerceData.map(d => d.Path);


  for (const page of pages) {
    if (!commerceUrls.includes(page.Path)) continue;

    const mdTxt = await fetchText(`${page.Path.replace('https://business.adobe.com', 'https://main--bacom--adobecom.hlx.page')}.md`);
    if (!mdTxt) continue;

    const mdast = await getMdast(mdTxt);
    if (!mdast) continue;

    const cardMetadataTable = getTable(mdast, 'Card Metadata')[0];

    if (!cardMetadataTable) {
      console.log(`Table not found: ${page.Path}`);
      break;
    }

    const tags = convertTags(page[TAGS_KEY]);

    const keyVals = getKeyVals(cardMetadataTable.table);

    updateKeyValue(keyVals, 'Tags', `${tags},caas:products/adobe-commerce`);
    updateKeyName(keyVals, 'altCardImageText', 'cardImageAltText');
    updateKeyName(keyVals, 'cardImagePath', 'cardImage');
    updateKeyName(keyVals, 'cardDate', 'created');
    updateKeyName(keyVals, 'cardTitle', 'title');

    updateKeyNameAndValue(
      keyVals,
      'original_entity_id',
      'primaryTag',
      'caas:content-type/customer-story'
    );

    updateKeyNameAndValue(keyVals, 'badges', 'badgeText', 'Featured');
    await saveDocx(mdast, page.Path.split('/').pop());

  }
  process.exit(0);
}

await main();
