import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fetch } from '@adobe/fetch';
import { mdast2docx } from '@adobe/helix-md2docx';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';

const getLeaf = (node, type) => {
  if (node?.type === type || !node.children) return node;

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const leaf = getLeaf(node.children[i], type);
      if (leaf) return leaf;
    }
  }
  return undefined;
};

const getHeaderInfo = (str) => {
  if (!str) return [];
  const [blockName, rawOptions] = str.split('(').map((t) => t.trim());
  const options = rawOptions?.split(',');
  if (options?.length) {
    const lastOption = options[options.length - 1];
    if (lastOption?.endsWith(')')) options[options.length - 1] = lastOption.replace(')', '');
  }
  return [blockName, options];
};

const getTableMap = (mdast) => {
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

const getKeyVal = (keyVals, key) => {
  const lcKey = key.toLowerCase();
  return keyVals.find((keyVal) => keyVal.key?.value?.toLowerCase() === lcKey);
};

export const updateKeyValue = (keyVals, key, value) => {
  const keyVal = getKeyVal(keyVals, key);
  if (keyVal?.val) keyVal.val.value = value;
};

export const updateKeyName = (keyVals, originalName, newName) => {
  const keyVal = getKeyVal(keyVals, originalName);
  if (keyVal?.key) keyVal.key.value = newName;
};

export const updateKeyNameAndValue = (keyVals, originalName, newName, value) => {
  const keyVal = getKeyVal(keyVals, originalName);
  if (keyVal?.key) {
    keyVal.key.value = newName;
    keyVal.val.value = value;
  }
};

export const getTable = (mdast, blockName) =>
  getTableMap(mdast).filter((t) => t.blockName === blockName?.toLowerCase());

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

export const saveDocx = async (mdast, name, outputDir = 'output', logger = errorLogger) => {
  const fileName = `${name}.docx`;
  const buffer = await mdast2docx(mdast, { log: logger});
  if (!existsSync(outputDir)) {
    await mkdir(outputDir);
  }
  await writeFile(`${outputDir}${outputDir && '/'}${fileName}`, buffer);
  console.log(`Saved ${fileName}`);
};
