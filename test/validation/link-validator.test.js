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
import { BulkUpdate, ExcelReporter, loadListData, saveDocument } from '../../bulk-update/index.js';

describe('Validator', () => {
  const sourceMd = fs.readFileSync('test/validation/mocks/adobe-experience-manager-source.md', 'utf-8');
  const updatedMd = fs.readFileSync('test/validation/mocks/adobe-experience-manager-updated.md', 'utf-8');
  const mismatchMd = fs.readFileSync('test/validation/mocks/adobe-experience-manager-updated-mismatched.md', 'utf-8');
  const shuffledMd = fs.readFileSync('test/validation/mocks/adobe-experience-manager-shuffled.md', 'utf-8');

  it('Returns "all links match" based on link match', async () => {
    const sourceMdast = await getMdast(sourceMd);
    const updatedMdast = await getMdast(updatedMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, updatedMdast);

    const message = compareLinkLists(sourceLinks, updatedLinks);
    expect(message[2]).to.equal(LINKS_MATCH);
  });

  it('Returns "link mismatch mapping" based on link mismatch', async () => {
    const sourceMdast = await getMdast(sourceMd);
    const mismatchedMdast = await getMdast(mismatchMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, mismatchedMdast);

    const message = compareLinkLists(sourceLinks, updatedLinks);
    const mismatchHash = message[3].log[5];
    const mismatchPath = message[3].log[6];
    const mismatchSearch = message[3].log[7];
    const mismatchHost = message[3].log[8];
    const mismatchText = message[3].log[9];
    expect(message[2]).to.equal(LINKS_DO_NOT_MATCH);
    expect(mismatchHash.hashMatch).to.be.false;
    expect(mismatchPath.pathMatch).to.be.false;
    expect(mismatchSearch.searchMatch).to.be.false;
    expect(mismatchHost.hostMatch).to.be.false;
    expect(mismatchText.textMatch).to.be.false;
  });

  it('Returns "source and updated list do not have the same length" when the files have different link numbers', async () => {
    const sourceMdast = await getMdast(sourceMd);
    const shuffledMdast = await getMdast(shuffledMd);
    const { sourceLinks, updatedLinks } = await getLinksLists(sourceMdast, shuffledMdast);

    const message = compareLinkLists(sourceLinks, updatedLinks);
    expect(message[2]).to.equal(LENGTHS_DO_NOT_MATCH);
  });

  it('valiates the migration', async () => {
    const pathToListShort = './blog-test/output/list.json';
    const { pathname } = new URL('.', import.meta.url);
    const dateString = ExcelReporter.getDateString();
    const myReporter = new ExcelReporter(`${pathname}validation-${dateString}.xlsx`, false);

    await validateMigratedPageLinks(pathToListShort, myReporter);
    console.log(myReporter.getReport());
    myReporter.log('live', 'laugh', 'love');
    console.log(myReporter.getReport().logs.live);
    // myReporter.saveReport();
  });
});
