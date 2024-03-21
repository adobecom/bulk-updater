# Hello World Migration

## Description

This migration adds a "hello world" header to the top of the document.
This is an example of using the bulk update library located at `bulk-update/index.js` to perform bulk updates.

## Usage

Run the migration script using the command `npm run bulk-update 'migration-example'` or `node migration-example/custom-migration.js`.

## Overview

The `migration-example/migration.js` script is responsible for setting up the configuration object and performing the actual migration. 
The `init` function returns the configuration object for the migration, and the `migrate` function performs the actual migration.

## Custom Migrations

For complete control over the migration process, you can create a custom migration script. The `migration-example/custom-migration.js` script is an example of this.
