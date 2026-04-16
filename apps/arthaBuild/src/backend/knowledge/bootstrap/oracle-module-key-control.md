# N/key-control — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1557413213.html
> Module: N/key-control
> Version: SuiteScript 2.x / 2.1

# N/keyControl Module

Use the N/keyControl module to use SSH keys and access key storage. You can also access keys in the UI at _Setup > Company > Preferences > Keys_.

By using the SSH keys, you can manage files and directories by using the SSH file transfer (SFTP) protocol. For more information, see [SSH Keys for SFTP](chapter_1558548485.html). For more information about SFTP, see [N/sftp Module](section_4617004932.html).

  [   ](/app/help/helpcenter.nl?fid=section_0303041314)                                

## In This Help Topic

  - N/keyControl Module Members

  - Key Object Members


## N/keyControl Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [keyControl.Key](section_156035916506.html) |  Object |  Server scripts |  Represents the key object.  
Method |  [keyControl.findKeys(options)](section_1557413246.html) |  Object |  Server scripts |  Searches and returns a list of keys based on criteria set. If no options are set for criteria, the full list of keys stored in NetSuite is returned.  
[keyControl.createKey(options)](section_1557417459.html) |  [keyControl.Key](section_156035916506.html) |  Server scripts |  Creates a key.  
[keyControl.deleteKey(options)](section_1557417847.html) |  Object |  Server scripts |  Marks the key as deleted in database. The history is retained.  
[keyControl.loadKey(options)](section_1557417962.html) |  [keyControl.Key](section_156035916506.html) |  Server scripts |  Loads a key.  
[keyControl.lock(options)](section_161351701469.html) |  string |  Server scripts |  Locks a key so that it cannot be edited in the UI.  
[keyControl.unlock(options)](section_161351774208.html) |  string |  Server scripts |  Unlocks a key that has been locked by [keyControl.lock(options)](section_161351701469.html).  
Enum |  [keyControl.Operator](section_1557413265.html) |  enum |  Server scripts |  Holds the values for the key operators of [keyControl.findKeys(options)](section_1557413246.html).  

## Key Object Members

The following members are called on the [keyControl.Key](section_156035916506.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Key.file](section_1557418153.html) |  [file.File](section_4247974825.html) |  Server scripts |  File object of the key.  
[Key.password](section_1557418554.html) |  string |  Server scripts |  Password of the key (write-only). You can create a GUID using [Form.addSecretKeyField(options)](section_4550325064.html). This property also accepts the script ID of an API secret stored at _Setup > Company > API Secrets_.  
[Key.scriptId](section_1557418581.html) |  string |  Server scripts |  Script ID of the key. NetSuite prepends this ID with `custkey`.  
[Key.name](section_1557418612.html) |  string |  Server scripts |  Name of the key.  
[Key.description](section_1557418633.html) |  string |  Server scripts |  Description of the key.  
[Key.restrictions](section_1557418660.html) |  string |  Server scripts |  The internal IDs of the employees selected in the **Restrict to Employees** field of the key record.  
Method |  [Key.save()](section_1557418685.html) |  Object |  Server scripts |  Saves the key.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
