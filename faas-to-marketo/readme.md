# FaaS to Marketo Link Migration

This tool automates the generation of Marketo URLs from FaaS URLs found in markdown documents. It utilizes a CSV file to mapping FaaS URLs to Marketo URLs, processing each document to find FaaS URLs, and generates a corresponding Marketo URL based on the mapping and template.

## Prerequisites

Prepare a CSV file with a row for each page that needs to be migrated and the specified template: full, expanded, or essential.

The CSV should have headers `path` and `template`.

## Usage

Run the url-report script using the CSV file containing the paths and templates of the unpublished pages. 
This will generate an Excel document in the `faas-to-marketo/reports/` directory with the marketo links and any other messages and warnings.

Run using: `node faas-to-marketo/url-report.js <csvFile>`
Example: `node faas-to-marketo/url-report.js faas-to-marketo/form-mapping.csv`

## Unpublished Content

To migrate unpublished pages, follow these steps using the markdown downloader:

1. **Generate a List of Pages to Download:**
  - Run the `url-report` script first. Use a CSV file containing the paths and templates of the unpublished pages.
  - This generates an `output/list.json` file with the entries that need to be downloaded.

2. **Download Markdown Files:**
  - Execute the `download-markdown` script, specifying the CSV file with paths and templates of the unpublished pages.
  - **Command:** `node download-markdown/download-markdown.js <csvFile> <outputDir> <baseUrl>`
  - **Example:** `node download-markdown/download-markdown.js 'faas-to-marketo' 'source' 'https://main--bacom--adobecom.hlx.page'`
  - This downloads the markdown files to the `faas-to-marketo/md/source/` directory.

3. **Verify Cache and Download Completion:**
  - Run the `url-report` script again. It will use the downloaded markdown files, leveraging the 30-day cache.
  - Ensure there are no 'Fetching markdown' messages in the console output, indicating the cache is functioning correctly.
