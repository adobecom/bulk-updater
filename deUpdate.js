/**  */

import {
  fetchText,
  getChildren,
  getLeaf,
  getMdast,
  getTable,
  getTableMap,
  getKeyVals,
  nodeContains,
  saveDocx,
  updateKeyName,
  updateKeyNameAndValue,
  updateKeyValue,
} from './utils/mdast-utils.js';

// list of urls of Franklin pages to update
const pages = [
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/accent-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/ace-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-advertising-cloud-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-digital-experiences-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-experience-cloud',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-experience-cloud-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-experience-platform-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-on-adobe-intranet-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-sensei-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/adobe-xml-case-study',
  // 'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/albertsons-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/allianz-australia-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/alshaya-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/amplifon-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/amway-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/andritz-gruppe-case-study',
  // 'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/anheuser-busch-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/armor-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/arthrex-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/arval-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/asfinag-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/bechtle-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/binyan-studios-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/bmw-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/bmw-group-france-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/briggs-stratton-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/bt-customer-experience-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/bt-esign-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/burger-king-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/c3-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/cabinets-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/carl-zeiss-meditec-ag-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/carou-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/center-parcs-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/ciena-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/city-of-sacramento-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/code-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/comviva-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/constellation-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/crane-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/css-versicherung-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/dandd-london-case-study',
  // 'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/dell-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/der-spiegel-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/der-touristik-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/dixons-carphone-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/edf-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/eglo-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/eiu-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/elektrobit-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/empowered-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/eurobet-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/festo-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/flyer-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/foodpanda-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/fox-networks-group-gmbh-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/franke-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/fraport-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/gabor-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/galenica-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/gebruder-weiss-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/global-fund-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/grabarzundpartner-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/grundfos-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hagerty-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/haka-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hallhuber-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/handbook-germany-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/helly-hansen-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hewlett-packard-enterprise-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hexagon-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hjh-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hogl-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/homag-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hostelworld-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/hotelscom-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/htw-berlin-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/huk-coburg-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/ibb-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/ibm-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/innogy-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/internetstores-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/japan-airlines-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/jockey-case-study',
  // 'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/kaercher-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/kao-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/knauf-ceiling-solutions-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/kneipp-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/kws-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/lampenwelt-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/lenovo-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/lifetime-training-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/littlehipstar-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/loccitane-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/london-heathrow-airport-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/lufthansa-airplus-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/lush-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/magenta-telekom-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/mann-hummel-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/mann-hummel-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/mediadesign-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/merck-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/metro-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/mey-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/meyer-natural-foods-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/meyle-muller-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/mitel-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/mondi-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/monin-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/moovit-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/national-center-for-missing-and-exploited-children-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/nedbank-case-study',
  // 'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/neverfail-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/new-voice-media-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/nissan-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/nivus-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/nkd-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/ogilvy-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/otto-acrobat-sign-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/otto-customer-journey-analytics-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/pall-corporation-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/panasonic-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/panda-security-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/pga-tour-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/piaggio-fast-forward-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/pierre-fabre-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/pino-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/posterxxl-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/prediger-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/progrexion-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/provinzial-nordwest-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/puma-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/raiffeisen-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/raiffeisen-informatik-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/regalraum-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/rewe-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/riese-mueller-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/royal-london-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/royal-philips-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/rs-components-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/saga-titan-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sas-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sbb-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/schaeffler-gruppe-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/scout24-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/seat-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/shopdirect-case-study',
  // 'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/silicon-labs-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sixt-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sky-ai-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sky-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/s-management-services-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/smart-europe-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/software-ag-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/spar-ics-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sprint-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/stoke-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/strabag-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/strauss-coffee-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sunrise-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/sunstar-group-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/super-rtl-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/swisscom-ai-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/swisscom-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/tata-consulting-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/telefonica-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/telegraph-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/tendam-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/tf1-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/the-home-depot-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/tsb-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/videor-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/viega-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/virgin-holidays-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/visa-digitas-pixelpark-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/vw-classic-parts',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/walgreens-boots-alliance-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/wvv-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/yemeksepeti-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/zadig-voltaire-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/zarges-case-study',
  'https://main--bacom--adobecom.hlx.page/de/customer-success-stories/zdf-enterprises-case-study',
];

const caasFrag =
  '[/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title](https://main--bacom--adobecom.hlx.page/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title)';

const footerFrag = `[/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title](https://main--bacom--adobecom.hlx.page/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title)

  [/de/fragments/customer-success-stories/contact-footer](https://main--bacom--adobecom.hlx.page/de/fragments/customer-success-stories/contact-footer)`;

// mdast object of a caasLink
const caasLinkPara = {
  type: 'paragraph',
  children: [
    {
      type: 'link',
      title: null,
      url: 'https://main--bacom--adobecom.hlx.page/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title',
      children: [
        {
          type: 'text',
          value:
            '/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title',
        },
      ],
    },
  ],
};

const main = async () => {
  for (const page of pages) {
    let mdTxt = await fetchText(`${page}.md`);
    if (!mdTxt) {
      console.log('Error: ', page);
      continue;
    }

    if (mdTxt.includes('de/fragments/customer-success-stories/cards')) {
      if (mdTxt.includes('de/fragments/customer-success-stories/contact-footer')) {
        continue;
      }
      mdTxt = mdTxt.replace(caasFrag, footerFrag);
    } else {
      console.log('caasFrag not found:', page);
      continue;
    }

    const mdast = await getMdast(mdTxt);
    if (!mdast) continue;

    await saveDocx(mdast, page.split('/').pop());
  }
};

await main();
process.exit(0);
