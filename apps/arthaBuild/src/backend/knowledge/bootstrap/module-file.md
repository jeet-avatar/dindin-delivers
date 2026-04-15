---
source: SuiteScript 2.x API Reference — N/file Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/file Module

The N/file module provides access to the NetSuite File Cabinet. Use it to load, create,
update, and delete files stored in the File Cabinet. Available in server-side scripts only.

## Loading the Module

```javascript
define(['N/file'], function(file) { ... });
```

## Core Methods

### file.load(options)
Loads a file from the File Cabinet by internal ID or path.

```javascript
// Load by internal ID
var f = file.load({ id: 1234 });

// Load by absolute path
var f = file.load({ id: '/SuiteScripts/myScript.js' });
var f = file.load({ id: '/Templates/PDF Templates/invoice.html' });
```

Returns: `File` object

### file.create(options)
Creates a new File object in memory (not yet saved).

```javascript
var newFile = file.create({
  name: 'export.csv',
  fileType: file.Type.CSV,
  contents: 'id,name,amount\n1,Widget,19.99\n2,Gadget,29.99\n',
  folder: -15,           // Optional: folder internal ID; -15 = SuiteScripts root
  description: 'Monthly export',  // Optional
  isOnline: false        // Optional: true = publicly accessible URL
});

var fileId = newFile.save(); // Returns internal ID (number)
```

### file.delete(options)
Deletes a file from the File Cabinet.

```javascript
file.delete({ id: 1234 });
```

## File Object Properties

```javascript
var f = file.load({ id: 1234 });

f.id           // Internal ID (number)
f.name         // File name (string), e.g. 'report.pdf'
f.path         // Full path in File Cabinet, e.g. '/SuiteScripts/report.pdf'
f.folder       // Parent folder internal ID (number)
f.size         // File size in bytes (number)
f.fileType     // file.Type constant string
f.description  // File description (string)
f.isOnline     // Boolean — publicly accessible
f.isText       // Boolean — text-based file type
f.encoding     // File encoding (string)
f.url          // Public URL (if isOnline = true)
```

## File Object Methods

```javascript
// Get file contents as a string
var contents = f.getContents();

// Append text to an existing text file
f.appendLine({ value: 'new line of text' });

// Reset contents iterator (for large files read in chunks)
f.resetStream();

// Read next chunk (for streaming large files)
var chunk = f.readChunk({ size: 5000 });  // 5000 chars
```

## file.Type Constants

```javascript
file.Type.PLAINTEXT    // 'PLAINTEXT' (.txt)
file.Type.CSV          // 'CSV' (.csv)
file.Type.JSON         // 'JSON' (.json)
file.Type.XML          // 'XMLDOC' (.xml)
file.Type.HTML         // 'HTMLDOC' (.html)
file.Type.PDF          // 'PDF' (.pdf)
file.Type.JAVASCRIPT   // 'JAVASCRIPT' (.js)
file.Type.CSS          // 'STYLESHEET' (.css)
file.Type.SCSS         // 'SCSS' (.scss)
file.Type.PNG          // 'PNGIMAGE' (.png)
file.Type.JPG          // 'JPGIMAGE' (.jpg)
file.Type.GIF          // 'GIFIMAGE' (.gif)
file.Type.MP3          // 'MP3' (.mp3)
file.Type.ZIP          // 'ZIP' (.zip)
file.Type.EXCEL        // 'EXCEL' (.xlsx)
file.Type.WORD_DOC     // 'WORD_DOC' (.docx)
```

## Standard File Cabinet Folder Paths

| Path | Purpose |
|------|---------|
| `/SuiteScripts/` | SuiteScript files |
| `/Templates/` | Email and PDF templates |
| `/Templates/PDF Templates/` | PDF templates for record printing |
| `/Web Site Hosting Files/` | Web store hosting files |
| `/Images/` | Image assets |

## Standard Folder Internal IDs

| ID | Folder |
|----|--------|
| `-15` | SuiteScripts (root) |
| `-10` | Templates |

Note: Folder IDs other than -15 and -10 are account-specific. Use search or navigation
to find folder IDs for custom folder structures.

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `file.load()` | 10 units |
| `file.create()` | 0 units (in memory) |
| `fileObj.save()` | 10 units |
| `file.delete()` | 10 units |

## Common Patterns

### Write a JSON report to File Cabinet
```javascript
require(['N/file'], function(file) {
  var data = { reportDate: new Date().toISOString(), records: [] };
  // ... populate data ...

  var f = file.create({
    name: 'report-' + new Date().toISOString().split('T')[0] + '.json',
    fileType: file.Type.JSON,
    contents: JSON.stringify(data, null, 2),
    folder: -15
  });
  var fileId = f.save();
  log.audit({ title: 'Report written', details: 'File ID: ' + fileId });
});
```

### Load and parse CSV
```javascript
require(['N/file'], function(file) {
  var csvFile = file.load({ id: '/SuiteScripts/import/data.csv' });
  var contents = csvFile.getContents();
  var lines = contents.split('\n');
  var headers = lines[0].split(',');

  for (var i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    var values = lines[i].split(',');
    var row = {};
    headers.forEach(function(h, idx) {
      row[h.trim()] = values[idx] ? values[idx].trim() : '';
    });
    // Process row...
  }
});
```

### Create PDF from template
```javascript
require(['N/render', 'N/file'], function(render, file) {
  var renderer = render.create();
  renderer.templateContent = file.load({ id: '/Templates/PDF Templates/invoice.html' }).getContents();
  renderer.addRecord({ templateName: 'record', record: rec });

  var pdfFile = renderer.renderAsPdf();
  pdfFile.name = 'Invoice_' + tranId + '.pdf';
  pdfFile.folder = -15;
  pdfFile.save();
});
```

### Check if file exists
```javascript
require(['N/file', 'N/search'], function(file, search) {
  var fileSearch = search.create({
    type: 'file',
    filters: [['name', search.Operator.IS, 'myfile.csv']],
    columns: [search.createColumn({ name: 'internalid' })]
  });
  var results = fileSearch.run().getRange({ start: 0, end: 1 });
  if (results.length > 0) {
    var existingId = results[0].getValue({ name: 'internalid' });
    // File exists, load it
    var f = file.load({ id: parseInt(existingId) });
  }
});
```

## Notes

- Files created with `file.create()` are in memory only until `.save()` is called.
- `getContents()` returns the full file as a string — for large files, use `readChunk()`.
- Binary files (PDF, images) have base64-encoded contents from `getContents()`.
- The `/SuiteScripts/` path is the recommended location for all SuiteScript files.
- File names must be unique within a folder.
