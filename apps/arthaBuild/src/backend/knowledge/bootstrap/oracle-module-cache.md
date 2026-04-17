# N/cache — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4642573343.html
> Module: N/cache
> Version: SuiteScript 2.x / 2.1

# N/cache Module

Use the N/cache module to enable temporary, short-term storage of data. Using a cache improves performance by eliminating the need for scripts to repeatedly retrieve the same piece of data. You can use this module to build a cache to store and retrieve string values using a specific key.

You can create a cache that is available (1) to the current script only, (2) to all server scripts in the current bundle, or (3) to all server scripts in your NetSuite account. Data is stored in the cache according to its time to live (ttl) specified in the [Cache.put(options)](section_4642661313.html) method.

  [   ](/app/help/helpcenter.nl?fid=section_0302040458)                                

## In This Help Topic

  - N/cache Module Members

  - Cache Object Members


## N/cache Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [cache.Cache](section_4642656915.html) |  Object |  Server scripts |  Encapsulates a cache which is a segment of memory that can be used to store data on a temporary, short-term basis.  
Method |  [cache.getCache(options)](section_4642627983.html) |  [cache.Cache](section_4642656915.html) |  Server scripts |  Checks for a cache object with the specified name. If the cache object exists, this method returns it. If the cache object does not exist, the system creates and returns a new cache object.  
Enum |  [cache.Scope](section_4655722738.html) |  enum |  Server scripts |  Holds the string values that describe the availability of the cache. Use this enum to set the value of the [Cache.scope](section_4642698254.html) property and the `options.scope` parameter of the [cache.getCache(options)](section_4642627983.html) method.  

## Cache Object Members

The following members are called on [cache.Cache](section_4642656915.html).

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Cache.get(options)](section_4642661440.html) |  string |  Server scripts |  Retrieves a value from the cache based on a key that you provide. If the requested value is not in the cache, the method calls the user-defined function identified by a method parameter.  
[Cache.put(options)](section_4642661313.html) |  string |  Server scripts |  Puts a value into the cache.  
[Cache.remove(options)](section_4642660820.html) |  string |  Server scripts |  Removes a value from the cache.  
Property |  [Cache.name](section_4642698188.html) |  string |  Server scripts |  The name of the cache.  
[Cache.scope](section_4642698254.html) |  string |  Server scripts |  The availability of the cache. A cache can be made available

  - to the current script only,
  - to all scripts in the current bundle, or
  - to all scripts in your NetSuite account.

Set this value using the [cache.Scope](section_4655722738.html) enum.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
