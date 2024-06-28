# FaaS to Marketo Form Validation

Validation of markdown files for the BACOM project for the migration of noodp pages.

## Steps

### 1. Download Markdown

See the [Download Markdown Readme](../download-markdown/readme.md) for full details.

In the `download-markdown` directory, copy the `.env.example` file to `.env` and add your authorization token.

Run the markdown download script to download the markdown files from the specified domain and stage path.

```bash
node download-markdown/download-markdown.js 'bacom-validation-2' 'page' 'https://main--bacom--adobecom.hlx.page'
```

Here we are downloading the markdown files from the `live` and `page` domains into `live` and `page` directories using the `output/list.json` file.

### 2. Validate Markdown

See the [Validation Readme](../validation/README.md) for full details.

Run the markdown validation script to validate the downloaded markdown files.

```bash
node validation/link-validator.js 'bacom-validation-2' 'bacom' 'page'
```

Here we are validating the markdown files in the `bacom` and `page` directories using the `output/list.json` file.
