/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import process from 'process';
import { loadIndex } from './utils/fetch-utils.js';

/**
 * Fetches index from a given project, site, and indexUrl.
 *
 * @param {string} project - The project to parse
 * @param {string} indexUrl - The index file that contains the list of markdown files to parse
 * @returns - An object with the totals and the list of failures
 */
export default async function fetchIndex(project, indexUrl) {
  const entries = await loadIndex(project, indexUrl, false);

  return entries.length;
}

async function main(project, site, index) {
  const indexUrl = `${site}${index}`;
  const count = await fetchIndex(project, indexUrl);
  console.log(`Total index entries: ${count}`);
}

// node fetch-index.js <project> <site> <index>
// node fetch-index.js bacom-blog https://main--business-website--adobe.hlx.page /blog/query-index.json?limit=3000
if (import.meta.url === `file://${process.argv[1]}`) {
  const PROJECT = 'bacom-blog';
  const SITE = 'https://main--business-website--adobe.hlx.page';
  const INDEX = '/blog/query-index.json?limit=3000';

  const args = process.argv.slice(2);
  const [project = PROJECT, site = SITE, index = INDEX] = args;

  await main(project, site, index);
  process.exit(0);
}
