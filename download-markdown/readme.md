# Markdown Download

This script allows you to download a list of markdown files to a specified local directory. 
It utilizes JSON files to determine the list of files and locales required for the migration process.

## Features

- Supports skipping existing files to prevent unnecessary downloads.
- Implements delays between fetch requests to comply with rate limits.
- Utilizes a timeout mechanism to prevent long wait times for markdown fetching.
- Logs detailed messages throughout the process for monitoring and troubleshooting.

## Prerequisites

Before running the script, ensure the following structure is set up in your migration directory:

1. A new or existing migration directory, e.g. `blog-test`.
2. An `output` folder containing a `list.json` file with an array of entries.
3. Optionally a `locales.json` file with an array of supported locales.

## Usage

Run the script with the following command:

```bash
node download-markdown/download-markdown.js <migration-dir> <output-dir> <domain> <stage-path>
```

Where:
* `<migration-dir>` is the directory containing the output/list.json and locales.json files.
* `<output-dir>` is the md directory where the markdown files will be saved.
* `<domain>` is the domain from which the markdown files will be fetched.
* `<stage-path>` is the path used to construct the full URLs for downloading the markdown files.

## Localization Support

The script supports localized entries for staged paths.
Ensure the locales.json file contains the necessary locales, such as `['', 'de', 'fr']`.
The locale will be placed between the domain and stage path in the URL.

For example, if the stage path is '/drafts/staged-content', and the entry is 'de/entry' the URL is 'https://main--bacom-blog--adobecom.hlx.page/de/drafts/staged-content/entry.md'.

## Download Process

The script downloads markdown files based on the provided domain, locale, stage path, and entry path.
Any trailing slashes are converted to an index page.

The full URL is constructed as follows: `<domain><locale><stage-path><entry>.md`

For example:
'https://main--bacom-blog--adobecom.hlx.page' + 'de' + '/drafts/staged-content/' + '/de/'
becomes:
'https://main--bacom-blog--adobecom.hlx.page/de/drafts/staged-content/index.md'

The files are saved in the format: `<migration-dir>/md/<output-dir>/<entry>.md`.
In the example above, the markdown would be saved as: `./blog-test/md/uploaded/de/index.md`.

To re-download existing markdown files, set the `ALLOW_SKIP` constant to `false` in the script.

## Example Usage

```bash
node tools/download-markdown/download-markdown.js 'blog-test' 'uploaded' 'https://main--bacom-blog--adobecom.hlx.page' '/drafts/staged-content'
```

This command will start the download process based on the configurations provided in the ‘blog-test’ migration directory.
It will read the `./blog-test/output/list.json` file to determine the list of markdown files to download.
It will download the markdown file using the specified domain (https://main--bacom-blog--adobecom.hlx.page), using the `./blog-test/locales.json` file and stage path (/drafts/staged-content) to construct the URLs.
The downloaded files will be saved in the `./blog-test/md/uploaded/` directory using the original entry names.

## Script Functions

* `readJsonFile(file, directory)`: Parses a JSON file from the specified directory.
* `fetchMarkdown(url, fetchWaitMs, fetchFn = fetch)`: Fetches markdown content from a URL after a specified delay.
* `downloadMD(documentUrl, folderPath, entry, fetchFn = fetch)`: Downloads a markdown file from the given URL and saves it to the specified folder.
* `downloadMDs(stagedUrls, folderPath, fetchFn = fetch)`: Downloads multiple markdown files and saves them to a folder.
* `downloadMarkdown(folder, list, locales, siteURL, stagePath, fetchFn = fetch)`: Main function that orchestrates the download of markdown files.
* `init(migrationDir, outputDir, siteUrl, stagePath)`: Initializes the download process with the provided parameters.
