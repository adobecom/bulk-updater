#!/bin/bash

OneDrive="$1"
Repos="$2"

Website="$OneDrive/Business Website - Documents/website"
BulkUpdater="$Repos/bulk-updater/bacom-blog"

cd $OneDrive
cd "Business Website - Documents/website"

echo '[]' > "${BulkUpdater}/bacom-blog-all.json"

# List of locales
locales=("blog" "de" "kr" "au" "fr" "jp" "uk")

# Loop over each locale
for locale in "${locales[@]}"; do
  cd $Website
  find "./$locale" -type f -name "*.docx" -print | \
    sed 's/\.docx$//; s/^\.\//\//' | \
    jq -R -s 'split("\n")[:-1]' > "$BulkUpdater/bacom-blog-$locale.json"
  
  # Combine JSON files
  cd $BulkUpdater
  jq -s 'add' "./bacom-blog-all.json" "./bacom-blog-$locale.json" > "./temp.json" && mv "./temp.json" "./bacom-blog-all.json"
done

# Run migration script
node blog-migration.js "bacom-blog-all.json" "true" "bacom-blog-migration.json" "true"
