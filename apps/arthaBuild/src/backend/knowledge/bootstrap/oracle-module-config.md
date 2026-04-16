# N/config — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4261803800.html
> Module: N/config
> Version: SuiteScript 2.x / 2.1

# N/config Module

Use the N/config module to access NetSuite configuration settings. The [config.load(options)](section_4256772439.html) method returns a [record.Record](section_4205869719.html) object. Use the [record.Record](section_4205869719.html) object members to access configuration settings. You do not need to load the N/record module to do this.

See [config.Type](section_4256772632.html) for a list of supported configuration objects.

  [   ](/app/help/helpcenter.nl?fid=section_0302064256)                                

## In This Help Topic

  - N/config Module Members


## N/config Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [config.load(options)](section_4256772439.html) |  [record.Record](section_4205869719.html) |  Server scripts |  Loads a [record.Record](section_4205869719.html) object that encapsulates the specified configuration page.  
Enum |  [config.Type](section_4256772632.html) |  enum |  Server scripts |  Holds the string values for supported configuration objects. Use this enum to set the value of the NetSuite configuration page you want to access in the [config.load(options)](section_4256772439.html) method.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
