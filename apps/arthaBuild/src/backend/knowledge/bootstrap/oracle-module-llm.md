# N/llm — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_9123730083.html
> Module: N/llm
> Version: SuiteScript 2.x / 2.1

# N/llm Module

Note: 

The content in this help topic pertains to SuiteScript 2.1.

The N/llm module supports generative artificial intelligence (AI) capabilities in SuiteScript. You can use this module to send requests to the large language models (LLMs) supported by NetSuite and receive responses to use in your scripts.

  [   ](/app/help/helpcenter.nl?fid=article_1015110627)                                

If you're new to using generative AI in SuiteScript, see [SuiteScript 2.x Generative AI APIs](article_6193337927.html). That topic contains essential information about this feature.

The following list summarizes the main features that are available using the N/llm module:

  - **Content generation** \- You can request generative AI content from a supported LLM using [llm.generateText(options)](article_1014032554.html). You can provide a prompt that describes the content you want to generate, and the module sends the request to the Oracle Cloud Infrastructure (OCI) Generative AI service to generate a response.

  - **Prompt evaluation** \- If you use Prompt Studio to manage existing prompts in your NetSuite account, you can use [llm.evaluatePrompt(options)](article_0115064704.html) to send a prompt from Prompt Studio to the LLM for evaluation. This method uses the information from the prompt definition in Prompt Studio (such as the model and model parameters), and it lets you provide values for any variables the prompt uses before sending it for evaluation. For more information about Prompt Studio, see [Prompt Studio](article_160809601.html).

  - **Prompt and Text Enhance action management** \- By using the N/record module, you can create, update, and delete prompts and Text Enhance actions in your scripts. For more information, see [Managing Prompts and Text Enhance Actions Using the N/llm Module](article_0115105418.html).

  - **Retrieval-augmented generation (RAG) support** \- You can give source documents to the LLM when calling [llm.generateText(options)](article_1014032554.html). The LLM uses information from the source documents to augment its response. The LLM also returns citations that identify which source documents it used. For an example of how to implement a RAG use case using the N/llm module, see [Provide Source Documents When Calling the LLM](subsect_0317102527.html).

  - **Embedding support** \- The [llm.embed(options)](article_76083302199.html) method converts text to vector embeddings. Your SuiteScript applications can use vector embeddings for use cases such as semantic searches, recommender systems, text classification, or text clustering. For an example of how to generate and use embeddings, see [Find Similar Items Using Embeddings](subsect_0730103359.html). For more information about embedding models, refer to [Offered Pretrained Foundational Models in Generative AI](https://docs.oracle.com/en-us/iaas/Content/generative-ai/pretrained-models.htm) in the _Oracle Cloud Infrastructure Documentation_.

Embedding methods have their own monthly free usage quota, separate from generate methods. If you use both in a month, you'll see two rows for the month, labeled by usage type. For more information, see [View SuiteScript AI Usage Limit and Usage](article_2204741206.html).

  - **Streaming support** \- Using the [llm.generateTextStreamed(options)](article_46075557997.html) and [llm.evaluatePromptStreamed(options)](article_47080704730.html) methods, your code gets content as the LLM generates it, instead of waiting to receive it all at the same time. For an example how to work with streamed content, see [Receive a Partial Response from the LLM](subsect_0730103345.html).

  - **Method aliases** \- You can use the following aliases in your code instead of the method names:

    - `llm.chat(options)` is an alias for [llm.generateText(options)](article_1014032554.html).

    - `llm.executePrompt(options)` is an alias for [llm.evaluatePrompt(options)](article_0115064704.html).

    - `llm.chatStreamed(options)` is an alias for [llm.generateTextStreamed(options)](article_46075557997.html).

    - `llm.executePromptStreamed(options)` is an alias for [llm.evaluatePromptStreamed(options)](article_47080704730.html).

Promise versions are also available for these methods.

When aliases are available for methods, you'll see them listed in the main table of the method's help topic. For an example, see [llm.generateTextStreamed(options)](article_46075557997.html).


This module is available in NetSuite by default when the Server SuiteScript feature is enabled. For more information, see [Enabling Features](chapter_N232138.html).

Important: 

As you work with this module, keep the following considerations in mind:

  - Generative AI features, such as the N/llm module, use creativity in their responses. Make sure you validate the AI-generated responses for accuracy and quality. Oracle NetSuite isn't responsible or liable for the use or interpretation of AI-generated content.

  - SuiteScript Generative AI APIs (N/llm module) are available only for accounts located in certain regions. For a list of these regions, see [Generative AI Feature Availability in NetSuite](article_3132707887.html).


## In This Help Topic

  - N/llm Module Members

  - ChatMessage Object Members

  - Citation Object Members

  - Document Object Members

  - EmbedResponse Object Members

  - Response Object Members

  - StreamedResponse Object Members

  - Usage Object Members


## N/llm Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [llm.ChatMessage](article_1015043130.html) |  Object |  Server scripts |  The chat message.  
[llm.Citation](article_56082143862.html) |  Object |  Server scripts |  A citation returned from the LLM.  
[llm.Document](article_73085600635.html) |  Object |  Server scripts |  A document to be used as source content when calling the LLM.  
[llm.EmbedResponse](article_40085011867.html) |  Object |  Server scripts |  The embeddings response returned from the LLM.  
[llm.Response](article_1015033509.html) |  Object |  Server scripts |  The response returned from the LLM.  
[llm.StreamedResponse](article_13082058358.html) |  Object |  Server scripts |  The streamed response returned from the LLM.  
Method |  [llm.createChatMessage(options)](article_1014104320.html) |  Object |  Server scripts |  Creates a chat message based on a specified role and text.  
[llm.createDocument(options)](article_79091440431.html) |  Object |  Server scripts |  Creates a document to be used as source content when calling the LLM.  
[llm.embed(options)](article_76083302199.html) |  Object |  Server scripts |  Returns the embeddings from the LLM for a given input.  
[llm.embed.promise(options)](article_52083437973.html) |  Promise |  Server scripts |  Asynchronously returns the embeddings from the LLM for a given input.  
[llm.evaluatePrompt(options)](article_0115064704.html) |  Object |  Server scripts |  Takes the ID of an existing prompt and values for variables used in the prompt and returns the response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.evaluatePrompt.promise(options)](article_81065603726.html) |  Promise |  Server scripts |  Takes the ID of an existing prompt and values for variables used in the prompt and asynchronously returns the response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.evaluatePromptStreamed(options)](article_47080704730.html) |  Object |  Server scripts |  Takes the ID of an existing prompt and values for variables used in the prompt and returns the streamed response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.evaluatePromptStreamed.promise(options)](article_43094934029.html) |  Promise |  Server scripts |  Takes the ID of an existing prompt and values for variables used in the prompt and asynchronously returns the streamed response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.generateText(options)](article_1014032554.html) |  Object |  Server scripts |  Takes a prompt and parameters for the LLM and returns the response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.generateText.promise(options)](article_1014100301.html) |  Promise |  Server scripts |  Takes a prompt and parameters for the LLM and asynchronously returns the response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.generateTextStreamed(options)](article_46075557997.html) |  Object |  Server scripts |  Takes a prompt and parameters for the LLM and returns the streamed response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.generateTextStreamed.promise(options)](article_48093225962.html) |  Promise |  Server scripts |  Takes a prompt and parameters for the LLM and asynchronously returns the streamed response from the LLM. When you're using unlimited usage mode, this method also accepts the OCI configuration parameters.  
[llm.getRemainingFreeUsage()](article_1014102816.html) |  number |  Server scripts |  Returns the number of free requests in the current month.  
[llm.getRemainingFreeUsage.promise()](article_1014103215.html) |  Promise |  Server scripts |  Asynchronously returns the number of free requests in the current month.  
[llm.getRemainingFreeEmbedUsage()](article_77083006042.html) |  number |  Server scripts |  Returns the number of free embeddings requests in the current month.  
[llm.getRemainingFreeEmbedUsage.promise()](article_53083101627.html) |  Promise |  Server scripts |  Asynchronously returns the number of free embeddings requests in the current month.  
Enum |  [llm.ChatRole](article_1015044805.html) |  enum |  Server scripts |  Holds the string values for the author (role) of a chat message. Use this enum to set the value of the `options.role` parameter in [llm.createChatMessage(options)](article_1014104320.html).  
[llm.EmbedModelFamily](article_36111753207.html) |  enum |  Server scripts |  Holds the string values for the large language model to be used to generate embeddings. Use this enum to set the value of the `options.embedModelFamily` parameter in [llm.embed(options)](article_76083302199.html).  
[llm.ModelFamily](article_1014101247.html) |  enum |  Server scripts |  Holds the string values for the large language model to be used. Use this enum to set the value of the `options.model` parameter in [llm.generateText(options)](article_1014032554.html).  
[llm.SafetyMode](article_0804070845.html) |  enum |  Server scripts |  Holds the string values for the safety mode to be used for LLM requests. Use this enum to set the value of the `options.safetyMode` parameter in [llm.generateText(options)](article_1014032554.html) and [llm.generateTextStreamed(options)](article_46075557997.html).  
[llm.Truncate](article_23112904019.html) |  enum |  Server scripts |  Holds the string values for the truncation method to use when embeddings input exceeds 512 tokens. Use this enum to set the value of the `options.truncate` parameter in [llm.embed(options)](article_76083302199.html).  

