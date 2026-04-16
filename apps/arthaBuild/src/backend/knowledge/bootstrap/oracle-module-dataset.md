# N/dataset — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_158946741680.html
> Module: N/dataset
> Version: SuiteScript 2.x / 2.1

# N/dataset Module

Use the N/dataset module to create, load, list, or save datasets. You can only use this module in server scripts.

With this module, you can do things like:

  - Create columns, joins, and conditions within a dataset.

  - Delete a dataset using the [N/query Module](section_1510275060.html).

  - Execute a dataset and obtain results-similar to running a query definition with the [N/query Module](section_1510275060.html).

  - Use string aliasing to identify columns, which is helpful when linking dataset columns to a workbook.

  - Apply column labels, which are the string descriptions shown in the UI.

  - Save a dataset.


Datasets are the foundation for workbooks and their components. In a dataset, you combine record type fields and filters to make a query. You can use the results as source data for any workbook, and you can use one dataset in several workbooks.

To learn more about datasets in SuiteAnalytics, see [Defining a Dataset](section_1544122173.html). For details on workbooks, see [N/workbook Module](article_159006350818.html).

Important: 

The N/dataset module doesn't work in unauthenticated client-side contexts. For details, see the SuiteAnswers [Outbound HTTPs in an unauthenticated client-side context](https://suiteanswers.custhelp.com/app/answers/detail/a_id/1013055).

  [   ](/app/help/helpcenter.nl?fid=section_0303050851)                                

## In This Help Topic

  - N/dataset Module Members

  - Column Object Members

  - Condition Object Members

  - Dataset Object Members

  - Join Object Members


