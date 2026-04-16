# N/query (SuiteQL) Governance

> Source: Oracle NetSuite Official Documentation
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1510275060.html
> Category: SuiteScript 2.x Reference

# N/query Module

Use the N/query module to create and run queries using the SuiteAnalytics Workbook query process. For more information about SuiteAnalytics Workbook, see [SuiteAnalytics Workbook Overview](chapter_1503949328.html).

  [   ](/app/help/helpcenter.nl?fid=section_0304035624)                                

Using the query module, you can:

  - Use multilevel joins to create queries using field data from multiple record types.

  - Create conditions (filters) using AND, OR, and NOT logic, as well as formulas and relative dates.

  - Sort query results based on the values of multiple columns.

  - Load and delete existing saved queries that were created using the SuiteAnalytics Workbook interface.

  - View paged query results.

  - Use promises for asynchronous .

  - Convert query objects to SuiteQL queries and run arbitrary SuiteQL queries.


For more information about creating scripts using the N/query module, see the following help topics:

  - [Scripting with the N/query Module](section_1532440865.html)

  - [Formulas in the N/query Module](section_1536750827.html)

  - [Relative Dates in the N/query Module](section_1549916938.html)

  - [SuiteQL in the N/query Module](section_157960623712.html)


Important: 

As you use the N/query module, keep the following considerations in mind:

  - The N/query module lets you create and run queries using the SuiteAnalytics Workbook query process. You can load and delete existing queries, but you can't save queries with this module. To save queries, use the SuiteAnalytics Workbook interface. For details, see [Navigating SuiteAnalytics Workbook](chapter_1544220943.html).

  - The N/query module uses a different data source than N/search. To find record types or field IDs for filters or result columns, use the Records Catalog (not the SuiteScript Records Browser). The Records Catalog lists everything available for SuiteAnalytics Workbook and N/query. For more, see [Records Catalog Overview](article_159367781370.html).

  - The N/query module doesn't work in unauthenticated client-side contexts. For details, see the SuiteAnswers article [Outbound HTTPs in an unauthenticated client-side context](https://suiteanswers.custhelp.com/app/answers/detail/a_id/1013055).


## In This Help Topic

  - N/query Module Members

  - Column Object Members

  - Component Object Members

  - Condition Object Members

  - Page Object Members

  - PagedData Object Members

  - PageRange Object Members

  - Query Object Members

  - RelativeDate Object Members

  - Result Object Members

  - ResultSet Object Members

  - Sort Object Members

  - SuiteQL Object Members


