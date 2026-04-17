---
source: SuiteScript 2.x API Reference — N/compress Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/compress Module

The N/compress module creates, reads, and decompresses archive files (ZIP, GZIP) in NetSuite.
Use it to bundle multiple files for download, compress large exports, or extract incoming
compressed data from integrations. Available in server-side scripts.

## Loading the Module

```javascript
define(['N/compress'], function(compress) { ... });
```

## Creating ZIP Archives

### compress.createArchiver()
Creates an Archiver object for building a ZIP archive.

```javascript
var archiver = compress.createArchiver();
```

### archiver.add(options)
Adds a file to the archive.

```javascript
var archiver = compress.createArchiver();

// Add files to the archive
archiver.add({
  name: 'orders.csv',    // Filename inside the ZIP
  file: ordersFile       // File object (from N/file)
});

archiver.add({
  name: 'invoices.csv',
  file: invoicesFile
});

archiver.add({
  name: 'reports/summary.pdf',  // Can include path within ZIP
  file: summaryFile
});
```

**Parameters:**
- `name` (string): Required. The filename (and optional path) for the file inside the archive
- `file` (File): Required. An N/file `File` object to include

### archiver.toFile(options)
Finalizes the archive and returns it as a File object.

```javascript
var zipFile = archiver.toFile({
  name: 'monthly_export.zip',  // Name of the resulting ZIP file
  folder: -15                   // Optional: save to File Cabinet folder ID
});
// Returns: File object (ZIP format)

// If folder is specified, the file is automatically saved to File Cabinet
// If no folder, the File object is in-memory (call .save() to persist)
log.audit({ title: 'Archive created', details: zipFile.name + ' (' + zipFile.size + ' bytes)' });
```

**Parameters:**
- `name` (string): Required. Name of the ZIP file
- `folder` (number): Optional. File Cabinet folder ID to save into. -15 = SuiteScripts root.

**Returns:** `file.File` object

## Decompressing GZIP Files

### compress.gunzip(options)
Decompresses a GZIP-compressed file.

```javascript
var gzipFile = file.load({ id: '/SuiteScripts/imports/data.csv.gz' });

var decompressedFile = compress.gunzip({ file: gzipFile });
// Returns: File object with decompressed contents

var contents = decompressedFile.getContents();
log.debug({ title: 'Decompressed size', details: decompressedFile.size });
```

**Parameters:**
- `file` (File): Required. A File object containing GZIP-compressed data

**Returns:** `file.File` object with decompressed contents

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `compress.createArchiver()` | 0 units |
| `archiver.add()` | 0 units per file |
| `archiver.toFile()` | 10 units |
| `compress.gunzip()` | 10 units |

## Common Patterns

### Bundle multiple reports for email attachment
```javascript
require(['N/compress', 'N/file', 'N/email'], function(compress, file, email) {

  function bundleReports(reportFiles) {
    var archiver = compress.createArchiver();

    reportFiles.forEach(function(reportFile, index) {
      archiver.add({
        name: 'report_' + (index + 1) + '.csv',
        file: reportFile
      });
    });

    return archiver.toFile({
      name: 'reports_bundle_' + new Date().toISOString().split('T')[0] + '.zip'
      // No folder — in-memory only for email attachment
    });
  }

  var zipBundle = bundleReports([ordersFile, invoicesFile, customersFile]);

  email.send({
    author: 5,
    recipients: ['finance@company.com'],
    subject: 'Monthly Report Bundle',
    body: 'Please find all reports attached as a ZIP file.',
    attachments: [zipBundle]
  });
});
```

### Create export ZIP and save to File Cabinet
```javascript
require(['N/compress', 'N/file', 'N/search'], function(compress, file, search) {

  function createExportArchive() {
    var archiver = compress.createArchiver();

    // Generate customer CSV
    var customerCsv = generateCustomerCSV(); // returns File object
    archiver.add({ name: 'customers.csv', file: customerCsv });

    // Generate orders CSV
    var ordersCsv = generateOrdersCSV(); // returns File object
    archiver.add({ name: 'orders.csv', file: ordersCsv });

    // Generate items CSV
    var itemsCsv = generateItemsCSV(); // returns File object
    archiver.add({ name: 'items.csv', file: itemsCsv });

    // Save to File Cabinet
    var zipFile = archiver.toFile({
      name: 'export_' + new Date().toISOString().split('T')[0] + '.zip',
      folder: -15  // SuiteScripts root
    });

    log.audit({ title: 'Export created', details: 'File ID: ' + zipFile.id });
    return zipFile.id;
  }
});
```

### Decompress GZIP from external API
```javascript
require(['N/compress', 'N/https', 'N/file'], function(compress, https, file) {

  function fetchCompressedData(apiUrl) {
    var response = https.get({
      url: apiUrl,
      headers: { 'Accept-Encoding': 'gzip' }
    });

    // If the API returns GZIP-compressed content
    if (response.headers['Content-Encoding'] === 'gzip') {
      // Create a file from the compressed response body
      var compressedFile = file.create({
        name: 'compressed.gz',
        fileType: file.Type.GZIP,
        contents: response.body
      });

      var decompressed = compress.gunzip({ file: compressedFile });
      return JSON.parse(decompressed.getContents());
    }

    return JSON.parse(response.body);
  }
});
```

### Archive historical records (organized in folders)
```javascript
function archiveMonthlyData(year, month) {
  var archiver = compress.createArchiver();

  // Add files organized in subdirectories within the ZIP
  archiver.add({ name: year + '/' + month + '/orders.csv', file: ordersFile });
  archiver.add({ name: year + '/' + month + '/invoices.csv', file: invoicesFile });
  archiver.add({ name: year + '/' + month + '/README.txt', file: readmeFile });

  var archive = archiver.toFile({
    name: 'archive_' + year + '_' + month + '.zip',
    folder: archiveFolderId
  });

  log.audit({ title: 'Archive created', details: archive.path });
  return archive;
}
```

## Notes

- `archiver.add()` accepts only File objects — create files with `file.create()` or load with
  `file.load()` before adding to an archive
- `archiver.toFile()` with `folder` saves the ZIP to the File Cabinet immediately
- `archiver.toFile()` without `folder` returns an in-memory File — it will NOT have an `id`
  until `.save()` is called
- N/compress does NOT support reading (extracting) ZIP files — only creating ZIP and
  decompressing GZIP
- For ZIP extraction, consider processing the ZIP via N/sftp (download then decompress)
  or an external processing step
- Maximum archive size depends on available memory in the script execution environment —
  for very large exports, consider creating multiple smaller ZIPs
