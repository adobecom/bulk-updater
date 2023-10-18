import { links_dnt, shouldAddDnt } from '../../../../bacom-blog/links/links_dnt.js'
import { readFile } from 'fs/promises';
import { expect } from '@esm-bundle/chai';
import { getMdast } from '../../../../utils/mdast-utils.js';

describe('shouldAddDnt', () => {
    it('returns false if the link is already localized', () => {
        const link = "https://main--bacom-blog--adobecom.hlx.page/de/blog/basics/b2c-ecommerce-guide";
        const locale = '/de';
        const urlList = ["/blog/basics/b2c-ecommerce-guide"];

        expect(shouldAddDnt(link, locale, urlList)).to.be.false;
    })

    it('returns false if the link has a locale equivilent', () => {
        const link = "https://main--bacom-blog--adobecom.hlx.page/blog/basics/b2c-ecommerce-guide";
        const locale = '/de';
        const urlList = ["/de/blog/basics/b2c-ecommerce-guide"];

        expect(shouldAddDnt(link, locale, urlList)).to.be.false;
    })

    it('returns true if the link points to the us and does not have a locale equivelant', () => {
        const link = "https://main--bacom-blog--adobecom.hlx.page/blog/basics/b2c-ecommerce-guide";
        const locale = '/de';
        const urlList = ["/fr/blog/basics/b2c-ecommerce-guide"];

        expect(shouldAddDnt(link, locale, urlList)).to.be.true;
    })

    it('returns true if the link is to same-host non-blog content', () => {
        const link = "https://business.adobe.com/products/real-time-customer-data-platform/rtcdp.html";
        const locale = '/de';
        const urlList = ["/blog/basics/b2c-ecommerce-guide"];

        expect(shouldAddDnt(link, locale, urlList)).to.be.true;
    })

})


describe('links', () => {
    it('gets all link nodes on a page and returns their number', () => {

    })

    it('adds #_dnt correctly to the link node', () => {

    })

    it('transforms the link correctly in place on the page', () => {
        
    });
});
