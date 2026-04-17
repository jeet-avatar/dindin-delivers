# N/search — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4345764122.html
> Module: N/search
> Version: SuiteScript 2.x / 2.1

# N/search Module

Use the N/search module to create and run on-demand or saved searches, then analyze and work through the results. With this module, you can do things like:

  - Search for a single record using keywords

  - Create and save searches

  - Load and run saved searches

  - Search for duplicate records

  - Return a set of records that match your defined filter criteria


You can also paginate results and add navigation to jump between pages. This makes it great for handling large result sets.

Important: 

The N/search module doesn't work in unauthenticated client-side contexts. For details, see the SuiteAnswers [Outbound HTTPs in an unauthenticated client-side context](https://suiteanswers.custhelp.com/app/answers/detail/a_id/1013055).

  [   ](/app/help/helpcenter.nl?fid=section_0304061100)                                

## In This Help Topic

  - N/search Module Members

  - Column Object Members

  - Filter Object Members

  - Page Object Members

  - PagedData Object Members

  - PageRange Object Members

  - Result Object Members

  - ResultSet Object Members

  - Search Object Members

  - Setting Object Members


## N/search Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [search.Column](section_4345767216.html) |  Object |  Client and server scripts |  Encapsulates a single search column in a [search.Search](section_4392315904.html) object. Use the methods and properties available to the Column object to get or set Column properties.  
[search.Filter](section_4345767603.html) |  Object |  Client and server scripts |  Encapsulates a search filter used in a search. Use the properties for the Filter object to get and set the filter properties.  
[search.Page](section_4486547978.html) |  Object |  Client and server scripts |  Encapsulates a set of search results for a single search page.  
[search.PagedData](section_4486558900.html) |  Object |  Client and server scripts |  Holds metadata about a paginated query.  
[search.PageRange](section_4486559010.html) |  Object |  Client and server scripts |  Defines the page range to bound the result set for a paginated query.  
[search.Result](section_4345767112.html) |  Object |  Client and server scripts |  Encapsulate a single search result row. Use the methods and properties for the Result object to get the column values for the result row.  
[search.ResultSet](section_4345767679.html) |  Object |  Client and server scripts |  Encapsulates a set of search results returned by [Search.run()](section_452292724609.html).  
[search.Search](section_4392315904.html) |  Object |  Client and server scripts |  Encapsulates a NetSuite search. Use the methods available to the Search object to create a search, run a search, or save a search.  
[search.Setting](section_1536244919.html) |  Object |  Client and server scripts |  Encapsulates a search setting. Search settings let you specify search parameters that are typically available only in the UI.  
Method |  [search.create(options)](section_4345171487.html) |  [search.Search](section_4392315904.html) |  Client and server scripts |  Creates a new search and returns it as a [search.Search](section_4392315904.html) object.  
[search.create.promise(options)](section_4440790350.html) |  [search.Search](section_4392315904.html) |  Client and server scripts |  Creates a new search asynchronously and returns it as a [search.Search](section_4392315904.html) object.  
[search.createColumn(options)](section_4345776927.html) |  [search.Column](section_4345767216.html) |  Client and server scripts |  Creates a new search column as a [search.Column](section_4345767216.html) object.  
[search.createFilter(options)](section_4345777107.html) |  [search.Filter](section_4345767603.html) |  Client and server scripts |  Creates a new search filter as a [search.Filter](section_4345767603.html) object.  
[search.createSetting(options)](section_1536171305.html) |  [search.Setting](section_1536244919.html) |  Client and server scripts |  Creates a new search setting and returns it as a [search.Setting](section_1536244919.html) object.  
[search.delete(options)](section_4345775501.html) |  void |  Client and server scripts |  Deletes an existing saved search asynchronously and returns it as a [search.Search](section_4392315904.html) object.  
[search.delete.promise(options)](section_4440793315.html) |  void |  Client and server scripts |  Deletes an existing saved search and returns it as a [search.Search](section_4392315904.html) object.  
[search.duplicates(options)](section_4345775593.html) |  [search.Result](section_4345767112.html)[] |  Client and server scripts |  Performs a search for duplicate records based on the duplicate detection configuration for the account. Returns an array of [search.Result](section_4345767112.html) objects.  
[search.duplicates.promise(options)](section_4440793863.html) |  [search.Result](section_4345767112.html)[] |  Client and server scripts |  Performs a search for duplicate records asynchronously based on the duplicate detection configuration for the account. Returns an array of [search.Result](section_4345767112.html) objects.  
[search.global(options)](section_4345775747.html) |  [search.Result](section_4345767112.html)[] |  Client and server scripts |  Performs a global search against a single keyword or multiple keywords.  
[search.global.promise(options)](section_4440794809.html) |  [search.Result](section_4345767112.html)[] |  Client and server scripts |  Performs a global search asynchronously against a single keyword or multiple keywords.  
[search.load(options)](section_4345775360.html) |  [search.Search](section_4392315904.html) |  Client and server scripts |  Loads an existing saved search and returns it as a [search.Search](section_4392315904.html) object.  
[search.load.promise(options)](section_4440792540.html) |  [search.Search](section_4392315904.html) |  Client and server scripts |  Loads an existing saved search asynchronously and returns it as a [search.Search](section_4392315904.html) object.  
[search.lookupFields(options)](section_4345776651.html) |  Object | array |  Client and server scripts |  Performs a search for one or more body fields on a record. Returns select fields as an object with value and text properties. Returns multiselect fields as an object with value:text pairs.  
[search.lookupFields.promise(options)](section_4440795405.html) |  Object | array |  Client and server scripts |  Performs a search asynchronously for one or more body fields on a record. Returns select fields as an object with value and text properties. Returns multiselect fields as an object with value:text pairs.  
Enum |  [search.Operator](section_4345782273.html) |  enum |  Client and server scripts |  Holds the values for search operators to use with the [search.Filter](section_4345767603.html).  
[search.Sort](section_4486581209.html) |  enum |  Client and server scripts |  Holds the values for supported sorting directions used with [search.createColumn(options)](section_4345776927.html).  
[search.Summary](section_4345777923.html) |  enum |  Client and server scripts |  Holds the values for summary types used by the [Column.summary](section_455339294433.html) object.  
[search.Type](section_4483165708.html) |  enum |  Client and server scripts |  Holds the string values for search types supported in the [N/search Module](section_4345764122.html). Use this enum to set the value for the `options.type` parameter of the [search.create(options)](section_4345171487.html) method.  

