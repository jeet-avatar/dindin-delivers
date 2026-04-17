# N/http — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4296361104.html
> Module: N/http
> Version: SuiteScript 2.x / 2.1

# N/http Module

Use the N/http module to make HTTP calls from server or client scripts. For client scripts, this module also provides the ability to make cross-domain HTTP requests using NetSuite servers as proxies.

All HTTP content types are supported.

  [   ](/app/help/helpcenter.nl?fid=section_0305041202)                                

Note: 

The N/http module does not accept the HTTPS protocol. Use the [N/https Module](section_4418229131.html) for that purpose.

## In This Help Topic

  - HTTP Header Information

  - N/http Module Members

  - ClientResponse Object Members

  - ServerRequest Object Members

  - ServerResponse Object Members


## HTTP Header Information

HTTP headers can be used to pass additional information with an HTTP request or response. Each HTTP header consists of its case-insensitive name followed by a colon (:), then by its value (without line breaks). If you use custom headers, make sure the names of these headers do not contain underscores. For a general list of all HTTP headers, visit [http://developer.mozilla.org/en-US/docs/Web/HTTP/Headers.](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

Some headers are not supported in NetSuite and are blocked. These are listed below as either general HTTP headers or Suitelet response headers.

### General Blocked HTTP Headers

Be aware that certain headers cannot be set manually when using the N/http module methods. If a script attempts to set values for any of the following headers, the values are discarded. These headers are listed in the following table.

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

### Suitelet Response HTTP Header Blocklist

In addition to the headers described in General Blocked HTTP Headers, certain headers cannot be set manually when interacting with the [http.ServerResponse](section_4314609319.html) Objects sent by Suitelets. If a script attempts to set values for any of these headers, the system throws an SSS_INVALID_HEADER error. These headers are listed in the following table.

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

## N/http Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [http.ClientResponse](section_4299069814.html) |  Object (read-only) |  Server scripts |  The response from the server to an HTTP client request (for example, [http.get(options)](section_4426024767.html)).  
[http.ServerRequest](section_4314608702.html) |  Object (read-only) |  Server scripts |  HTTP request information sent to an HTTP server. For example, a request sent to/received by a Suitelet or RESTlet.  
[http.ServerResponse](section_4314609319.html) |  Object |  Server scripts |  The response from an HTTP server to an HTTP request. For example, a response from a Suitelet or RESTlet.  
Method |  [http.delete(options)](section_4426024970.html) |  [http.ClientResponse](section_4299069814.html) or [http.ServerResponse](section_4314609319.html) |  Client and server scripts |  Sends an HTTP DELETE request and returns the response.  
[http.delete.promise(options)](section_4440810687.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTP DELETE request asynchronously and returns the response.  
[http.get(options)](section_4426024767.html) |  [http.ClientResponse](section_4299069814.html) or [http.ServerResponse](section_4314609319.html) |  Client and server scripts |  Sends an HTTP GET request and returns the response.  
[http.get.promise(options)](section_4440810374.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTP GET request asynchronously and returns the response.  
[http.post(options)](section_4426024574.html) |  [http.ClientResponse](section_4299069814.html) or [http.ServerResponse](section_4314609319.html) |  Client and server scripts |  Sends an HTTP POST request and returns the response.  
[http.post.promise(options)](section_4440816463.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTP POST request asynchronously and returns the response.  
[http.put(options)](section_4426024367.html) |  [http.ClientResponse](section_4299069814.html) or [http.ServerResponse](section_4314609319.html) |  Client and server scripts |  Sends an HTTP PUT request and returns the response.  
[http.put.promise(options)](section_4440817389.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTP PUT request asynchronously and returns the response.  
[http.request(options)](section_4426024227.html) |  [http.ClientResponse](section_4299069814.html) or [http.ServerResponse](section_4314609319.html) |  Client and server scripts |  Sends an HTTP request and returns the response.  
[http.request.promise(options)](section_4440816259.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Sends an HTTP request asynchronously and returns the response.  
Enum |  [http.CacheDuration](section_4426027147.html) |  enum |  Server scripts |  Holds the string values for supported cache durations. Use this enum to set the value of the `type` parameter in [ServerResponse.setCdnCacheable(options)](section_4426015213.html).  
[http.Method](section_4426027649.html) |  enum |  Server scripts |  Holds the string values for supported HTTP requests. Use this enum to set the value of `method` parameter in [http.request(options)](section_4426024227.html).  
[http.RedirectType](section_1492804577.html) |  enum |  Server scripts |  Holds the string values for supported NetSuite resources that you can redirect to. Use this enum to set the value of the `type` parameter for [ServerResponse.sendRedirect(options)](section_4315616450.html).  

## ClientResponse Object Members

The following members are called on the [http.ClientResponse](section_4299069814.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ClientResponse.body](section_4314733286.html) |  string (read-only) |  Server scripts |  The client response body.  
[ClientResponse.code](section_4314732346.html) |  number (read-only) |  Server scripts |  The client response code.  
[ClientResponse.headers](section_4314733103.html) |  Object (read-only) |  Server scripts |  The client response headers.  

## ServerRequest Object Members

The following members are called on the [http.ServerRequest](section_4314608702.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ServerRequest.getLineCount(options)](section_4314815897.html) |  number |  Server scripts |  Returns the number of lines in a sublist.  
[ServerRequest.getSublistValue(options)](section_4314828231.html) |  string |  Server scripts |  Returns the value of a sublist line item.  
Property |  [ServerRequest.body](section_4314806583.html) |  string (read-only) |  Server scripts |  The server request body.  
[ServerRequest.files](section_4314805947.html) |  Object (read-only) |  Server scripts |  The server request files.  
[ServerRequest.headers](section_4314803549.html) |  Object (read-only) |  Server scripts |  The server request headers.  
[ServerRequest.clientIpAddress](section_158232403519.html) |  String (read-only) |  Server scripts |  The remote client IP address.  
[ServerRequest.method](section_4314807135.html) |  [http.Method](section_4426027649.html) |  Server scripts |  The server request HTTP method.  
[ServerRequest.parameters](section_4314803781.html) |  Object (read-only) |  Server scripts |  The server request parameters.  
[ServerRequest.url](section_4314807784.html) |  string (read-only) |  Server scripts |  The server request URL.  

## ServerResponse Object Members

The following members are called on the [http.ServerResponse](section_4314609319.html) Object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ServerResponse.addHeader(options)](section_4315356945.html) |  void |  Server scripts |  Adds a header to the response.  
[ServerResponse.getHeader(options)](section_4321649843.html) |  string | string[] |  Server scripts |  Returns the value of a response header.  
[ServerResponse.renderPdf(options)](section_4426014776.html) |  void |  Server scripts |  Generates and renders a PDF directly to the response.  
[ServerResponse.sendRedirect(options)](section_4315616450.html) |  void |  Server scripts |  Sets the redirect URL by resolving to a NetSuite resource.  
[ServerResponse.setCdnCacheable(options)](section_4426015213.html) |  void |  Server scripts |  Sets CDN caching for a period of time.  
[ServerResponse.setHeader(options)](section_4315325840.html) |  void |  Server scripts |  Sets the value of a response header.  
[ServerResponse.write(options)](section_4316382571.html) |  void |  Server scripts |  Writes information (text, xml, html) to the response.  
[ServerResponse.writeFile(options)](section_4426015540.html) |  void |  Server scripts |  Writes a file to the response.  
[ServerResponse.writeLine(options)](section_4316493873.html) |  void |  Server scripts |  Writes line information (text, xml, html) to the response.  
[ServerResponse.writePage(options)](section_4426014272.html) |  void |  Server scripts |  Generates a page.  
Property |  [ServerResponse.headers](section_4314846555.html) |  Object (read-only) |  Server scripts |  The server response headers.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
