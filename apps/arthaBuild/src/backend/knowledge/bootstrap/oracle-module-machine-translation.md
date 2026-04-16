# N/machine-translation — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_3151132758.html
> Module: N/machine-translation
> Version: SuiteScript 2.x / 2.1

# N/machineTranslation Module

Note: 

The content in this help topic pertains to SuiteScript 2.1.

Use the N/machineTranslation module to translate text into supported languages using generative AI. This module uses the Oracle Cloud Infrastructure (OCI) Language service to translate text in documents you provide. For more information about this service, see [Language](https://docs.oracle.com/en-us/iaas/Content/language/using/home.htm) in the OCI documentation.

  [                                 ](article_0604033355.html)  

You can also use the [N/llm Module](article_9123730083.html) to translate text by providing a suitable prompt when calling generative AI methods (such as [llm.generateText(options)](article_1014032554.html)). However, using the N/machineTranslation module provides several benefits that make it a better choice for most translation use cases:

  - **Reduced cost** \- The N/machineTranslation module supports unlimited translation requests, while the N/llm module provides only a limited number of LLM requests per month. When using the N/machineTranslation module, you don't need to provide Oracle Cloud Infrastructure (OCI) credentials to get unlimited usage, which helps to reduce the cost of your solutions.

  - **No prompt engineering required** \- When you use the N/machineTranslation module, you don't need to write a prompt to generate translations. The module detects the source language automatically and translates provided documents into the language you specify in your request.

  - **More straightforward limits** \- The N/machineTranslation module limits the length of each provided document to 5,000 characters, and it also limits the total length of all provided documents to 20,000 characters. The N/llm module provides limits that are based on tokens and the context window of the LLM you use, which can be more difficult to estimate.

  - **More supported languages** \- The N/machineTranslation module can translate text into additional languages that may not be supported by LLMs and the N/llm module.

  - **More reliable translations** \- The N/machineTranslation module uses the OCI Language service, which is designed for specific natural language processing (NLP) tasks, including translation. It uses pretrained models that can offer more predictable and reliable translation results compared to the N/llm module. The N/llm module uses the OCI Generative AI service, which is designed for content generation and may provide more varied translation results compared to a dedicated translation service.


This module is available in NetSuite by default when the Server SuiteScript feature is enabled. For more information, see [Enabling Features](chapter_N232138.html).

## In This Help Topic

  - N/machineTranslation Module Members

  - Document Object Members

  - Error Object Members

  - Response Object Members


## N/machineTranslation Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [machineTranslation.Document](article_0604033710.html) |  Object |  Server scripts |  A document with untranslated text (to provide to [machineTranslation.translate(options)](article_0606031958.html) for translation) or translated text (when part of a [machineTranslation.Response](article_0606030944.html) object returned from the translation service).  
[machineTranslation.Error](article_0604035004.html) |  Object |  Server scripts |  An error returned from the translation service.  
[machineTranslation.Response](article_0606030944.html) |  Object |  Server scripts |  The response from the translation service, which contains [machineTranslation.Document](article_0604033710.html) objects with translated text.  
Method |  [machineTranslation.createDocument(options)](article_0606031651.html) |  Object |  Server scripts |  Creates a document to be used as source content when calling the translation service.  
[machineTranslation.translate(options)](article_0606031958.html) |  Object |  Server scripts |  Translates a set of documents into the specified language.  
[machineTranslation.translate.promise(options)](article_0606035713.html) |  Promise |  Server scripts |  Asynchronously translates a set of documents into the specified language.  
Enum |  [machineTranslation.Language](article_0606032409.html) |  enum |  Server scripts |  Holds string values for the source language (when creating a document) or target language (when calling [machineTranslation.translate(options)](article_0606031958.html)). Use this enum to set the `options.language` parameter in [machineTranslation.createDocument(options)](article_0606031651.html) or the `options.targetLanguage` parameter in [machineTranslation.translate(options)](article_0606031958.html).  

## Document Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Document.id](article_0604034037.html) |  string |  Server scripts |  The ID of the document.  
[Document.language](article_0604034449.html) |  string |  Server scripts |  The language of the document.  
[Document.text](article_0604034823.html) |  string |  Server scripts |  The content of the document.  

## Error Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Error.documentId](article_0604035154.html) |  string |  Server scripts |  The ID of the document in which the error occurred.  
[Error.message](article_0604035337.html) |  string |  Server scripts |  The error message returned from the translation service.  

## Response Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Response.errors](article_0606031259.html) |  [machineTranslation.Error](article_0604035004.html)[] |  Server scripts |  The errors returned from the translation service.  
[Response.results](article_0606031415.html) |  [machineTranslation.Document](article_0604033710.html)[] |  Server scripts |  The translated documents returned from the translation service.  

### Related Topics

  - [N/machineTranslation Module](article_3151132758.html)
  - [SuiteScript 2.x Generative AI APIs](article_6193337927.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.1](chapter_156042690639.html)


[General Notices](chapter_N000004.html)
