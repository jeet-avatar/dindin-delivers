# N/util — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4569538303.html
> Module: N/util
> Version: SuiteScript 2.x / 2.1

# N/util Module

Use the N/util module to manually access methods that verify object and primitive types in a SuiteScript 2.x script. These methods can also be accessed using the global util object. For more information about the global util object, see [SuiteScript 2.x Global Objects](chapter_4387171685.html).

  [   ](/app/help/helpcenter.nl?fid=section_0305034417)                                

Use the N/util module to access methods that verify object and primitive types in a SuiteScript 2.x script.

Each method (for example, [util.isArray(obj)](section_4434638201.html)) returns a boolean value, based on evaluation of the `obj` parameter.

If you need to identify a type specific to SuiteScript 2.x, use the [toString()](section_4542785226.html) global method.

## In This Help Topic

  - N/util Module Members


## N/util Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [util.each(iterable, callback)](section_4541697371.html) |  Object or Array |  Client and server scripts |  Iterates over each member in an Object or Array.  
[util.extend(receiver, contributor)](section_4541702994.html) |  Object |  Client and server scripts |  Copies the properties in a source object to a destination object.  
[util.isArray(obj)](section_4434638201.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript Array object and false otherwise.  
[util.isAsyncFunction(obj)](section_159485198809.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is JavaScript Async Function and false otherwise.  
[util.isBoolean(obj)](section_4434638340.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript Boolean and false otherwise.  
[util.isDate(obj)](section_4434642842.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript Date object and false otherwise.  
[util.isFunction(obj)](section_4434697652.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript Function or Async Function and false otherwise.  
[util.isNumber(obj)](section_4434771374.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript Number object or a value that evaluates to a Number object, and false otherwise.  
[util.isObject(obj)](section_4434780923.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a plain JavaScript object (new Object() or {} for example), and false otherwise.  
[util.isRegExp(obj)](section_4434785140.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript RegExp object or a value that evaluates to a RegExp object, and false otherwise.  
[util.isString(obj)](section_4434798099.html) |  boolean |  Client and server scripts |  Returns true if the `obj` parameter is a JavaScript String object or a value that evaluates to a String object, and false otherwise.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
