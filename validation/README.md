# Post Bulk Update Link Validation

Validation tool to test the integrity of links pre and post bulk update and user preview.

The tool takes the list of paths provided asnd uses it to check the source and updated md 
folders that should contain md files pulled down from query-log.json files.

The validator differs from the link validation done during bulk updating by checking two different
folders that should be representative of md files from different stages of the bulk update process.
To ensure link integraty, the "updated" md folder should contain MDs that are either post update, post
Sharepoint opened, or both.

## Usage

Run the migration script directly, ensuring to set the path:

```bash
node validation/link-validator.js {path to list.json} {path to md directory}

example: node validation/link-validator.js ./blog-test/output/list.json ./blog-test/md
```
