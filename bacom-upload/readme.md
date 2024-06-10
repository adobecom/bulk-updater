# Bacom Upload

This is a proof of concept project to test the upload of docx files to Sharepoint using the Graph API.

## Steps

1. Update the `.env` file with the required environment variables.
2. Run the upload script to upload the docx files to Sharepoint.

## Environment Variables
Replace the following environment variables in the `.env` file:

```bash
SITE_ID=your_site_id
DRIVE_ID=your_drive_id
BEARER_TOKEN=your_bearer_token
```

Use the https://developer.microsoft.com/en-us/graph/graph-explorer to get the `SITE_ID`, `DRIVE_ID`, and `BEARER_TOKEN` values.

## Usage

Run the upload script directly:

```bash
node bacom-upload/migration.js
```
