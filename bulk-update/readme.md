# Bulk Migration Guide

This guide provides instructions for creating migrations and using `bulk-update.js` to perform bulk migration of markdown files to docx.

## Creating a Migration

To create a new migration, make a new migration file within a new migration project folder. This folder should be at the root of the project and named after the project. For complex migrations, consider creating separate migration files inside the migration folder for each block or section.

Folder Structure:
* <project-name>/migration.js
* <project-name>/migrations/<block-migration>.js

## Configuration Object

The configuration object sets up the migration and is used by the bulk update scripts. It contains the following properties:

- `siteUrl`: The base hlx URL, page, or live, for relative markdown paths.
- `reporter`: A logging class for recording loading, saving, and migration statuses.
- `mdDir`: The directory for storing the fetched markdown for caching purposes.
- `cacheTimeMs`: The markdown cache time in milliseconds. If set to -1, the cache never expires.

Here is an example of a configuration object setup:

```js
config = {
  "siteUrl": "https://main--bacom--adobecom.hlx.page/", // The hlx site url
  "reporter": new ConsoleReporter(), // The logging type
  "outputPath": "output", // The output directory for the docx files
  "mdDir": "markdown", // The directory for storing the fetched markdown.
  "cacheTimeMs": 0 // Disables the cache.
}
```

## Migration Function

The `migration.js` file sets up the configuration object and performs the actual migration.

Structure: TBD

## Reporter

The reporter class is crucial for logging the migration process, aiding in debugging and tracking migration progress.

There are several types of reporters:
- `BaseReporter`: This base reporter class stores logs in an array. It's useful for creating custom logging solutions.
- `ConsoleReporter`: This reporter logs to the console, making it useful for debugging.
- `ExcelReporter`: This reporter logs to an Excel file, making it ideal for final migration reporting.

Here's an example of how to instantiate an `ExcelReporter`:

```js
excelReporter = new ExcelReporter('output.xlsx');
```

### Logging:

The `log` method takes a `topic`, `status`, `message`, and additional arguments.

- `topic`: The topic of the log message.
- `status`: The status of the log message.
- `message`: The log message.
- `args`: Additional arguments to be included in the log.

Example:

```js
reporter.log('block migration', 'success', `Migrated ${count} Block(s)`, link1, link2);
```

## Document Manager

The Document Manager is responsible for converting markdown files into mdast format and from mdast to docx format. The mdast object is a JSON representation of the markdown file. Libraries such as 'unist-util-select' can be used to traverse the mdast object and modify the markdown tree.

### Structure

A document object consists of the following properties:

- `entry`: The relative URL path of the resource.
- `markdown`: The initial markdown string fetched from the resource.
- `mdast`: The modifiable mdast object used for content migration.

Here's an example of a document object:

```js
document = {
  "entry": "/products/adobe-experience-cloud-products.html",
  "markdown": "# Authoring Content",
  "mdast": { "type": "root", ... }
}
```

The document manager has the following methods:

- `loadDocument`: Fetches the markdown file and converts it to mdast format.
- `saveDocument`: Converts the mdast object to docx format and saves it to the output directory.

### loadDocument

The `loadDocument` method is automatically invoked during the migration process. It accepts an entry path and a configuration object as parameters. The method loads or fetches the markdown file, saves it to the `mdDir` specified in the configuration object, and converts the markdown into mdast format. This is all returned in a document object.

```js
const document = await loadDocument(entry, config);
```

### saveDocument

The `saveDocument` method should be invoked by the migration process when the mdast object is ready to be saved. The `entry` property of the document object is used to determine the filename of the docx file and can be updated during the migration. The method accepts a document object and a configuration object as parameters. It converts the document mdast into docx format and saves it to the output directory specified in the configuration object.

```js
await saveDocument(document, config);
```
