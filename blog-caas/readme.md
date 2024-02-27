# Blog to CAAS Migration

Migration to add card metadata to blog pages so that blog articles can be added to CaaS.

## Overview

1. Extracting data and metadata from the existing blog content.
2. Map Metadata tags to CaaS tags.
3. Validate the extracted metadata.
4. Creating a new card-metadata block for CaaS.

## Usage

Run the migration script directly or use the bulk-update script:

```bash
node blog-caas/migration.js
npm run bulk-update blog-caas
```

## Testing

Test using on of the following command:
```bash
npm run test test/blog-caas/
npm run test:watch test/blog-caas/
```

### Documentation
https://wiki.corp.adobe.com/display/MKTOMD/Blog+to+CaaS
