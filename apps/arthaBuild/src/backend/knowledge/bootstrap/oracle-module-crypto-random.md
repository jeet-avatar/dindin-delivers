# N/crypto-random — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_13113107585.html
> Module: N/crypto-random
> Version: SuiteScript 2.x / 2.1

# N/crypto/random Module

Note: 

The N/crypto/random module is available for both client and server scripts, but server scripts need to use SuiteScript 2.1.

If you cannot update your server script code to SuiteScript 2.1, consider implementing a small RESTlet in SuiteScript 2.1 that uses N/crypto/random module and consuming it from your script with [https.requestRestlet(options)](section_159139340774.html)

  [   ](subsect_46113121364.html#subsect_29130641620)                                

## In This Help Topic

Use the N/crypto/random module to provide cryptographically-secure, pseudorandom generator methods.

  - N/crypto/random Module Members


## N/crypto/random Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [random.generateBytes(options)](article_0526121734.html) |  Uint8Array |  Client and server scripts |  Generates cryptographically strong pseudorandom set of bytes.  
[random.generateInt(options)](article_0526122403.html) |  number |  Client and server scripts |  Method used to generate cryptographically strong pseudorandom number.  
[random.generateUUID()](article_0526122721.html) |  string |  Client and server scripts |  Method used to generate a v4 Universally Unique Identifier using a cryptographically secure random number generator.  

[General Notices](chapter_N000004.html)
