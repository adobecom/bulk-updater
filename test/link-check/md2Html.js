import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';
import getMetadata from '@adobe/helix-html-pipeline/src/steps/get-metadata.js';
import html from '@adobe/helix-html-pipeline/src/steps/make-html.js';
import extractMetaData from '@adobe/helix-html-pipeline/src/steps/extract-metadata.js';
import render from '@adobe/helix-html-pipeline/src/steps/render.js';
import tohtml from '@adobe/helix-html-pipeline/src/steps/stringify-response.js';

import { IDSlugger } from '@adobe/helix-html-pipeline/src/utils/id-slugger.js';
import { Modifiers } from '@adobe/helix-html-pipeline/src/utils/modifiers.js';

export default async (markdown, hlxUrl) => {
  const url = hlxUrl instanceof URL ? hlxUrl : new URL(hlxUrl);
  const state = {
    content: {
      data: markdown,
      slugger: new IDSlugger(),
    },
    log: '',
    metadata: Modifiers.EMPTY,
    mappedMetadata: Modifiers.EMPTY,
    info: {
      path: url.pathname,
      unmappedPath: '',
    },
    config: { host: url.host },
  };
  const req = { url };
  const res = { body: '' };

  await parseMarkdown(state);
  await getMetadata(state);
  await html(state);
  await extractMetaData(state, req);
  await render(state, req, res);
  await tohtml(state, req, res);

  return res.body;
};
