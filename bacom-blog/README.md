# BACOM Blog Bulk Update

Fetch markdown from the Business Website and bulk update it for the BACOM Blog.
From main--business-website--adobe to main--bacom-blog--adobecom.

## How to use
Running the migration will fetch the markdown from the Business Website and cache it locally.
Running it with the cache option will only use the cached markdown.
To clear the cache, delete the `md/bacom-blog` folder.

Run the node script directly

```bash
node blog-migration.js "bacom-blog/bacom-blog-all.json" "fetch" "output"
node blog-migration.js "bacom-blog/bacom-blog-all.json" "cache" "output"
```

Run the node script via npm

```bash
npm run migration:blog
```

Run from script, this will add new entries to the bacom-blog-all.json file.
```bash
sh ../blog-migration.sh
sh ../blog-migration.sh "MY-DOCX-SITE-FOLDER"
```
## Useful JQ JSON commands

Text to JSON
`jq -R -s -c 'split("\n")[:-1]' input.txt > output.json`
`jq -R -s 'split("\n")[:-1] | map(sub("https://business.adobe.com"; "")) | sort' input.txt > output.json`

JSON to text
`jq -r '.[]' target.json > output.txt`
`jq -r '"https://main--bacom-blog--adobecom.hlx.page" + .[]' target.json > output.txt`

Find paths
`jq '[.[] | select(. | contains("/banners") or contains("/tags"))]' source.json > target.json`

Filter paths
`jq '[.[] | select(. | contains("/fragments") | not)]' source.json > target.json`

Combine and sort
`jq -s 'add | unique | sort' source1.json source2.json > output.json'`
