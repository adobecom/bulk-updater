import fs from 'fs';
import { selectAll } from 'unist-util-select';
import { BulkUpdate, ExcelReporter } from '../bulk-update/index.js';

const PATH = 'path';
const TEMPLATE = 'template';
const CAMPAIGN_ID = 'campaign_id';

const { pathname } = new URL('.', import.meta.url);
const dateString = ExcelReporter.getDateString();
const config = {
  list: [],
  siteUrl: 'https://main--bacom--adobecom.hlx.live',
  reporter: new ExcelReporter(`${pathname}reports/url-report-${dateString}.xlsx`, false),
  outputDir: `${pathname}output`,
  mdDir: `${pathname}md`,
  mdCacheMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  fetchWaitMs: 20,
};
const uniqueFaasUrls = [];
const poiMapping = {
  7: 'Acrobat',
  2836: 'AUDIENCEMANAGER',
  2838: 'ADOBESIGN',
  2839: 'ANALYTICSSOLNSTANNDARD',
  2843: 'ADOBEADVERTISINGCLOUD',
  2844: 'TARGETSOLN',
  2845: 'EXPERIENCEMANAGERSOLN',
  2992: 'CREATIVECLOUD',
  3009: 'ADOBECAMPAIGN',
  3074: 'ADOBEEXPERIENCEPLATFORM',
  3090: 'Captivate',
  3122: 'DXML',
  3149: 'EXPERIENCEMANAGERASSETS',
  3150: 'EXPERIENCEMANAGERFORMS',
  3151: 'EXPERIENCEMANAGERSITES',
  3197: 'Commerce',
  3200: 'MARKETOENGAGEMENTPLATFORM',
  3206: 'ADOBEEXPERIENCEPLATFORM',
  3231: 'DIGITALPERFORMANCE',
  3273: 'WORKFRONT',
  3279: 'REAL_TIME_CDP',
  3283: 'ADOBE_JOURNEY_OPTIMIZER',
  3287: 'CUSTOMER_JOURNEY_ANALYTICS',
};
const subtypeMapping = {
  2850: 'nurture',
  2851: 'request_for_information',
  2849: 'seminar',
  3204: 'strategy_webinar',
  2848: 'trial_download',
  2847: 'whitepaper_form',
};
const templateMapping = {
  full: 'flex_contact',
  expanded: 'flex_event',
  essential: 'flex_content',
};
const byPageOptions = {
  entry: '',
  faasUrl: '',
  marketoUrl: '',
  fragment: '',
};

function csvToArray(file) {
  if (!file) return [];
  const csv = fs.readFileSync(file, 'utf8').trim();
  const rows = csv.split(/\r?\n/);
  const headers = rows[0].toLowerCase().replace(' ', '_').split(',');
  rows.shift();

  const arr = rows.map((row) => {
    const rowData = row.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      const data = rowData[index];
      obj[header] = data || '';
    });
    return obj;
  });

  return arr;
}

const utf8ToB64 = (str) => btoa(unescape(encodeURIComponent(str)));
const b64ToUtf8 = (str) => decodeURIComponent(escape(atob(str)));

function parseEncodedConfig(encodedConfig) {
  try {
    return JSON.parse(b64ToUtf8(decodeURIComponent(encodedConfig)));
  } catch (e) {
    console.log(e);
  }
  return null;
}

export function getMarketoData(entry, faasUrl, pathMapping) {
  const encodedConfig = faasUrl.split('#')[1];
  const faasData = parseEncodedConfig(encodedConfig);

  if (!faasData) {
    config.reporter.log('url-mapping-by-page', 'error', 'Error parsing faas url', { ...byPageOptions, entry, faasUrl });
    return undefined;
  }

  const entryMap = pathMapping.find((map) => map[PATH] === entry);
  const templateLabel = entryMap[TEMPLATE].toLowerCase();
  const template = Object.keys(templateMapping).find((key) => templateLabel.includes(key));

  if (!template) {
    config.reporter.log('url-mapping-by-page', 'error', `No match for template: ${templateLabel}`, { ...byPageOptions, entry, faasUrl });
    return undefined;
  }

  const faasSubtype = faasData.pjs93 || faasData.p?.js?.[93];
  const subtype = subtypeMapping[faasSubtype];

  if (!subtype) {
    config.reporter.log('url-mapping-by-page', 'error', `No match for subtype: ${faasSubtype}`, { ...byPageOptions, entry, faasUrl });
    return undefined;
  }

  const campaignID = entryMap[CAMPAIGN_ID] || faasData.pjs36 || faasData.p?.js?.[36];

  if (!campaignID) {
    config.reporter.log('url-mapping-by-page', 'error', `No campaign id: ${campaignID}`, { ...byPageOptions, entry, faasUrl });
    return undefined;
  }

  const destinationUrl = faasData.d;

  if (!destinationUrl) {
    config.reporter.log('url-mapping-by-page', 'warn', 'No destination url', { ...byPageOptions, entry, faasUrl });
  }

  const onsiteID = faasData.pjs39 || faasData.p?.js?.[39];

  if (!onsiteID) {
    config.reporter.log('url-mapping-by-page', 'warn', 'No onsite id', { ...byPageOptions, entry, faasUrl });
  }

  const faasPoi = faasData.pjs94 || faasData.p?.js?.[94];
  const poi = poiMapping[faasPoi];

  if (!poi) {
    config.reporter.log('url-mapping-by-page', 'warn', `No match for POI: ${faasPoi}`, { ...byPageOptions, entry, faasUrl });
  }

  config.reporter.log('fields', 'info', 'Field info', {
    entry, template, subtype, campaignID, destinationUrl, onsiteID, poi,
  });

  return {
    template,
    subtype,
    campaignID,
    destinationUrl,
    onsiteID,
    poi,
  };
}