## Column Object Members

The following members are available for a [search.Column](section_4345767216.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Column.setWhenOrderedBy(options)](section_457130065917.html) |  [search.Column](section_4345767216.html) |  Client and server scripts |  Returns the search column for which the minimal or maximal value should be found when returning the [search.Column](section_4345767216.html) value.  
Property |  [Column.formula](section_454645935058.html) |  string |  Client and server scripts |  Formula used for a search column as a string.  
[Column.function](section_453268676757.html) |  string |  Client and server scripts |  Special function used in the search column as a string.  
[Column.join](section_460655456542.html) |  string (read-only) |  Client and server scripts |  Join ID for a search column as a string.  
[Column.label](section_459848266600.html) |  string |  Client and server scripts |  Label used for the search column. You can only get or set custom labels with this property.  
[Column.name](section_456729370116.html) |  string (read-only) |  Client and server scripts |  Name of a search column as a string.  
[Column.summary](section_455339294433.html) |  string (read-only) |  Client and server scripts |  Returns the summary type for a search column.  

## Filter Object Members

The following members are available for a [search.Filter](section_4345767603.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Filter.formula](section_46683898925.html) |  string |  Client and server scripts |  Formula used by the search filter.  
[Filter.join](section_460736328124.html) |  string (read-only) |  Client and server scripts |  Join ID for the search filter.  
[Filter.name](section_459893737792.html) |  string (read-only) |  Client and server scripts |  Name or internal ID of the search field.  
[Filter.operator](section_452460571288.html) |  string (read-only) |  Client and server scripts |  Operator used for the search filter.  
[Filter.summary](section_46485229492.html) |  [search.Summary](section_4345777923.html) |  Client and server scripts |  Summary type for the search filter.  

## Page Object Members

