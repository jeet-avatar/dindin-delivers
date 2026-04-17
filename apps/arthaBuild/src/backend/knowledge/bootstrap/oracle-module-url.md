# N/url — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4358552918.html
> Module: N/url
> Version: SuiteScript 2.x / 2.1

# N/url Module

Use the N/url module to determine URL navigation paths within NetSuite and format URL strings.

  [   ](/app/help/helpcenter.nl?fid=section_0305033928)                                

## In This Help Topic

  - N/url Module Members


## N/url Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [url.format(options)](section_4358672703.html) |  string |  Client and server scripts |  Converts (serializes) URL query parameters into a string.  
[url.resolveDomain(options)](section_4861456597.html) |  string |  Client and server scripts |  Returns a domain name for a NetSuite account.  
[url.resolveRecord(options)](section_4358667680.html) |  string |  Client and server scripts |  Returns an internal URL to a NetSuite record.  
[url.resolveScript(options)](section_4358672433.html) |  string |  Client and server scripts |  Returns an external or internal URL to a script.  
[url.resolveTaskLink(options)](section_4358672296.html) |  string |  Client and server scripts |  Returns an internal URL for a tasklink.  
Enum |  [url.HostType](section_4834765371.html) |  enum |  Client and server scripts |  Holds the string values that describe a category of domain name. Use this enum to set the value of the `hostType` parameter of the [url.resolveDomain(options)](section_4861456597.html) method.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
