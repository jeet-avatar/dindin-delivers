# N/ui-message — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4497735093.html
> Module: N/ui-message
> Version: SuiteScript 2.x / 2.1

# N/ui/message Module

Use the N/ui/message module to display a message at the top of the screen under the menu bar.

Important: 

SuiteScript does not support direct access to the NetSuite UI through the Document Object Model (DOM). The NetSuite UI should only be accessed using SuiteScript APIs.

  [   ](/app/help/helpcenter.nl?fid=section_0305030151)                                

## In This Help Topic

  - N/ui/message Members

  - Message Object Members


## N/ui/message Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [message.Message](section_4497858078.html) |  void |  Client scripts |  Encapsulates the Message object that gets created when calling the [message.create(options)](section_4497873263.html) method.  
Method |  [message.create(options)](section_4497873263.html) |  [message.Message](section_4497858078.html) |  Client scripts |  Creates a message that can be displayed or hidden near the top of the page.  
Enum |  [message.Type](section_4498688050.html) |  enum |  Client scripts |  Indicates the type of message to create and display, which specifies the background color of the message and other message indicators. Use this enum to set the value of the `options.type` parameter of the [message.create(options)](section_4497873263.html) method.  

## Message Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Message.hide()](section_4610801857.html) |  void |  Client scripts |  Hides the message.  
[Message.show(options)](section_4497866594.html) |  void |  Client scripts |  Shows the message.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)
  - [SuiteScript Versioning Guidelines](section_4417231053.html)
  - [SuiteScript 2.1](chapter_156042690639.html)


[General Notices](chapter_N000004.html)
