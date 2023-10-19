#!/bin/bash

# Fetch new paths
./bacom-blog/fetch-index.sh

if [ $# -eq 1 ]; then
  ./bacom-blog/fetch-sharepoint.sh $1
fi

# Run bulk update script
node blog-migration.js "bacom-blog/bacom-blog-all.json" "fetch" "output"
# node blog-migration.js "bacom-blog/bacom-blog-all.json" "cache" "output"
