import { writeFile } from 'fs/promises';
import { fetch } from '@adobe/fetch';

console.log('In fetch paths');

const locales = [
    "ae_en",
    "ae_ar",
    "africa",
    "ar",
    "at",
    "au",
    "be_en",
    "be_nl",
    "be_fr",
    "bg",
    "br",
    "ca",
    "ca_fr",
    "ch",
    "ch_de",
    "ch_fr",
    "ch_it",
    "cis_en",
    "cis_ru",
    "cl",
    "cn",
    "co",
    "cr",
    "cy_en",
    "cz",
    "de",
    "dk",
    "ec",
    "ee",
    "eg_ar",
    "eg_en",
    "es",
    "fi",
    "fr",
    "gr_en",
    "gr_el",
    "gt",
    "hk_en",
    "hk_zh",
    "hu",
    "id_en",
    "id_id",
    "ie",
    "il_en",
    "il_he",
    "in",
    "in_hi",
    "it",
    "jp",
    "kr",
    "kw_ar",
    "kw_en",
    "la",
    "lt",
    "lu_en",
    "lu_fr",
    "lu_de",
    "lv",
    "mena_ar",
    "mena_en",
    "mt",
    "mx",
    "my_ms",
    "my_en",
    "ng",
    "nl",
    "no",
    "nz",
    "pe",
    "ph_en",
    "ph_fil",
    "pl",
    "pr",
    "pt",
    "qa_en",
    "qa_ar",
    "ro",
    "ru",
    "sa_ar",
    "sa_en",
    "se",
    "sg",
    "si",
    "sk",
    "th_en",
    "th_th",
    "tr",
    "tw",
    "ua",
    "uk",
    "vn_vi",
    "vn_en",
    "za"
]

const rootUrl = 'https://main--bacom--adobecom.hlx.page';
const customerStoriesQIPath = 'customer-success-stories/query-index.json'

function constructUrl(root, locale, qIPath) {
    return `${root}/${locale}/${qIPath}`
}

async function main () {
    const pathKey = [];

    for (const locale in locales) {
        console.log(`Writing paths for locale: ${locales[locale]}`)
        const url = constructUrl(rootUrl, locales[locale], customerStoriesQIPath);
        const fileName = `${locales[locale]}-${customerStoriesQIPath.split('/').join('-')}`;

        console.log(`Url: ${url} and file name: ${fileName}`);

        const queryIndex = await fetch(url);
        let queryJson;
    
        if (queryIndex.ok) {
            console.log('Response is ok');
            queryJson = await queryIndex.json();
    
            const paths = queryJson.data.reduce((pathObj, indexItem) => {
                if (indexItem?.path) {
                    pathObj.paths.push(`${rootUrl}${indexItem.path}.md`);
                }
                return pathObj;
            }, {locale: `${locales[locale]}`, paths: []})
    
            const jsonPaths = JSON.stringify(paths)
            pathKey.push(fileName);
        
            await writeFile(`./path-files/${fileName}`, jsonPaths);
        }
    }
    const pathKeyFile = JSON.stringify(pathKey);
    await writeFile(`./path-files/a-path-key.json`, pathKeyFile)
    process.exit(0)
}

await main();