export function generateMarketoUrl({
  template,
  subtype,
  campaignID,
  destinationUrl,
  onsiteID,
  poi,
}) {
  const isEssential = template === 'essential';
  const isFull = template === 'full';
  const marketoConfig = {
    'field_filters.functional_area': isEssential ? 'hidden' : 'Functional Area-DX',
    'field_filters.industry': 'hidden',
    'field_filters.job_role': isEssential ? 'hidden' : 'DX',
    'field_filters.products': isFull ? 'POI-Dxonly-area' : 'hidden',
    'field_visibility.comments': 'hidden',
    'field_visibility.company': 'required',
    'field_visibility.company_size': 'hidden',
    'field_visibility.demo': 'hidden',
    'field_visibility.name': 'required',
    'field_visibility.phone': isFull ? 'required' : 'hidden',
    'field_visibility.postcode': isFull ? 'required' : 'hidden',
    'field_visibility.state': isFull ? 'required' : 'hidden',
    'field_visibility.website': 'hidden',
    'form id': '2277',
    'form type': 'marketo_form',
    'form.subtype': subtype,
    'form.success.content': destinationUrl || '',
    'form.success.type': '',
    'form.template': templateMapping[template],
    'marketo host': 'engage.adobe.com',
    'marketo munckin': '360-KCI-804',
    'program.additional_form_id': '',
    'program.campaignids.external': '',
    'program.campaignids.onsite': onsiteID || '',
    'program.campaignids.retouch': '',
    'program.campaignids.sfdc': campaignID,
    'program.content.id': '',
    'program.content.type': '',
    'program.copartnernames': '',
    'program.poi': poi || '',
    'program.subscription.id': '',
  };

  return `https://milo.adobe.com/tools/marketo#${utf8ToB64(JSON.stringify(marketoConfig))}`;
}

/**
 * Migration
 *
 * @param {Object} document - The document to be migrated.
 * @param {string} document.entry - The entry path of the document.
 * @param {Object} document.mdast - The Markdown AST of the document.
 */
export async function migrate(document) {
  const { mdast, entry } = document;
  const faasLinks = selectAll('link', mdast).filter((node) => node.url.includes('/tools/faas'));

  if (!faasLinks.length) {
    const fragmentLink = selectAll('link', mdast).find((node) => node.url.includes('/fragments/') && node.url.includes('/forms/'))?.url;

    if (fragmentLink) {
      config.reporter.log('url-mapping-by-page', 'skip', 'See fragment', { ...byPageOptions, entry, fragment: fragmentLink });
    } else {
      config.reporter.log('url-mapping-by-page', 'skip', 'No faas block', { ...byPageOptions, entry });
    }
    return;
  }

  faasLinks.forEach((node) => {
    const faasUrl = node.url;
    const marketoData = getMarketoData(entry, faasUrl, config.pathMapping);

    if (!marketoData) return;

    const marketoUrl = generateMarketoUrl(marketoData);

    config.reporter.log('url-mapping-by-page', 'success', 'Generated Marketo URL', { ...byPageOptions, entry, faasUrl, marketoUrl });

    if (!uniqueFaasUrls.includes(faasUrl)) {
      uniqueFaasUrls.push(faasUrl);
      config.reporter.log('url-mapping-by-form', 'info', '', { entry, faasUrl, marketoUrl });
    }
  });
}

/**
 *
 * @returns {Object} - The configuration object for the migration.
 */
export function init(csvFile) {
  config.pathMapping = csvToArray(csvFile);
  const pathsToMigrate = config.pathMapping.map((item) => item[PATH]);

  if (pathsToMigrate.length) config.list = pathsToMigrate;

  return config;
}

/**
 * Run using `node faas-to-marketo/url-report.js <csvFile>`
 * E.g. `node faas-to-marketo/url-report.js faas-to-marketo/form-mapping.csv`
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const csvFile = process.argv[2];
  await BulkUpdate(init(csvFile), migrate);
  await config.reporter.saveReport();
  process.exit();
}
