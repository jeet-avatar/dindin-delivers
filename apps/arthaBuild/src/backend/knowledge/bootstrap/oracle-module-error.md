# N/error — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4243798608.html
> Module: N/error
> Version: SuiteScript 2.x / 2.1

# N/error Module

Use the N/error module to create custom SuiteScript errors that you can use in try-catch statements to abort script execution. Note that this module doesn't provide functionality to throw custom errors; however, you can include logic such as try-catch statements in your script to throw custom SuiteScript errors.

  [   ](/app/help/helpcenter.nl?fid=section_0227032340)                                

## In This Help Topic

  - N/error Module Members

  - SuiteScriptError Object Members


For more information about additional error logging capabilities, see the [N/log Module](section_4574548135.html).

## N/error Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [error.SuiteScriptError](section_4253432660.html) |  Object |  Server scripts |  Encapsulates a custom SuiteScript error for any server script type.  
Method |  [error.create(options)](section_4243803203.html) |  [error.SuiteScriptError](section_4253432660.html) |  Server scripts |  Creates a new [error.SuiteScriptError](section_4253432660.html) object.  
Enum |  [error.Type](section_159469488562.html) |  enum |  Server scripts |  Holds the string values for error types. Use this enum to set the value for the [SuiteScriptError.name](section_4243803552.html) parameter of the [error.create(options)](section_4243803203.html) method. This sets the value of the [SuiteScriptError.type](section_159475480456.html) property.  

## SuiteScriptError Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SuiteScriptError.cause](section_158049399342.html) |  string (read-only) |  Server scripts |  Cause of the error.  
[SuiteScriptError.id](section_4243803497.html) |  string (read-only) |  Server scripts |  Error ID that is automatically generated when a new error is created.  
[SuiteScriptError.message](section_4243803629.html) |  string (read-only) |  Server scripts |  Error message text displayed in the Details column of the Execution Log. Set from the `options.message` parameter when you create a new error using [error.create(options)](section_4243803203.html)  
[SuiteScriptError.name](section_4243803552.html) |  string (read-only) |  Server scripts |  Error name or error code. Set from the `options.name` parameter when you create a new error using [error.create(options)](section_4243803203.html).  
[SuiteScriptError.notifyOff](section_159475415674.html) |  boolean (read-only) |  Server scripts |  Suppresses email notification when set to true. Set from the `options.notifyOff` parameter when you create a new error using [error.create(options)](section_4243803203.html)  
[SuiteScriptError.stack](section_4243803715.html) |  Array of strings (read-only) |  Server scripts |  List of method calls that the script is executing when the error is thrown.  
[SuiteScriptError.type](section_159475480456.html) |  [error.Type](section_159469488562.html) (read-only) |  Server scripts |  Error type (error.SuiteScriptError).  

### Related Topics

  - [N/log Module](section_4574548135.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
