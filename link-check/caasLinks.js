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

async function init() {
  const reporter = new ExcelReporter(`${pathname}reports/caas-links.xlsx`, true);
  const list = await loadListData(LIST);
  const { length } = list;

  for (const [i, entry] of list.entries()) {
    const percentage = Math.round(((i + 1) / length) * 10000) / 100;
    console.log(`Processing entry ${i + 1} of ${length} (${percentage}%) ${entry}`);
    const miloURL = MILO_BLOG + entry;
    const franklinURL = FRANKLIN_BLOG + entry;
    try {
      const result = await compare(miloURL, franklinURL);
      reporter.log('link-check', 'info', 'Checked Links', {
        entry,
        miloURL,
        franklinURL,
        match: result.match,
        unique: result.unique.length,
        total: result.links.length,
      });
    } catch (e) {
      console.error('Error Checking Links:', e);
      reporter.log('link-check', 'error', 'Error Checking Links', { entry, miloURL, franklinURL, error: e.message });
    }
  }
  reporter.calculateTotals();
  reporter.saveReport();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await init();
  process.exit(0);
}
