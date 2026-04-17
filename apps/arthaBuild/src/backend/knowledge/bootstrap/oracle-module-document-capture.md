# N/document-capture — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_8134325498.html
> Module: N/document-capture
> Version: SuiteScript 2.x / 2.1

# N/documentCapture Module

Note: 

The content in this help topic pertains to SuiteScript 2.1.

Load the N/documentCapture module to extract text content from supported documents.

The N/documentCapture module lets you programmatically extract structured content and key information from a variety of document types (such as invoices, receipts, contracts, and so on) directly within NetSuite. This module uses the AI-driven capabilities of the Oracle Cloud Infrastructure (OCI) Document Understanding service and can automate document processing, reduce manual data entry, and enhance business workflows. For more information about the OCI Document Understanding service, refer to [Document Understanding](https://docs.oracle.com/en-us/iaas/Content/document-understanding/using/home.htm) in the _Oracle Cloud Infrastructure Documentation_.

  [                                 ](article_0703022052.html)  

This module provides the following features and benefits:

  - **Automated content extraction** \- Extracts text, tables, and key-value pairs from scanned documents, PDFs, and images.

  - **AI-powered data recognition** \- Uses advanced machine learning models from OCI to accurately identify and extract relevant information.

  - **Support for multiple document types** \- Works with invoices, receipts, tax forms, and other business documents in PDF, PNG, JPG, and TIFF formats.

  - **Synchronous and asynchronous requests** \- Supports synchronous requests (for documents up to five pages in length) and asynchronous requests (for documents longer than five pages).

  - **Document classification** \- Automatically classifies documents by type, enabling use cases such as intelligent routing and processing.

  - **Usage tracking** \- Tracks usage on the AI Preferences page in the NetSuite UI.

  - **Support for multiple languages and layouts** \- Supports documents in multiple languages and using various layouts, increasing flexibility.

  - **Error handling and confidence scores** \- Provides confidence scores for extracted data and error handling for improved reliability.


This module is available in NetSuite by default when the Server SuiteScript feature is enabled. For more information, see [Enabling Features](chapter_N232138.html).

To learn how to get started with the N/documentCapture module, see [Getting Started with the N/documentCapture Module](article_0828072922.html).

## In This Help Topic

  - N/documentCapture Module Members

  - Cell Object Members

  - Document Object Members

  - Field Object Members

  - FieldLabel Object Members

  - FieldValue Object Members

  - Line Object Members

  - Page Object Members

  - Table Object Members

  - TableRow Object Members

  - Word Object Members


## N/documentCapture Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [documentCapture.Cell](article_0703022335.html) |  Object |  Server scripts |  An extracted table cell from a document.  
[documentCapture.Document](article_0703030933.html) |  Object |  Server scripts |  The extracted data from a document.  
[documentCapture.Field](article_0703031446.html) |  Object |  Server scripts |  An extracted field from a document.  
[documentCapture.FieldLabel](article_0704095038.html) |  Object |  Server scripts |  An extracted field label from a document.  
[documentCapture.FieldValue](article_0704095437.html) |  Object |  Server scripts |  An extracted field value from a document.  
[documentCapture.Line](article_0704100631.html) |  Object |  Server scripts |  An extracted line of text from a document.  
[documentCapture.Page](article_0704100841.html) |  Object |  Server scripts |  An extracted page from a document.  
[documentCapture.Table](article_0704101225.html) |  Object |  Server scripts |  An extracted table from a document.  
[documentCapture.TableRow](article_0704102217.html) |  Object |  Server scripts |  An extracted table row from a document.  
[documentCapture.Word](article_0704102321.html) |  Object |  Server scripts |  An extracted word from a document.  
Method |  [documentCapture.documentToStructure(options)](article_0704102801.html) |  [documentCapture.Document](article_0703030933.html) |  Server scripts |  Extracts content from a document.  
[documentCapture.documentToStructure.promise(options)](article_49090632931.html) |  Promise |  Server scripts |  Asynchronously extracts content from a document.  
[documentCapture.documentToText(options)](article_0704103115.html) |  string |  Server scripts |  Extracts text content from a PDF file.  
[documentCapture.documentToText.promise(options)](article_6091025132.html) |  Promise |  Server scripts |  Asynchronously extracts text content from a PDF file.  
[documentCapture.getRemainingConcurrency()](article_70083055604.html) |  number |  Server scripts |  Returns the number of available concurrent requests remaining.  
[documentCapture.getRemainingConcurrency.promise()](article_32092152071.html) |  Promise |  Server scripts |  Asynchronously returns the number of available concurrent requests remaining.  
[documentCapture.getRemainingFreeUsage()](article_42084005061.html) |  number |  Server scripts |  Returns the number of free document capture requests remaining for the current month.  
[documentCapture.getRemainingFreeUsage.promise()](article_86092527607.html) |  Promise |  Server scripts |  Asynchronously returns the number of free document capture requests remaining for the current month.  
[documentCapture.parseResult(options)](article_0704103210.html) |  [documentCapture.Document](article_0703030933.html) |  Server scripts |  Converts a JSON file into a [documentCapture.Document](article_0703030933.html) object.  
Enum |  [documentCapture.DocumentType](article_0704103314.html) |  enum |  Server scripts |  Holds values for the document type.  
[documentCapture.Feature](article_0704103522.html) |  enum |  Server scripts |  Holds values for the feature to extract.  
[documentCapture.FieldType](article_0704103558.html) |  enum |  Server scripts |  Holds values for the type of a field.  
[documentCapture.Language](article_0828075605.html) |  enum |  Server scripts |  Holds values for the language of a document.  

## Cell Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Cell.confidence](article_0703022616.html) |  number |  Server scripts |  The confidence level for the cell.  
[Cell.text](article_0703023215.html) |  string |  Server scripts |  The extracted text of the cell.  

## Document Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Document.mimeType](article_0703031202.html) |  string |  Server scripts |  The MIME type of the document.  
[Document.pages](article_0703031346.html) |  [documentCapture.Page](article_0704100841.html)[] |  Server scripts |  The pages of the document.  
Method |  [Document.getText()](article_93100953424.html) |  string |  Server scripts |  Returns the entire text of the document.  

## Field Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Field.label](article_0703031534.html) |  [documentCapture.FieldLabel](article_0704095038.html) |  Server scripts |  The label (name) of the field.  
[Field.type](article_0704094825.html) |  string |  Server scripts |  The type of the field.  
[Field.value](article_0704094949.html) |  [documentCapture.FieldValue](article_0704095437.html) |  Server scripts |  The value of the field.  

## FieldLabel Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [FieldLabel.confidence](article_0704095138.html) |  number |  Server scripts |  The confidence level for the field label.  
[FieldLabel.name](article_0704095251.html) |  string |  Server scripts |  The name of the field label.  

## FieldValue Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [FieldValue.confidence](article_0704095514.html) |  number |  Server scripts |  The confidence level for the field value.  
[FieldValue.text](article_0704095601.html) |  string |  Server scripts |  The text of the field value.  

## Line Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Line.confidence](article_0704100717.html) |  number |  Server scripts |  The confidence level for the line.  
[Line.text](article_0704100807.html) |  string |  Server scripts |  The text of the line.  

## Page Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Page.detectedDocumentTypes](article_28102340830.html) |  Object[] |  Server scripts |  A set of confidence levels indicating whether the page represents a particular type of document.  
[Page.fields](article_0704100922.html) |  [documentCapture.Field](article_0703031446.html)[] |  Server scripts |  The extracted fields from the page of a document.  
[Page.lines](article_0704101048.html) |  [documentCapture.Line](article_0704100631.html)[] |  Server scripts |  The extracted lines from the page of a document.  
[Page.tables](article_0704101117.html) |  [documentCapture.Table](article_0704101225.html)[] |  Server scripts |  The extracted tables from the page of a document.  
[Page.words](article_0704101139.html) |  [documentCapture.Word](article_0704102321.html)[] |  Server scripts |  The extracted words from the page of a document.  
Method |  [Page.getText()](article_65101108674.html) |  string |  Server scripts |  Returns the entire text of the page.  

## Table Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Table.bodyRows](article_0704101315.html) |  [documentCapture.TableRow](article_0704102217.html)[] |  Server scripts |  The extracted body rows from the table in a document.  
[Table.columnCount](article_0704101358.html) |  number |  Server scripts |  The number of extracted columns from the table in a document.  
[Table.confidence](article_0704101426.html) |  number |  Server scripts |  The confidence level for the table.  
[Table.footerRows](article_0704102012.html) |  [documentCapture.TableRow](article_0704102217.html)[] |  Server scripts |  The extracted footer rows from the table in a document.  
[Table.headerRows](article_0704102044.html) |  [documentCapture.TableRow](article_0704102217.html)[] |  Server scripts |  The extracted header rows from the table in a document.  
[Table.rowCount](article_0704102126.html) |  number |  Server scripts |  The number of extracted rows from the table in a document.  

## TableRow Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [TableRow.cells](article_0704102248.html) |  [documentCapture.Cell](article_0703022335.html)[] |  Server scripts |  The extracted cells in the table row.  

## Word Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Word.confidence](article_0704102426.html) |  number |  Server scripts |  The confidence level for the word.  
[Word.text](article_0704102521.html) |  string |  Server scripts |  The extracted text of the word.  

### Related Topics

  - [N/documentCapture Module](article_8134325498.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.1](chapter_156042690639.html)


[General Notices](chapter_N000004.html)
