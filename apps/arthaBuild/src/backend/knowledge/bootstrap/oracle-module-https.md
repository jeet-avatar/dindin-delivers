# N/https — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4418229131.html
> Module: N/https
> Version: SuiteScript 2.x / 2.1

# N/https Module

Use the N/https module to manage content sent to a third party using HTTPS calls. This module encapsulates all the functionality of the [N/http Module](section_4296361104.html), but does not allow the HTTP protocol. You can make HTTPS calls from client and server scripts.

  [   ](/app/help/helpcenter.nl?fid=section_0305042314)                                

You can use the N/https module to encode binary content or access a handle to the value in a NetSuite credential field.

You can use the N/https module to communicate between SuiteScript scripts, RESTlets, and SuiteTalk REST APIs without having to reauthenticate, using the [https.requestRestlet(options)](section_159139340774.html) and [https.requestSuiteTalkRest(options)](section_159139347369.html) methods.

When the N/https module is used, SuiteScript also loads the [N/crypto Module](section_4358549582.html) and [N/encode Module](section_4369847722.html).

Important: 

Use TLS 1.2 for HTTPS requests. SuiteScript 2.0 requests such [https.delete(options)](section_4567631039.html), [https.get(options)](section_4567631366.html), [https.post(options)](section_4567628658.html), [https.put(options)](section_4567627984.html), and [https.request(options)](section_4567630582.html) usually go to third-party servers. Management of these servers is not within the control of your company. These HTTPS requests now fail the handshake when they attempt to connect to servers that do not support TLS 1.2. You should communicate with those who manage any third-party servers to which you connect, and ensure their servers support the TLS 1.2 protocol.

Important: 

NetSuite supports the same list of trusted third-party certificate authorities (CAs) as the Mozilla Included CA Certificate List.

The target endpoint, domain, or server must use one of these trusted third-party CAs, or the connection cannot be established. Oracle NetSuite requires that the endpoints that you are connecting to from NetSuite provide a full certification chain, including intermediate certificates.

