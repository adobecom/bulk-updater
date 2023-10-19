#!/bin/bash

BulkUpdater=$(realpath `dirname $0`)
echo "BulkUpdater: $BulkUpdater"

# List of locales
locales=("blog" "de/blog" "kr/blog" "au/blog" "fr/blog" "jp/blog" "uk/blog")

mkdir -p "$BulkUpdater/temp"
echo "Total entries: $(jq length "$BulkUpdater/bacom-blog-all.json")"

# Create JSON file of all index entries
for locale in "${locales[@]}"; do
  # remove /blog from locale
  jsonFile=${locale%/*}

  echo "Total $jsonFile entries: $(jq length "$BulkUpdater/bacom-blog-$jsonFile.json")"
  node fetch-index.js bacom-blog https://main--business-website--adobe.hlx.page /$locale/query-index.json?limit=3000 true
  mv $BulkUpdater/../bacom-blog.json $BulkUpdater/temp/$jsonFile-index.json

  # Combine JSON files
  jq -s 'add | unique | sort' \
    "$BulkUpdater/temp/$jsonFile-index.json" \
    "$BulkUpdater/bacom-blog-$jsonFile.json" > \
    "$BulkUpdater/temp/bacom-blog-$jsonFile.json"

  mv "$BulkUpdater/temp/bacom-blog-$jsonFile.json" \
     "$BulkUpdater/bacom-blog-$jsonFile.json"

  echo "Total $jsonFile entries: $(jq length "$BulkUpdater/bacom-blog-$jsonFile.json")"

  jq -s 'add | unique | sort' \
    "$BulkUpdater/bacom-blog-all.json" \
    "$BulkUpdater/bacom-blog-$jsonFile.json" > \
    "$BulkUpdater/temp/bacom-blog-all.json" && \

  mv "$BulkUpdater/temp/bacom-blog-all.json" \
     "$BulkUpdater/bacom-blog-all.json"
  
  echo "Total entries: $(jq length "$BulkUpdater/bacom-blog-all.json")"
done


rm -rf "$BulkUpdater/temp"
