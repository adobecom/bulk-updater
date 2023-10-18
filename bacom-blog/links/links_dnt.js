export const LOCALE_STRINGS = [
    '/au/',
    '/de/',
    '/fr/',
    '/jp/',
    '/kr/',
    '/uk/',
];

export function links_dnt() {
    return false;
}

export function shouldAddDnt(link, locale, urlList) {
    const url = new URL(link);

    // If the link already has the locale, it is already localized
    if (url.pathname.includes(locale)) return false;

    // Localize the link, and check for it in the JSON
    const localizedPathname = `${locale}${url.pathname}`;
    if (urlList.includes(localizedPathname)) return false;

    // If it does not link to blog
    if (!url.pathname.includes('/blog')) return true;

    return true;
}