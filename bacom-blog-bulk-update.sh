#!/bin/bash

Repos="$1"
OneDrive="$2"

Website="$OneDrive/Business Website - Documents/website"
BulkUpdater="$Repos/bulk-updater"

# List of locales
locales=("blog" "de/blog" "kr/blog" "au/blog" "fr/blog" "jp/blog" "uk/blog")

rm -f "$BulkUpdater/bacom-blog.json"
rm -f "$BulkUpdater/bacom-blog/bacom-blog-all.json"
echo '[]' > "$BulkUpdater/bacom-blog/bacom-blog-all.json"
mkdir -p "$BulkUpdater/bacom-blog/temp"

echo "Processing $Website"
# Loop over each locale
for locale in "${locales[@]}"; do
  # remove /blog from locale
  jsonFile=${locale%/*}
  echo "Processing $locale"

  # Create JSON file of all docx files
  cd "$Website" || exit 1
  echo "Finding entries from SharePoint"
  find "./$locale" -type f -name "*.docx" -print | \
    sed 's/\.docx$//; s/^\.\//\//' | \
    jq -R -s 'split("\n")[:-1]' > "$BulkUpdater/bacom-blog/temp/$jsonFile.json"

  count=$(jq length "$BulkUpdater/bacom-blog/temp/$jsonFile.json")
  echo "Total Sharepoint entries: $count"

  # Create JSON file of all index entries
  cd "$BulkUpdater" || exit 1
  node fetch-index.js bacom-blog https://main--business-website--adobe.hlx.page /$locale/query-index.json?limit=3000 true
  mv $BulkUpdater/bacom-blog.json $BulkUpdater/bacom-blog/temp/index-$jsonFile.json

  # Combine JSON files
  jq -s 'add | unique | sort' \
    "$BulkUpdater/bacom-blog/temp/$jsonFile.json" \
    "$BulkUpdater/bacom-blog/temp/index-$jsonFile.json" > \
    "$BulkUpdater/bacom-blog/bacom-blog-$jsonFile.json"

  jq -s 'add | unique | sort' \
    "$BulkUpdater/bacom-blog/bacom-blog-all.json" \
    "$BulkUpdater/bacom-blog/bacom-blog-$jsonFile.json" > \
    "$BulkUpdater/bacom-blog/temp/bacom-blog-all.json" && \
    mv "$BulkUpdater/bacom-blog/temp/bacom-blog-all.json" "$BulkUpdater/bacom-blog/bacom-blog-all.json"
done

echo "Created $BulkUpdater/bacom-blog/bacom-blog-all.json"
count=$(jq length "$BulkUpdater/bacom-blog/bacom-blog-all.json")
echo "Total number of entries: $count"

rm -rf "$BulkUpdater/bacom-blog/temp"

# Run migration script
node blog-migration.js "bacom-blog/bacom-blog-all.json" "true" "output" "true"
