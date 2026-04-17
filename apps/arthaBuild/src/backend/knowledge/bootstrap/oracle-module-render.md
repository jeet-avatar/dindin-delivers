# N/render — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4412042824.html
> Module: N/render
> Version: SuiteScript 2.x / 2.1

# N/render Module

Use the N/render module for printing, PDF creation, form creation from templates, and email creation from templates.

  [   ](/app/help/helpcenter.nl?fid=section_0302074109)                                

Note: 

Direct manipulation of the print URL is **not** supported.

## In This Help Topic

  - N/render Module Members

  - EmailMergeResult Object Members

  - TemplateRenderer Object Members


## N/render Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [render.EmailMergeResult](section_4417244174.html) |  Object |  Server scripts |  Encapsulates an email merge result.  
[render.TemplateRenderer](section_4412065265.html) |  Object |  Server scripts |  Encapsulates a template object that produces HTML and PDF printed forms utilizing advanced PDF/HTML template capabilities.  
Method |  [render.bom(options)](section_457552429198.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates a PDF or HTML file object containing a bill of materials.  
[render.create()](section_455028930663.html) |  [render.TemplateRenderer](section_4412065265.html) |  Server scripts |  Creates a [render.TemplateRenderer](section_4412065265.html) object.  
[render.mergeEmail(options)](section_454332824706.html) |  [render.EmailMergeResult](section_4417244174.html) |  Server scripts |  Creates a [render.EmailMergeResult](section_4417244174.html) object.  
[render.packingSlip(options)](section_458625732421.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates a PDF or HTML file object containing a packing slip.  
[render.pickingTicket(options)](section_456921936034.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates a PDF or HTML file object containing a picking ticket.  
[render.statement(options)](section_455095458983.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates a PDF or HTML file object containing a statement.  
[render.transaction(options)](section_452452331542.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates a PDF or HTML file object containing a transaction.  
[render.xmlToPdf(options)](section_459185424803.html) |  [file.File](section_4247974825.html) |  Server scripts |  Passes XML to the BFO tag library (which is stored by NetSuite), and returns a PDF file.  
Enum |  [render.DataSource](section_4619588793.html) |  enum |  Server scripts |  Holds the string values for supported data source types. Use this enum to set the `options.format` parameter of the [TemplateRenderer.addCustomDataSource(options)](section_4528541027.html) method.  
[render.PrintMode](section_4412215015.html) |  enum |  Server scripts |  Holds the string values for supported print output types. Use this enum to set the `options.printMode` parameter of the [render.bom(options)](section_457552429198.html), [render.pickingTicket(options)](section_456921936034.html), and [render.statement(options)](section_455095458983.html) methods.  

## EmailMergeResult Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [EmailMergeResult.body](section_4412212816.html) |  string (read-only) |  Server scripts |  The body of the email distribution in string format.  
[EmailMergeResult.subject](section_4412212830.html) |  string (read-only) |  Server scripts |  The subject of the email distribution in string format.  

## TemplateRenderer Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [TemplateRenderer.addCustomDataSource(options)](section_4528541027.html) |  void |  Server scripts |  Adds an XML file or JSON object to an advanced template as a custom data source.  
[TemplateRenderer.addQuery(options)](section_156217838581.html) |  void |  Server scripts |  Uses Query as the renderer's data source.  
[TemplateRenderer.addRecord(options)](section_456543212890.html) |  void |  Server scripts |  Binds a record to a template variable.  
[TemplateRenderer.addSearchResults(options)](section_456249023436.html) |  void |  Server scripts |  Binds a search result to a template variable.  
[TemplateRenderer.renderAsPdf()](section_452241760253.html) |  Object |  Server scripts |  Uses an advanced template to produce a PDF printed form.  
[TemplateRenderer.renderPdfToResponse(options)](section_455108276366.html) |  void |  Server scripts |  Renders PDF template content as a server response.  
[TemplateRenderer.renderAsString()](section_455231872558.html) |  string |  Server scripts |  Returns template content in string form.  
[TemplateRenderer.setTemplateById(options)](section_4528552999.html) |  void |  Server scripts |  Sets the template using the internal ID.  
[TemplateRenderer.setTemplateByScriptId(options)](section_4528574899.html) |  void |  Server scripts |  Sets the template using the script ID.  
[TemplateRenderer.renderToResponse(options)](section_459426513671.html) |  void |  Server scripts |  Renders HTML template content as a server response.  
Property |  [TemplateRenderer.templateContent](section_453133789062.html) |  string |  Server scripts |  Content of the template.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)
  - [Scripting with Advanced Templates](section_1533138530.html)


[General Notices](chapter_N000004.html)
