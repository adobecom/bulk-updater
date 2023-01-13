/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { writeFile } from 'fs/promises';
import { fetch } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';
import { getMdast, saveDocx } from './utils/mdast-utils.js';

const entries = [
  // 'https://main--bacom--adobecom.hlx.page/drafts/cmillar/ben-and-jerrys-case-study',
  'https://main--bacom--adobecom.hlx.page/customer-success-stories/carmax-case-study',
];

const textToChange = ``;
const textToChangeTo = ``;


async function main() {
  console.log('Fetching entries and saving locally');
  for (const entry of entries) {
    const mdast = await getMdast(entry);
    await saveDocx(mdast, entry.split('/').pop());
  }
  process.exit(0);
}

await main();
