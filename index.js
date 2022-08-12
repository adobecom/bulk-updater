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
import fetch from 'node-fetch';

const textToChange = ``;

const textToChangeTo = ``;

async function main() {
    console.log('Fetching entries and saving locally');
    const entries = [];
    // fetch entries, make modifications, and save to disk
    for (const entry of entries) {
        const response = await fetch(entry);
        const content = await response.text();

        // Make a few changes
        const newContent = content.replace(textToChange, textToChangeTo);
        
        // Save to disk
        const fileName = entry.split('/').pop();
        await fs.writeFile(fileName, newContent);
    }
    console.log('Done');
}

main();
