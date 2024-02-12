import fs from 'fs';
import { saveDocument, getMdast } from '../../bulk-update/document-manager/document-manager.js';
import md2Html from './md2Html.js';

const { pathname } = new URL('.', import.meta.url);

export default async (md, name) => {
  const mdTxt = `${pathname}mock/${name}.md`;
  fs.writeFileSync(mdTxt, md);

  const mdast = await getMdast(md);

  // Only save the document if it doesn't exist to prevent creating a different file every time.
  if (!fs.existsSync(`${pathname}mock/${name}.docx`)) {
    saveDocument({ mdast, entry: `/${name}` }, { outputDir: `${pathname}mock` });
  }

  const url = new URL(`https://business.adobe.com/${name}.html`);
  const html = await md2Html(md, url);
  fs.writeFileSync(`${pathname}mock/${name}.html`, html);
};
