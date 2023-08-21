import xlsx from 'xlsx';
import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { fetch } from '@adobe/fetch';
import process from 'process';
import { getMdast, getTableMap, getNodesByType } from './utils/mdast-utils.js';

const PROJECT = 'bacom-blog';
const SITE = 'https://main--business-website--adobe.hlx.page';
const INDEX = '/blog/query-index.json?limit=3000';
const USE_CACHE = true;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchIndex(url) {
    console.log('Fetching entries and saving locally');
    const index = await fetch(url);
    const indexData = await index.json();

    return indexData.data;
}

async function loadIndex(project, url, cached = true) {
    const filePath = `./${project}/entries.json`;

    async function fetchAndWrite() {
        const entries = await fetchIndex(url);
        const paths = entries.map((entry) => entry.path);
        await writeFile(filePath, JSON.stringify(paths, null, 2));
        return paths;
    }

    if (!cached) {
        return fetchAndWrite();
    }

    try {
        await access(filePath);
        const entriesJson = await readFile(filePath, 'utf8');
        return JSON.parse(entriesJson);
    } catch (err) {
        return fetchAndWrite();
    }
}

async function fetchMarkdown(url) {
    console.log('Fetching markdown and saving locally');
    await delay(500);
    const response = await fetch(url);
    return await response.text();
}

async function loadMarkdown(url, path, cached = true) {
    async function fetchAndWrite() {
        const markdown = await fetchMarkdown(`${url}.md`);
        await writeFile(`./${path}.md`, markdown);
        return markdown;
    }

    if (!cached) {
        return fetchAndWrite();
    }

    try {
        await access(`./${path}.md`);
        return await readFile(`./${path}.md`, 'utf8');
    } catch (err) {
        return fetchAndWrite();
    }
}

async function runReport(project, site, indexUrl, cached = true) {
    const blocks = {};
    const variants = {};
    const allLinks = {};
    const blockLinks = {};
    const totals = { blocks: {}, variants: {} };
    const entries = await loadIndex(project, indexUrl, cached);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        blocks[entry] = {};
        const folder = `${project}${entry.split('/').slice(0, -1).join('/')}`;
        await mkdir(`./${folder}`, { recursive: true });

        const markdown = await loadMarkdown(`${site}${entry}`, `${project}${entry}`, cached);
        const mdast = await getMdast(markdown);
        const tableMap = getTableMap(mdast);

        for (let j = 0; j < tableMap.length; j++) {
            const table = tableMap[j];
            const { blockName, options } = table;
            if (options) {
                const variant = blockName + ' (' + options.join(', ') + ')';
                variants[entry] = variants[entry] || {};
                variants[entry][variant] = (variants[entry][variant] || 0) + 1;
                totals.variants[variant] = (totals.variants[variant] || 0) + 1;
            }
            blocks[entry][blockName] = (blocks[entry][blockName] || 0) + 1;
            totals.blocks[blockName] = (totals.blocks[blockName] || 0) + 1;

            const links = getNodesByType(table.table, 'link');
            const name = entry + ',' + blockName + j;
            blockLinks[name] = blockLinks[name] || [];
            links.forEach((link) => {
                const { url } = link;
                blockLinks[name].push(url);
            });
        };

        const links = getNodesByType(mdast, 'link');
        if (links) {
            links.forEach((link) => {
                const { url } = link;
                allLinks[entry] = allLinks[entry] || [];
                allLinks[entry].push(url);
            });
        }

        console.log(`${i}/${entries.length}`, entry, blocks[entry]);
    }

    return { blocks, variants, allLinks, blockLinks, totals };
}

function createReport(site, project, report) {
    const { blocks, variants, allLinks, blockLinks, totals } = report;
    const allBlocks = Object.keys(totals.blocks).sort();
    const ws_data = [['Path', 'URL', ...allBlocks]];

    for (const entry in blocks) {
        const blockValues = allBlocks.map((key) => blocks[entry][key] || 0);
        const row = [entry, `${site}${entry}`, ...blockValues];
        ws_data.push(row);
    }

    const wb = xlsx.utils.book_new();
    const ws_entries = xlsx.utils.aoa_to_sheet(ws_data);
    xlsx.utils.book_append_sheet(wb, ws_entries, 'Entries');

    const allVariants = Object.keys(totals.variants).sort();
    const variantsData = [['Path', 'URL', ...allVariants]];
    for (const entry in variants) {
        const blocks = allVariants.map((key) => variants[entry][key] || 0);
        const row = [entry, `${site}${entry}`, ...blocks];
        variantsData.push(row);
    }
    const ws_variants = xlsx.utils.aoa_to_sheet(variantsData);
    xlsx.utils.book_append_sheet(wb, ws_variants, 'Variants');

    const linksData = [['Path', 'URL', 'Links']];
    for (const entry in allLinks) {
        const row = [entry, `${site}${entry}`, ...allLinks[entry]];
        linksData.push(row);
    }
    const ws_links = xlsx.utils.aoa_to_sheet(linksData);
    xlsx.utils.book_append_sheet(wb, ws_links, 'All Links');

    const blockLinksData = [['Path', 'URL', 'Block', 'Links']];
    for (const entry in blockLinks) {
        const [entryName, blockName] = entry.split(',');
        const row = [entryName, `${site}${entryName}`, blockName, ...blockLinks[entry]];
        blockLinksData.push(row);
    }
    const ws_blocklinks = xlsx.utils.aoa_to_sheet(blockLinksData);
    xlsx.utils.book_append_sheet(wb, ws_blocklinks, 'Block Links');

    const ws_totals = xlsx.utils.aoa_to_sheet([['Block', 'Total'], ...Object.entries(totals.blocks)]);
    xlsx.utils.book_append_sheet(wb, ws_totals, 'Totals');

    const dateStr = new Date().toLocaleString('en-US', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\/|,|:| /g, '-').replace('--', '_');
    xlsx.writeFile(wb, `./${project}/reports/Report ${dateStr}.xlsx`);
    console.log(`Saved Report reports/${dateStr}.xlsx`);
}

async function main(project, site, index, cached) {
    await mkdir(`./${project}`, { recursive: true });

    const indexUrl = `${site}${index}`;

    const report = await runReport(project, site, indexUrl, cached);
    console.log('totals', report.totals);

    await mkdir(`./${project}/reports`, { recursive: true });
    createReport(site, project, report);
}

const args = process.argv.slice(2);
const [project = PROJECT, site = SITE, index = INDEX, cached = USE_CACHE] = args;

await main(project, site, index, cached);
