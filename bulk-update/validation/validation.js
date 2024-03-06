import fs from 'fs';
import { docx2md } from '@adobe/helix-docx2md';
import { entryToPath } from '../document-manager/document-manager.js';
import { compareMarkdown } from './links.js';
import { checkAltText } from './images.js';

export function checkLinks(md, markdown, reporter, entry) {
  const links = compareMarkdown(md, markdown);

  if (links) {
    console.log(`Links Match: ${links.match}, ${links.unique.length} unique links found.`);
    if (links.unique.length) {
      reporter?.log('validation', 'error', 'Unique links found', { entry, count: links.unique.length });
      console.table(links.unique);
    }
  } else {
    console.log('Could not validate links');
  }
}

export function checkImages(md, markdown, reporter, entry) {
  const missingAltText = checkAltText(md, markdown);
  console.log(`Images Missing Alt Text: ${missingAltText.length}`);
  if (missingAltText.length > 0) {
    reporter?.log('validation', 'error', 'Missing alt text', { entry, count: missingAltText.length });
    console.log(missingAltText);
  }
}

export async function validateMigration(document, config) {
  const { markdown, entry } = document;
  const { reporter, outputDir } = config;
  const output = `${outputDir}${entryToPath(entry)}.docx`;

  if (!fs.existsSync(output)) return;

  try {
    const docx = await fs.promises.readFile(output);
    const outputMd = await docx2md(docx, { listener: null });
    checkLinks(outputMd, markdown, reporter, entry);
    checkImages(outputMd, markdown, reporter, entry);
  } catch (error) {
    console.error('Error validating migration:', error);
    reporter?.log('validation', 'error', 'Error validating migration', { entry, error: error.message });
  }
}
