# N/crypto — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4358549582.html
> Module: N/crypto
> Version: SuiteScript 2.x / 2.1

# N/crypto Module

Use N/crypto module to perform hashing, hash-based message authentication (hmac), and symmetrical encryption functions.

When the N/crypto module is used, SuiteScript also loads [N/encode Module](section_4369847722.html).

  [   ](/app/help/helpcenter.nl?fid=section_0302070216)                                

## In This Help Topic

  - N/crypto Module Members

  - Cipher Object Members

  - CipherPayload Object Members

  - Decipher Object Members

  - Hash Object Members

  - Hmac Object Members

  - SecretKey Object Members


## N/crypto Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [crypto.Cipher](section_4358574527.html) |  Object |  Server scripts |  Encapsulates a cipher.  
[crypto.CipherPayload](section_4358619238.html) |  Object |  Server scripts |  Encapsulates a cipher payload.  
[crypto.Decipher](section_4358620478.html) |  Object |  Server scripts |  Encapsulates a decipher.  
[crypto.Hash](section_4358620745.html) |  Object |  Server scripts |  Encapsulates a hash.  
[crypto.Hmac](section_4358620874.html) |  Object |  Server scripts |  Encapsulates an hmac.  
[crypto.SecretKey](section_4358620976.html) |  Object |  Server scripts |  Encapsulates a secret key handle.  
Method |  [crypto.checkPasswordField(options)](section_160806904480.html) |  boolean |  Server scripts |  Checks whether a password in a record corresponds to the password entered by the user.  
[crypto.createCipher(options)](section_4358650498.html) |  Object |  Server scripts |  Creates and returns a new [crypto.Cipher](section_4358574527.html) Object.  
[crypto.createDecipher(options)](section_4358650886.html) |  Object |  Server scripts |  Creates and returns a new [crypto.Decipher](section_4358620478.html) object.  
[crypto.createHash(options)](section_4358647370.html) |  Object |  Server scripts |  Creates and returns a new [crypto.Hash](section_4358620745.html) Object.  
[crypto.createHmac(options)](section_4358647613.html) |  Object |  Server scripts |  Creates and returns a new [crypto.Hmac](section_4358620874.html) Object.  
[crypto.createSecretKey(options)](section_4358653390.html) |  Object |  Server scripts |  Creates and returns a new [crypto.SecretKey](section_4358620976.html) Object.  
Enum |  [crypto.EncryptionAlg](section_4358655796.html) |  string (read-only) |  Server scripts |  Holds the string values for supported encryption algorithms. Use this enum to set the `options.algorithm` parameter for [crypto.createCipher(options)](section_4358650498.html).  
[crypto.HashAlg](section_4358655346.html) |  string (read-only) |  Server scripts |  Holds the string values for supported hashing algorithms. Use this enum to set the `options.algorithm` parameter for [crypto.createHash(options)](section_4358647370.html) and [crypto.createHmac(options)](section_4358647613.html).  
[crypto.Padding](section_4358655564.html) |  string (read-only) |  Server scripts |  Holds the string values for supported cipher padding. Use this enum to set the `options.padding` parameter for [crypto.createCipher(options)](section_4358650498.html) and [crypto.createDecipher(options)](section_4358650886.html).  

## Cipher Object Members

The following members are called on [crypto.Cipher](section_4358574527.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Cipher.update(options)](section_454552856444.html) |  void |  Server scripts |  Updates the clear data with the specified encoding.  
[Cipher.final(options)](section_454422851562.html) |  Object |  Server scripts |  Returns the cipher data.  

## CipherPayload Object Members

The following members are called on [crypto.CipherPayload](section_4358619238.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [CipherPayload.ciphertext](section_455083557128.html) |  string |  Server scripts |  The result of the ciphering process.  
[CipherPayload.iv](section_46186462402.html) |  number |  Server scripts |  An initialization vector.  

## Decipher Object Members

The following members are called on [crypto.Decipher](section_4358620478.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Decipher.final(options)](section_458502441405.html) |  string |  Server scripts |  Returns the clear data.  
[Decipher.update(options)](section_453919616698.html) |  void |  Server scripts |  Updates decipher data with the specified encoding.  

## Hash Object Members

The following members are called on [crypto.Hash](section_4358620745.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Hash.digest(options)](section_456370178222.html) |  string |  Server scripts |  Calculates the digest of the data to be hashed.  
[Hash.update(options)](section_453249145507.html) |  void |  Server scripts |  Updates the clear data with the encoding specified.  

## Hmac Object Members

The following members are called on [crypto.Hmac](section_4358620874.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Hmac.digest(options)](section_459978271483.html) |  string |  Server scripts |  Gets the computed digest.  
[Hmac.update(options)](section_457765136718.html) |  void |  Server scripts |  Updates the clear data with the encoding specified.  

## SecretKey Object Members

The following members are called on [crypto.SecretKey](section_4358620976.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Secretkey.guid](section_455843444823.html) |  string |  Server scripts |  The GUID associated with the secret key.  
[SecretKey.encoding](section_458478637694.html) |  string |  Server scripts |  The encoding used for the clear text value of the secret key.  
[SecretKey.secret](section_161299949029.html) |  string |  Server scripts |  The script ID of an API secret stored at _Setup > Company > API Secrets_.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
