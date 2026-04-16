# N/format — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4388721627.html
> Module: N/format
> Version: SuiteScript 2.x / 2.1

# N/format Module

Use the format module to parse formatted data into strings and to convert strings into a specified format. The format module formats data according to personal preferences set on the Set Preferences page, accessible from _Home > Set Preferences_. See [Setting Personal Preferences](chapter_N475297.html).

  [   ](/app/help/helpcenter.nl?fid=section_0303040501)                                

## In This Help Topic

  - N/format Module Members


## N/format Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [format.format(options)](section_4388843892.html) |  string | Date |  Client and server scripts |  Takes a raw value and returns a formatted value. Note:  This method is overloaded when you format a `datetime` or `datetimetz` value.  
[format.parse(options)](section_4388837989.html) |  Date | string | number |  Client and server scripts |  Takes a formatted value and returns a raw value. Note:  This method is overloaded when you format a `datetime` or `datetimetz` value.  
Enum |  [format.Timezone](section_4407050795.html) |  enum |  Client and server scripts |  Holds the string values for supported time zone formats. Use this enum to set the value of the `options.timezone` parameter.  
[format.Type](section_4388844232.html) |  enum |  Client and server scripts |  Holds the string values for the supported field types. Use this enum to set the value of the `options.type` parameter when calling [format.format(options)](section_4388843892.html) or [format.parse(options)](section_4388837989.html).  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
