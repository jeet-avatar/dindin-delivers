# N/compress — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158584507367.html
> Module: N/compress
> Version: SuiteScript 2.x / 2.1

# N/compress Module

Use the N/compress module to compress and decompress files. You can also use this module to archive multiple files in a single file archive such as TAR or ZIP file.

You can compress and decompress individual files by using [compress.gzip(options)](section_158584918027.html) and [compress.gunzip(options)](section_158584955171.html).

You can create an archive by using [compress.createArchiver()](section_158584980366.html) and add multiple files to the archive.

  [   ](/app/help/helpcenter.nl?fid=section_0302060943)                                

## In This Help Topic

  - N/compress Module Members

  - Archiver Object Members


## N/compress Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [compress.Archiver](section_158584592144.html) |  Object |  Server scripts |  The functionality for creating archive files. Use [compress.createArchiver()](section_158584980366.html) to create this object.  
Method |  [compress.createArchiver()](section_158584980366.html) |  [compress.Archiver](section_158584592144.html) |  Server scripts |  Creates a [compress.Archiver](section_158584592144.html) object.  
[compress.gunzip(options)](section_158584955171.html) |  [file.File](section_4247974825.html) |  Server scripts |  Decompresses a file and returns it as a temporary file object.  
[compress.gzip(options)](section_158584918027.html) |  [file.File](section_4247974825.html) |  Server scripts |  Compresses a file and returns it as a temporary file object.  
Enum |  [compress.Type](section_158584877701.html) |  enum |  Server scripts |  Holds the string values for the archive types. Use this enum to set the value of the `type` parameter of the method [Archiver.archive(options)](section_158584789142.html).  

## Archiver Object Members

The following members are called on the [compress.Archiver](section_158584592144.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Archiver.add(options)](section_158584723528.html) |  void |  Server scripts |  Adds a file to be archived.  
[Archiver.archive(options)](section_158584789142.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates an archive with the added files and returns it as a temporary file object.  

### Related Topics

  - [N/compress Module](section_158584507367.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
