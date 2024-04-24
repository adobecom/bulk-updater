/* eslint-disable max-len */
import { fetch } from '@adobe/fetch';
import { compare } from './linkCompare.js';
import { ExcelReporter, loadListData } from '../bulk-update/index.js';

const { pathname } = new URL('.', import.meta.url);
const MILO_BLOG = 'https://main--bacom-blog--adobecom.hlx.live';
const FRANKLIN_BLOG = 'https://main--business-website--adobe.hlx.live';
const QUERY_INDEXES = [
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
 * @returns boolean - Returns true if the URLs match, otherwise false.
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
      const miloTotal = miloLinks.filter((x) => x).length;
      const stagedTotal = stagedLinks.filter((x) => x).length;
      const mismatchPercent = Math.round((result.broken.length / miloTotal) * 100) / 100;
      const countMatch = miloTotal === stagedTotal;
      console.log('match:', result.match, 'miloTotal:', miloTotal, 'stagedTotal:', stagedTotal, 'mismatchPercent:', mismatchPercent, 'countMatch:', countMatch);

      report.log('link-check', status, 'Checked Links', { liveURL, stagedURL, broken: !result.match, countMatch });
      reportExtra.log('link-check', status, 'Checked Links', {
        entry,
        liveURL,
        stagedURL,
        broken: !result.match,
        match: result.match,
        uniqueCount: result.unique.length,
        miloTotal,
        stagedTotal,
        countMatch,
        mismatchPercent,
        thirtyPercent: mismatchPercent > 0.3,
      });
      if (result.shuffled.length > 0) {
        const shuffledLinks = result.shuffled.map((link) => `${link.link1} - ${link.index1}-${link.index2}`);
        reportExtra.log('shuffled-links', 'info', entry, shuffledLinks);
      }
      if (!result.match) {
        reportExtra.log('live-links', 'info', liveURL, miloLinks);
        reportExtra.log('staged-links', 'info', stagedURL, stagedLinks);
      }
      if (!result.match && countMatch && result.unique.length === 0) {
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
      const miloTotal = miloLinks.filter((x) => x).length;
      const franklinTotal = franklinLinks.filter((x) => x).length;
      const mismatchPercent = Math.round((result.broken.length / miloTotal) * 100) / 100;
      const countMatch = miloTotal === franklinTotal;
      console.log('match:', result.match, 'miloTotal:', miloTotal, 'franklinTotal:', franklinTotal, 'mismatchPercent:', mismatchPercent, 'countMatch:', countMatch);

      report.log('link-check', status, 'Checked Links', { miloURL, franklinURL, broken: !result.match, countMatch });
      reportExtra.log('link-check', status, 'Checked Links', {
        entry,
        miloURL,
        franklinURL,
        broken: !result.match,
        match: result.match,
        uniqueCount: result.unique.length,
        miloTotal,
        franklinTotal,
        countMatch,
        mismatchPercent,
        thirtyPercent: mismatchPercent > 0.3,
      });
      if (!result.match && countMatch && result.unique.length === 0) {
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
  const list = await loadListData(QUERY_INDEXES);
  // remove any duplicates from list
  const uniqueList = [...new Set(list)];
  await miloFranklin(uniqueList);
  await stagedContent(uniqueList);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await init();
  process.exit(0);
}
