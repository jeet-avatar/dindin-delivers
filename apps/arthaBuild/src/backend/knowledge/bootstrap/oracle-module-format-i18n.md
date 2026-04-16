# N/format-i18n — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1543861741.html
> Module: N/format-i18n
> Version: SuiteScript 2.x / 2.1

# N/format/i18n Module

Use the N/format/i18n module to format strings in international context and format numbers to currency or number strings. You can also use this module to format phone number to strings and parse strings to phone number.

  [   ](/app/help/helpcenter.nl?fid=section_0303035402)                                

## In This Help Topic

  - N/format/i18n Module Members

  - Currency Formatter Object Members

  - Number Formatter Object Members

  - Phone Number Formatter Object Members

  - Phone Number Parser Object Members


## N/format/i18n Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [format.CurrencyFormatter](section_1558024548.html) |  Object |  Client and server scripts |  Represents the object that formats the number to currency string.  
[format.NumberFormatter](section_1558026406.html) |  Object |  Client and server scripts |  Represents the object that formats the number to string.  
[format.PhoneNumberFormatter](section_158626649783.html) |  Object |  Client and server scripts |  Represents the object that formats the phone number to string.  
[format.PhoneNumberParser](section_158627095342.html) |  Object |  Client and server scripts |  Represents the object that parses the string to phone number.  
Method |  [format.spellOut(options)](section_1549297222.html) |  string |  Client and server scripts |  Creates a string containing the spelled-out version of the specified number in a specified locale.  
[format.getCurrencyFormatter(options)](section_1558023369.html) |  object |  Client and server scripts |  Creates a [format.CurrencyFormatter](section_1558024548.html) object to format numbers to currency strings.  
[format.getNumberFormatter(options)](section_1558023913.html) |  object |  Client and server scripts |  Creates a [format.NumberFormatter](section_1558026406.html) object to format numbers to strings.  
[format.getPhoneNumberFormatter(options)](article_20131717237.html) |  object |  Client and server scripts |  Creates a [format.PhoneNumberFormatter](section_158626649783.html) object to format phone numbers to strings.  
[format.getPhoneNumberParser(options)](article_77132343780.html) |  object |  Client and server scripts |  Parses a phone number from a string. Returns a [format.PhoneNumberParser](section_158627095342.html) object.  
Enum |  [format.NegativeNumberFormat](section_1558031974.html) |  enum |  Client and server scripts |  Holds the values for the negative number format. Used to set the value of the `options.negativeNumberFormatter` parameter of the [format.getNumberFormatter(options)](section_1558023913.html).  
[format.Currency](section_1558027087.html) |  enum |  Client and server scripts |  Holds the values for the currency code. Used to set the value of the `options.currency` parameter of the [format.getCurrencyFormatter(options)](section_1558023369.html) method.  

## Currency Formatter Object Members

The following members are called on the [format.CurrencyFormatter](section_1558024548.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [CurrencyFormatter.currency](section_1558031127.html) |  string |  Client and server scripts |  Indicates the currency code.  
[CurrencyFormatter.locale](section_161167908197.html) |  string |  Client and server scripts |  The locale of the currency formatter.  
[CurrencyFormatter.symbol](section_1558031214.html) |  string |  Client and server scripts |  Indicates the currency symbol.  
[CurrencyFormatter.numberFormatter](section_1558031250.html) |  object |  Client and server scripts |  Contains the [format.NumberFormatter](section_1558026406.html) object derived from [format.CurrencyFormatter](section_1558024548.html) with the same number formatting parameters without currency symbol.  
[CurrencyFormatter.format(options)](section_1558031335.html) |  string |  Client and server scripts |  Formats the number to the currency string.  

## Number Formatter Object Members

The following members are called on the [format.NumberFormatter](section_1558026406.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [NumberFormatter.groupSeparator](section_1558031440.html) |  string |  Client and server scripts |  Indicates the group separator.  
[NumberFormatter.decimalSeparator](section_1558031580.html) |  string |  Client and server scripts |  Indicates the decimal separator.  
[NumberFormatter.locale](section_161167940078.html) |  string |  Client and server scripts |  The locale of the number formatter.  
[NumberFormatter.precision](section_1558031620.html) |  number |  Client and server scripts |  Indicates the precision.  
[format.NegativeNumberFormat](section_1558031974.html) |  enum |  Client and server scripts |  Indicates the negative number format.  
[NumberFormatter.format(options)](section_1558031908.html) |  string |  Client and server scripts |  Formats the number to string.  

## Phone Number Formatter Object Members

The following members are called on the [format.PhoneNumberFormatter](section_158626649783.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [format.PhoneNumberFormatter](section_158626649783.html) |  Object |  Client and server scripts |  The object that formats the phone number to string.  
Method |  [PhoneNumberFormatter.format(options)](section_158626687631.html) |  string |  Client and server scripts |  Formats phone number object to string.  
Enum |  [format.PhoneNumberFormatType](section_158626858431.html) |  enum |  Client and server scripts |  Holds the values for the phone number format type. Used to set the value of the `options.formatType` parameter of the [format.getPhoneNumberFormatter(options)](article_20131717237.html) method.  
[format.Country](section_158626866748.html) |  enum |  Client and server scripts |  Hold the values for the countries. Used to set the value of the options.defaultCountry parameter in the [format.getPhoneNumberParser(options)](article_77132343780.html) method.  

### Phone Number Parser Object Members

The following members are called on the [format.PhoneNumberParser](section_158627095342.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [format.PhoneNumberParser](section_158627095342.html) |  Object |  Client and server scripts |  The object that parses the string to phone number.  
Method |  [PhoneNumberParser.parse(options)](section_158626797748.html) |  Object of type `PhoneNumber` |  Client and server scripts |  Parses string to phone number.  

### Related Topics

  - [N/format/i18n Module](section_1543861741.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