## N/dataset Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [dataset.Column](section_158946808345.html) |  Object |  Server scripts |  A column in the dataset, which usually represents a record field.  
[dataset.Condition](section_158946951148.html) |  Object |  Server scripts |  A condition or set of conditions to apply to a column.  
[dataset.Dataset](section_158948063457.html) |  Object |  Server scripts |  A representation of the entire dataset, including columns, conditions, and joins.  
[dataset.Join](section_158948390739.html) |  Object |  Server scripts |  A joined record used in the dataset.  
Method |  [dataset.create(options)](section_158989971922.html) |  [dataset.Dataset](section_158948063457.html) |  Server scripts |  Creates a dataset.  
[dataset.createColumn(options)](section_158990102328.html) |  [dataset.Column](section_158946808345.html) |  Server scripts |  Creates a dataset column.  
[dataset.createCondition(options)](section_158990217350.html) |  [dataset.Condition](section_158946951148.html) |  Server scripts |  Creates a dataset condition (criteria). A condition is applied to a dataset column and includes an operator.  
[dataset.createJoin(options)](section_158990279568.html) |  [dataset.Join](section_158948390739.html) |  Server scripts |  Creates a dataset join.  
[dataset.createTranslation(options)](section_162853138869.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  Creates a translation expression based on a Translation Collection.  
[dataset.describe(options)](section_162853496011.html) |  Object[] |  Server scripts |  Retrieves descriptive information about a dataset, including name, description, and a list of columns or formulas with their labels and types.  
[dataset.describe.promise(options)](section_0507043830.html) |  Promise Object |  Server scripts |  Asynchronously retrieves descriptive information about a dataset, including name, description, and a list of columns or formulas with their labels and types..  
[dataset.list()](section_158990317009.html) |  Object[] |  Server scripts |  Lists all existing datasets.  
[dataset.listPaged(options)](section_162853512391.html) |  `PagedInfoData` |  Server scripts |  Returns metadata about datasets as a set of paged results.  
[dataset.loadDataset(options)](section_158990335776.html) |  [dataset.Dataset](section_158948063457.html) |  Server scripts |  Loads an existing dataset.  
[dataset.loadDataset.promise(options)](section_0507050454.html) |  Promise Object |  Server scripts |  Asynchronously loads an existing dataset.  

## Column Object Members

This object encapsulates the record fields in the dataset. Columns are equivalent to the fields you use when you build a dataset in SuiteAnalytics. For more information about datasets in SuiteAnalytics, see [Custom Workbooks and Datasets](chapter_1544122127.html).

The following members are available for a [dataset.Column](section_158946808345.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Column.alias](section_158946930657.html) |  string (read-only) |  Server scripts |  The alias of the column.  
[Column.fieldId](section_158946870976.html) |  string (read-only) |  Server scripts |  The ID of the record field associated with the column.  
[Column.formula](section_158946906503.html) |  string (read-only) |  Server scripts |  The formula of the column.  
[Column.id](section_158946901670.html) |  number (read-only) |  Server Scripts |  The ID of the column.  
[Column.join](section_159310457176.html) |  [dataset.Join](section_158948390739.html) (read-only) |  Server scripts |  The join for the column. Used only when the column is from a joined record.  
[Column.label](section_158946922873.html) |  string (read-only) |  Server scripts |  The label of the column.  
[Column.type](section_158946914278.html) |  string (read-only) |  Server scripts |  The return type of the formula.  

## Condition Object Members

This object encapsulates the criteria in the dataset. Conditions are equivalent to the criteria you use when you build a dataset in SuiteAnalytics. For more information about criteria used in datasets in SuiteAnalytics, see [Dataset Criteria Filters](section_1544211200.html).

The following members are available for a [dataset.Condition](section_158946951148.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Condition.caseSensitive](section_0507040252.html) |  boolean |  Server scripts |  Indicates whether the condition in a sort is case sensitive.  
[Condition.children](section_158946962310.html) |  [dataset.Condition](section_158946951148.html)[] (read-only) |  Server scripts |  The children of the condition (for example, subconditions AND'd or OR'd).  
[Condition.column](section_158948010876.html) |  [dataset.Column](section_158946808345.html) (read-only) |  Server scripts |  The column on which the condition is placed.  
[Condition.operator](section_158948026629.html) |  string (read-only) |  Server scripts |  The operator of the condition.  
[Condition.values](section_158948048117.html) |  string[] | number[] | boolean[] | Date[] | Object[] (read-only) |  Server scripts |  The values for the condition.  

## Dataset Object Members

This object encapsulates the entire dataset. For more information about datasets in SuiteAnalytics, see [Custom Workbooks and Datasets](chapter_1544122127.html).

The following members are available for a [dataset.Dataset](section_158948063457.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Dataset.getExpressionFromColumn(options)](section_158948233177.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  Returns an expression which can be used in a workbook.  
[Dataset.run()](section_158948330969.html) |  [query.ResultSet](section_1510779235.html) |  Server scripts |  Executes the dataset and returns the result set (the same as in [N/query Module](section_1510275060.html)).  
[Dataset.run.promise()](section_0507044927.html) |  Promise Object |  Server scripts |  Asynchronously executes the dataset and returns the result set (the same as in [N/query Module](section_1510275060.html)).  
[Dataset.runPaged(options)](section_158948363823.html) |  [query.PagedData](section_1510779273.html) |  Server scripts |  Executes the dataset and returns the result set in paginated data form (the same as in [N/query Module](section_1510275060.html)).  
[Dataset.save(options)](section_159354415610.html) |  Object |  Server scripts |  Saves a dataset.  
Property |  [Dataset.columns](section_158948083358.html) |  [dataset.Column](section_158946808345.html)[] |  Server scripts |  The columns in the dataset.  
[Dataset.condition](section_158948103219.html) |  [dataset.Condition](section_158946951148.html) |  Server scripts |  The condition (criteria) for the entire dataset.  
[Dataset.description](section_158948114518.html) |  string |  Server scripts |  The description of the dataset.  
[Dataset.id](section_158948123704.html) |  string |  Server scripts |  The ID of the dataset.  
[Dataset.name](section_158948129533.html) |  string |  Server scripts |  The name of the dataset.  
[Dataset.type](section_158948136837.html) |  string |  Server scripts |  The internal ID for the base record type for the dataset.  

## Join Object Members

Encapsulates a joined record used in the dataset. For more information about using joins in a dataset, see [Joining Record Types in a Dataset](section_1544129148.html).

The following members are available for a [dataset.Join](section_158948390739.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Join.fieldId](section_158948402464.html) |  string (read-only) |  Server scripts |  The ID of the field on which the join is performed.  
[Join.join](section_158948412223.html) |  [dataset.Join](section_158948390739.html) (read-only) |  Server scripts |  The child join, if the join is a multilevel join.  
[Join.source](section_158948418068.html) |  string (read-only) |  Server scripts |  The internal ID for the source record type of the join.  
[Join.target](section_158948426433.html) |  string (read-only) |  Server scripts |  The polymorphic target of the join.  

### Related Topics

  - [N/workbook Module](article_159006350818.html)
  - [Custom Workbooks and Datasets](chapter_1544122127.html)
  - [Defining a Dataset](section_1544122173.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
