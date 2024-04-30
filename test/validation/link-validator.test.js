import fs from 'fs';
import { expect } from '@esm-bundle/chai';
import {
  getLinksLists,
  compareLinkLists,
  LINKS_MATCH,
  LINKS_DO_NOT_MATCH,
  LENGTHS_DO_NOT_MATCH,
  validateMigratedPageLinks,
} from '../../validation/link-validator.js';
import { getMdast } from '../../bulk-update/document-manager/document-manager.js';
import { ExcelReporter } from '../../bulk-update/index.js';

const { pathname } = new URL('.', import.meta.url);

describe('Validator', () => {
  const sourceMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-source.md`, 'utf-8');
  const updatedMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-updated.md`, 'utf-8');
  const mismatchMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-updated-mismatched.md`, 'utf-8');
  const shuffledMd = fs.readFileSync(`${pathname}mocks/adobe-experience-manager-shuffled.md`, 'utf-8');

  it('Returns "all links match" based on link match', async () => {
    const sourceMdast = await getMdast(sourceMd);
    const updatedMdast = await getMdast(updatedMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, updatedMdast);

    const message = compareLinkLists(sourceLinks, updatedLinks);
    expect(message[1]).to.equal(LINKS_MATCH);
  });

  it('Returns "link mismatch mapping" based on link mismatch', async () => {
    const sourceMdast = await getMdast(sourceMd);
    const mismatchedMdast = await getMdast(mismatchMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, mismatchedMdast);

    const message = compareLinkLists(sourceLinks, updatedLinks);
    const mismatchHash = message[3].log['hashMatch-5'];
    const mismatchPath = message[3].log['pathMatch-6'];
    const mismatchSearch = message[3].log['searchMatch-7'];
    const mismatchHost = message[3].log['hostMatch-8'];
    const mismatchText = message[3].log['textMatch-9'];
    expect(message[1]).to.equal(LINKS_DO_NOT_MATCH);
    expect(mismatchHash).to.be.false;
    expect(mismatchPath).to.be.false;
    expect(mismatchSearch).to.be.false;
    expect(mismatchHost).to.be.false;
    expect(mismatchText).to.be.false;
  });

  it('Returns "source and updated list do not have the same length" when the files have different link numbers', async () => {
    const sourceMdast = await getMdast(sourceMd);
    const shuffledMdast = await getMdast(shuffledMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, shuffledMdast);

    const message = compareLinkLists(sourceLinks, updatedLinks);
    expect(message[2]).to.equal(LENGTHS_DO_NOT_MATCH);
  });

  it('valiates the migration', async () => {
    const pathToListShort = 'test/validation/mocks/list.json';
    const mdPath = 'test/validation/mocks/md';
    const dateString = ExcelReporter.getDateString();
    const myReporter = new ExcelReporter(`${pathname}output/validation-${dateString}.xlsx`, false);

    await validateMigratedPageLinks(pathToListShort, mdPath, myReporter);
    const report = myReporter.getReport();
    console.log(report);
    expect(Object.keys(report.logs).length).to.equal(2);
    expect(report.logs['Compare Links'].length).to.equal(3);
    expect(report.logs['Deep Compare Links'].length).to.equal(2);
    // Uncomment to troubleshoot report
    // myReporter.saveReport();
  });
});
