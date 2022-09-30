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

import fs from 'fs-extra';
import { fetch } from '@adobe/fetch';
import { md2docx } from '@adobe/helix-md2docx';

const entries = [
    'https://main--bacom--adobecom.hlx.live/customer-success-stories/ben-and-jerrys-case-study.md',
];

const textToChange = ``;
const textToChangeTo = ``;

async function main() {
    console.log('Fetching entries and saving locally');
    // fetch entries, make modifications, and save to disk
    for (const entry of entries) {
        const response = await fetch(entry);
        const content = await response.text();

        // Save to disk
        const fileName = entry.split('/').pop().replace('.md', '.docx');

        const buffer = await md2docx(content);
        await fs.writeFile(fileName, buffer);
    }
}

await main();
