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

const entries = [
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/accent-group-case-study',
  'https://main--bacom--adobecom.hlx.page/africa/customer-success-stories/adarsh-credit-cooperative-society-case-study',
];

async function main() {
  console.log('Fetching entries and saving locally');
  for (const entry of entries) {
    const response = await fetch(`${entry}.md`);
    const content = await response.text();
    const state = { content: { data: content }, log: '' };
    await parseMarkdown(state);

    const { mdast } = state.content;
    let runThrottle = 0;
    mdast.children.forEach((child) => {
      if (child.type === 'gridTable' && runThrottle < 1) {
        if (child.children[0].children[0].children[0].children[0].children[0].value === 'Columns (contained)') {
          child.children.forEach((grandChild) => {
            if (grandChild.type === 'gtBody') {
              console.log(grandChild.children[0].children[0].children[0].children[0].type);
              if (grandChild.children[0].children[0].children[0].children[0].type === 'text') {
                const textArray = grandChild.children[0].children[0].children[0].children[0].value.split(':');
                grandChild.children[0].children[0].children[0].children[0].value = `:objectives: ${textArray[2]}`;
              } else {
                grandChild.children[0].children[0].children[0] = {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      value: ':objectives:',
                    },
                  ],
                };
              }
              if (grandChild.children[0].children[1].children[0].children[0].type === 'text') {
                const resultsArray = grandChild.children[0].children[0].children[0].children[0].value.split(':');
                grandChild.children[0].children[1].children[0].children[0].value = `:results: ${resultsArray[2]}`;
              } else {
                grandChild.children[0].children[1].children[0] = {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'text',
                      value: ':results:',
                    },
                  ],
                };
              }
            }
          });
          runThrottle++;
        }
      }
    });

    const fileName = `${entry.split('/').pop()}.docx`;

    const buffer = await mdast2docx(mdast);
    await writeFile(fileName, buffer);

    console.log(`Saved ${fileName}`);
  }
  process.exit(0);
}

await main();
