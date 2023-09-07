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

/**
 * This is a collection of node utils to parse and modify mdast trees.
 */

import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { select, selectAll } from 'unist-util-select'
import { fetch } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';


/**
 * It returns the first node of a given type that it finds in a tree
 * @param node - The node to search
 * @param type {string} - The type of the node you're looking for.
 * @returns The first node that matches the type or undefined if no node matches the type.
 */
export const getLeaf = (node, type) => {
  if (node?.type === type || !node.children) return node;

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const leaf = getLeaf(node.children[i], type);
      if (leaf) return leaf;
    }
  }
  return undefined;
};

/**
* It takes a node and a type, and recursively walk the tree and return all nodes of a given type
* @param node - the node we're currently on
* @param type {string} - The type of nodes you want to get.
* @returns An array of nodes of the given type
*/
export const getNodesByType = (node, type) => {
  let children = [];
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === type) children.push(child);
      children.push(...getNodesByType(child, type));
    }
  }
  return children;
};

/**
 * It takes a node and a type, and returns an array of all the children of that node that match the
 * type
 * @param node - the node we're currently on
 * @param type {string} - The type of node you want to get.
 * @returns An array of objects with the following properties:
 *   - type
 *   - value
 *   - idx
 */
export const getChildren = (node, type) => {
  if (!node?.children) return [];
  return node.children.reduce((acc, child, idx) => {
    if (child.type === type) acc.push({ ...child, idx });
    return acc;
  }, []);
};

/**
 * It returns true if a node contains a child node of a given type, with a given parameter, and a given
 * value
 * @param node {Object} - the node to check
 * @param type {string} - The type of node you're looking for.
 * @param param {string} - The param which contains the value to check for
 * @param val {(string|function)} - The value to check for.  If string checks for an exact match.
 *        Otherwise provide a function that returns a boolean, the value will be provided as the only argument
 * @returns A function that takes in a node, a type, a param, and a val. It checks if the node is of
 * the type, and if it is, it checks if the node's param is equal to the val. If it is, it returns
 * true. If it isn't, it checks if the node has children, and if it does, it checks if any of the
 * children are
 */
export const nodeContains = (node, type, param, val) => {
  if (node.type === type) {
    if ((typeof val === 'function' && val(node[param])) || node[param] === val) {
      return true;
    }
  }
  if (node.children?.length) {
    return node.children.some((child) => nodeContains(child, type, param, val));
  }
  return false;
};

/**
 * It takes a string like `block(option1, option2)` and returns an array like `['block', ['option1',
 * 'option2']]`
 * @param str - The string to parse.
 * @returns An array with the block name and options.
 */
export const getHeaderInfo = (str) => {
  if (!str) return [];
  const [blockName, rawOptions] = str.split('(').map((t) => t.trim());
  const options = rawOptions?.split(',').map((t) => t.trim());
  if (options?.length) {
    const lastOption = options[options.length - 1];
    if (lastOption?.endsWith(')')) options[options.length - 1] = lastOption.replace(')', '');
  }
  return [blockName, options];
};

/**
 * Select all grid tables with a specific block name
 *
 * @param {object} mdast - mdast tree
 * @param {string} block - block name
 * @returns {object} mdast tree reference
 */
export const selectAllBlocks = (mdast, block) => {
  return selectAll('gridTable', mdast).filter((table) => {
    const [blockName] = getHeaderInfo(select('text', table)?.value?.toLowerCase());
    return blockName === block.toLowerCase();
  });
}

// mdast Table Utils

/**
 * It takes a markdown AST and returns an array of objects that contain the table, the block name, and
 * the options
 * @param mdast - The markdown AST
 * @returns An array of objects with the following properties:
 *   blockName: The name of the block
 *   options: The options for the block
 *   table: The table object
 */
export const getTableMap = (mdast) => {
  const tables = mdast.children.filter((child) => child.type === 'gridTable');
  const tableMap = tables.map((table) => {
    const [blockName, options] = getHeaderInfo(getLeaf(table, 'text')?.value?.toLowerCase());
    return {
      blockName,
      options,
      table,
    };
  });
  return tableMap;
};

/**
 * It takes a table and returns an array of objects, where each object has a key and a value
 * @param table - The table node
 * @returns An array of objects with keys and values.
 */
