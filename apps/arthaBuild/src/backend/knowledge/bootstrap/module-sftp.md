---
source: SuiteScript 2.x API Reference — N/sftp Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/sftp Module

The N/sftp module enables secure file transfer operations with external SFTP servers.
Use it to upload and download files, list directory contents, and move files as part of
integration workflows. Available in server-side scripts only.

## Loading the Module

```javascript
define(['N/sftp'], function(sftp) { ... });
```

## Creating a Connection

### sftp.createConnection(options)
Establishes an SFTP connection to a remote server.

```javascript
var connection = sftp.createConnection({
  url: 'sftp.example.com',        // SFTP server hostname (no sftp:// prefix)
  port: 22,                        // Default: 22
  username: 'sftpuser',
  passwordGuid: '{{customsecret_sftp_password}}',  // NetSuite credential GUID
  hostKey: '{{customsecret_sftp_hostkey}}'         // Server host key GUID (for verification)
});
```

**Parameters:**
- `url` (string): Required. SFTP server hostname or IP address
- `port` (number): Optional. Default 22
- `username` (string): Required. SFTP username
- `passwordGuid` (string): Required. NetSuite credential placeholder for the password
- `hostKey` (string): Optional but recommended. Credential GUID for the server's host key
  (used to verify server identity and prevent MITM attacks)
- `timeout` (number): Optional. Connection timeout in seconds. Default 20.

**Returns:** Connection object

## Connection Methods

### connection.download(options)
Downloads a file from the SFTP server.

```javascript
var downloadedFile = connection.download({
  filename: '/inbound/orders.csv'   // Full path on remote server
});
// Returns: File object (same as N/file)

var contents = downloadedFile.getContents();
log.audit({ title: 'Downloaded', details: downloadedFile.name + ' (' + downloadedFile.size + ' bytes)' });
```

**Returns:** `file.File` object

### connection.upload(options)
Uploads a file to the SFTP server.

```javascript
require(['N/sftp', 'N/file'], function(sftp, file) {

  // Load or create the file to upload
  var reportFile = file.create({
    name: 'daily_export.csv',
    fileType: file.Type.CSV,
    contents: generateCsvContent()
  });

  connection.upload({
    filename: '/outbound/daily_export.csv',  // Target path on remote server
    file: reportFile
  });

  log.audit({ title: 'Uploaded', details: '/outbound/daily_export.csv' });
});
```

**Parameters:**
- `filename` (string): Required. Target file path on the remote server
- `file` (File): Required. N/file `File` object to upload

### connection.list(options)
Lists files and directories at a remote path.

```javascript
var entries = connection.list({ path: '/inbound' });

entries.forEach(function(entry) {
  log.debug({ title: 'Entry', details: entry.name + ' | Size: ' + entry.size + ' | Modified: ' + entry.lastModified });
});
```

**Returns:** Array of objects with:
- `name` (string): File or directory name
- `size` (number): File size in bytes (0 for directories)
- `lastModified` (Date): Last modification date
- `isDirectory` (boolean): True if this is a directory

### connection.move(options)
Moves or renames a file on the remote server.

```javascript
connection.move({
  from: '/inbound/orders.csv',
  to: '/processed/orders_2024-01-15.csv'
});
```

**Parameters:**
- `from` (string): Required. Source path on remote server
- `to` (string): Required. Destination path on remote server

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `sftp.createConnection()` | 10 units |
| `connection.download()` | 10 units |
| `connection.upload()` | 10 units |
| `connection.list()` | 5 units |
| `connection.move()` | 5 units |

## Common Integration Patterns

### Download, process, and archive files
```javascript
define(['N/sftp', 'N/file', 'N/record'], function(sftp, file, record) {

  function execute(context) {
    var conn = sftp.createConnection({
      url: 'sftp.partner.com',
      port: 22,
      username: 'integrationuser',
      passwordGuid: '{{customsecret_partner_sftp_pwd}}'
    });

    // List inbound directory
    var files = conn.list({ path: '/inbound/orders' });

    files.forEach(function(entry) {
      if (entry.isDirectory || !entry.name.endsWith('.csv')) return;

      try {
        // Download the file
        var csvFile = conn.download({ filename: '/inbound/orders/' + entry.name });
        log.audit({ title: 'Processing', details: entry.name });

        // Process the CSV
        var lines = csvFile.getContents().split('\n');
        lines.slice(1).forEach(function(line) {
          if (!line.trim()) return;
          processOrderLine(line.split(','));
        });

        // Move to processed folder
        conn.move({
          from: '/inbound/orders/' + entry.name,
          to: '/processed/orders/' + entry.name
        });

        log.audit({ title: 'Processed', details: entry.name });
      } catch (e) {
        log.error({ title: 'Failed: ' + entry.name, details: e.message });
        // Move to error folder
        conn.move({
          from: '/inbound/orders/' + entry.name,
          to: '/error/orders/' + entry.name
        });
      }
    });
  }

  return { execute: execute };
});
```

### Upload daily export
```javascript
function execute(context) {
  require(['N/sftp', 'N/file', 'N/search'], function(sftp, file, search) {

    // Build export content
    var csvLines = ['OrderNumber,Customer,Amount,Date'];
    search.create({
      type: 'salesorder',
      filters: [['tranDate', 'within', 'today']],
      columns: [{ name: 'tranId' }, { name: 'entity' }, { name: 'amount' }, { name: 'tranDate' }]
    }).run().each(function(result) {
      csvLines.push([
        result.getValue({ name: 'tranId' }),
        result.getText({ name: 'entity' }),
        result.getValue({ name: 'amount' }),
        result.getValue({ name: 'tranDate' })
      ].join(','));
      return true;
    });

    var exportFile = file.create({
      name: 'orders_' + new Date().toISOString().split('T')[0] + '.csv',
      fileType: file.Type.CSV,
      contents: csvLines.join('\n')
    });

    var conn = sftp.createConnection({
      url: 'sftp.customer.com',
      username: 'netsuite_export',
      passwordGuid: '{{customsecret_customer_sftp}}'
    });

    conn.upload({
      filename: '/uploads/' + exportFile.name,
      file: exportFile
    });

    log.audit({ title: 'Export uploaded', details: exportFile.name });
  });
}
```

## Notes

- The `hostKey` parameter is strongly recommended for production use — it prevents connecting
  to wrong/compromised servers (equivalent to SSH `known_hosts`)
- All credentials must be stored in NetSuite (Setup > Integration > OAuth Credentials) using
  `{{customsecret_...}}` placeholder syntax — never hardcode passwords
- The N/sftp module supports password authentication only — certificate/key-based auth
  is not supported via the standard API
- Files downloaded via `connection.download()` are NOT automatically saved to the File Cabinet —
  they are in-memory File objects. Call `.save()` to persist if needed
- Connection timeouts apply per operation — large file transfers may need extended timeout values
