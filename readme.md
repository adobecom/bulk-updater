# Bulk updater script
> A script for pulling in multiple .md files, making modifications and re-exporting as .docx
> This repo has been archived as it is no longer used. 

## Install: 
```
npm install 
```

## Run
```
node index.js
```

# Block Report
> A script for reporting on the types of and number of blocks in a site.

## Run
```
node block-report.js [project] [site] [index] [cached]
```

## Parameters

* project (Optional): The project name or directory. Default is set to `'bacom-blog'`.
* site (Optional): The base URL of the site. Default is set to `'https://main--business-website--adobe.hlx.page'`.
* index (Optional): The specific index or endpoint. Default is set to `'/blog/query-index.json?limit=3000'`.
* cached (Optional): Boolean flag to enable or disable caching. Default is set to `true`.
