# N/file — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4205693274.html
> Module: N/file
> Version: SuiteScript 2.x / 2.1

# N/file Module

Use the N/file module to work with files within NetSuite. You can use this module to upload files to the NetSuite File Cabinet, as well as send files as attachments without uploading them to the File Cabinet. You can also use this module to copy files in the File Cabinet, and you can use conflict resolution options to handle conflicts (such as when a file with the same name already exists in the same folder in the File Cabinet).

Tip: 

When dealing with file naming conventions, especially when uploading files to the File Cabinet using SuiteScript, it is important to follow best practices to prevent file duplication. If your system works with multiple files simultaneously, consider including timestamps with millisecond precision in the file names. Additionally, generating a random number as part of the file name can further reduce the chances of duplicates.

A [file.Reader](section_1543844186.html) object, which is returned by [File.getReader()](section_1543843814.html), can be used for special read operations. Use [File.getSegments(options)](section_1543844004.html) to retrieve an iterator of custom segments of a file.

Methods that load content in memory, such as [File.getContents()](section_4229269811.html), have a 10 MB size limit. This limit does not apply when content is streamed, such as when [File.save()](section_4229271179.html) is called.

The [File.appendLine(options)](section_4769938149.html) method inserts a line to the end of a CSV or text file, which increases the file size accordingly. All files are screened for malicious content when they are uploaded or updated, and increased file size can slow down the process. Consider splitting large files into several smaller ones if you experience performance issues.

  [   ](/app/help/helpcenter.nl?fid=section_0303032537)                                

## In This Help Topic

  - N/file Module Members

  - File Object Members

  - Reader Object Members


## N/file Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [file.File](section_4247974825.html) |  Object |  Server scripts |  Encapsulates a file within NetSuite.  
[file.Reader](section_1543844186.html) |  Object |  Server scripts |  Encapsulates a reader that you can use to perform special read operations.  
Method |  [file.copy(options)](section_161167269293.html) |  [file.File](section_4247974825.html) |  Server scripts |  Copies an existing file in the File Cabinet.  
[file.create(options)](section_4223861820.html) |  [file.File](section_4247974825.html) |  Server scripts |  Creates a new [file.File](section_4247974825.html).  
[file.delete(options)](section_4226573892.html) |  void |  Server scripts |  Deletes an existing [file.File](section_4247974825.html) from the NetSuite File Cabinet.  
[file.load(options)](section_4226574300.html) |  [file.File](section_4247974825.html) |  Server scripts |  Loads an existing [file.File](section_4247974825.html) from the NetSuite File Cabinet.  
Enum |  [file.Encoding](section_4228998505.html) |  enum |  Server scripts |  Holds character encoding values for file contents. Use this enum to set the value of the [File.encoding](section_4229270853.html) property.  
[file.NameConflictResolution](section_161167377495.html) |  enum |  Server scripts |  Holds conflict resolution values that apply when copying a file. Use this enum to specify how to resolve conflicts when copying files and to set the value of the conflict resolution parameter in [file.copy(options)](section_161167269293.html)  
[file.Type](section_4228999954.html) |  enum |  Server scripts |  Holds file type values. Use this enum to set the value of the [File.fileType](section_4229267378.html) property.  

## File Object Members

The following members are available for a [file.File](section_4247974825.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [File.appendLine(options)](section_4769938149.html) |  [file.File](section_4247974825.html) |  Server scripts |  Inserts a line to the end of a CSV or text file.  
[File.getContents()](section_4229269811.html) |  string |  Server scripts |  Returns the content of a file in string format.  
[File.lines.iterator()](section_4769955095.html) |  boolean |  Server scripts |  Calls a developer-defined function for each line. Returns false when line processing stops.  
[File.resetStream()](section_4769955125.html) |  void |  Server scripts |  Resets the file stream to its previous state.  
[File.save()](section_4229271179.html) |  number |  Server scripts |  Saves a new or updated file to the File Cabinet.  
[File.getReader()](section_1543843814.html) |  Object |  Server scripts |  Returns reader object for read operations.  
[File.getSegments(options)](section_1543844004.html) |  Object |  Server scripts |  Returns an iterator of segments that are delimited by the specified separator.  
Property |  [File.description](section_4223862428.html) |  string |  Server scripts |  Description of a file.  
[File.encoding](section_4229270853.html) |  string |  Server scripts |  Character encoding on a file.  
[File.fileType](section_4229267378.html) |  enum |  Server scripts |  File type of a file.  
[File.folder](section_4229265810.html) |  number |  Server scripts |  Internal ID of the folder that houses a file within the NetSuite File Cabinet.  
[File.id](section_4229266178.html) |  number (read-only) |  Server scripts |  Internal ID of a file in the NetSuite File Cabinet.  
[File.isInactive](section_4229270120.html) |  boolean |  Server scripts |  Inactive status of a file. If set to true, the file is inactive.  
[File.isOnline](section_4229270451.html) |  boolean |  Server scripts |  'Available without Login' status of a file. If set to true, users can download the file outside of a current NetSuite login session.  
[File.isText](section_4229267767.html) |  boolean (read-only) |  Server scripts |  Indicates whether a file type is text-based.  
[File.name](section_4229266563.html) |  string |  Server scripts |  Name of a file.  
[File.path](section_4229268933.html) |  string (read-only) |  Server scripts |  Relative path to a file in the NetSuite File Cabinet.  
[File.size](section_4229266796.html) |  number (read-only) |  Server scripts |  Size of a file in bytes.  
[File.url](section_4229268651.html) |  string (read-only) |  Server scripts |  URL of a file.  

## Reader Object Members

The following members are available for a [file.Reader](section_1543844186.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Reader.readChars(options)](section_1543844484.html) |  string |  Server scripts |  Returns the next `options.number` characters from the current position.  
[Reader.readUntil(options)](section_1543844425.html) |  string |  Server scripts |  Returns string from current position to the next occurrence of `options.tag`.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
