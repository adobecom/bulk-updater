# Migration Tools

This directory contains utility functions for migrating content from one format to another. The tools are designed to work with Markdown Abstract Syntax Trees (mdast) and are used to transform content from the old format to the new format.

## Select

The `select.js` file contains utility functions for finding blocks in a Markdown Abstract Syntax Tree (mdast).

- `getBlockInfo(str)`: This function takes a string and extracts block information from it. It returns an object containing the block name and options.

- `selectAllBlocks(mdast, block)`: This function takes an mdast tree and a block name as arguments. It returns all grid tables in the mdast tree that match the specified block name.

- `selectBlock(mdast, block)`: This function is similar to `selectAllBlocks`, but it returns the first grid table that matches the specified block name.

- `mapBlock(block)`: This function takes a block element and maps its data to a 2D array.

- `blockToObject(block)`: This function converts a block into an object. It uses the `mapBlock` function to map the block data to a 2D array, then converts this array into an object.
