# N/pgp — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_5095832176.html
> Module: N/pgp
> Version: SuiteScript 2.x / 2.1

# N/pgp Module

Note: 

The content in this help topic pertains to SuiteScript 2.1.

Use the N/pgp module to enable secure messaging, file encryption, and document signing. Based on [OpenPGP](https://www.openpgp.org/) encryption standards.

Important: 

To use the N/pgp Module, you must first generate PGP keys from [GnuPG](https://www.gnupg.org/gph/en/manual.html), [OpenPGP](https://openpgpjs.org/), or a third party source that supports pgp key generation. The generated keys must be stored in Secrets Management to securely manage and reference the keys. To store your generated keys, go to _Setup > Company > API Secrets_ to create a new secret key.

For more information about API Secrets in NetSuite, see [Secrets Management](article_160216486846.html).

If you are new to PGP, use the following resources to learn more:

  - [RFC 4880 OpenPGP Message Format](https://datatracker.ietf.org/doc/html/rfc4880) \- Provides background information about the PGP standard.

  - [GnuPG Manual](https://www.gnupg.org/gph/en/manual.html) \- A reliable resource for practical information.

  - [OpenPGP](https://www.openpgp.org/) \- Learn more about the pgp standards with documentation resources for developers.


## Limitations of N/pgp

As you are working with the N/pgp module, consider the following limitations:

  - You cannot generate, modify, or inspect PGP keys using the N/pgp module. You must generate keys from a third party source that supports PGP key generation.

  - You cannot create a message without readable PGP software.

  - You are limited to strings.

  - You are limited to data that fits into memory.


  [   ](/app/help/helpcenter.nl?fid=section_0711100030)                                

## In This Help Topic

  - N/pgp Module Members

  - Config Object Members

  - KeyId Object Members

  - Message Object Members

  - MessageData Object Members

  - Verification Object Members

  - VerificationSignature Object Members


## N/pgp Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [pgp.Config](section_0921021222.html) |  Object |  Server scripts |  General configuration options that can be used for message decryption.  
[pgp.Key](section_0921033205.html) |  Object |  Server scripts |  Cryptographic keys and its metadata.  
[pgp.KeyId](section_0921033457.html) |  Object |  Server scripts |  An octet scalar that identifies a subkey.  
[pgp.Message](section_0923090947.html) |  Object |  Server scripts |  Processed PGP data.  
[pgp.MessageData](section_0923092625.html) |  Object |  Server scripts |  Message data.  
[pgp.Verification](section_0923094518.html) |  Object |  Server scripts |  Verification results.  
[pgp.VerificationSignature](section_0923101555.html) |  Object |  Server scripts |  A verification result for a single signature.  
Method |  [pgp.createConfig(options)](section_0923113524.html) |  [pgp.Config](section_0921021222.html) |  Server scripts |  Creates a new configuration object.  
[pgp.createMessageData(options)](section_0923113223.html) |  [pgp.MessageData](section_0923092625.html) |  Server scripts |  Creates new message data.  
[pgp.createSigner(options)](section_0923113742.html) |  [certificate.Signer](section_1547242551.html) |  Server scripts |  Creates a [certificate.Signer](section_1547242551.html) object for signing plain strings.  
[pgp.createVerification()](section_0923113648.html) |  [pgp.Verification](section_0923094518.html) |  Server scripts |  Creates an empty verification object.  
[pgp.loadKeyFromSecret(options)](section_0923112727.html) |  [pgp.Key](section_0921033205.html) |  Server scripts |  Loads a key whose contents are stored securely in secret.  
[pgp.parseMessage(options)](section_0923113424.html) |  [pgp.Message](section_0923090947.html) |  Server scripts |  Parses a PGP message.  
[pgp.parseKey(options)](section_0923113901.html) |  [pgp.Key](section_0921033205.html) |  Server scripts |  Parses an existing PGP key.  
Enum |  [pgp.CompressionAlgorithm](section_0923112620.html) |  Enum |  Server scripts |  Holds the values for available compression algorithms. Use this enum to set the value of the `options.compressionAlgorithm` parameter of the [MessageData.encrypt(options)](section_0923093832.html) method.  
[pgp.Format](section_0923111016.html) |  Enum |  Server scripts |  Literal data packet type. Use this enum to set the value for the options.format parameter of the [pgp.createMessageData(options)](section_0923113223.html) method.  

## Config Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Config.allowInsecureDecryptionWithSigningKeys](section_0921031929.html) |  boolean |  Server scripts |  Enables decryption that is not secured with signing keys.  
[Config.allowMessagesWithoutIntegrityProtection](section_0921032219.html) |  boolean |  Server scripts |  Allows messages without integrity protection.  
[Config.useRelaxedSignatureParsing](section_0921032557.html) |  boolean |  Server scripts |  Relaxed signature parsing for configuration objects.  

## KeyId Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [KeyId.asHex()](section_0921033647.html) |  string |  Server scripts |  Returns a key ID as a hexadecimal string.  

## Message Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Message.type](section_0923091633.html) |  boolean |  Server Scripts |  Message type that specifies how a message is processed.  
Method |  [Message.asArmored()](section_0923091739.html) |  string |  Server scripts |  Converts a message to ASCII armored format.  
[Message.toMessageData()](section_0923092023.html) |  [pgp.MessageData](section_0923092625.html) |  Server scripts |  Converts a message to message data without processing. Works only if the message is not encrypted.  
[Message.decrypt(options)](section_0923092155.html) |  [pgp.MessageData](section_0923092625.html) |  Server scripts |  Decrypts a message and optionally verifies the signatures.  

## MessageData Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [MessageData.filename](section_0923093028.html) |  string |  Server scripts |  The name of a file.  
[MessageData.date](section_0923093419.html) |  Date |  Server scripts |  The date of a message or modification date of the file.  
[MessageData.format](section_0923093507.html) |  [pgp.Format](section_0923111016.html) |  Server scripts |  Literal data packet type.  
Method |  [MessageData.getText()](section_0923093601.html) |  string |  Server scripts |  Extracts the contents of a message as text.  
[MessageData.toMessage()](section_0923093718.html) |  [pgp.Message](section_0923090947.html) |  Server scripts |  Creates a message with no signature, compression, or encryption.  
[MessageData.encrypt(options)](section_0923093832.html) |  [pgp.Message](section_0923090947.html) |  Server scripts |  Creates a message that is encrypted and optionally signed.  

## Verification Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [VerificationSignature.verified](section_0923105015.html) |  null | boolean |  Server scripts |  Indicates whether verification was successful.  
[Verification.signatures](section_0923095811.html) |  null | Array<VerificationSignature> |  Server scripts |  A list of individual verifications, one per signature.  

## VerificationSignature Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [VerificationSignature.keyId](section_0923101641.html) |  [pgp.KeyId](section_0921033457.html) |  Server Scripts |  ID of the (sub)key that was used for signing.  
[VerificationSignature.dateSigned](section_0923103943.html) |  Date |  Server Scripts |  Date when the message was signed.  
[VerificationSignature.verified](section_0923105015.html) |  boolean |  Server scripts |  Indicates whether verification was successful for a signature.  
[VerificationSignature.problems](section_0923105152.html) |  string[] |  Server scripts |  A list of problems for verification signatures.  

### Related Topics

  - [SuiteScript 2.x Modules](bridgehead_1501543623.html#bridgehead_1501609041)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
