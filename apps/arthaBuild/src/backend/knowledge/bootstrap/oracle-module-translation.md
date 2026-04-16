# N/translation — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1538666156.html
> Module: N/translation
> Version: SuiteScript 2.x / 2.1

# N/translation Module

Use the N/translation module to allow SuiteScript developers to interact with NetSuite Translation Collections programmatically. For more information about Translation Collections, see [Translation Collections Overview](section_1544566748.html).

  [   ](/app/help/helpcenter.nl?fid=section_0305025218)                                

You can watch a video that demonstrates how to use the N/translation module to work with Translation Collections.

Note: 

The N/translation module provides read-only access. If you want to create or modify Translation Collections, you can do so in the NetSuite UI at _Customization > Translations > Manage Translations_

For more information about managing Translation Collections in the UI, see [Manage Translations](article_158572305264.html).

A Translation Collection is encapsulated in the [translation.Handle](section_1541705125.html) object. The `translation.Handle` object is a hierarchical object, which means that each node in the object is either another `translation.Handle` object or a [translation.Translator](section_1541706219.html) function. Translator functions combine strings with parameters. When you create a Translation Collection in the NetSuite UI, you can include parameter placeholders in your translation strings. The translator function injects the specified parameter values into the placeholders in the returned translation string.

In your scripts, use [translation.get(options)](section_1541707388.html) to get a `translation.Translator` function you can use to obtain specific translated strings in a collection. Consider the following code sample:
[code] 
              // key HELLO_1 = 'Hello, {1}'

    message: translation.get({
        collection: 'custcollection_my_strings',
        key: 'HELLO_1'
    })({
        params: ['NetSuite']
    }) 


[/code]

In this sample, if the string value of the `HELLO_1` key is "Hello, {1}", the `translation.Translator` function combines the string with the `params` parameter value and returns "Hello, NetSuite". You can also use [translation.load(options)](section_1541708603.html) to load translation strings from one or more Translation Collections. For information about the way strings are added to and formatted in collections, see [Working with Translation Collection Strings](section_1544553733.html).

You can load collections in different language locales by using the `locales` parameter of [translation.load(options)](section_1541708603.html). You can also use [translation.selectLocale(options)](section_1541708921.html) to create a `translation.Handle` object in a specific locale from an existing `translation.Handle` object.

## In This Help Topic

  - N/translation Module Members


## N/translation Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Type |  Description  
---|---|---|---|---  
Object |  [translation.Handle](section_1541705125.html) |  Object |  Client and server scripts |  Encapsulates a Translation Collection for a locale.  
[translation.Translator](section_1541706219.html) |  Object / Function |  Client and server scripts |  Represents a translator function that returns translated strings. The translated strings include variables that are passed as parameters to the translator function.  
Method |  [translation.get(options)](section_1541707388.html) |  [translation.Translator](section_1541706219.html) |  Client and server scripts |  Creates a translator function for a key in the specified Translation Collection and locale.  
[translation.load(options)](section_1541708603.html) |  [translation.Handle](section_1541705125.html) |  Client and server scripts |  Creates a [translation.Handle](section_1541705125.html) object with translations for the specified Translation Collections and locales.  
[translation.selectLocale(options)](section_1541708921.html) |  [translation.Handle](section_1541705125.html) |  Client and server scripts |  Creates a [translation.Handle](section_1541705125.html) object in the specified locale from an existing `translation.Handle` object.  
Enum |  [translation.Locale](section_1541709045.html) |  enum |  Client and server scripts |  Holds the supported locales for Translation Collections. Use this enum to pass the locale argument to [translation.get(options)](section_1541707388.html) and [translation.selectLocale(options)](section_1541708921.html).  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