export const getKeyVals = (table) => {
  const rows = getLeaf(table, 'gtBody')?.children;
  return rows.map((row) =>
    row.children.reduce((rowInfo, cell, idx) => {
      const rowInfoKey = idx === 0 ? 'key' : 'val';
      rowInfo[rowInfoKey] = getLeaf(cell, 'text');
      return rowInfo;
    }, {})
  );
};

/**
 * "Given an array of key-value pairs, return the value of the key-value pair whose key matches the
 * given key."
 *
 * @param keyVals - An array of key-value pairs.
 * @param key - The key to look for in the key-value pairs.
 * @returns The value of the key-value pair that matches the key.
 */
const getKeyVal = (keyVals, key) => {
  const lcKey = key.toLowerCase();
  return keyVals.find((keyVal) => keyVal.key?.value?.toLowerCase() === lcKey);
};

/**
 * If the keyVal exists, update the value.
 * @param keyVals - The array of key/value pairs.
 * @param key - the key to update
 * @param value - The value to be updated.
 */
export const updateKeyValue = (keyVals, key, value) => {
  const keyVal = getKeyVal(keyVals, key);
  if (keyVal?.val) keyVal.val.value = value;
};

/**
 * It takes an array of key-value pairs, a key name, and a new key name, and updates the key name in
 * the array
 * @param keyVals - The array of key-value pairs.
 * @param originalName - The original name of the key.
 * @param newName - The new name of the key.
 */
export const updateKeyName = (keyVals, originalName, newName) => {
  const keyVal = getKeyVal(keyVals, originalName);
  if (keyVal?.key) keyVal.key.value = newName;
};

/**
 * "Update the key name and value of a key-value pair in a JavaScript object."
 *
 * The function takes in an array of key-value pairs, the original name of the key, the new name of the
 * key, and the new value of the key
 * @param keyVals - The array of key/value pairs.
 * @param originalName - The original name of the key.
 * @param newName - The new name of the key.
 * @param value - The value of the key-value pair.
 */
export const updateKeyNameAndValue = (keyVals, originalName, newName, value) => {
  const keyVal = getKeyVal(keyVals, originalName);
  if (keyVal?.key) {
    keyVal.key.value = newName;
    keyVal.val.value = value;
  }
};

/**
 * It takes a markdown AST and a block name, and returns an array of tables that match the block name
 * @param mdast - The markdown AST
 * @param blockName - The name of the table block.
 */
export const getTable = (mdast, blockName) =>
  getTableMap(mdast).filter((t) => t.blockName === blockName?.toLowerCase());

// End mdast Table Utils

/**
 * It takes a string of Markdown text and returns a JavaScript object that represents the Markdown
 * Abstract Syntax Tree (mdast)
 * @param mdTxt - The markdown text to be parsed.
 * @returns The mdast is being returned.
 */
export const getMdast = async (mdTxt) => {
  const state = { content: { data: mdTxt }, log: '' };

  await parseMarkdown(state);
  const { mdast } = state.content;
  return mdast;
};

const errorLogger = {
  error: (s) => console.log(s),
  info: () => {},
  log: () => {},
  warn: (s) => console.log(s),
};

/**
 * It takes a Markdown AST, a name, an output directory, and a logger, and saves a docx file to the
 * output directory
 * @param mdast - The MDAST object to convert to docx.
 * @param name - The name of the file to be saved.
 * @param [outputDir=output] - The directory to save the file to.
 * @param [logger] - A function that takes a string and logs it.
 */
export const saveDocx = async (mdast, name, outputDir = 'output', logger = errorLogger) => {
  const fileName = `${name}.docx`;
  const buffer = await mdast2docx(mdast, { log: logger });
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  await writeFile(`${outputDir}${outputDir && '/'}${fileName}`, buffer);
  console.log(`Saved ${fileName}`);
};

/**
 * It fetches a URL and returns the text of the response
 * @param url - The URL of the page to fetch.
 * @returns A function that takes a url as an argument and returns a promise that resolves to the text
 * of the response.
 */
export const fetchText = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Page not loaded: ${res.status} ${url}`);
      return null;
    }
    const text = await res.text();
    return text;
  } catch (err) {
    console.log(`fetchText error: ${err.message}`);
    return null;
  }
};