## ChatMessage Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ChatMessage.role](article_1015044731.html) |  string |  Server scripts |  The author (role) of the chat message.  
[ChatMessage.text](article_1015044007.html) |  string |  Server scripts |  Text of the chat message. This text can be either the prompt sent by the script or the response returned by the LLM.  

## Citation Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Citation.documentIds](article_7082217666.html) |  string[] |  Server scripts |  The IDs of the documents where the cited text is located.  
[Citation.end](article_49082248467.html) |  number |  Server scripts |  The ending position of the cited text.  
[Citation.start](article_94083155180.html) |  number |  Server scripts |  The starting position of the cited text.  
[Citation.text](article_21084848961.html) |  string |  Server scripts |  The cited text from the documents.  

## Document Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Document.data](article_51085702425.html) |  string |  Server scripts |  The content of the document.  
[Document.id](article_83085729325.html) |  string |  Server scripts |  The ID of the document.  

## EmbedResponse Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [EmbedResponse.embeddings](article_47085051031.html) |  number[] |  Server scripts |  The embeddings returned from the LLM.  
[EmbedResponse.inputs](article_3085137102.html) |  string[] |  Server scripts |  The list of inputs used to generate the embeddings response.  
[EmbedResponse.model](article_31085243777.html) |  string |  Server scripts |  The model used to generate the embeddings response.  