The following members are available for a [search.Page](section_4486547978.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Page.next()](section_4486605324.html) |  void |  Client and server scripts |  Gets the next segment of data from a paginated search  
[Page.next.promise()](section_4492410539.html) |  void |  Client scripts |  Asynchronously gets the next segment of data from a paginated search  
[Page.prev()](section_4486606245.html) |  void |  Client and server scripts |  Gets the previous segment of data from a paginated search  
[Page.prev.promise()](section_4492410589.html) |  void |  Client scripts |  Asynchronously gets the previous segment of data from a paginated search  
Property |  [Page.data](section_4486604985.html) |  [search.Result](section_4345767112.html)[] |  Client and server scripts |  The results from a paginated search.  
[Page.isFirst](section_4486603498.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether a page is the first page of data for a result set  
[Page.isLast](section_4486603745.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether a page is the last page of data for a result set.  
[Page.pagedData](section_4486604468.html) |  [search.PagedData](section_4486558900.html) (read-only) |  Client and server scripts |  The `PagedData` Object used to fetch this `Page` Object.  
[Page.pageRange](section_4486602257.html) |  [search.PageRange](section_4486559010.html) (read-only) |  Client and server scripts |  The `PageRange` Object used to fetch this `Page` Object.  

## PagedData Object Members

The following members are available for a [search.PagedData](section_4486558900.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [PagedData.fetch(options)](section_4486609298.html) |  [search.Page](section_4486547978.html) |  Client and server scripts |  Retrieves the data within the specified page range.  
[PagedData.fetch.promise()](section_4491674556.html) |  [search.Page](section_4486547978.html) |  Client scripts |  Asynchronously retrieves the data within the specified page range.  
Property |  [PagedData.count](section_4486607957.html) |  number (read-only) |  Client and server scripts |  The total number of results when [Search.runPaged(options)](section_4486596158.html) was executed.  
[PagedData.pageRanges](section_4486608251.html) |  [search.PageRange](section_4486559010.html)[] (read-only) |  Client and server scripts |  The collection of PageRange objects that divide the entire result set into smaller groups.  
[PagedData.pageSize](section_4486608636.html) |  number (read-only) |  Client and server scripts |  The maximum number of entries per page  
[PagedData.searchDefinition](section_4486608824.html) |  [search.Search](section_4392315904.html) (read-only) |  Client and server scripts |  The search criteria used when [Search.runPaged(options)](section_4486596158.html) was executed.  

## PageRange Object Members

The following members are available for a [search.PageRange](section_4486559010.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PageRange.compoundLabel](section_4486607482.html) |  string (read-only) |  Client and server scripts |  Human-readable label with beginning and ending range identifiers  
[PageRange.index](section_4486606935.html) |  number (read-only) |  Client and server scripts |  The index of this page range.  

## Result Object Members

The following members are available for a [search.Result](section_4345767112.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Result.getText(column)](section_460663391112.html) |  string |  Client and server scripts |  The text value for a [search.Column](section_4345767216.html) if it is a stored select field.  
[Result.getText(options)](section_456658264159.html) |  string |  Client and server scripts |  The UI display name, or text value, for a search result column. This method is supported only for non-stored select, image, and document fields.  
[Result.getValue(options)](section_46917053222.html) |  string |  Client and server scripts |  Used on formula fields and non-formula (standard) fields to get the value of a specified search return column.  
[Result.getValue(column)](section_46988464355.html) |  string |  Client and server scripts |  Used on formula and non-formula (standard) fields. Returns the string value of a specified search result column. For convenience, this method takes a single [search.Column](section_4345767216.html) Object.  
Property |  [Result.columns](section_452222534179.html) |  [search.Column](section_4345767216.html)[] |  Client and server scripts |  Array of [search.Column](section_4345767216.html) objects that encapsulate the columns returned in the search result row.  
[Result.id](section_454656921386.html) |  string (read-only) |  Client and server scripts |  The internal ID for the record returned in a search result row.  
[Result.recordType](section_456526428222.html) |  string (read-only) |  Client and server scripts |  The type of record returned in a search result row.  

## ResultSet Object Members

The following members are available for a [search.ResultSet](section_4345767679.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ResultSet.each(callback)](section_457160888671.html) |  void |  Client and server scripts |  Use a developer-defined function to invoke on each row in the search results, up to 4000 results at a time.  
[ResultSet.each.promise(callback)](section_4629990761.html) |  void |  Client scripts |  Asynchronously use a developer-defined function to invoke on each row in the search results, up to 4000 results at a time.  
[ResultSet.getRange(options)](section_456010986327.html) |  [search.Result](section_4345767112.html)[] |  Client and server scripts |  Retrieve a slice of the search result as an array of [search.Result](section_4345767112.html) objects.  
[ResultSet.getRange.promise(options)](section_4629921431.html) |  [search.Result](section_4345767112.html)[] |  Client scripts |  Asynchronously retrieve a slice of the search result as an array of [search.Result](section_4345767112.html) objects.  
Property |  [ResultSet.columns](section_456520019530.html) |  [search.Column](section_4345767216.html)[] |  Client and server scripts |  An array of [search.Column](section_4345767216.html) objects that represent the columns returned in the search results.  

## Search Object Members

The following members are available for a [search.Search](section_4392315904.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Search.run()](section_452292724609.html) |  [search.ResultSet](section_4345767679.html) |  Client and server scripts |  Runs an on demand search created with [search.create(options)](section_4345171487.html) or a search loaded with [search.load(options)](section_4345775360.html), returning the results as a [search.ResultSet](section_4345767679.html).  
[Search.runPaged(options)](section_4486596158.html) |  [search.PagedData](section_4486558900.html) |  Client and server scripts |  Runs the current search and returns a [search.PagedData](section_4486558900.html) Object.  
[Search.runPaged.promise(options)](section_4492428680.html) |  [search.PagedData](section_4486558900.html) |  Client and server scripts |  Asynchronously runs the current search and returns a [search.PagedData](section_4486558900.html) Object.  
[Search.save()](section_452655578613.html) |  number |  Client and server scripts |  Saves a search created by [search.create(options)](section_4345171487.html) or loaded with [search.load(options)](section_4345775360.html). Returns the internal ID of the saved search.  
[Search.save.promise()](section_4440796572.html) |  number |  Client and server scripts |  Asynchronously saves a search created by [search.create(options)](section_4345171487.html) or loaded with [search.load(options)](section_4345775360.html). Returns the internal ID of the saved search.  
Property |  [Search.columns](section_456374450683.html) |  [search.Column](section_4345767216.html)[] | string[] |  Client and server scripts |  Columns to return for this search as an array of [search.Column](section_4345767216.html) objects or a string array of column names.  
[Search.filterExpression](section_458440490721.html) |  Object[] |  Client and server scripts |  Search filter expression for the search as an array of expression objects.  
[Search.filters](section_459415222167.html) |  [search.Filter](section_4345767603.html)[] |  Client and server scripts |  Filters for the search as an array of [search.Filter](section_4345767603.html) objects.  
[Search.id](section_455917297362.html) |  string |  Client and server scripts |  Script ID for a saved search, starting with `customsearch`.  
[Search.isPublic](section_460638366698.html) |  boolean |  Client and server scripts |  Value is `true` if the search is public, or `false` if it is not.  
[Search.packageId](section_156336419831.html) |  string |  Client and server scripts |  The application ID for the search.  
[Search.searchId](section_458892150878.html) |  number |  Client and server scripts |  Internal ID of a search.  
[Search.searchType](section_459534851073.html) |  string |  Client and server scripts |  Search type on which a search is based.  
[Search.settings](section_1536244062.html) |  [search.Setting](section_1536244919.html)[] | string[] |  Client and server scripts |  Search settings for this search as an array of [search.Setting](section_1536244919.html) objects or a string array of column names.  
[Search.title](section_458807006835.html) |  string |  Client and server scripts |  Title for a saved search. Use this property to set the title for a search before you save it for the first time.  

## Setting Object Members

The following members are available for a [search.Setting](section_1536244919.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Setting.name](section_1536177181.html) |  string (read-only) |  Client and server scripts |  The name of the search parameter.  
[Setting.value](section_1536177235.html) |  string (read-only) |  Client and server scripts |  The value of the search parameter.  

### Related Support Article

  - [SuiteScript 2.0 > N/search Module > Add a Filter on a Loaded Search Record](https://suiteanswers.custhelp.com/app/answers/detail/a_id/86511)


### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
