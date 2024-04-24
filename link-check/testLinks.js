/* eslint-disable max-len */
import { fetch } from '@adobe/fetch';
import { compare } from './linkCompare.js';
import { ExcelReporter } from '../bulk-update/index.js';

const { pathname } = new URL('.', import.meta.url);
const BLOG = 'https://main--bacom-blog--adobecom.hlx.page';
const SOURCE = '/drafts/bmarshal/link-shuffle/test/link-document';

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

async function checkLinks(list) {
  const report = new ExcelReporter(`${pathname}reports/test-links.xlsx`, true);
  const { length } = list;

  for (const [i, entry] of list.entries()) {
    const percentage = Math.round(((i + 1) / length) * 10000) / 100;
    console.log(`Processing entry ${i + 1} of ${length} (${percentage}%) ${entry}`);
    const testURL = BLOG + entry;
    const sourceURL = BLOG + SOURCE;

    try {
      const result = await compare(testURL, sourceURL, fetch, comparison);
      const miloLinks = result.links.map((link) => link.link1);
      const franklinLinks = result.links.map((link) => link.link2);
      const status = result.match ? 'match' : 'broken';
      const miloTotal = miloLinks.filter((x) => x).length;
      const franklinTotal = franklinLinks.filter((x) => x).length;
      const mismatchPercent = Math.round((result.broken.length / miloTotal) * 100) / 100;
      const countMatch = miloTotal === franklinTotal;
      console.log('match:', result.match, 'miloTotal:', miloTotal, 'franklinTotal:', franklinTotal, 'mismatchPercent:', mismatchPercent, 'countMatch:', countMatch);

      report.log('link-check', status, 'Checked Links', { miloURL: testURL, franklinURL: sourceURL, broken: !result.match, countMatch });
    } catch (e) {
      console.error('Error Checking Links:', e);
      report.log('link-check', 'error', 'Error Checking Links', { miloURL: testURL, franklinURL: sourceURL, broken: false });
    }
  }

  report.generateTotals();
  report.saveReport();
}

async function init() {
  const list = [];
  for (let i = 1; i <= 100; i += 1) {
    list.push(`${SOURCE}-${i}`);
  }
  await checkLinks(list);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await init();
  process.exit(0);
}