## Response Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Response.chatHistory](article_1015041820.html) |  [llm.ChatMessage](article_1015043130.html)[] |  Server scripts |  List of chat messages.  
[Response.citations](article_31090645000.html) |  [llm.Citation](article_56082143862.html)[] |  Server scripts |  List of citations used to generate the response.  
[Response.documents](article_77090808354.html) |  [llm.Document](article_73085600635.html)[] |  Server scripts |  List of documents used to generate the response.  
[Response.model](article_1015041456.html) |  string |  Server scripts |  Model used to produce the LLM response.  
[Response.text](article_1015040837.html) |  string |  Server scripts |  Text returned by the LLM.  
[Response.usage](article_0804073454.html) |  [llm.Usage](article_0804071108.html) |  Server scripts |  Token usage for a request to the LLM.  

## StreamedResponse Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [StreamedResponse.chatHistory](article_43082126234.html) |  [llm.ChatMessage](article_1015043130.html)[] |  Server scripts |  List of chat messages.  
[StreamedResponse.citations](article_2082423034.html) |  [llm.Citation](article_56082143862.html)[] |  Server scripts |  List of citations used to generate the streamed response.  
[StreamedResponse.documents](article_2082503946.html) |  [llm.Document](article_73085600635.html)[] |  Server scripts |  List of documents used to generate the streamed response.  
[StreamedResponse.model](article_37082546497.html) |  string |  Server scripts |  Model used to produce the streamed response.  
[StreamedResponse.text](article_83082638858.html) |  string |  Server scripts |  Text returned by the LLM.  

## Usage Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Usage.completionTokens](article_0804071705.html) |  number |  Server scripts |  The number of tokens in the response from the LLM.  
[Usage.promptTokens](article_0804071825.html) |  number |  Server scripts |  The number of tokens in the request to the LLM.  
[Usage.totalTokens](article_0804071933.html) |  number |  Server scripts |  The total number of tokens for the entire request to the LLM.  

Note: 

To learn more about the generative AI models, see the SuiteAnswers article [LLM Mapping for Generative AI Features](https://suiteanswers.custhelp.com/app/answers/detail/a_id/1023335). Be aware that you must be logged in to NetSuite to access articles in SuiteAnswers.

### Related Topics

  - [N/llm Module](article_9123730083.html)
  - [SuiteScript 2.x Generative AI APIs](article_6193337927.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.1](chapter_156042690639.html)


[General Notices](chapter_N000004.html)