## N/query Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [query.Column](section_1510779196.html) |  Object |  Client and server scripts |  The field types (query result columns) that are displayed from the query results. Use [Query.createColumn(options)](section_1510780373.html) or [Component.createColumn(options)](section_1510784945.html) to create this object.  
[query.Component](section_1510779141.html) |  Object |  Client and server scripts |  One component of the query definition. The query definition always contains at least one component that encapsulates the initial query type. Queries with joins contain multiple components that encapsulate the join relationships. The initial component ([Query.root](section_1510781874.html)) is automatically created with the query definition ([query.Query](section_1510275177.html)). Use [Query.autoJoin(options)](section_1530819144.html) or [Component.autoJoin(options)](section_1530818573.html) to create subsequent components.  
[query.Condition](section_1510779210.html) |  Object |  Client and server scripts |  A condition. A condition narrows the query results. Use [Query.createCondition(options)](section_1510780329.html) or [Component.createCondition(options)](section_1510784922.html) to create this object.  
[query.Page](section_1510779287.html) |  Object |  Client and server scripts |  One page of the paged query results.  
[query.PagedData](section_1510779273.html) |  Object |  Client and server scripts |  A set of paged query results. This object also contains information about the set of paged results it encapsulates.  
[query.PageRange](section_1510779296.html) |  Object |  Client and server scripts |  A range of pages from the paged query results.  
[query.Period](section_158289614570.html) |  Object |  Client and server scripts |  A period of time to use in query conditions.  
[query.RelativeDate](section_1544109440.html) |  Object |  Client and server scripts |  A relative date to use in query conditions.  
[query.Result](section_1510779258.html) |  Object |  Client and server scripts |  A single row of the query result set.  
[query.ResultSet](section_1510779235.html) |  Object |  Client and server scripts |  The set of results returned by the query.  
[query.Query](section_1510275177.html) |  Object |  Client and server scripts |  The query definition. Use [query.create(options)](section_1510275581.html) or [query.load(options)](section_1510349101.html) to create this object. Important:  The creation of this object is the first step in creating a query with the [N/query Module](section_1510275060.html).  
[query.Sort](section_1510779222.html) |  Object |  Client and server scripts |  A sort that is placed on a particular query result column. Use [Query.createSort(options)](section_1510780402.html) or [Component.createSort(options)](section_1510785047.html) to create this object.  
[query.SuiteQL](section_157960384819.html) |  Object |  Client and server scripts |  A SuiteQL query. Use [Query.toSuiteQL()](section_157960522744.html) to create this object.  
Method |  [query.create(options)](section_1510275581.html) |  [query.Query](section_1510275177.html) |  Client and server scripts |  Creates the query definition. Important:  The invocation of this method is the first step in creating a query with the [N/query Module](section_1510275060.html).  
[query.createPeriod(options)](section_158289670344.html) |  [query.Period](section_158289614570.html) |  Client and server scripts |  Creates a [query.Period](section_158289614570.html) object that represents a period of time.  
[query.createRelativeDate(options)](section_1544108154.html) |  [query.RelativeDate](section_1544109440.html) |  Client and server scripts |  Creates a [query.RelativeDate](section_1544109440.html) object that represents a date relative to the current date.  
[query.delete(options)](section_1530819817.html) |  void |  Client and server scripts |  Deletes an existing query that was created using the SuiteAnalytics Workbook UI. The deleted query is no longer available and cannot be modified or executed.  
[query.listTables(options)](section_158289760700.html) |  <Object> |  Client and server scripts |  Lists the table view objects that are included in a workbook in SuiteAnalytics Workbook.  
[query.load(options)](section_1510349101.html) |  [query.Query](section_1510275177.html) |  Client and server scripts |  Loads an existing query that was created using the SuiteAnalytics Workbook UI. The loaded query can be modified (for example, by setting additional property values), joined with other query types, and executed in the same way as queries created using [query.create(options)](section_1510275581.html).  
[query.load.promise(options)](section_1552419444.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Asynchronously loads an existing query that was created using the SuiteAnalytics Workbook UI.  
[query.runSuiteQL(options)](section_157960542026.html) |  [query.ResultSet](section_1510779235.html) |  Client and server scripts |  Runs an arbitrary SuiteQL query.  
[query.runSuiteQL.promise(options)](article_0429104416.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Asynchronously runs an arbitrary SuiteQL query.  
[query.runSuiteQLPaged(options)](section_157960586441.html) |  [query.PagedData](section_1510779273.html) |  Client and server scripts |  Runs an arbitrary SuiteQL query as a paged query.  
[query.runSuiteQLPaged.promise(options)](section_0429112941.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Asynchronously runs an arbitrary query as a paged query.  
Enum |  [query.Aggregate](section_1510878932.html) |  enum |  Client and server scripts |  Holds the string values for aggregate functions supported with the [N/query Module](section_1510275060.html). This enum is used to pass the aggregate function argument to [Component.createColumn(options)](section_1510784945.html), [Component.createCondition(options)](section_1510784922.html), [Query.createColumn(options)](section_1510780373.html), and [Query.createCondition(options)](section_1510780329.html).  
[query.DateId](section_1544111587.html) |  enum |  Client and server scripts |  Holds the string values for supported date codes in relative dates. This enum is used to pass the date ID argument to [query.createRelativeDate(options)](section_1544108154.html).  
[query.FieldContext](section_1552071599.html) |  enum |  Client and server scripts |  Holds the string values for the field context to use when creating a column. This enum is used to pass the context argument to [Query.createColumn(options)](section_1510780373.html) and [Component.createColumn(options)](section_1510784945.html).  
[query.Operator](section_1510275752.html) |  enum |  Client and server scripts |  Holds the string values for operators supported with the [N/query Module](section_1510275060.html). This enum is used to pass the operator argument to [Query.createCondition(options)](section_1510780329.html) and [Component.createCondition(options)](section_1510784922.html).  
[query.PeriodAdjustment](section_158289865548.html) |  enum |  Client and server scripts |  Holds the string values for adjustment types for a period. This enum is used to pass the adjustment argument to [query.createPeriod(options)](section_158289670344.html).  
[query.PeriodCode](section_158289876878.html) |  enum |  Client and server scripts |  Holds the string values for period codes for a period. This enum is used to pass the code argument to [query.createPeriod(options)](section_158289670344.html).  
[query.PeriodType](section_158289949288.html) |  enum |  Client and server scripts |  Holds the string values for period types for a period. This enum is used to pass the type argument to [query.createPeriod(options)](section_158289670344.html).  
[query.RelativeDateRange](section_1544111773.html) |  enum |  Client and server scripts |  Holds [query.RelativeDate](section_1544109440.html) object values for supported date ranges in relative dates. This enum is used to pass the values argument to [Query.createCondition(options)](section_1510780329.html) and [Component.createCondition(options)](section_1510784922.html).  
[query.ReturnType](section_1510878969.html) |  enum |  Client and server scripts |  Holds the string values for the formula return types supported with the [N/query Module](section_1510275060.html). This enum is used to pass the formula return type argument to [Query.createColumn(options)](section_1510780373.html), [Component.createColumn(options)](section_1510784945.html), [Query.createCondition(options)](section_1510780329.html), and [Component.createCondition(options)](section_1510784922.html).  
[query.SortLocale](section_1530819885.html) |  enum |  Client and server scripts |  Holds the string values for sort locales supported with the [N/query Module](section_1510275060.html). This enum is used to pass the sort locale argument to [Query.createSort(options)](section_1510780402.html) and [Component.createSort(options)](section_1510785047.html).  
[query.Type](section_1510878994.html) |  enum |  Client and server scripts |  Holds the string values for supported query types used in the query definition. This enum is used to pass the initial query type argument to [query.create(options)](section_1510275581.html).  

## Column Object Members

The following members are available for a [query.Column](section_1510779196.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Column.aggregate](section_1510789115.html) |  string (read-only) |  Client and server scripts |  An aggregate function that is performed on the query result column. An aggregate function performs a calculation on the column values and returns a single value.  
[Column.alias](section_156336566313.html) |  string (read-only) |  Client and server scripts |  An alias for this column. An alias is an alternate name for a column, and the alias is used in mapped results.  
[Column.component](section_1510789028.html) |  [query.Component](section_1510779141.html) (read-only) |  Client and server scripts |  A reference to the [query.Component](section_1510779141.html) object to which this query result column belongs.  
[Column.context](section_1544109085.html) |  Object (read-only) |  Client and server scripts |  The field context for values in the query result column. The field context determines how field values are displayed in the column.  
[Column.fieldId](section_1510788976.html) |  string (read-only) |  Client and server scripts |  The name of the query result column. This property and the [Column.formula](section_1510789062.html) property cannot be set at the same time.  
[Column.formula](section_1510789062.html) |  string (read-only) |  Client and server scripts |  The formula used to create the query result column. This property and the [Column.fieldId](section_1510788976.html) property cannot be set at the same time.  
[Column.groupBy](section_1510789147.html) |  (read-only) |  Client and server scripts |  Whether the query results are grouped by this query result column.  
[Column.label](section_158291894456.html) |  string (read-only) |  Client and server scripts |  The label for the column.  
[Column.type](section_1510789090.html) |  string (read-only) |  Client and server scripts |  The return type of the formula used to create the query result column.  

## Component Object Members

The following members are available for a [query.Component](section_1510779141.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Component.autoJoin(options)](section_1530818573.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates a join relationship. After you create the initial query definition, use [Query.autoJoin(options)](section_1530819144.html) to create your first join. Then use this method to create each subsequent join. This method selects the correct join type automatically based on the record types that are being joined.  
[Component.createColumn(options)](section_1510784945.html) |  [query.Column](section_1510779196.html) |  Client and server scripts |  Creates a query result column based on the component. Use this method to create columns based on the join relationships created with [Query.autoJoin(options)](section_1530819144.html) and [Component.autoJoin(options)](section_1530818573.html).  
[Component.createCondition(options)](section_1510784922.html) |  [query.Condition](section_1510779210.html) |  Client and server scripts |  Creates a condition (filter column) based on the component. Use this method to create conditions based on the join relationships created with [Query.autoJoin(options)](section_1530819144.html) and [Component.autoJoin(options)](section_1530818573.html).  
[Component.createSort(options)](section_1510785047.html) |  [query.Sort](section_1510779222.html) |  Client and server scripts |  Creates a sort based on the component. Use this method to create sorts based on the join relationships created with [Query.autoJoin(options)](section_1530819144.html) and [Component.autoJoin(options)](section_1530818573.html).  
[Component.join(options)](section_1510784833.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates a join relationship. This method is an alias to [Component.autoJoin(options)](section_1530818573.html). After you create the initial query definition, use [Query.autoJoin(options)](section_1530819144.html) to create your first join. Then use this method, or [Component.autoJoin(options)](section_1530818573.html), to create each subsequent join.  
[Component.joinFrom(options)](section_1530818705.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates an explicit directional join relationship from another component to this component (an inverse join). This method sets the [Component.source](section_1510785292.html) property on the returned [query.Component](section_1510779141.html) object. After you create the initial query definition, use this method to create explicit directional joins from other components to this component.  
[Component.joinTo(options)](section_1530818855.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates an explicit directional join relationship to another component from this component (a join). You can use this method to specify the target of the join when a field can join multiple query types. This method sets the [Component.target](section_1510785266.html) property on the returned [query.Component](section_1510779141.html) object. After you create the initial query definition, use this method to create explicit directional joins to other components from this component.  
Property |  [Component.child](section_1510785245.html) |  Object (read-only) |  Client and server scripts |  The child components of the component. This property holds an object of key-value pairs. Each key is the name of a child component. Each value is the corresponding child [query.Component](section_1510779141.html) object.  
[Component.parent](section_1510785228.html) |  string (read-only) |  Client and server scripts |  The parent [query.Component](section_1510779141.html) object of the component.  
[Component.source](section_1510785292.html) |  string (read-only) |  Client and server scripts |  The source query type of the component. The value of this property is set when [Component.joinFrom(options)](section_1530818705.html) is called to perform an explicit directional join from another component.  
[Component.target](section_1510785266.html) |  string (read-only) |  Client and server scripts |  The target query type of the component. The value of this property is set when [Component.joinTo(options)](section_1530818855.html) is called to perform an explicit directional join to another component.  
[Component.type](section_1510785195.html) |  string (read-only) |  Client and server scripts |  The query type of the component.  

## Condition Object Members

The following members are available for a [query.Condition](section_1510779210.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Condition.aggregate](section_1510789603.html) |  string (read-only) |  Client and server scripts |  An aggregate function that is performed on the condition. An aggregate function performs a calculation on the condition values and returns a single value.  
[Condition.children](section_1510789455.html) |  [query.Condition](section_1510779210.html)[] (read-only) |  Client and server scripts |  An array of child conditions used to create the parent condition.  
[Condition.component](section_1510789643.html) |  [query.Component](section_1510779141.html) (read-only) |  Client and server scripts |  A reference to the [query.Component](section_1510779141.html) object to which this condition belongs.  
[Condition.fieldId](section_1510789485.html) |  string (read-only) |  Client and server scripts |  The name of the field that is used in the condition.  
[Condition.formula](section_1510789560.html) |  string (read-only) |  Client and server scripts |  The formula used to create the condition.  
[Condition.operator](section_1510789501.html) |  string (read-only) |  Client and server scripts |  The name of the operator used to create the condition.  
[Condition.type](section_1510789582.html) |  string (read-only) |  Client and server scripts |  The return type of the formula used to create the condition.  
[Condition.values](section_1510789525.html) |  string | number | | <string | number | > (read-only) |  Client and server scripts |  Value or an array of values used by an operator to create the condition.  

## Page Object Members

The following members are available for a [query.Page](section_1510779287.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Page.data](section_1510878060.html) |  [query.ResultSet](section_1510779235.html) (read-only) |  Client and server scripts |  The query results contained in this page.  
[Page.isFirst](section_1510878267.html) |  boolean (read-only) |  Client and server scripts |  Whether this page is the first of the paged query results.  
[Page.isLast](section_1510878292.html) |  boolean (read-only) |  Client and server scripts |  Whether this page is the last of the paged query results.  
[Page.pagedData](section_1510878184.html) |  [query.PagedData](section_1510779273.html) (read-only) |  Client and server scripts |  The set of paged query results that this page is from.  
[Page.pageRange](section_1510878146.html) |  [query.PageRange](section_1510779296.html) (read-only) |  Client and server scripts |  The range of query results for this page.  

## PagedData Object Members

The following members are available for a [query.PagedData](section_1510779273.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [PagedData.iterator()](section_1510861317.html) |  [Iterator](section_0831085754.html) object |  Client and server scripts |  Standard SuiteScript 2.0 object for iterating through results.  
[PagedData.fetch(options)](section_163482652383.html) |  [query.Page](section_1510779287.html) |  Client and server scripts |  Retrieves a page in the set of pages included in the `PagedData` object.  
[PagedData.fetch.promise(options)](section_0429115433.html) |  [Promise Object](section_4387812940.html) |  Client and server scripts |  Asynchronously retrieves a page in the set of pages included in the `PagedData` object.  
Property |  [PagedData.count](section_1510861385.html) |  number (read-only) |  Client and server scripts |  The total number of paged query results.  
[PagedData.pageRanges](section_1510861433.html) |  [query.PageRange](section_1510779296.html)[] |  Client and server scripts |  An array of page ranges for the set of paged query results.  
[PagedData.pageSize](section_1510861410.html) |  number (read-only) |  Client and server scripts |  The number of query result rows per page.  

## PageRange Object Members

The following members are available for a [query.PageRange](section_1510779296.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PageRange.index](section_1510878655.html) |  number (read-only) |  Client and server scripts |  The index for this page range.  
[PageRange.size](section_1510878735.html) |  number (read-only) |  Client and server scripts |  The number of query result rows in this page range.  

## Period Object Members

The following members are available for a [query.Period](section_158289614570.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Period.adjustment](section_158289613523.html) |  string (read-only) |  Client and server scripts |  The adjustment of the period. This property uses values from the [query.PeriodAdjustment](section_158289865548.html) enum.  
[Period.code](section_158289612641.html) |  string (read-only) |  Client and server scripts |  The code of the period. This property uses values from the [query.PeriodCode](section_158289876878.html) enum.  
[Period.type](section_158289645227.html) |  string (read-only) |  Client and server scripts |  The type of the period. This property uses values from the [query.PeriodType](section_158289949288.html) enum.  

## Query Object Members

The following members are available for a [query.Query](section_1510275177.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Query.and(conditions)](section_1510780422.html) |  [query.Condition](section_1510779210.html) |  Client and server scripts |  Creates a new condition (a [query.Condition](section_1510779210.html) object) that corresponds to a logical conjunction (AND) of the arguments passed to the method. The arguments must be one or more [query.Condition](section_1510779210.html) objects.  
[Query.autoJoin(options)](section_1530819144.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates a join relationship. After you create the initial query definition, use this method to create your first join or subsequent joins from the root component of the query. This method selects the correct join type automatically based on the record types that are being joined.  
[Query.createColumn(options)](section_1510780373.html) |  [query.Column](section_1510779196.html) |  Client and server scripts |  Creates a query result column based on the [query.Query](section_1510275177.html) object. Use this method to create columns on the initial query definition created with [query.create(options)](section_1510275581.html).  
[Query.createCondition(options)](section_1510780329.html) |  [query.Condition](section_1510779210.html) |  Client and server scripts |  Creates a condition (filter column) based on the [query.Query](section_1510275177.html) object. Use this method to create conditions on the initial query definition created with [query.create(options)](section_1510275581.html).  
[Query.createSort(options)](section_1510780402.html) |  [query.Sort](section_1510779222.html) |  Client and server scripts |  Creates a sort based on the [query.Query](section_1510275177.html) object. The [query.Sort](section_1510779222.html) object describes a sort that is placed on a particular query result column or condition.  
[Query.join(options)](section_1510275377.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates a join relationship. This method is an alias to [Query.autoJoin(options)](section_1530819144.html). After you create the initial query definition, use this method, or [Query.autoJoin(options)](section_1530819144.html), to create your first join.  
[Query.joinFrom(options)](section_1530819218.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates an explicit directional join relationship from another component to the root component of the search definition (an inverse join). This method sets the [Component.source](section_1510785292.html) property on the returned [query.Component](section_1510779141.html) object. After you create the initial query definition, use this method to create your first join as an explicit directional join from another component to this component.  
[Query.joinTo(options)](section_1530819329.html) |  [query.Component](section_1510779141.html) |  Client and server scripts |  Creates an explicit directional join relationship to another component from this component (a forward join). You can use this method to specify the target of the join when a field can join multiple query types. This method sets the [Component.target](section_1510785266.html) property on the returned [query.Component](section_1510779141.html) object. After you create the initial query definition, use this method to create your first join as an explicit directional join to another component from this component.  
[Query.not(condition)](section_1510780462.html) |  [query.Condition](section_1510779210.html) |  Client and server scripts |  Creates a new condition (a [query.Condition](section_1510779210.html) object) that corresponds to a logical negation (NOT) of the argument passed to the method. The argument must be a [query.Condition](section_1510779210.html) object.  
[Query.or(conditions)](section_1510780444.html) |  [query.Condition](section_1510779210.html) |  Client and server scripts |  Creates a new condition (a [query.Condition](section_1510779210.html) object) that corresponds to a logical disjunction (OR) of the arguments passed to the method. The arguments must be one or more [query.Condition](section_1510779210.html) objects.  
[Query.run(options)](section_1510780212.html) |  [query.ResultSet](section_1510779235.html) |  Client and server scripts |  Executes the query and returns the query result set.  
[Query.run.promise()](section_1510780250.html) |  [query.ResultSet](section_1510779235.html) |  Client and server scripts |  Executes the query asynchronously and returns the query result set.  
[Query.runPaged(options)](section_1510780277.html) |  [query.PagedData](section_1510779273.html) |  Client and server scripts |  Executes the query and returns a set of paged results.  
[Query.runPaged.promise(options)](section_1510780308.html) |  [query.PagedData](section_1510779273.html) |  Client and server scripts |  Executes the query asynchronously and returns a set of paged results.  
[Query.toSuiteQL()](section_157960522744.html) |  [query.SuiteQL](section_157960384819.html) |  Client and server scripts |  Converts this [query.Query](section_1510275177.html) object to its corresponding SuiteQL representation.  
Property |  [Query.child](section_1510781899.html) |  Object (read-only) |  Client and server scripts |  A reference to children of the root component of the query definition. The value of this property is an object of key-value pairs. Each key is the name of a child component. Each respective value is the corresponding [query.Component](section_1510779141.html) object.  
[Query.columns](section_1510781812.html) |  [query.Column](section_1510779196.html)[] |  Client and server scripts |  An array of query result columns returned from the query. Before you perform the query, you must assign all created columns as values to this property.  
[Query.condition](section_1510781832.html) |  [query.Condition](section_1510779210.html) object |  Client and server scripts |  The parent condition that narrows the query results. Before you perform the query, you must assign your simple or complex conditions to this property.  
[Query.id](section_1530819439.html) |  number (read-only) |  Client and server scripts |  The ID of the query definition. This property has a value only for existing queries that are loaded using [query.load(options)](section_1510349101.html). If you create a query using [query.create(options)](section_1510275581.html) but do not save it, this property is null.  
[Query.name](section_1530819481.html) |  string (read-only) |  Client and server scripts |  The name of the query definition. This property has a value only for existing queries that are loaded using [query.load(options)](section_1510349101.html). If you create a query using [query.create(options)](section_1510275581.html) but do not save it, this property is null.  
[Query.root](section_1510781874.html) |  [query.Component](section_1510779141.html) (read-only) |  Client and server scripts |  The root component of the query definition.  
[Query.sort](section_1510781853.html) |  [query.Column](section_1510779196.html)[] (read-only) |  Client and server scripts |  An array of query result columns used for sorting.  
[Query.type](section_1510275511.html) |  string (read-only) |  Client and server scripts |  The query type of the initial query definition.  

## RelativeDate Object Members

The following members are available for a [query.RelativeDate](section_1544109440.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [RelativeDate.dateId](section_1544109453.html) |  string (read-only) |  Client and server scripts |  The ID of the relative date.  
[RelativeDate.end](section_1544109465.html) |  Object (read-only) |  Client and server scripts |  The end point of the relative date.  
[RelativeDate.interval](section_1544109758.html) |  Object (read-only) |  Client and server scripts |  The interval of the relative date (from the [RelativeDate.start](section_1544109794.html) point to the [RelativeDate.end](section_1544109465.html) point).  
[RelativeDate.isRange](section_1552334952.html) |  boolean (read-only) |  Client and server scripts |  Whether the relative date represents a range of dates or a specific moment in time.  
[RelativeDate.start](section_1544109794.html) |  Object (read-only) |  Client and server scripts |  The start point of the relative date.  
[RelativeDate.value](section_1544109837.html) |  number (read-only) |  Client and server scripts |  The value of the relative date.  

## Result Object Members

The following members are available for a [query.Result](section_1510779258.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Result.asMap()](section_156336629343.html) |  Object |  Client and server scripts |  Returns the query result as an object with the columns mapped to the result values.  
[Result.getValue(options)](article_0522071257.html) |  <boolean | number | string | Date | null> (read-only) |  Client and server scripts |  Gets the value at a given index in [Result.values](section_1510859061.html).  
Property |  [Result.values](section_1510859061.html) |  Array <boolean | number | string | Date | null> (read-only) |  Client and server scripts |  The result values.  

## ResultSet Object Members

The following members are available for a [query.ResultSet](section_1510779235.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ResultSet.asMappedResults()](section_156336700395.html) |  Object[] |  Client and server scripts |  Returns a query result set as an array of mapped results.  
[ResultSet.iterator()](section_1510790932.html) |  [Iterator](section_0831085754.html) object |  Client and server scripts |  Standard SuiteScript 2.0 object for iterating through results.  
Property |  [ResultSet.columns](section_1510857693.html) |  [query.Column](section_1510779196.html)[] (read-only) |  Client and server scripts |  An array of query result column references.  
[ResultSet.results](section_1510857646.html) |  [query.Result](section_1510779258.html)[] (read-only) |  Client and server scripts |  An array of [query.Result](section_1510779258.html) objects.  
[ResultSet.types](section_1510857678.html) |  string[] (read-only) |  Client and server scripts |  An array of the return types for [ResultSet.results](section_1510857646.html).  

## Sort Object Members

The following members are available for a [query.Sort](section_1510779222.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Sort.ascending](section_1530897548.html) |  boolean |  Client and server scripts |  Whether the sort direction is ascending.  
[Sort.caseSensitive](section_1530819572.html) |  boolean |  Client and server scripts |  Whether the sort is case sensitive. If a sort is case sensitive (and the sort direction is ascending), rows with column values that start with uppercase letters are listed before rows with column values that start with lowercase letters. If a sort is not case sensitive, uppercase and lowercase letters are treated the same.  
[Sort.column](section_1510790467.html) |  [query.Column](section_1510779196.html) (read-only) |  Client and server scripts |  The query result column that the query results are sorted by.  
[Sort.locale](section_1530819644.html) |  string |  Client and server scripts |  The locale to use for the sort. A locale represents a combination of language and region, and it can affect how certain values (such as strings) are sorted.  
[Sort.nullsLast](section_1530819676.html) |  boolean |  Client and server scripts |  Whether query results with null values are listed at the end of the query results.  

## SuiteQL Object Members

The following members are available for a [query.SuiteQL](section_157960384819.html) object.

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [SuiteQL.run()](section_157960470046.html) |  [query.ResultSet](section_1510779235.html) |  Client and server scripts |  Runs the SuiteQL query and returns the query results.  
[SuiteQL.runPaged(options)](section_157960491275.html) |  [query.PagedData](section_1510779273.html) |  Client and server scripts |  Runs the SuiteQL query as a paged query and returns the paged query results.  
Property |  [SuiteQL.columns](section_157960405619.html) |  [query.Column](section_1510779196.html)[] |  Client and server scripts |  Describes the result columns to be returned from the query.  
[SuiteQL.params](section_157960427733.html) |  <string | number | > (read-only) |  Client and server scripts |  Contains the parameters for the query.  
[SuiteQL.query](section_157960443690.html) |  string (read-only) |  Client and server scripts |  Holds the string representation of the query.  
[SuiteQL.type](section_157960456167.html) |  string (read-only) |  Client and server scripts |  Describes the type of the query. This property uses values from the [query.Type](section_1510878994.html) enum.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)
  - [SuiteAnalytics Workbook Overview](chapter_1503949328.html)


[General Notices](chapter_N000004.html)
