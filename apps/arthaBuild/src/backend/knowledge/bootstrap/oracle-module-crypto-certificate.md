# N/crypto-certificate — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1543432423.html
> Module: N/crypto-certificate
> Version: SuiteScript 2.x / 2.1

# N/crypto/certificate Module

Use the N/crypto/certificate module to sign XML documents or strings with digital certificates using asymmetric cryptography. You can also use this module to create signer and verifier objects and verify signed documents.

  [   ](/app/help/helpcenter.nl?fid=section_0302065731)                                

## In This Help Topic

  - N/crypto/certificate Module Members

  - SignedXml Object Members

  - Signer Object Members

  - Verifier Object Members


## N/crypto/certificate Module Members

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [certificate.SignedXml](section_1547156078.html) |  Object |  Server scripts |  Encapsulates an XML string that has been digitally signed. Use [certificate.signXml(options)](section_1547090628.html) to create this object.  
[certificate.Signer](section_1547242551.html) |  Object |  Server scripts |  Encapsulates a created signature (signer) for plain strings. Use [certificate.createSigner(options)](section_1547071865.html) to create this object.  
[certificate.Verifier](section_1547244665.html) |  Object |  Server scripts |  Encapsulates a created verifier for verifying plain string signatures. Use [certificate.createVerifier(options)](section_1547089078.html) to create this object.  
Method |  [certificate.createSigner(options)](section_1547071865.html) |  [certificate.Signer](section_1547242551.html) |  Server scripts |  Creates a [certificate.Signer](section_1547242551.html) object for signing plain strings.  
[certificate.createVerifier(options)](section_1547089078.html) |  [certificate.Verifier](section_1547244665.html) |  Server scripts |  Creates a [certificate.Verifier](section_1547244665.html) object for verifying signatures of plain strings.  
[certificate.signXml(options)](section_1547090628.html) |  [certificate.SignedXml](section_1547156078.html) |  Server scripts |  Signs the input XML string using the Certificate ID. Returns the [certificate.SignedXml](section_1547156078.html) as a string. Note:  Formatting, such as line breaks, is disabled in signatures.  
[certificate.verifyXmlSignature(options)](section_1547090251.html) |  void |  Server scripts |  Verifies the signature in the [SignedXml.asFile()](section_156565610435.html) file.  
Enum |  [certificate.HashAlg](section_1549631688.html) |  enum |  Server scripts |  Holds the string values for hash algorithm types. Use this enum to set the `option.algorithm` property values for the [certificate.createSigner(options)](section_1547071865.html), [certificate.createVerifier(options)](section_1547089078.html), [certificate.signXml(options)](section_1547090628.html) methods.  

## SignedXml Object Members

The following members are called on the [certificate.SignedXml](section_1547156078.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [SignedXml.asFile()](section_156565610435.html) |  [file.File](section_4247974825.html) |  Server scripts |  Returns the signed XML as a file object.  
[SignedXml.asString()](section_1547245476.html) |  string |  Server scripts |  Returns the signed XML as a string.  
[SignedXml.asXml()](section_156565632759.html) |  [xml.Document](section_4392323653.html) |  Server scripts |  Returns the signed XML as an XML document. You can use the [N/xml Module](section_4344917661.html) with this document to access elements and attributes in the XML.  

## Signer Object Members

The following members are called on the [certificate.Signer](section_1547242551.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Signer.sign(options)](section_1547244059.html) |  void |  Server scripts |  Signs the string and returns the signature.  
[Signer.update(options)](section_1547243336.html) |  void |  Server scripts |  Updates the input string to be signed. The string can be encoded.  

## Verifier Object Members

The following members are called on the [certificate.Verifier](section_1547244665.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Verifier.update(options)](section_1547244829.html) |  void |  Server scripts |  Updates the string to be verified against specified certificate.  
[Verifier.verify(options)](section_1547244953.html) |  void |  Server scripts |  Verifies the string against a provided signature using specified certificate.  

### Related Topics

  - [SignedXml.asFile()](section_156565610435.html)
  - [SignedXml.asString()](section_1547245476.html)
  - [SignedXml.asXml()](section_156565632759.html)


[General Notices](chapter_N000004.html)
