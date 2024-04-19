/* eslint-disable max-len */
import { fetch } from '@adobe/fetch';
import { compare } from './linkCompare.js';
import { ExcelReporter, loadListData } from '../bulk-update/index.js';

const { pathname } = new URL('.', import.meta.url);
const MILO_BLOG = 'https://main--bacom-blog--adobecom.hlx.live';
const FRANKLIN_BLOG = 'https://main--business-website--adobe.hlx.live';
const LIST = [
  'https://main--bacom-blog--adobecom.hlx.live/de/blog/query-index.json',
  'https://main--bacom-blog--adobecom.hlx.live/fr/blog/query-index.json',
  'https://main--bacom-blog--adobecom.hlx.live/au/blog/query-index.json',
  'https://main--bacom-blog--adobecom.hlx.live/uk/blog/query-index.json',
  'https://main--bacom-blog--adobecom.hlx.live/blog/query-index.json',
  'https://main--bacom-blog--adobecom.hlx.live/jp/blog/query-index.json',
  'https://main--bacom-blog--adobecom.hlx.live/kr/blog/query-index.json',
];

/**
 * Compares two URLs
 *
 * @param {URL} url1 - The milo URL.
 * @param {URL} url2 - The franklin URL.
 * @returns boolean
 */
function comparison(url1, url2) {
  if (url2.pathname.includes('/banners/')) return true;
  if (url1.href.includes('#_dnt')) {
    return (url1.host === url2.host) && (url1.pathname === url2.pathname);
  }
  return url1.href === url2.href;
}

async function stagedContent(list) {
  const report = new ExcelReporter(`${pathname}reports/blog-staged-links.xlsx`, true);
  const reportExtra = new ExcelReporter(`${pathname}reports/blog-staged-links-extra.xlsx`, false);
  const { length } = list;

  for (const [i, entry] of list.entries()) {
    const percentage = Math.round(((i + 1) / length) * 10000) / 100;
    console.log(`Processing entry ${i + 1} of ${length} (${percentage}%) ${entry}`);
    const liveURL = MILO_BLOG + entry;
    const stagedURL = liveURL.replace('/blog/', '/drafts/staged-content/blog/').replace('.hlx.live', '.hlx.page');

    try {
      const result = await compare(liveURL, stagedURL, fetch, comparison);
      const miloLinks = result.links.map((link) => link.link1);
      const stagedLinks = result.links.map((link) => link.link2);
      const status = result.match ? 'match' : 'broken';

      report.log('link-check', status, 'Checked Links', { liveURL, stagedURL, broken: !result.match });
      reportExtra.log('link-check', status, 'Checked Links', {
        entry,
        liveURL,
        stagedURL,
        broken: !result.match,
        match: result.match,
        miloTotal: miloLinks.filter((x) => x).length,
        stagedTotal: stagedLinks.filter((x) => x).length,
        mismatchPercent: Math.round((result.unique.length / miloLinks.filter((x) => x).length) * 100) / 100,
      });
      if (!result.match) {
        reportExtra.log('live-links', 'info', liveURL, miloLinks);
        reportExtra.log('staged-links', 'info', stagedURL, stagedLinks);
        reportExtra.log('links', 'milo', liveURL, miloLinks);
        reportExtra.log('links', 'staged', stagedURL, stagedLinks);
      }
    } catch (e) {
      console.error('Error Checking Links:', e);
      report.log('link-check', 'error', 'Error Checking Links', { liveURL, stagedURL, broken: false });
      reportExtra.log('link-check', 'error', 'Error Checking Links', {
        entry,
        liveURL,
        stagedURL,
        broken: true,
        error: e.message,
      });
    }
  }

  report.generateTotals();
  report.saveReport();
  reportExtra.generateTotals();
  reportExtra.saveReport();
}

async function miloFranklin(list) {
  const report = new ExcelReporter(`${pathname}reports/blog-links.xlsx`, true);
  const reportExtra = new ExcelReporter(`${pathname}reports/blog-links-extra.xlsx`, false);
  const { length } = list;

  for (const [i, entry] of list.entries()) {
    const percentage = Math.round(((i + 1) / length) * 10000) / 100;
    console.log(`Processing entry ${i + 1} of ${length} (${percentage}%) ${entry}`);
    const miloURL = MILO_BLOG + entry;
    const franklinURL = FRANKLIN_BLOG + entry;

    try {
      const result = await compare(miloURL, franklinURL, fetch, comparison);
      const miloLinks = result.links.map((link) => link.link1);
      const franklinLinks = result.links.map((link) => link.link2);
      const status = result.match ? 'match' : 'broken';

      report.log('link-check', status, 'Checked Links', { miloURL, franklinURL, broken: !result.match });
      reportExtra.log('link-check', status, 'Checked Links', {
        entry,
        miloURL,
        franklinURL,
        broken: !result.match,
        match: result.match,
        miloTotal: miloLinks.filter((x) => x).length,
        franklinTotal: franklinLinks.filter((x) => x).length,
        mismatchPercent: Math.round((result.unique.length / miloLinks.filter((x) => x).length) * 100) / 100,
      });
      if (!result.match) {
        reportExtra.log('milo-links', 'info', miloURL, miloLinks);
        reportExtra.log('franklin-links', 'info', franklinURL, franklinLinks);
        reportExtra.log('links', 'milo', miloURL, miloLinks);
        reportExtra.log('links', 'franklin', franklinURL, franklinLinks);
      }
    } catch (e) {
      console.error('Error Checking Links:', e);
      report.log('link-check', 'error', 'Error Checking Links', { miloURL, franklinURL, broken: false });
      reportExtra.log('link-check', 'error', 'Error Checking Links', {
        entry,
        miloURL,
        franklinURL,
        broken: true,
        error: e.message,
      });
    }
  }

  report.generateTotals();
  report.saveReport();
  reportExtra.generateTotals();
  reportExtra.saveReport();
}

async function init() {
  const list = await loadListData(LIST);
  await miloFranklin(list);
  await stagedContent(list);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await init();
  process.exit(0);
}
