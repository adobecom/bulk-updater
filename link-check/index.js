import { compare } from './linkCompare.js';

/**
 * Executes a comparison of links from two sources. Accepts Docx, Markdown, and URLs.
 *
 * Example usage:
 * node link-check/index.js https://main--business-website--adobe.hlx.page/blog/ https://main--bacom-blog--adobecom.hlx.page/blog/
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const source1 = process.argv[2];
  const source2 = process.argv[3];

  console.log(`Comparing ${source1} and ${source2}...`);

  await compare(source1, source2)
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error('Error occurred while comparing links:', error.message);
    })
    .finally(() => {
      process.exit();
    });
}
