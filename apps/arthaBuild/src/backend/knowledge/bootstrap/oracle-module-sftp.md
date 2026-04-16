# N/sftp — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4617004932.html
> Module: N/sftp
> Version: SuiteScript 2.x / 2.1

# N/sftp Module

Use the N/sftp module to manage folders and upload or download files from external SSH file transfer (SFTP) servers. You can perform the following SFTP functions using the N/sftp module:

SFTP servers can be hosted by your organization or by a third party. NetSuite does not provide SFTP server functionality. All SFTP transfers to or from NetSuite must originate from SuiteScript. It is not possible for external clients to initiate file transfers using SFTP.

Use SSH keys to establish an SFTP connection. By using the keys, you can manage files and directories by using the SFTP protocol. For more information, see [SSH Keys for SFTP](chapter_1558548485.html). For more information about working with keys in SuiteScript, see the N/keyControl Module, see [N/keyControl Module](section_1557413213.html).

  [   ](/app/help/helpcenter.nl?fid=section_0304050535)                                

Important: 

All paths, directories, and filenames that contain wildcards such as `?` and `*` must have those characters escaped, unless these characters are specifically intended to work as wildcards.

Note: 

To use an external server to initiate a NetSuite file transfer that doesn't use SFTP, you can use RESTlets or SOAP web services. In SuiteScript, RESTlets can respond to requests containing file data and save them in the File Cabinet. RESTlets can also respond to requests for file data by loading the contents from the File Cabinet and returning them in the response. Note that binary file content must be received or sent as Base64 encoded Strings. See [SuiteScript 2.x RESTlet Script Type](section_4387799403.html) for more information.

In SOAP web services, applications can invoke CRUD operations on the file record to populate or change the contents of the File Cabinet. See [SuiteTalk SOAP Web Services Platform Guide](book_156388532579.html) and [File](section_N3784054.html) for more information.

## In This Help Topic

  - N/sftp Module Members

  - Connection Object Members

  - [Setting up an SFTP Transfer](section_4855400554.html)

  - [SFTP Authentication](section_4855401415.html)

  - [Supported Cipher Suites and Host Key Types](section_4784614151.html)

  - [Supported SuiteScript File Types](section_4855409350.html)

  - [N/keyControl Module](section_1557413213.html)


## N/sftp Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [sftp.Connection](section_4618502733.html) |  Object |  Server scripts |  Represents a connection to the account on the remote FTP server.  
Method |  [sftp.createConnection(options)](section_4617005472.html) |  [sftp.Connection](section_4618502733.html) |  Server scripts |  Establishes a connection to a remote FTP server.  
Enum |  [sftp.MAX_CONNECT_TIMEOUT](section_1557321286.html) |  enum |  Server scripts |  Holds the values for maximum connection timeout.  
[sftp.MIN_CONNECT_TIMEOUT](section_1557238823.html) |  enum |  Server scripts |  Holds the values for minimum connection timeout.  
[sftp.MAX_PORT_NUMBER](section_1557327056.html) |  enum |  Server scripts |  Holds the values for the maximum port number.  
[sftp.MIN_PORT_NUMBER](section_1557327099.html) |  enum |  Server scripts |  Holds the values for the minimum port number.  
[sftp.DEFAULT_PORT_NUMBER](section_1557327135.html) |  enum |  Server scripts |  Holds the values for the default port number.  
[sftp.Sort](section_1557239613.html) |  enum |  Server scripts |  Holds the values to be used to sort the listed directory. Use this enum to set the value of the `options.sort` parameter of the [Connection.list(options)](section_1557235176.html) method.  

## Connection Object Members

The following members are called on the [sftp.Connection](section_4618502733.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Connection.download(options)](section_4618664030.html) |  [file.File](section_4247974825.html) |  Server scripts |  Downloads a file from the remote FTP server.  
[Connection.upload(options)](section_4618512910.html) |  void |  Server scripts |  Uploads a file to the remote FTP server.  
[Connection.makeDirectory(options)](section_1557234024.html) |  string |  Server scripts |  Creates an empty directory.  
[Connection.removeDirectory(options)](section_1557234344.html) |  void |  Server scripts |  Removes an empty directory.  
[Connection.removeFile(options)](section_1557234670.html) |  void |  Server scripts |  Removes a file in a directory.  
[Connection.move(options)](section_1557234961.html) |  void |  Server scripts |  Moves a file or directory from one location to another.  
[Connection.list(options)](section_1557235176.html) |  Array<Object> |  Server scripts |  Lists the remote directory.  
Enum |  [Connection.MAX_FILE_SIZE](section_1557238937.html) |  enum |  Server scripts |  Holds the values for the maximum file size.  
[Connection.MAX_TRANSFER_TIMEOUT](section_1557238973.html) |  enum |  Server scripts |  Holds the values for the maximum transfer timeout.  

### Related Support Articles

  - [SuiteScript > sftp Module > Connection.upload(options) > Execution Logs > FTP_PERMISSION_DENIED](https://suiteanswers.custhelp.com/app/answers/detail/a_id/88524)
  - [SuiteScript 2.0 > n/sftp > FTP_INVALID_DIRECTORY](https://suiteanswers.custhelp.com/app/answers/detail/a_id/92760)
  - [One SFTP Connection Established per Every File Upload/Download Using sftp.createConnection() Function](https://suiteanswers.custhelp.com/app/answers/detail/a_id/88609)


### Related Topics

  - [Setting up an SFTP Transfer](section_4855400554.html)
  - [SFTP Authentication](section_4855401415.html)
  - [Supported Cipher Suites and Host Key Types](section_4784614151.html)
  - [Supported SuiteScript File Types](section_4855409350.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
