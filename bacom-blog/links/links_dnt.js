import { selectAll } from 'unist-util-select';
import { STATUS_SUCCESS, STATUS_SKIPPED } from '../../utils/migration-utils.js';

const BLOG_ORIGINS = [
    'https://business.adobe.com',
    'https://main--business-website--adobe.hlx.page',
    'https://main--business-website--adobe.hlx.live',
];

const LOCALE_STRINGS = [
    '/au',
    '/de',
    '/fr',
    '/jp',
    '/kr',
    '/uk',
];

export function shouldAddDnt(link, locale, urlList) {
    const url = new URL(link);

    // External links do not need dnt
    if (!BLOG_ORIGINS.includes(url.origin)) return false;

    // If the link already has the locale, it is already localized
    if (url.pathname.includes(locale)) return false;

    // Localize the link, and check for it in the JSON
    const localizedPathname = `${locale}${url.pathname}`;
    if (urlList.includes(localizedPathname)) return false;

    // exclude banners or fragments
    if (url.pathname.includes('/banners') || url.pathname.includes('/fragments')) return false;

    return true;
}

export function links_dnt(mdast, entry, entries) {
    const linksReport = {
        entry: entry,
        pageLinkReports: []
    }
    const locale = entry.substring(0, 3);
    if (!LOCALE_STRINGS.includes(locale)) linksReport.pageLinkReports.push({status: STATUS_SKIPPED, message: "US content"});

    const links = selectAll('link', mdast);

    if (!links?.length) {
        linksReport.pageLinkReports.push({
            status: STATUS_SKIPPED,
            message: `No links in entry: ${entry}`
        });
    }
    
    for (const link in links) {
        const url = links[link].url;
        
        if (typeof url !== 'string' || url?.length === 0 ) {
            linksReport.pageLinkReports.push({
                status: STATUS_SKIPPED,
                message: `Link did not have url property. See ${links[link]} on ${entry}`
            });
            continue;
        }

        if (shouldAddDnt(url, locale, entries)) {
            links[link].url = `${links[link].url}#_dnt`;
            linksReport.pageLinkReports.push({
                status: STATUS_SUCCESS,
                message: `Added #_dnt to link: ${links[link].url}`
            });
        } else {
            linksReport.pageLinkReports.push({
                status: STATUS_SKIPPED,
                message: `Did not transform link: ${links[link].url}`
            });
        }
    }

    return linksReport;
}
