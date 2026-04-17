# N/redirect — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4424286105.html
> Module: N/redirect
> Version: SuiteScript 2.x / 2.1

# N/redirect Module

Use the N/redirect module to customize navigation within NetSuite by setting up a redirect URL that resolves to a NetSuite resource or external URL. You can redirect users to one of the following:

  - URL

  - Suitelet

  - Record

  - Task link

  - Saved search

  - Unsaved search


  [   ](/app/help/helpcenter.nl?fid=section_0304044237)                                

Note: 

Suitelets, beforeLoad user events, and synchronous afterSubmit user events are supported. This module does not support beforeSubmit or asynchronous afterSubmit user events. This module is only supported when triggered from the UI. Backend contexts such as CSV Import and Scheduled Scripts are not supported.

## In This Help Topic

  - N/redirect Module Members


## N/redirect Module Members

Member Type |  Name |  Return Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [redirect.redirect(options)](section_4424988767.html) |  void |  Suitelets, beforeLoad user events, and synchronous afterSubmit user events |  Redirects to the URL of a Suitelet that is available externally (available without login).  
[redirect.toRecord(options)](section_4424995667.html) |  void |  Suitelets, beforeLoad user events, and synchronous afterSubmit user events |  Redirects to a NetSuite record.  
[redirect.toRecordTransform(options)](section_157713182405.html) |  void |  workflow action scripts |  Redirects to a standard or custom transaction instance.  
[redirect.toSavedSearch(options)](section_4424988669.html) |  void |  afterSubmit user events |  Redirects to a saved search.  
[redirect.toSavedSearchResult(options)](section_4424988694.html) |  void |  afterSubmit user events |  Redirects to a saved search result.  
[redirect.toSearch(options)](section_4424988719.html) |  void |  afterSubmit user events |  Redirects to search.  
[redirect.toSearchResult(options)](section_4424988724.html) |  void |  afterSubmit user events |  Redirects to search results.  
[redirect.toSuitelet(options)](section_4424988773.html) |  void |  Suitelets, beforeLoad user events, and synchronous afterSubmit user events |  Redirects to a Suitelet.  
[redirect.toTaskLink(options)](section_4424988740.html) |  void |  Suitelets, beforeLoad user events, and synchronous afterSubmit user events |  Redirects to a tasklink.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
