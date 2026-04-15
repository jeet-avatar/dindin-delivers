---
source: Oracle NetSuite Official Documentation — Advanced PDF/HTML Templates
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Dynamic PDF Generation (Advanced PDF/HTML Templates)

## Overview

NetSuite uses FreeMarker as its template engine for PDF generation.
Templates can access record fields, iterate over sublists, apply conditional logic,
and format numbers/dates. Rendered PDFs can be printed, emailed as attachments,
or stored in the File Cabinet.

---

## FreeMarker Template Engine

FreeMarker is a Java-based template language (similar to Jinja2 / Mustache).
Key syntax:

| Syntax                          | Description                                     |
|---------------------------------|-------------------------------------------------|
| `${record.fieldId}`             | Output field value                              |
| `<#if condition>...</#if>`      | Conditional block                               |
| `<#list collection as item>` | Iterate over a list                             |
| `${value?string["format"]}`     | Format a value (number, date)                  |
| `${value?upper_case}`           | String transformation                           |
| `${value!""}`                   | Default value if null                           |
| `<#assign var = value>`         | Variable assignment                             |

---

## Accessing Record Fields in FreeMarker

### Header Fields

```freemarker
<strong>Invoice Number:</strong> ${record.tranId}
<strong>Customer:</strong> ${record.entity.name}
<strong>Date:</strong> ${record.tranDate?string["MM/dd/yyyy"]}
<strong>Due Date:</strong> ${record.dueDate?string["MM/dd/yyyy"]}
<strong>Amount Due:</strong> $${record.total?string["###,##0.00"]}
<strong>Status:</strong> ${record.status}
```

### Body Fields (Custom)

```freemarker
<strong>PO Number:</strong> ${record.custbody_po_number!"N/A"}
<strong>Sales Rep:</strong> ${record.salesRep.name!"Unassigned"}
<strong>Territory:</strong> ${record.custbody_territory!""}
```

---

## Iterating Over Sublists

### Invoice Line Items

```freemarker
<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Description</th>
      <th>Qty</th>
      <th>Unit Price</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    <#list record.item as line>
      <tr>
        <td>${line.item.name!""}</td>
        <td>${line.description!""}</td>
        <td>${line.quantity?string["##0.##"]}</td>
        <td>$${line.rate?string["###,##0.00"]}</td>
        <td>$${line.amount?string["###,##0.00"]}</td>
      </tr>
    </#list>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4" align="right"><strong>Subtotal:</strong></td>
      <td>$${record.subtotal?string["###,##0.00"]}</td>
    </tr>
    <tr>
      <td colspan="4" align="right"><strong>Tax:</strong></td>
      <td>$${record.taxtotal?string["###,##0.00"]}</td>
    </tr>
    <tr>
      <td colspan="4" align="right"><strong>Total:</strong></td>
      <td><strong>$${record.total?string["###,##0.00"]}</strong></td>
    </tr>
  </tfoot>
</table>
```

---

## Conditional Logic

```freemarker
<#-- Show discount section only if discount applied -->
<#if record.discountTotal?? && (record.discountTotal > 0)>
  <tr>
    <td>Discount Applied:</td>
    <td>-$${record.discountTotal?string["###,##0.00"]}</td>
  </tr>
</#if>

<#-- Status-based messaging -->
<#if record.status == "Paid in Full">
  <div class="paid-stamp">PAID</div>
<#elseif record.amountRemaining > 0>
  <div class="due-notice">Balance Due: $${record.amountRemaining?string["###,##0.00"]}</div>
</#if>

<#-- Different layout for US vs international customers -->
<#if record.currency.symbol == "USD">
  <span>${record.total?string["###,##0.00"]} USD</span>
<#else>
  <span>${record.foreignTotal?string["###,##0.00"]} ${record.currency.symbol}</span>
  <span>(${record.total?string["###,##0.00"]} USD equivalent)</span>
</#if>
```

---

## Custom Forms Setup

**Navigation:** Setup > Customization > Forms > Transaction Forms

1. Select existing form type (e.g., Invoice)
2. Click "Print Template" button to edit the FreeMarker template
3. Or create a new PDF template: Setup > Customization > Forms > PDF/HTML Templates > New

Forms can be assigned to:
- All transactions of that type
- Specific subsidiaries
- Specific customers (via customer preferred form)

---

## Generating PDFs in SuiteScript

```javascript
/**
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 */
define(['N/render', 'N/record', 'N/file', 'N/log'], function(render, record, file, log) {
    function onRequest(context) {
        var invoiceId = parseInt(context.request.parameters.id);

        // Load the invoice
        var invoice = record.load({ type: record.Type.INVOICE, id: invoiceId });

        // Create a render context
        var renderer = render.create();
        renderer.setTemplateById({ id: 5 }); // Template internal ID from PDF Templates

        // Add the record to the template context
        renderer.addRecord({ templateName: 'record', record: invoice });

        // Optional: add custom data
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'custom',
            data: {
                generatedDate: new Date().toLocaleDateString(),
                message: 'Thank you for your business!'
            }
        });

        // Render as PDF
        var pdfFile = renderer.renderAsPdf();

        // Option 1: Stream as HTTP response (download)
        context.response.setHeader({
            name: 'Content-Type',
            value: 'application/pdf'
        });
        context.response.setHeader({
            name: 'Content-Disposition',
            value: 'attachment; filename="invoice-' + invoice.getValue({ fieldId: 'tranid' }) + '.pdf"'
        });
        context.response.writeFile({ file: pdfFile });
    }
    return { onRequest: onRequest };
});
```

---

## Emailing PDF as Attachment

```javascript
define(['N/render', 'N/record', 'N/email', 'N/log'], function(render, record, email, log) {
    function sendInvoiceEmail(invoiceId) {
        var invoice = record.load({ type: record.Type.INVOICE, id: invoiceId });
        var customerId = invoice.getValue({ fieldId: 'entity' });
        var customerEmail = invoice.getValue({ fieldId: 'custentity_email' });
        var tranId = invoice.getValue({ fieldId: 'tranid' });

        // Render PDF
        var renderer = render.create();
        renderer.setTemplateById({ id: 5 });
        renderer.addRecord({ templateName: 'record', record: invoice });
        var pdfFile = renderer.renderAsPdf();

        // Send email with PDF attachment
        email.send({
            author: runtime.getCurrentUser().id,
            recipients: customerId,
            subject: 'Invoice ' + tranId + ' from Our Company',
            body: 'Dear Customer,\n\nPlease find your invoice attached.\n\nThank you.',
            attachments: [pdfFile]
        });

        log.audit('Invoice emailed', 'Invoice ' + tranId + ' sent to ' + customerEmail);
    }
});
```

---

## Storing Rendered PDF in File Cabinet

```javascript
define(['N/render', 'N/record', 'N/file'], function(render, record, file) {
    function archiveInvoicePDF(invoiceId) {
        var invoice = record.load({ type: record.Type.INVOICE, id: invoiceId });
        var renderer = render.create();
        renderer.setTemplateById({ id: 5 });
        renderer.addRecord({ templateName: 'record', record: invoice });
        var pdfFile = renderer.renderAsPdf();

        // Store in File Cabinet
        pdfFile.folder = 100; // Target folder ID
        pdfFile.name = 'Invoice-' + invoice.getValue({ fieldId: 'tranid' }) + '.pdf';
        var fileId = pdfFile.save();

        // Attach to invoice record
        record.attach({
            record: { type: 'file', id: fileId },
            to: { type: record.Type.INVOICE, id: invoiceId }
        });
    }
});
```
