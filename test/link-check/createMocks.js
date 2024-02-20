import fs from 'fs';
import { saveDocument, getMdast } from '../../bulk-update/document-manager/document-manager.js';
import md2Html from './md2Html.js';

const { pathname } = new URL('.', import.meta.url);

const createMock = async (md, name) => {
  const mdTxt = `${pathname}mock/${name}.md`;
  fs.writeFileSync(mdTxt, md);

  const mdast = await getMdast(md);
  saveDocument({ mdast, entry: `/${name}` }, { outputDir: `${pathname}mock` });

  const url = new URL(`https://business.adobe.com/${name}.html`);
  const html = await md2Html(md, url);
  fs.writeFileSync(`${pathname}mock/${name}.html`, html);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const linkURLs = [
    'https://www.adobe.com/creativecloud.html',
    'https://www.adobe.com/products/photoshop.html',
    'https://www.adobe.com/products/illustrator.html',
    'https://www.adobe.com/products/premiere.html',
    'https://www.adobe.com/products/acrobat.html',
  ];

  let links1 = '# Links';
  linkURLs.forEach((link) => {
    links1 += `\n- [Adobe](${link})`;
  });
  createMock(links1, 'links1');
  let links2 = '# Links';
  linkURLs.slice().reverse().forEach((link) => {
    links2 += `\n- [Adobe](${link})`;
  });
  createMock(links2, 'links2');
}
