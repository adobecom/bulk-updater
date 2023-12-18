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
} from "./mdast-utils.js";

// list of urls of Franklin pages to update
const pages = [
  "https://main--bacom--adobecom.hlx.page/customer-success-stories/ben-and-jerrys-case-study",
  "https://main--bacom--adobecom.hlx.page/customer-success-stories/helly-hansen-case-study",
];

const updateTableDataOnPage = async () => {
  for (const page of pages) {
    const mdTxt = await fetchText(`${page}.md`);
    if (!mdTxt) continue;

    const mdast = await getMdast(mdTxt);
    if (!mdast) continue;

    const cardMetadataTable = getTable(mdast, "Card Metadata")[0];

    if (!cardMetadataTable) {
      console.log(`Table not found: ${page.Path}`);
      break;
    }

    const tags = convertTags(page[TAGS_KEY]);

    const keyVals = getKeyVals(cardMetadataTable.table);

    updateKeyValue(keyVals, "Tags", `${tags},caas:products/adobe-commerce`);
    updateKeyName(keyVals, "altCardImageText", "cardImageAltText");
    updateKeyName(keyVals, "cardImagePath", "cardImage");
    updateKeyName(keyVals, "cardDate", "created");
    updateKeyName(keyVals, "cardTitle", "title");

    updateKeyNameAndValue(
      keyVals,
      "original_entity_id",
      "primaryTag",
      "caas:content-type/customer-story"
    );

    updateKeyNameAndValue(keyVals, "badges", "badgeText", "Featured");
    await saveDocx(mdast, page.split("/").pop());
  }
};

// mdast object of a caasLink
const caasLinkPara = {
  type: "paragraph",
  children: [
    {
      type: "link",
      title: null,
      url: "https://main--bacom--adobecom.hlx.page/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title",
      children: [
        {
          type: "text",
          value:
            "/de/fragments/customer-success-stories/cards/de-generic-recommended-collection-with-title",
        },
      ],
    },
  ],
};

const findAndModifyMdast = async () => {
  for (const page of pages) {
    const mdTxt = await fetchText(`${page}.md`);
    if (!mdTxt) continue;

    const mdast = await getMdast(mdTxt);
    if (!mdast) continue;

    const paragraphs = getChildren(mdast, "paragraph");

    const caasPara = paragraphs.find((para) => {
      return nodeContains(para, "link", "url", (url) =>
        url.startsWith("https://milo.adobe.com/tools/caas#")
      );
    });

    // Check if the CaaS link has a heading and table around it,
    // if so replace with `caasLinkPara`
    if (
      caasPara &&
      mdast.children[caasPara.idx - 1].type === "heading" &&
      mdast.children[caasPara.idx - 2].type === "thematicBreak" &&
      mdast.children[caasPara.idx + 1].type === "gridTable" &&
      mdast.children[caasPara.idx + 2].type === "thematicBreak"
    ) {
      mdast.children.splice(caasPara.idx - 1, 5, caasLinkPara);
      await saveDocx(mdast, page.split("/").pop());
    }
  }
};

process.exit(0);
