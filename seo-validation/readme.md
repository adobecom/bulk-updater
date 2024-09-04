# FaaS to Marketo Form Validation

Validation of markdown files for the BACOM project for the migration of noodp pages.

## Steps

### 0. Copy list.json

Copy the list.json file to the output directory

```bash
mkdir -p seo-validation/output
cp seo-validation/list.json seo-validation/output/list.json
```

See the [Download Markdown Readme](../download-markdown/readme.md) for full details.

### 1. Download Pre-updated Markdown

[MWPW-157568](https://jira.corp.adobe.com/browse/MWPW-157568)

Run the markdown download script to download the markdown files from the specified domain and stage path.

```bash
node download-markdown/download-markdown.js 'seo-validation' 'pre' 'https://main--bacom--adobecom.hlx.live'
```

Here we are downloading the pre-updated markdown files from the `live` domain into `pre` directory using the `list.json` file.

### 2. Download Post-updated Markdown

[MWPW-157218](https://jira.corp.adobe.com/browse/MWPW-157218)

Run the markdown download script to download the markdown files from the specified domain and stage path.

```bash
node download-markdown/download-markdown.js 'seo-validation' 'post' 'https://main--bacom--adobecom.hlx.live'
```

Here we are downloading the post-updated markdown files from the `live` domain into `post` directory using the `list.json` file.

### 3. Validate Markdown

See the [Validation Readme](../validation/README.md) for full details.

Run the markdown validation script to validate the downloaded markdown files.

```bash
node validation/link-validator.js 'seo-validation' 'pre' 'post'
```

Here we are validating the markdown files in the `pre` and `post` directories using the `output/list.json` file.
