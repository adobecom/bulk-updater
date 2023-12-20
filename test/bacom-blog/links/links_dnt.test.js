import {
  links_dnt,
  shouldAddDnt,
  linkReportSuccess,
} from '../../../bacom-blog/links/links_dnt.js';
import { skippedReport, successReport } from './mocks/reports-mocks.js';
import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../utils/mdast-utils.js';

describe('shouldAddDnt', () => {
  it('returns false if the link is already localized', () => {
    const link =
      'https://business.adobe.com/de/blog/basics/b2c-ecommerce-guide';
    const locale = '/de';
    const urlList = ['/blog/basics/b2c-ecommerce-guide'];

    expect(shouldAddDnt(link, locale, urlList)).to.be.false;
  });

  it('returns false if the link has a locale equivilent', () => {
    const link = 'https://business.adobe.com/blog/basics/b2c-ecommerce-guide';
    const locale = '/de';
    const urlList = ['/de/blog/basics/b2c-ecommerce-guide'];

    expect(shouldAddDnt(link, locale, urlList)).to.be.false;
  });

  it('returns false if the link is to a banner or fragment', () => {
    const fragLink =
      'https://business.adobe.com/fragments/real-time-customer-data-platform/rtcdp.html';
    const bannerLink =
      'https://business.adobe.com/banners/real-time-customer-data-platform/rtcdp.html';
    const locale = '/de';
    const urlList = ['/blog/basics/b2c-ecommerce-guide'];

    expect(shouldAddDnt(fragLink, locale, urlList)).to.be.false;
    expect(shouldAddDnt(bannerLink, locale, urlList)).to.be.false;
  });

  it('returns true if the link points to the us and does not have a locale equivelant', () => {
    const link = 'https://business.adobe.com/blog/basics/b2c-ecommerce-guide';
    const locale = '/de';
    const urlList = ['/fr/blog/basics/b2c-ecommerce-guide'];

    expect(shouldAddDnt(link, locale, urlList)).to.be.true;
  });

  it('returns true if the link is to same-host non-blog content', () => {
    const link =
      'https://business.adobe.com/products/real-time-customer-data-platform/rtcdp.html';
    const locale = '/de';
    const urlList = ['/blog/basics/b2c-ecommerce-guide'];

    expect(shouldAddDnt(link, locale, urlList)).to.be.true;
  });
});

describe('linksReportSuccess', () => {
  it('returns false when the link report is an object that has failed', () => {
    const report = {
      status: 'failed',
      message: 'Did not transform links, failed to fetch markedown',
    };

    expect(linkReportSuccess(report)).to.be.false;
  });

  it('should return false if the report entry is empty', () => {
    const report = {};

    expect(linkReportSuccess(report)).to.be.false;
  });

  it('should return false if there are no successes in the report', () => {
    const report = skippedReport;

    expect(linkReportSuccess(report)).to.be.false;
  });

  it('should return true if there is at least one success in the report', () => {
    const report = successReport;

    expect(linkReportSuccess(report)).to.be.true;
  });
});

describe('links', () => {
  it('adds #_dnt correctly to the link node', async () => {
    const inputPath = new URL('./mocks/de-pre-dnt.md', import.meta.url);
    const outputPath = new URL('./mocks/de-post-dnt.md', import.meta.url);
    const inputMd = await readFile(inputPath);
    const outputMd = await readFile(outputPath);
    const inputMdast = await getMdast(inputMd.toString());
    const outputMdast = await getMdast(outputMd.toString());

    const entry = '/de/';
    const entries = ['/de/blog/basics/data-warehouse'];

    links_dnt(inputMdast, entry, entries);
    expect(inputMdast).to.deep.equal(outputMdast);
  });
});
