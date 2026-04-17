# N/record-context — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158627324548.html
> Module: N/record-context
> Version: SuiteScript 2.x / 2.1

# N/recordContext Module

Use the N/recordContext module to get all the available context types of the record, such as `localization`. The `localization` context type indicates which country a script is using for execution. You can also use the N/recordContext module to create conditional statements within a script so that the script behaves differently based on the context.

For more information about localization context, see [Localization Context](section_157496034201.html#subsect_157496046561).

  [   ](/app/help/helpcenter.nl?fid=section_0304041947)                                

## In This Help Topic

  - N/recordContext Module Members


## N/recordContext Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [recordContext.RecordContext](section_159311113661.html) |  Object (read-only) |  Client and server scripts |  Contains key-value pairs that represent context types and their values.  
Method |  [recordContext.getContext(options)](section_158627355521.html) |  [recordContext.RecordContext](section_159311113661.html) |  Client and server scripts |  Returns the record context object for a record.  
Enum |  [recordContext.ContextType](section_158627386827.html) |  enum (read-only) |  Client and server scripts |  Holds the values for the context type. Used to set the value for the `contextTypes` parameter of the [recordContext.getContext(options)](section_158627355521.html) method.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
