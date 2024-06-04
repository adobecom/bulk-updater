# Post Bulk Update Link Validation

This is a validation tool to test the integrity of links pre and post bulk update and user preview.

The tool takes the list of paths provided and uses it to check the source and updated markdown folders that should contain markdown files pulled down from `query-log.json` files.

The validator differs from the link validation done during bulk updating by checking two different folders that should be representative of markdown files from different stages of the bulk update process. To ensure link integrity, the "updated" markdown folder should contain markdown files that are either post update, post Sharepoint opened, or both.

This tool is made to be used in conjunction with the `download-markdown` tool but can be used independently with any markdown.

## Prerequisites

Before running the script, ensure the following structure is set up in your migration directory:

1. A new or existing migration directory, e.g. `blog-test`.
2. An `output` folder containing a `list.json` file with an array of entries.
3. A `md` folder containing the source and updated markdown files.

## Usage

Run the migration script directly, ensuring to set the path:

```bash
node validation/link-validator.js <migration-dir> <source> <updated>
# example:
node validation/link-validator.js 'blog-test' 'source' 'updated'
```

Where:
- `<migration-dir>` is the directory containing the output/list.json and locales.json files.
- `<source>` is the folder containing the source markdown files.
- `<updated>` is the folder containing the updated markdown files.

## How it works

The script reads markdown files from the provided paths and extracts all the links from each file. It then compares the links from the source and updated files. If the links match exactly, it logs that they match. If they don't, it performs a deep comparison, logging the differences and any anomalies it detects.

The script generates two reports: a standard report and a deep comparison report. The standard report logs the overall results of the comparison, while the deep comparison report logs detailed information about each link and any anomalies detected.


## Reviewing the Reports

The script generates two reports: a standard report and a deep comparison report.

The standard report logs the overall results of the comparison, including the number of links that match, the number of links that don't match, and the anomalies detected.

The deep comparison report logs detailed information about each link, including the source and updated URLs, the observations made, and any anomalies detected.
Any unknown anomalies or issues can be further investigated by reviewing the deep comparison report.
Pages with links that don't match 

Outputs a list of all page links for pages that do not match 1:1 on deep report.
If one of the links do not match, all the links on that page will be added to a "All Links" sheet. 

## Observations

The script makes several observations while comparing the source and updated markdown files. 

Here are some of the key observations:

- **Match**: Checks if the two strings (or URLs) are exactly the same.
- **Empty**: Checks if either of the two strings (or URLs) is empty.
- **Both Empty**: Checks if both the strings (or URLs) are empty.
- **Lengths Match**: Checks if the two strings (or URLs) have the same length.
- **Similarity Percentage**: Calculates the percentage similarity between the two strings (or URLs).
- **Whitespace**: Checks if the two strings (or URLs) are the same when all whitespace is removed.
- **ASCII**: Checks if either of the two strings (or URLs) contains ASCII characters.
- **Double Hash**: Checks if either of the URLs contains more than one hash (#) character.
- **Valid URL**: Checks if both the old and new URLs are valid.
- **Hash Match**: Checks if the hash part of the old and new URLs match.
- **Host Match**: Checks if the host part of the old and new URLs match.
- **Pathname Match**: Checks if the pathname part of the old and new URLs match.
- **Search Match**: Checks if the search part of the old and new URLs match.

## Anomalies

Based on the observations, the script detects several anomalies. 

Here are some of the key anomalies:

- **Empty Link**: The link or its associated text are empty.
- **Missing link**: The link and its associated text are missing.
- **Whitespace Corruption**: The text matches when all whitespace is removed, but does not match otherwise.
- **ASCII URL Corruption**: The URL contains ASCII characters and does not match the source URL.
- **Multiple Hashtags**: The URL contains more than one hash (#) character.
