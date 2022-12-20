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
import fs from 'fs';
import { fetch } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';

const entries = [
    'https://main--bacom--adobecom.hlx.page/customer-success-stories/adobe-advertising-cloud-case-study',
    'https://main--bacom--adobecom.hlx.page/kr/customer-success-stories/adobe-advertising-cloud-case-study',
    'https://main--bacom--adobecom.hlx.page/au/customer-success-stories/adobe-advertising-cloud-case-study',
];


async function main() {
    console.log('Fetching entries and saving locally');
    const mainDirectory = 'output';
    fs.mkdirSync(mainDirectory, { recursive: true });

    for (const entry of entries) {
        
        const response = await fetch(`${entry}.md`);
        const content = await response.text();

        const urlParts = entry.split('/');
        const directory = urlParts[urlParts.length - 2];
        const name = `${urlParts[urlParts.length - 1]}`;

        let locale = 'en-US';
        if (urlParts[urlParts.length - 3] !== 'main--bacom--adobecom.hlx.page') {
            locale = urlParts[urlParts.length - 3];
        }

        if (locale === 'en-US') {
            const path = `${mainDirectory}/${directory}`;
            const fileName = `${mainDirectory}/${directory}/${name}`;
            fs.mkdirSync(path, { recursive: true });
            await writeFile(`${fileName}.md`, content);

            const secondResponse = await fetch(`http://localhost:3023/${fileName}.md`);
            const localContent = await secondResponse.text();

            const secondState = { content: { data: localContent }, log: '' };
            await parseMarkdown(secondState);
            const { mdast } = secondState.content;
            const buffer = await mdast2docx(mdast);
            await writeFile(`${fileName}.docx`, buffer);

            fs.unlink(`${fileName}.md`, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            });

            console.log(`Saved ${fileName}`);

        } else {
            const path = `${mainDirectory}/${locale}/${directory}`;
            const fileName = `${mainDirectory}/${locale}/${directory}/${name}`;
            fs.mkdirSync(path, { recursive: true });
            await writeFile(`${fileName}.md`, content)

            const secondResponse = await fetch(`http://localhost:3023/${fileName}.md`);
            const localContent = await secondResponse.text();

            const secondState = { content: { data: localContent }, log: '' };
            await parseMarkdown(secondState);
            const { mdast } = secondState.content;
            const buffer = await mdast2docx(mdast);
            await writeFile(`${fileName}.docx`, buffer);

            fs.unlink(`${fileName}.md`, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            });

            console.log(`Saved ${fileName}`);
        }

    };
    process.exit(0);
}

await main();
