#!/bin/bash

if [ $# -eq 0 ]; then
  exit 1
fi

BulkUpdater=$(realpath `dirname $0`)
OneDrive="$1"

# List of locales
locales=("blog" "de/blog" "kr/blog" "au/blog" "fr/blog" "jp/blog" "uk/blog")

mkdir -p "$BulkUpdater/temp"
echo "Total entries: $(jq length "$BulkUpdater/bacom-blog-all.json")"

# Create JSON file of all docx files
for locale in "${locales[@]}"; do
  # remove /blog from locale
  jsonFile=${locale%/*}

  echo "Total $jsonFile entries: $(jq length "$BulkUpdater/bacom-blog-$jsonFile.json")"

  cd "$OneDrive" || exit 1
  echo "OneDrive: $(pwd)"
  find "./$locale" -type f -name "*.docx" -print | \
    sed 's/\.docx$//; s/^\.\//\//' | \
    jq -R -s 'split("\n")[:-1]' > "$BulkUpdater/temp/$jsonFile-raw.json"

  cd "$BulkUpdater"

  # Filter out fragments
  jq '[.[] | select(. | contains("/fragments") | not)]' "$BulkUpdater/temp/$jsonFile-raw.json" > \
    "$BulkUpdater/temp/$jsonFile-sharepoint.json"

  echo "Total $jsonFile Sharepoint entries: $(jq length "$BulkUpdater/temp/$jsonFile-sharepoint.json")"

  jq -s 'add | unique | sort' \
    "$BulkUpdater/temp/$jsonFile-sharepoint.json" \
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
