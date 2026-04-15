---
source: SuiteScript 2.x API Reference — N/email Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/email Module

The N/email module sends email from NetSuite records and scripts. Available in server-side
scripts only. Emails sent via this module are tracked in NetSuite's email activity log.

## Loading the Module

```javascript
define(['N/email'], function(email) { ... });
```

## Core Methods

### email.send(options)
Sends a single email synchronously.

```javascript
email.send({
  author: 5,                    // Employee internal ID (required)
  recipients: ['user@example.com'],  // Array of email strings or entity objects
  subject: 'Order Confirmation',
  body: '<p>Your order has been confirmed.</p>',
  attachments: [],              // Optional: array of File objects
  relatedRecords: {             // Optional: links email to NetSuite records
    transactionId: 1234,
    entityId: 100
  },
  replyTo: 'noreply@company.com',  // Optional
  cc: ['manager@company.com'],     // Optional: CC recipients
  bcc: ['archive@company.com']     // Optional: BCC recipients
});
```

### Parameters

**author** (number): Required. Internal ID of the NetSuite employee record that appears as
the sender. The employee's email address is used as the From address.

**recipients** (Array): Required. Array of:
- Email address strings: `['user@example.com']`
- Entity objects: `[{ entityId: 100, name: 'John Smith' }]`
- Mixed: `['direct@email.com', { entityId: 200 }]`

**subject** (string): Required. Email subject line.

**body** (string): Required. Email body. Supports HTML markup.

**attachments** (Array): Optional. Array of `File` objects loaded via `file.load()` or
created via `file.create()`. File size limit: 5 MB per attachment.

**relatedRecords** (Object): Optional. Links the email activity to NetSuite records.
```javascript
relatedRecords: {
  transactionId: 1234,         // Link to a transaction record
  entityId: 100,               // Link to a customer/vendor/employee
  customRecordId: 567,         // Link to a custom record
  customRecordType: 'customrecord_project'  // Required if customRecordId set
}
```

**isInternalOnly** (boolean): Optional. If true, email is not sent externally (test mode).

## email.sendBulk(options)
Sends emails asynchronously (queued). Use for large-volume sends.

```javascript
email.sendBulk({
  author: 5,
  recipients: recipientArray,
  subject: 'Monthly Report',
  body: reportBody
});
```

- Returns immediately (async queue)
- No return value — cannot check delivery status programmatically

## email.sendCampaignEvent(options)
Sends a CRM campaign event email. Used with NetSuite Marketing module.

```javascript
email.sendCampaignEvent({
  campaignEventId: 100,
  recipientId: 200   // Customer or contact internal ID
});
```

## Using Email Templates

Load an email template record and merge field values:

```javascript
require(['N/record', 'N/email'], function(record, email) {
  // Load the email template
  var template = record.load({
    type: record.Type.EMAIL_TEMPLATE,
    id: templateId
  });

  var subject = template.getValue({ fieldId: 'subject' });
  var body = template.getValue({ fieldId: 'body' });

  // Merge template fields manually or use renderTemplate
  body = body.replace('{ORDER_NUM}', tranId);

  email.send({
    author: employeeId,
    recipients: [customerEmail],
    subject: subject,
    body: body,
    relatedRecords: { transactionId: orderId }
  });
});
```

## Attaching Files

```javascript
require(['N/email', 'N/file'], function(email, file) {
  // Load existing file from File Cabinet
  var attachment = file.load({ id: '/SuiteScripts/reports/report.pdf' });

  // Or create a file dynamically
  var csvAttachment = file.create({
    name: 'export.csv',
    fileType: file.Type.CSV,
    contents: 'id,name,amount\n1,Order1,100.00\n'
  });

  email.send({
    author: 5,
    recipients: ['finance@example.com'],
    subject: 'Monthly Export',
    body: 'Please find the export attached.',
    attachments: [attachment, csvAttachment]
  });
});
```

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `email.send()` | 1 unit per call |
| `email.sendBulk()` | 1 unit per call (async) |

**Limits:**
- Scheduled scripts: max 10 `email.send()` calls per script invocation
- User event scripts: max 10 `email.send()` calls per invocation
- Map/Reduce (per invocation): standard limit applies

## Error Handling

```javascript
try {
  email.send({
    author: authorId,
    recipients: [recipientEmail],
    subject: subject,
    body: body
  });
  log.audit({ title: 'Email sent', details: 'To: ' + recipientEmail });
} catch (e) {
  log.error({ title: 'Email failed', details: e.message + '\n' + e.stack });
  // Handle failure — do NOT re-throw if email is non-critical
}
```

Common errors:
- `AUTHOR_MUST_BE_AN_EMPLOYEE` — author ID must be an employee record, not customer/vendor
- `INVALID_RECIPIENT` — recipient email address is malformed
- `EMAIL_LIMIT_EXCEEDED` — exceeded per-invocation email limit

## Common Patterns

### Notify on record save (User Event afterSubmit)
```javascript
function afterSubmit(context) {
  if (context.type !== context.UserEventType.CREATE) return;

  var rec = context.newRecord;
  var custId = rec.getValue({ fieldId: 'entity' });

  require(['N/email', 'N/search'], function(email, search) {
    // Look up customer email
    var result = search.lookupFields({
      type: search.Type.CUSTOMER,
      id: custId,
      columns: ['email', 'firstname']
    });

    email.send({
      author: 5,
      recipients: [result.email],
      subject: 'Your order #' + rec.getValue({ fieldId: 'tranId' }) + ' is confirmed',
      body: 'Hello ' + result.firstname + ', your order has been received.',
      relatedRecords: { transactionId: rec.id, entityId: custId }
    });
  });
}
```

### Send from Scheduled Script with attachment
```javascript
function execute(context) {
  require(['N/email', 'N/file', 'N/search'], function(email, file, search) {
    var reportFile = generateReport(); // returns File object
    email.send({
      author: 5,
      recipients: ['reports@company.com'],
      subject: 'Weekly Report - ' + new Date().toDateString(),
      body: 'Weekly report attached.',
      attachments: [reportFile]
    });
    log.audit({ title: 'Report sent', details: 'File: ' + reportFile.name });
  });
}
```
