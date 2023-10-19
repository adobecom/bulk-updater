import { selectAll } from 'unist-util-select';
import { STATUS_SUCCESS, STATUS_SKIPPED } from '../../utils/migration-utils.js';

export const BLOG_ORIGINS = [
    'https://business.adobe.com',
    'https://main--business-website--adobe.hlx.page',
    'https://main--business-website--adobe.hlx.live',
]

export const LOCALE_STRINGS = [
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

    // If it does not link to blog
    if (!url.pathname.includes('/blog')) return true;

    return true;
}

export function links_dnt(mdast, entry, entries) {
    const linksReport = {
        entry: entry,
        pageLinkReports: []
    }
    const locale = entry.substring(0, 3);
    if (!LOCALE_STRINGS.includes(locale)) return {status: STATUS_SKIPPED, message: "US content", entry: entry};

    const links = selectAll('link', mdast);
    
    for (const link in links) {
        const url = links[link].url;
        if (shouldAddDnt(url, locale, entries)) {
            links[link].url = `${links[link].url}#_dnt`;
            linksReport.pageLinkReports.push({
                status: STATUS_SUCCESS,
                message: `Added #_dnt to link: ${links[link].url}}`
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