For a list of certificate authorities, see [https://wiki.mozilla.org/CA/Included_Certificates.](https://wiki.mozilla.org/CA/Included_Certificates)

Warning: 

Using plain text or other unencrypted user credentials is unsafe and can pose a security threat. Whenever possible, use [Token-based Authentication (TBA)](chapter_4247329078.html) or [OAuth 2.0](chapter_157769826287.html) to specify user credentials.

## In This Help Topic

  - HTTPS Header Information

  - N/https Module Members

  - SecureString Object Members

  - ClientResponse Object Members

  - ServerResponse Object Members

  - ServerRequest Object Members


## HTTPS Header Information

HTTP headers add extra information to a request or response. A header has a case-insensitive name, a colon (:), and a value on the same line. When you define custom headers, don't include underscores in the name. For a list of standard HTTP and HTTPS headers, see <https://developer.mozilla.org/docs/Web/HTTP/Headers>.

If you call [https.post(options)](section_4567628658.html) without a `Content-Type` header, NetSuite sets a default value:

POST Request Body Type |  Default Content-Type Header  
---|---  
Object |  `application/octet-stream`  
Uint8Array |  `application/x-www-form-urlencoded; charset=UTF-8`  
Other type |  `text/xml; charset=UTF-8`  

[https.ServerResponse](section_4567653583.html) encodes text responses in UTF-8 by default. To return a file with a different encoding, see [Return a File with Alternative Character Encoding](article_0808012948.html).

Some headers are not supported in NetSuite and are blocked. These are listed below as either general HTTPS headers or Suitelet response headers.

### General Blocked HTTPS Headers

Be aware that certain headers cannot be set manually when using N/https module methods. If a script attempts to set values for any of the following headers, the values are discarded. These headers are listed in the following table.

  - Connection
  - Content-Length
  - Host
  - JSESSIONID

| 

  - Trailer
  - Transfer-Encoding
  - Upgrade
  - Via


---|---  

### Suitelet Response HTTPS Header Blocklist

In addition to the headers described in General Blocked HTTPS Headers, certain headers cannot be set manually when interacting with the [https.ServerResponse](section_4567653583.html) Objects sent by Suitelets. If a script attempts to set values for any of these headers, the system throws an `SSS_INVALID_HEADER` error. These headers are listed in the following table.

  - Allow
  - Content-Location
  - Content-MD5
  - Content-Range
  - Date

| 

  - Location
  - Proxy-Authenticate
  - Public-Key-Pins
  - Public-Key-Pins-Report-Only
  - Retry-After

| 

  - Server
  - Strict-Transport-Security
  - Upgrade-Insecure-Requests
  - Warning
  - WWW-Authenticate


---|---|---  

## N/https Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [https.SecureString](section_4418286676.html) |  Object |  Server scripts |  Encapsulates data that may be sent to a third-party using an HTTPS call.  
[https.ClientResponse](section_4567656083.html) |  Object (read-only) |  Server scripts |  Encapsulates the response to an HTTPS client request.  
[https.ServerRequest](section_4567655097.html) |  Object (read-only) |  Server scripts |  Encapsulates the HTTPS request information sent to an HTTPS server. For example, a request received by a Suitelet or RESTlet.  
[https.ServerResponse](section_4567653583.html) |  Object |  Server scripts |  Encapsulates the response from an HTTPS server to an HTTPS request. For example, a response from a Suitelet or RESTlet.  
Method |  [https.createSecretKey(options)](section_4418247967.html) |  Object |  Server scripts |  Creates a key for the contents of a credential field.  
[https.createSecureString(options)](section_4418247678.html) |  Object |  Server scripts |  Creates an [https.SecureString](section_4418286676.html) Object.  
[https.delete(options)](section_4567631039.html) |  [https.ClientResponse](section_4567656083.html) or [https.ServerResponse](section_4567653583.html) |  Client and server scripts |  Sends an HTTPS DELETE request and returns the response.  
[https.delete.promise(options)](section_4619548807.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS DELETE request asynchronously and returns the response.  
[https.get(options)](section_4567631366.html) |  [https.ClientResponse](section_4567656083.html) or [https.ServerResponse](section_4567653583.html) |  Client and server scripts |  Sends an HTTPS GET request and returns the response.  
[https.get.promise(options)](section_4619547935.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS GET request asynchronously and returns the response.  
[https.post(options)](section_4567628658.html) |  [https.ClientResponse](section_4567656083.html) or [https.ServerResponse](section_4567653583.html) |  Client and server scripts |  Sends an HTTPS POST request and returns the response.  
[https.post.promise(options)](section_4619553255.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS POST request asynchronously and returns the response.  
[https.put(options)](section_4567627984.html) |  [https.ClientResponse](section_4567656083.html) or [https.ServerResponse](section_4567653583.html) |  Client and server scripts |  Sends an HTTPS PUT request and returns the response.  
[https.put.promise(options)](section_4619558092.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS PUT asynchronously request and returns the response.  
[https.request(options)](section_4567630582.html) |  [https.ClientResponse](section_4567656083.html) or [https.ServerResponse](section_4567653583.html) |  Client and server scripts |  Sends an HTTPS request and returns the response. If a request fails, an error.SuiteScriptError is thrown.  
[https.request.promise(options)](section_4619550220.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS request asynchronously and returns the response. If a request fails, a Promise.reject is thrown with a parameter Error.  
[https.requestRestlet(options)](section_159139340774.html) |  [https.ClientResponse](section_4567656083.html) |  Server scripts |  Sends an HTTPS request to a RESTlet and returns the response. Authentication headers are automatically added. The RESTlet will execute with the same privileges as the calling script.  
[https.requestRestlet.promise(options)](article_95165853712.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS request to a Restlet and returns the response.  
[https.requestSuitelet(options)](section_44162330742.html) |  [https.ClientResponse](section_4567656083.html) |  Client and server scripts |  Sends an HTTPS request to a Suitelet and returns the response.  
[https.requestSuitelet.promise(options)](section_95100734176.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTPS request asynchronously to a Suitelet and returns the response.  
[https.requestSuiteTalkRest(options)](section_159139347369.html) |  [https.ClientResponse](section_4567656083.html) |  Server scripts |  Sends an HTTPS request to a SuiteTalk REST endpoint and returns the response. Authentication headers are automatically added.  
Enum |  [https.CacheDuration](section_4567627367.html) |  enum |  Server scripts |  Holds the string values for supported cache durations. Use this enum to set the value of the `type` parameter in [ServerResponse.setCdnCacheable(options)](section_4567652215.html).  
[https.Encoding](section_4612521061.html) |  enum |  Server scripts |  Holds the string values for supported encoding types. Use this enum to set the value of parameters in [SecureString.appendString(options)](section_460942016600.html), [SecureString.convertEncoding(options)](section_457542663573.html), [https.createSecureString(options)](section_4418247678.html).  
[https.HashAlg](section_1543504694.html) |  enum |  Server scripts |  Holds the string values for supported hashing algorithms. Use this enum to set the value of parameters in [SecureString.hash(options)](section_459472900389.html) and [SecureString.hmac(options)](section_459579406737.html).  
[https.Method](section_4567626997.html) |  enum |  Server scripts |  Holds the string values for supported HTTPS requests. Use this enum to set the value of `method` parameter in [https.request(options)](section_4567630582.html).  
[https.RedirectType](section_1494603145.html) |  enum |  Server scripts |  Holds the string values for supported NetSuite resources that you can redirect to. Use this enum to set the value of the `type` parameter for [ServerResponse.sendRedirect(options)](section_4567653054.html).  

## SecureString Object Members

SecureString functionality is supported only in server scripts.

The following members are called on the [https.SecureString](section_4418286676.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [SecureString.appendSecureString(options)](section_453662353515.html) |  [https.SecureString](section_4418286676.html) |  Server scripts |  Appends one [https.SecureString](section_4418286676.html) to another [https.SecureString](section_4418286676.html).  
[SecureString.appendString(options)](section_460942016600.html) |  [https.SecureString](section_4418286676.html) |  Server scripts |  Appends a string to a [https.SecureString](section_4418286676.html).  
[SecureString.convertEncoding(options)](section_457542663573.html) |  [https.SecureString](section_4418286676.html) |  Server scripts |  Converts the content of a [https.SecureString](section_4418286676.html) between two encodings.  
[SecureString.hash(options)](section_459472900389.html) |  [https.SecureString](section_4418286676.html) |  Server scripts |  Creates a hash for a [https.SecureString](section_4418286676.html).  
[SecureString.hmac(options)](section_459579406737.html) |  [https.SecureString](section_4418286676.html) |  Server scripts |  Creates an hmac for a [https.SecureString](section_4418286676.html).  
[SecureString.replaceString(options)](section_162190865586.html) |  [https.SecureString](section_4418286676.html) |  Server Scripts |  Replaces all occurrences of a pattern string inside a [https.SecureString](section_4418286676.html) with a replacement string.  

## ClientResponse Object Members

The following members are called on the [https.ClientResponse](section_4567656083.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ClientResponse.body](section_4567655965.html) |  string (read-only) |  Server scripts |  The response body.  
[ClientResponse.code](section_4567655849.html) |  number (read-only) |  Server scripts |  The response code.  
[ClientResponse.headers](section_4567655700.html) |  Object (read-only) |  Server scripts |  The response body.  

## ServerRequest Object Members

The following members are called on the [https.ServerRequest](section_4567655097.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ServerRequest.getLineCount(options)](section_4567655008.html) |  number |  Server scripts |  Returns the number of lines in a sublist.  
[ServerRequest.getSublistValue(options)](section_4567654796.html) |  string |  Server scripts |  Returns the value of a sublist line item.  
Property |  [ServerRequest.body](section_4567654549.html) |  string (read-only) |  Server scripts |  The server request body  
[ServerRequest.files](section_4567654371.html) |  Object (read-only) |  Server scripts |  The server request files represented as object in ID-file.File pair.  
[ServerRequest.headers](section_4567654177.html) |  Object (read-only) |  Server scripts |  The server request headers.  
[ServerRequest.method](section_4567654020.html) |  [https.Method](section_4567626997.html) |  Server scripts |  The HTTPS method for the server request.  
[ServerRequest.parameters](section_4567653880.html) |  Object (read-only) |  Server scripts |  The server request parameters.  
[ServerRequest.url](section_4567653744.html) |  string (read-only) |  Server scripts |  The server request URL.  

## ServerResponse Object Members

The following members are called on the [https.ServerResponse](section_4567653583.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ServerResponse.addHeader(options)](section_4567653484.html) |  void |  Server scripts |  Adds a header to the response.  
[ServerResponse.getHeader(options)](section_4567653267.html) |  string | string[] |  Server scripts |  Returns the value of a response header.  
[ServerResponse.renderPdf(options)](section_4567652460.html) |  void |  Server scripts |  Generates and renders a PDF directly to the response.  
[ServerResponse.sendRedirect(options)](section_4567653054.html) |  void |  Server scripts |  Sets the redirect URL by resolving to a NetSuite resource.  
[ServerResponse.setCdnCacheable(options)](section_4567652215.html) |  void |  Server scripts |  Sets CDN caching for a period of time.  
[ServerResponse.setHeader(options)](section_4567652689.html) |  void |  Server scripts |  Sets the value of a response header.  
[ServerResponse.write(options)](section_4567651956.html) |  void |  Server scripts |  Writes information (text/xml/html) to the response.  
[ServerResponse.writeFile(options)](section_4567633001.html) |  void |  Server scripts |  Writes a file to the response.  
[ServerResponse.writeLine(options)](section_4567632751.html) |  void |  Server scripts |  Writes line information (text/xml/html) to the response.  
[ServerResponse.writePage(options)](section_4567632500.html) |  void |  Server scripts |  Generates a page.  
Property |  [ServerResponse.headers](section_4567631816.html) |  Object (read-only) |  Server scripts |  The server response headers.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
