# Bulk updater script
> A script for pulling in multiple .md files, making modifications and re-exporting as .docx

## Install: 
```
npm install 
```

## Run
```
node index.js
```

## Convert 
```
node node_modules/@adobe/helix-md2docx/src/cli/convert2docx.js <file>
```

Where `file` can either be a single file or directory.


## Example script

```
const textToChange = `
  <tr>
    <td>caas:content-type</td>
    <td>customer-story</td>
  </tr>
`;

const textToChangeTo = `
  <tr>
    <td>caas:some-other-specialcontent-type</td>
    <td>customer-story</td>
  </tr>
`;

async function main() {
    console.log('Fetching entries and saving locally');
    const entries = [
        'https://main--bacom--adobecom.hlx.page/customer-success-stories/adobe-at-adobe-techsummit-case-study.md', 
        'https://main--bacom--adobecom.hlx.page/customer-success-stories/abb-case-study.md', 
        'https://main--bacom--adobecom.hlx.page/customer-success-stories/aci-worldwide-case-study.md'];
    // fetch entries, make modifications, and save to disk
    for (const entry of entries) {
        const response = await fetch(entry);
        const content = await response.text();

        // Make a few changes
        const newContent = content.replace(textToChange, textToChangeTo);
        
        // Save to disk
        const fileName = entry.split('/').pop();
        await fs.writeFile(fileName, newContent);
    }
    console.log('Done');
}

main();
```