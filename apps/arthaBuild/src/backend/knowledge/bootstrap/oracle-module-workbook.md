# N/workbook — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_159006350818.html
> Module: N/workbook
> Version: SuiteScript 2.x / 2.1

# N/workbook Module

Use the N/workbook module to create new workbooks, load existing ones, or list all available workbooks.

A workbook can contain:

  - Pivots

  - Tables with columns, filters, and field contexts

  - Charts with axes and legends

  - Selectors

  - Sections

  - Data dimensions

  - Sorts

  - Conditional and limiting filters

  - Expressions

  - Data measures and calculated measures


Workbooks help you analyze your dataset query results using different components, like table views. Every workbook is based on a dataset. For more, see the [N/dataset Module](article_158946741680.html). To learn more about SuiteAnalytics workbooks and datasets, check out:

  - [SuiteAnalytics Workbook Overview](chapter_1503949328.html)

  - [Getting Started with SuiteAnalytics Workbook](section_158874665729.html)

  - [Custom Workbooks and Datasets](chapter_1544122127.html)


Important: 

The N/workbook module doesn't work in unauthenticated client-side contexts. For details, see the SuiteAnswers [Outbound HTTPs in an unauthenticated client-side context](https://suiteanswers.custhelp.com/app/answers/detail/a_id/1013055).

  [   ](/app/help/helpcenter.nl?fid=section_0303053727)                                

## In This Help Topic

  - N/workbook Module Members

  - Aspect Object Members

  - CalculatedMeasure Object Members

  - Category Object Members

  - ChartAxis Object Members

  - Chart Object Members

  - [workbook.ChildNodesSelector](section_163405579141.html)

  - Color Object Members

  - ConditionalFilter Object Members

  - ConditionalFormat Object Members

  - ConditionalFormatRule Object Members

  - Currency Object Members

  - DataDimension Object Members

  - DataDimensionItem Object Members

  - DataDimensionItemValue Object Members

  - DataDimensionValue Object Members

  - DataMeasure Object Members

  - [workbook.DescendantorSelfNodesSelector](section_163170591936.html)

  - DimensionSelector Object Members

  - Duration Object Members

  - Expression Object Members

  - FieldContext Object Members

  - FontSize Object Members

  - Legend Object Members

  - LimitingFilter Object Members

  - MeasureSelector Object Members

  - MeasureValue Object Members

  - MeasureValueSelector Object Members

  - PathSelector Object Members

  - PivotAxis Object Members

  - Pivot Object Members

  - PivotIntersection Object Members

  - PositionPercent Object Members

  - PositionUnits Object Members

  - PositionValues Object Members

  - Range Object Members

  - Record Object Members

  - RecordKey Object Members

  - ReportStyle Object Members

  - ReportStyleRule Object Members

  - Section Object Members

  - SectionValue Object Members

  - Series Object Members

  - Sort Object Members

  - SortByDataDimensionItem Object Members

  - SortByMeasure Object Members

  - SortDefinition Object Members

  - Style Object Members

  - Table Object Members

  - TableColumn Object Members

  - TableColumnCondition Object Members

  - TableColumnFilter Object Members

  - Workbook Object Members


## N/workbook Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [workbook.Aspect](section_159007796216.html) |  Object |  Server scripts |  An aspect.  
[workbook.CalculatedMeasure](section_163169891173.html) |  Object |  Server scripts |  A calculated measure.  
[workbook.Category](section_159007978137.html) |  Object |  Server scripts |  A chart category.  
[workbook.Chart](section_159007989923.html) |  Object |  Server scripts |  A chart.  
[workbook.ChartAxis](section_159008145231.html) |  Object |  Server scripts |  A chart axis object which is used when you create a category or a legend.  
[workbook.ChildNodesSelector](section_163405579141.html) |  Object |  Server scripts |  A selector for child nodes.  
[workbook.Color](section_163169970614.html) |  Object |  Server scripts |  A color.  
[workbook.ConditionalFilter](section_159008152586.html) |  Object |  Server scripts |  A conditional filter.  
[workbook.ConditionalFormat](section_163170026948.html) |  Object |  Server scripts |  A conditional format.  
[workbook.ConditionalFormatRule](section_163170087636.html) |  Object |  Server scripts |  A conditional format rule.  
[workbook.Currency](section_163170117705.html) |  Object |  Server scripts |  A currency amount and currency type.  
[workbook.DataDimension](section_159008172142.html) |  Object |  Server scripts |  A data dimension.  
[workbook.DataDimensionItem](section_159008187726.html) |  Object |  Server scripts |  A data dimension item.  
[workbook.DataDimensionItemValue](section_163170154453.html) |  Object |  Server scripts |  The value of a data dimension item.  
[workbook.DataDimensionValue](section_163170210491.html) |  Object |  Server scripts |  The value of a data dimension.  
[workbook.DataMeasure](section_163170291911.html) |  Object |  Server scripts |  A data measure.  
[workbook.DescendantorSelfNodesSelector](section_163170591936.html) |  Object |  Server scripts |  A selector for descendant or self nodes.  
[workbook.DimensionSelector](section_159008193274.html) |  Object |  Server scripts |  A dimension selector.  
[workbook.Duration](section_163170370552.html) |  Object |  Server scripts |  A duration.  
[workbook.Expression](section_159008229845.html) |  Object |  Server scripts |  An expression.  
[workbook.FieldContext](section_159008243498.html) |  Object |  Server scripts |  A field context.  
[workbook.FontSize](section_163170399484.html) |  Object |  Server scripts |  A font size.  
[workbook.Legend](section_159008316064.html) |  Object |  Server scripts |  A chart legend.  
[workbook.LimitingFilter](section_159008328944.html) |  Object |  Server scripts |  A limiting filter.  
[workbook.MeasureSelector](section_163170447750.html) |  Object |  Server scripts |  A measure selector.  
[workbook.MeasureValue](section_163170481168.html) |  Object |  Server scripts |  A measure value.  
[workbook.MeasureValueSelector](section_163170568904.html) |  Object |  Server scripts |  A measure value selector.  
[workbook.PathSelector](section_159008382970.html) |  Object |  Server scripts |  A path selector.  
[workbook.Pivot](section_159008434619.html) |  Object |  Server scripts |  A pivot definition. A pivot is a workbook component that enables you to pivot your dataset query results by defining measures and dimensions, so that you can analyze different subsets of data.  
[workbook.PivotAxis](section_159008441105.html) |  Object |  Server scripts |  A pivot axis.  
[workbook.PivotIntersection](section_163170659013.html) |  Object |  Server scripts |  A pivot intersection.  
[workbook.PositionPercent](section_163170729070.html) |  Object |  Server scripts |  A position defined by percentages of the x and y axes.  
[workbook.PositionUnits](section_163170762618.html) |  Object |  Server scripts |  A position defined by units.  
[workbook.PositionValues](section_163170827938.html) |  Object |  Server scripts |  A position defined by horizontal and vertical position values.  
[workbook.Range](section_163170872703.html) |  Object |  Server scripts |  A date or date-time range.  
[workbook.Record](section_163170917603.html) |  Object |  Server scripts |  A record.  
[workbook.RecordKey](section_163170962082.html) |  Object |  Server scripts |  A record key.  
[workbook.ReportStyle](section_163171063813.html) |  Object |  Server scripts |  A report style.  
[workbook.ReportStyleRule](section_163171130796.html) |  Object |  Server scripts |  A report style rule.  
[workbook.Section](section_159008446199.html) |  Object |  Server scripts |  A workbook section.  
[workbook.SectionValue](section_163173206668.html) |  Object |  Server scripts |  A section value.  
[workbook.Series](section_159008573032.html) |  Object |  Server scripts |  A series in a workbook. A series is used when you create a chart definition.  
[workbook.Sort](section_159008577679.html) |  Object |  Server scripts |  A sort.  
[workbook.SortByDataDimensionItem](section_163173379734.html) |  Object |  Server scripts |  A sort based on a data dimension item.  
[workbook.SortByMeasure](section_163173416538.html) |  Object |  Server scripts |  A sort based on a measure.  
[workbook.SortDefinition](section_159008585696.html) |  Object |  Server scripts |  A sort definition.  
[workbook.Style](section_163173520481.html) |  Object |  Server scripts |  A style.  
[workbook.Table](section_163344915869.html) |  Object |  Server scripts |  A table.  
[workbook.TableColumn](section_159008606673.html) |  Object |  Server scripts |  A table column.  
[workbook.TableColumnCondition](section_0519040723.html) |  Object |  Server scripts |  Condition for a table view column.  
[workbook.TableColumnFilter](section_163182554335.html) |  Object |  Server scripts |  A table column filter.  
[workbook.Workbook](section_159008620913.html) |  Object |  Server scripts |  A workbook. Workbooks are where you analyze the results of your dataset queries using different components, such as table views and pivots. All workbooks are based on a dataset, and a single dataset can be used as the basis for multiple workbooks.  
Method |  [workbook.create(options)](section_159008744522.html) |  [workbook.Workbook](section_159008620913.html) |  Server scripts |  Creates a workbook. Workbooks are where you analyze the results of your dataset queries using different components, such as table views and pivots. All workbooks are based on a dataset, and a single dataset can be used as the basis for multiple workbooks.  
[workbook.createAspect(options)](section_159008835819.html) |  [workbook.Aspect](section_159007796216.html) |  server scripts |  Creates an aspect for a chart series. An aspect includes a measure and an aspect type.  
[workbook.createCalculatedMeasure(options)](section_162861792485.html) |  [workbook.CalculatedMeasure](section_163169891173.html) |  Server scripts |  Creates a calculated measure.  
[workbook.createCategory(options)](section_159008867464.html) |  [workbook.Category](section_159007978137.html) |  Server scripts |  Creates a chart category, which includes an axis, a data root, and a sort definition. A chart category is used in a [workbook.Chart](section_159007989923.html).  
[workbook.createChart(options)](section_159008909052.html) |  [workbook.Chart](section_159007989923.html) |  Server scripts |  Creates a chart.  
[workbook.createChartAxis(options)](section_159050950689.html) |  [workbook.ChartAxis](section_159008145231.html) |  Server scripts |  Creates an X-axis or a Y-axis for the chart.  
[workbook.createColor(options)](section_162861840772.html) |  [workbook.Color](section_163169970614.html) |  Server scripts |  Creates a color.  
[workbook.createComplexRecordKey](section_0519030417.html) |  [workbook.RecordKey](section_163170962082.html) |  Server scripts |  Creates a complex RecordKey object from another object.  
[workbook.createConditionalFilter(options)](section_159050988221.html) |  [workbook.ConditionalFilter](section_159008152586.html) |  Server scripts |  Creates a conditional filter.  
[workbook.createConditionalFormat(options)](section_162861895977.html) |  [workbook.ConditionalFormat](section_163170026948.html) |  Server scripts |  Creates a conditional format.  
[workbook.createConditionalFormatRule(options)](section_162861919456.html) |  [workbook.ConditionalFormatRule](section_163170087636.html) |  Server scripts |  Creates a conditional format rule.  
[workbook.createConstant(options)](section_159051033752.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  Creates a constant expression.  
[workbook.createCurrency(options)](section_0508032752.html) |  [workbook.Currency](section_163170117705.html) |  Server scripts |  Creates a currency.  
[workbook.createDataDimension(options)](section_159051058770.html) |  [workbook.DataDimension](section_159008172142.html) |  Server scripts |  Creates a data dimension.  
[workbook.createDataDimensionItem(options)](section_159051228123.html) |  [workbook.DataDimensionItem](section_159008187726.html) |  Server scripts |  Creates a data dimension item.  
[workbook.createDataMeasure(options)](section_162861945807.html) |  [workbook.DataMeasure](section_163170291911.html) |  Server scripts |  Creates a data measure.  
[workbook.createDimensionSelector(options)](section_159051255354.html) |  [workbook.DimensionSelector](section_159008193274.html) |  Server scripts |  Creates a dimension selector.  
[workbook.createDuration(options)](section_0508035928.html) |  [workbook.Duration](section_163170370552.html) |  Server scripts |  Creates a duration.  
[workbook.createExpression(options)](section_159051315304.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  Creates an expression.  
[workbook.createFieldContext(options)](section_159051362448.html) |  [workbook.FieldContext](section_159008243498.html) |  Server scripts |  Creates a field context for table column.  
[workbook.createFontSize(options)](section_162862018622.html) |  [workbook.FontSize](section_163170399484.html) |  Server scripts |  Creates a font size.  
[workbook.createLegend(options)](section_159051403498.html) |  [workbook.Legend](section_159008316064.html) |  Server scripts |  Creates a chart legend.  
[workbook.createLimitingFilter(options)](section_159051462385.html) |  [workbook.LimitingFilter](section_159008328944.html) |  Server scripts |  Creates a limiting filter.  
[workbook.createMeasureSelector(options)](section_162862131381.html) |  [workbook.MeasureSelector](section_163170447750.html) |  Server scripts |  Creates a measure selector.  
[workbook.createMeasureValueSelector(options)](section_162862156486.html) |  [workbook.MeasureValueSelector](section_163170568904.html) |  Server scripts |  Creates a measure value selector.  
[workbook.createPathSelector(options)](section_159051588951.html) |  [workbook.PathSelector](section_159008382970.html) |  Server scripts |  Creates a path selector.  
[workbook.createPivot(options)](section_159051610759.html) |  [workbook.Pivot](section_159008434619.html) |  Server scripts |  Creates a pivot definition. A pivot is a workbook component that enables you to pivot your dataset query results by defining measures and dimensions, so that you can analyze different subsets of data.  
[workbook.createPivotAxis(options)](section_159051729422.html) |  [workbook.PivotAxis](section_159008441105.html) |  Server scripts |  Creates a pivot axis, which includes a data root and a sort definition.  
[workbook.createPositionPercent(options)](section_162862263729.html) |  [workbook.PositionPercent](section_163170729070.html) |  Server scripts |  Creates a position defined by percentages of the x and y axes.  
[workbook.createPositionUnits(options)](section_162862280295.html) |  [workbook.PositionUnits](section_163170762618.html) |  Server scripts |  Creates a position defined by units.  
[workbook.createPositionValues(options)](section_162862321945.html) |  [workbook.PositionValues](section_163170827938.html) |  Server scripts |  Creates a position defined by horizontal and vertical position values.  
[workbook.createRange(options)](section_0519011317.html) |  [workbook.Range](section_163170872703.html) |  Server scripts |  Creates a range.  
[workbook.createReportStyle(options)](section_162886027908.html) |  [workbook.ReportStyle](section_163171063813.html) |  Server scripts |  Creates a report style.  
[workbook.createReportStyleRule(options)](section_162886077520.html) |  [workbook.ReportStyleRule](section_163171130796.html) |  Server scripts |  Creates a report style rule.  
[workbook.createSection(options)](section_159051755688.html) |  [workbook.Section](section_159008446199.html) |  Server scripts |  Creates a section.  
[workbook.createSeries(options)](section_159051782681.html) |  [workbook.Series](section_159008573032.html) |  Server scripts |  Creates a chart series, which is a set of aspects.  
[workbook.createSimpleRecordKey](section_0519031203.html) |  [workbook.RecordKey](section_163170962082.html) |  Server scripts |  Creates a record key.  
[workbook.createSort(options)](section_159051806613.html) |  [workbook.Sort](section_159008577679.html) |  Server scripts |  Creates a sort.  
[workbook.createSortByDataDimensionItem(options)](section_162886098564.html) |  [workbook.SortByDataDimensionItem](section_163173379734.html) |  Server scripts |  Creates a sort based on a data dimension item.  
[workbook.createSortByMeasure(options)](section_162886129949.html) |  [workbook.SortByMeasure](section_163173416538.html) |  Server scripts |  Creates a sort based on a measure.  
[workbook.createSortDefinition(options)](section_159051836190.html) |  [workbook.SortDefinition](section_159008585696.html) |  Server scripts |  Creates a sort definition.  
[workbook.createStyle(options)](section_162886251569.html) |  [workbook.Style](section_163173520481.html) |  Server scripts |  Creates a style.  
[workbook.createTable(options)](section_163344854839.html) |  [workbook.Table](section_163344915869.html) |  Server scripts |  Creates a table view.  
[workbook.createTableColumn(options)](section_159051899414.html) |  [workbook.TableColumn](section_159008606673.html) |  Server scripts |  Creates a table column.  
[workbook.createTableColumnCondition(options)](section_0519035345.html) |  workbook.TableColumnCondition |  Server scripts |  Creates a table column condition.  
[workbook.createTableColumnFilter(options)](section_159051973321.html) |  [workbook.TableColumnFilter](section_163182554335.html) |  Server scripts |  Creates a table filter.  
[workbook.createTranslation(options)](section_0519032016.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  Creates a translation (a translation expression).  
[workbook.list()](section_159052002745.html) |  Object[] |  Server scripts |  Lists all existing workbooks.  
[workbook.listPaged(options)](section_162887136327.html) |  PagedInfoData |  Server scripts |  Retrieves a set of pages with metadata about workbooks.  
[workbook.loadWorkbook(options)](section_159052020752.html) |  [workbook.Workbook](section_159008620913.html) |  Server scripts |  Loads an existing workbook.  
Enum |  [workbook.Aggregation](section_159058742898.html) |  enum |  Server scripts |  Holds string values for aggregation types. Used to set the value of the `options.aggregation` parameter of the [workbook.createDataMeasure(options)](section_162861945807.html) method.  
[workbook.AspectType](section_159059139226.html) |  enum |  Server scripts |  Holds string values for aspect types. Used to set the `options.type` parameter of the [workbook.createAspect(options)](section_159008835819.html) method.  
[workbook.ChartType](section_159059165881.html) |  enum |  Server scripts |  Holds string values for chart types. Used to pass the type value to [workbook.createChart(options)](section_159008909052.html)  
[workbook.Color](section_162887285281.html) |  enum |  Server scripts |  Holds string values for colors. Used to set the `options.backgroundcolor`, `options.color`, and `options.textDecorationColor` parameters of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.ConstantType](section_159059175435.html) |  enum |  Server scripts |  Holds string values for constant types. Used to set the value of the `options.type` parameter of the [workbook.createConstant(options)](section_159051033752.html) method.  
[workbook.DateTimeHierarchy](section_159059205972.html) |  enum |  Server scripts |  Holds string values for workbook date-time hierarchy types.  
[workbook.DateTimeProperty](section_159059226295.html) |  enum |  Server scripts |  Holds string values for workbook date-time property types. Used to set the value of the `DATE_TIME_PROPERTY` in [workbook.ExpressionType](section_159059241921.html).  
[workbook.ExpressionType](section_159059241921.html) |  enum |  Server scripts |  Holds string values for workbook expression types. Use these values for the `options.functionId` parameter when creating an expression using [workbook.createExpression(options)](section_159051315304.html)  
[workbook.FontSize](section_162887352651.html) |  enum |  Server scripts |  Holds string values for font sizes. Used to set the value for the `options.fontSize` parameter of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.FontStyle](section_162887378565.html) |  enum |  Server scripts |  Holds string values for font sizes. Used to set the value for the `options.fontSize` parameter of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.FontWeight](section_163104222816.html) |  enum |  Server scripts |  Holds string values for font weights. Used to set the value for the `options.fontWeight` parameter of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.Image](section_163104240054.html) |  enum |  Server scripts |  Holds string values for images that you can use in workbooks. Used as a value for the [Style.backgroundImage](section_163173554190.html) property.  
[workbook.Position](section_163104283914.html) |  enum |  Server scripts |  Holds string values for positions. Used to set the value for the [PositionValues.horizontal](section_163170835215.html) and [PositionValues.vertical](section_163170846977.html) properties.  
[workbook.Stacking](section_159059283191.html) |  enum |  Server scripts |  Holds stacking types. Used to pass the stacking value to [workbook.createChart(options)](section_159008909052.html).  
[workbook.TemporalUnit](section_163104301627.html) |  enum |  Server scripts |  Holds string values for temporal units, such as hours or minutes. Used to set the value of the `options.start` and `options.end` parameters of the [workbook.createDuration(options)](section_0508035928.html) method.  
[workbook.TextAlign](section_163104334844.html) |  enum |  Server scripts |  Holds string values for text alignments. Used to set the value for the `options.textAlign` parameter of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.TextDecorationLine](section_163104347221.html) |  enum |  Server scripts |  Holds string values for text decoration line types, such as underline and strikethrough. Used to set the value for the `options.textDecorationLine` parameter of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.TextDecorationStyle](section_163104360654.html) |  enum |  Server scripts |  Holds string values for text decoration line styles, such as solid and dashed. Used to set the value for the `options.textDecoractionStyle` parameter of the [workbook.createStyle(options)](section_162886251569.html) method.  
[workbook.TotalLine](section_159059291106.html) |  enum |  Server scripts |  Holds string values for predefined total line formats. Used to pass the totalLine value to [workbook.createDataDimension(options)](section_159051058770.html) and to [workbook.createSection(options)](section_159051755688.html).  
[workbook.Unit](section_163104381588.html) |  enum |  Server scripts |  Holds string values for units of measurement. Used to set the `options.unit` parameter in the [workbook.createPositionUnits(options)](section_162862280295.html) method.  

## Aspect Object Members

The following members are available for a [workbook.Aspect](section_159007796216.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Aspect.measure](section_159059538164.html) |  [workbook.CalculatedMeasure](section_163169891173.html) | [workbook.DataMeasure](section_163170291911.html) |  Server scripts |  The measure of the aspect.  
[Aspect.type](section_159059739663.html) |  string |  Server scripts |  The type of the aspect. Set this value using [workbook.AspectType](section_159059139226.html).  

## CalculatedMeasure Object Members

The following members are available for a [workbook.CalculatedMeasure](section_163169891173.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [CalculatedMeasure.expression](section_163169898230.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  The expression for the calculated measure.  
[CalculatedMeasure.label](section_163169960441.html) |  string | [workbook.Expression](section_159008229845.html) |  Server scripts |  The label of the calculated measure.  

## Category Object Members

The following members are available for a object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Category.axis](section_159059758666.html) |  [workbook.ChartAxis](section_159008145231.html) |  Server scripts |  The axis of the category.  
[Category.root](section_159059796021.html) |  [workbook.DataDimension](section_159008172142.html) | [workbook.Section](section_159008446199.html) |  Server scripts |  The section or data dimension (that is, the fields for the x-axis).  
[Category.sortDefinitions](section_159059848154.html) |  [workbook.SortDefinition](section_159008585696.html)[] |  Server scripts |  The sort definitions of the category.  

## ChartAxis Object Members

The following members are available for a [workbook.ChartAxis](section_159008145231.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ChartAxis.title](section_159060132954.html) |  string |  Server scripts |  The title of the chart axis.  

## Chart Object Members

The following members are available for a [workbook.Chart](section_159007989923.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Chart.aggregationFilters](section_159059873137.html) |  Array<[workbook.LimitingFilter](section_159008328944.html) | [workbook.ConditionalFilter](section_159008152586.html)> |  Server scripts |  Limiting and conditional filters for the chart.  
[Chart.category](section_159059899895.html) |  string |  Server scripts |  The category of the chart.  
[Chart.dataset](section_159059924823.html) |  [dataset.Dataset](section_158948063457.html) |  Server scripts |  The underlying dataset for the chart.  
[Chart.filterExpressions](section_159059984270.html) |  [workbook.Expression](section_159008229845.html)[] |  Server scripts |  The filter expressions of the chart.  
[Chart.id](section_159060000181.html) |  string |  Server scripts |  The ID of the chart.  
[Chart.legend](section_159060006422.html) |  [workbook.Legend](section_159008316064.html) |  Server scripts |  The legend of the chart.  
[Chart.name](section_159060029636.html) |  string |  Server scripts |  The name of chart.  
[Chart.series](section_159060034662.html) |  [workbook.Series](section_159008573032.html) |  Server scripts |  The series of the chart.  
[Chart.stacking](section_159060042645.html) |  string |  Server scripts |  The stacking type for the chart.  
[Chart.subTitle](section_159060065018.html) |  string |  Server scripts |  The subtitle of the chart.  
[Chart.title](section_159060082797.html) |  string |  Server scripts |  The title of chart.  
[Chart.type](section_159060087628.html) |  [workbook.ChartType](section_159059165881.html) |  Server scripts |  The type of the chart.  

## Color Object Members

The following members are available for a [workbook.Color](section_163169970614.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Color.alpha](section_163169975898.html) |  number |  Server scripts |  The opacity, or transparency, of the color.  
[Color.blue](section_163169989032.html) |  number |  Server scripts |  The blue portion of the color.  
[Color.green](section_163170010381.html) |  number |  Server scripts |  The green portion of the color.  
[Color.red](section_163170014465.html) |  number |  Server scripts |  The red portion of the color.  

## ConditionalFilter Object Members

The following members are available for a [workbook.ConditionalFilter](section_159008152586.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ConditionalFilter.columnSelector](section_0523101300.html) |  [workbook.DescendantorSelfNodesSelector](section_163170591936.html)| [workbook.PathSelector](section_159008382970.html) | [workbook.DimensionSelector](section_159008193274.html) | [workbook.ChildNodesSelector](section_163405579141.html) |  Server scripts |  The column selector.  
[ConditionalFilter.filteredNodesSelector](section_159060177021.html) |  [workbook.PathSelector](section_159008382970.html) | [workbook.DimensionSelector](section_159008193274.html) |  Server scripts |  The selected filters.  
[ConditionalFilter.measure](section_159060203583.html) |  [workbook.CalculatedMeasure](section_163169891173.html) | [workbook.DataMeasure](section_163170291911.html) |  Server scripts |  The measure of the filter.  
[ConditionalFilter.otherAxisSelector](section_159060210397.html) |  [workbook.PathSelector](section_159008382970.html) | [workbook.DimensionSelector](section_159008193274.html) |  Server scripts |  The filter selector for the other axis.  
[ConditionalFilter.predicate](section_159060217839.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  The actual predicate which indicates if the condition is met.  
[ConditionalFilter.row](section_159060224291.html) |  boolean |  Server scripts |  The row axis indicator.  
ConditionalFilter.rowSelector |  [workbook.DescendantorSelfNodesSelector](section_163170591936.html)| [workbook.PathSelector](section_159008382970.html) | [workbook.DimensionSelector](section_159008193274.html) | [workbook.ChildNodesSelector](section_163405579141.html) |  Server scripts |  The row selector.  

## ConditionalFormat Object Members

The following members are available for a [workbook.ConditionalFormat](section_163170026948.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ConditionalFormat.rules](section_163170032294.html) |  [workbook.ConditionalFormatRule](section_163170087636.html)[] |  Server scripts |  The conditional formatting rules that are included in the conditional format.  

## ConditionalFormatRule Object Members

The following members are available for a [workbook.ConditionalFormatRule](section_163170087636.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ConditionalFormatRule.filter](section_163170091952.html) |  [workbook.TableColumnFilter](section_163182554335.html) |  Server scripts |  The filter that determines which rows or cells to apply the conditional format to.  
[ConditionalFormatRule.style](section_163170105669.html) |  [workbook.Style](section_163173520481.html) |  Server scripts |  The style to apply as the conditional format.  

## Currency Object Members

The following members are available for a [workbook.Currency](section_163170117705.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Currency.amount](section_163170128090.html) |  number |  Server scripts |  The amount of the currency.  
[Currency.id](section_163170140869.html) |  string |  Server scripts |  The ID of the currency (for example, USD, EUR, GBP, and so on).  

## DataDimension Object Members

The following members are available for a [workbook.DataDimension](section_159008172142.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DataDimension.children](section_159060235099.html) |  Array<[workbook.DataDimension](section_159008172142.html) | [workbook.Section](section_159008446199.html)> |  Server scripts |  The children of the data dimension.  
[DataDimension.items](section_159060252354.html) |  [workbook.DataDimensionItem](section_159008187726.html)[] |  Server scripts |  The items of the data dimension.  
[DataDimension.totalLine](section_159060259875.html) |  string |  Server scripts |  The formatting option for the total line. Set this value using [workbook.TotalLine](section_159059291106.html).  

## DataDimensionItem Object Members

The following members are available for a [workbook.DataDimensionItem](section_159008187726.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DataDimensionItem.expression](section_159060269666.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  The expression of data dimension item.  
[DataDimensionItem.label](section_159060286113.html) |  string |  Server scripts |  The label of the data dimension item.  

## DataDimensionItemValue Object Members

The following members are available for a [workbook.DataDimensionItemValue](section_163170154453.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DataDimensionItemValue.item](section_163170159800.html) |  [workbook.DataDimensionItem](section_159008187726.html) |  Server scripts |  The data dimension item.  
[DataDimensionItemValue.value](section_163170190266.html) |  string | number | boolean | [workbook.Record](section_163170917603.html) | [workbook.Currency](section_163170117705.html) | [workbook.Range](section_163170872703.html) | [workbook.Duration](section_163170370552.html) |  Server scripts |  The value of the data dimension item.  

## DataDimensionValue Object Members

The following members are available for a [workbook.DataDimensionValue](section_163170210491.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DataDimensionValue.dataDimension](section_163170216198.html) |  [workbook.DataDimension](section_159008172142.html) |  Server scripts |  The data dimension.  
[DataDimensionValue.itemValues](section_163170231216.html) |  [workbook.DataDimensionItemValue](section_163170154453.html)[] |  Server scripts |  The item values for the data dimension.  

## DataMeasure Object Members

The following members are available for a [workbook.DataMeasure](section_163170291911.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DataMeasure.aggregation](section_163170295910.html) |  string |  Server scripts |  The aggregation of the data measure.  
[DataMeasure.expression](section_163170308563.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  The expression for the data measure. This property is used if the data measure is a single-expression measure.  
[DataMeasure.expressions](section_163170327822.html) |  [workbook.Expression](section_159008229845.html)[] |  Server scripts |  The expressions for the data measure. This property is used if the data measure is a multiple-expression measure.  
[DataMeasure.label](section_163170341320.html) |  string | [workbook.Expression](section_159008229845.html) |  Server scripts |  The label of the data measure.  

## DimensionSelector Object Members

The following members are available for a [workbook.DimensionSelector](section_159008193274.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DimensionSelector.dimension](section_159060292188.html) |  [workbook.DataDimension](section_159008172142.html) | [workbook.Section](section_159008446199.html) |  Server scripts |  The dimension of the dimension selector.  

## Duration Object Members

The following members are available for a [workbook.Duration](section_163170370552.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Duration.amount](section_163170373072.html) |  number |  Server scripts |  The amount of the duration.  
[Duration.units](section_163170386544.html) |  Object |  Server scripts |  The units of the duration.  

## Expression Object Members

The following members are available for a [workbook.Expression](section_159008229845.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Expression.functionId](section_159060345596.html) |  string |  Server scripts |  The ID of the function used in the expression.  
[Expression.parameters](section_159060354863.html) |  Object |  Server scripts |  The parameters of the expression.  

## FieldContext Object Members

The following members are available for a [workbook.FieldContext](section_159008243498.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [FieldContext.name](section_159060362975.html) |  string |  Server scripts |  The name of the field context (for example, DISPLAY or CONSOLIDATED)  
[FieldContext.parameters](section_159060373825.html) |  Object |  Server scripts |  The parameters of the field context.  

## FontSize Object Members

The following members are available for a [workbook.FontSize](section_163170399484.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [FontSize.size](section_163170404227.html) |  number |  Server scripts |  The numeric size of the font size.  
[FontSize.unit](section_163170412748.html) |  string |  Server scripts |  The unit of the font size.  

## Legend Object Members

The following members are available for a object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Legend.axes](section_159060380390.html) |  [workbook.ChartAxis](section_159008145231.html)[] |  Server scripts |  The axes of the legend.  
[Legend.root](section_159060401557.html) |  [workbook.DataDimension](section_159008172142.html) | [workbook.Section](section_159008446199.html) |  Server scripts |  The section or data dimension (that is., the fields for the y-axis).  
[Legend.sortDefinitions](section_159060413021.html) |  [workbook.SortDefinition](section_159008585696.html)[] |  Server scripts |  The sort definitions of the legend.  

## LimitingFilter Object Members

The following members are available for a [workbook.LimitingFilter](section_159008328944.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [LimitingFilter.filteredNodesSelector](section_159060536488.html) |  [workbook.PathSelector](section_159008382970.html) | [workbook.DimensionSelector](section_159008193274.html) |  Server scripts |  The selected filter.  
[LimitingFilter.limit](section_159060556079.html) |  number |  Server scripts |  The limit number for the filter.  
[LimitingFilter.row](section_159060560980.html) |  boolean |  Server scripts |  The row axis indicator for the filter.  
[LimitingFilter.sortBys](section_159060565600.html) |  Array<[workbook.SortByDataDimensionItem](section_163173379734.html) | [workbook.SortByMeasure](section_163173416538.html)> |  Server scripts |  The ordering elements of the filter.  

## MeasureSelector Object Members

The following members are available for a [workbook.MeasureSelector](section_163170447750.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [MeasureSelector.measures](section_163170452022.html) |  [workbook.CalculatedMeasure](section_163169891173.html)[] | [workbook.DataMeasure](section_163170291911.html) |  Server scripts |  The measures for the measure selector.  

## MeasureValue Object Members

The following members are available for a [workbook.MeasureValue](section_163170481168.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [MeasureValue.measure](section_163170490332.html) |  [workbook.MeasureValue](section_163170481168.html) |  Server scripts |  The measure to use for the measure value.  
[MeasureValue.value](section_163170503741.html) |  string | number | boolean | [workbook.Record](section_163170917603.html) | [workbook.Currency](section_163170117705.html) | [workbook.Range](section_163170872703.html) | [workbook.Duration](section_163170370552.html) |  Server scripts |  The value to use for the measure value.  

## MeasureValueSelector Object Members

The following members are available for a [workbook.MeasureValueSelector](section_163170568904.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [MeasureValueSelector.columnSelector](section_163170571717.html) |  [workbook.DimensionSelector](section_159008193274.html) | [workbook.PathSelector](section_159008382970.html) | [workbook.DescendantorSelfNodesSelector](section_163170591936.html) |  Server scripts |  The column selector.  
[MeasureValueSelector.measureSelector](section_163170622118.html) |  [workbook.MeasureSelector](section_163170447750.html)[] |  Server scripts |  The measure selectors.  
[MeasureValueSelector.rowSelector](section_163170640587.html) |  [workbook.DimensionSelector](section_159008193274.html) | [workbook.PathSelector](section_159008382970.html) | [workbook.DescendantorSelfNodesSelector](section_163170591936.html) |  Server scripts |  The row selector.  

## PathSelector Object Members

The following members are available for a [workbook.PathSelector](section_159008382970.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PathSelector.elements](section_159066646127.html) |  [workbook.DimensionSelector](section_159008193274.html) |  Server scripts |  The elements denoting 'xpath' of the selector.  

## PivotAxis Object Members

The following members are available for a [workbook.PivotAxis](section_159008441105.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PivotAxis.root](section_159067285341.html) |  [workbook.DataDimension](section_159008172142.html) | [workbook.Section](section_159008446199.html) |  Server scripts |  The data for the pivot axis.  
[PivotAxis.sortDefinitions](section_159067303569.html) |  [workbook.SortDefinition](section_159008585696.html)[] |  Server scripts |  The sort definitions of the pivot axis.  

## Pivot Object Members

The following members are available for a [workbook.Pivot](section_159008434619.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Pivot.aggregationFilters](section_159066662957.html) |  Array<[workbook.ConditionalFilter](section_159008152586.html) |[workbook.LimitingFilter](section_159008328944.html)> |  Server scripts |  The limiting and conditional filters of the pivot definition.  
[Pivot.columnAxis](section_159066680385.html) |  [workbook.PivotAxis](section_159008441105.html) |  Server scripts |  The column axis of the pivot definition.  
[Pivot.dataset](section_159066924782.html) |  [dataset.Dataset](section_158948063457.html) |  Server scripts |  The underlying dataset of the pivot definition.  
[Pivot.datasetLink](section_0512014254.html) |  [datasetLink.DatasetLink](section_162626627810.html) |  Server scripts |  Underlying dataset for the pivot.  
[Pivot.filterExpressions](section_159066933834.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  The filter expressions of the pivot definition.  
[Pivot.id](section_159066947985.html) |  string |  Server scripts |  The ID of the pivot definition.  
[Pivot.name](section_159066953484.html) |  string |  Server scripts |  The name of the pivot definition.  
[Pivot.portletName](section_0512014329.html) |  string | [workbook.Expression](section_159008229845.html) |  Server scripts |  The name of the portlet for the pivot.  
[Pivot.reportStyles](section_0512014407.html) |  [workbook.ReportStyle](section_163171063813.html)[] |  Server scripts |  Report styles for the pivot.  
[Pivot.rowAxis](section_159066959476.html) |  [workbook.PivotAxis](section_159008441105.html) |  Server scripts |  The row axis of the pivot definition.  

## PivotIntersection Object Members

The following members are available for a [workbook.PivotIntersection](section_163170659013.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PivotIntersection.column](section_163170669420.html) |  [workbook.DataDimensionValue](section_163170210491.html) | [workbook.SectionValue](section_163173206668.html) |  Server scripts |  The column dimension value.  
[PivotIntersection.measureValues](section_163170686190.html) |  [workbook.MeasureValue](section_163170481168.html)[] |  Server scripts |  The measure values in the pivot intersection.  
[PivotIntersection.row](section_163170696918.html) |  [workbook.DataDimensionValue](section_163170210491.html) | [workbook.SectionValue](section_163173206668.html) |  Server scripts |  The row dimension value.  

## PositionPercent Object Members

The following members are available for a [workbook.PositionPercent](section_163170729070.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PositionPercent.percentX](section_163170734357.html) |  number |  Server scripts |  The percentage of the x dimension.  
[PositionPercent.percentY](section_163170743120.html) |  number |  Server scripts |  The percentage of the y dimension.  

## PositionUnits Object Members

The following members are available for a [workbook.PositionUnits](section_163170762618.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PositionUnits.unit](section_163170775370.html) |  string |  Server scripts |  The units for the position.  
[PositionUnits.x](section_163170786133.html) |  number |  Server scripts |  The x value of the position.  
[PositionUnits.y](section_163170792708.html) |  number |  Server scripts |  The y value of the position.  

## PositionValues Object Members

The following members are available for a [workbook.PositionValues](section_163170827938.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [PositionValues.horizontal](section_163170835215.html) |  string |  Server scripts |  The horizontal value of the position.  
[PositionValues.vertical](section_163170846977.html) |  string |  Server scripts |  The vertical value of the position.  

## Range Object Members

The following members are available for a [workbook.Range](section_163170872703.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Range.end](section_163170883402.html) |  string |  Server scripts |  The end date or date-time of the range.  
[Range.start](section_163170896250.html) |  string |  Server scripts |  The start date or date-time of the range.  

## Record Object Members

The following members are available for a [workbook.Record](section_163170917603.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Record.name](section_163170925187.html) |  string |  Server scripts |  The name of the record type for the record.  
[Record.primaryKey](section_163170936521.html) |  number |  Server scripts |  The primary key of the record.  
[Record.properties](section_163170947320.html) |  Object |  Server scripts |  The properties of the record.  

## RecordKey Object Members

The following members are available for a [workbook.RecordKey](section_163170962082.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [RecordKey.properties](section_163170982525.html) |  Object |  Server scripts |  The properties of the record key.  

## ReportStyle Object Members

The following members are available for a [workbook.ReportStyle](section_163171063813.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ReportStyle.rules](section_163171069587.html) |  [workbook.ReportStyleRule](section_163171130796.html)[] |  Server scripts |  The formatting rules for the report style.  
[ReportStyle.selectors](section_163171082395.html) |  [workbook.MeasureValueSelector](section_163170568904.html)[] |  Server scripts |  The selectors for the report style.  

## ReportStyleRule Object Members

The following members are available for a [workbook.ReportStyleRule](section_163171130796.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ReportStyleRule.expression](section_163171133355.html) |  [workbook.Expression](section_159008229845.html) |  Server scripts |  A boolean expression indicating whether the style should be applied.  
[ReportStyleRule.style](section_163171147220.html) |  [workbook.Style](section_163173520481.html) |  Server scripts |  The style to be applied.  

## Section Object Members

The following members are available for a [workbook.Section](section_159008446199.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Section.children](section_159067318372.html) |  Array<[workbook.CalculatedMeasure](section_163169891173.html) | [workbook.DataMeasure](section_163170291911.html) | [workbook.DataDimension](section_159008172142.html) | [workbook.DataDimensionItem](section_159008187726.html)> |  Server scripts |  The children of the section.  
[Section.totalLine](section_159067344059.html) |  string |  Server scripts |  The formatting option for the total line. Set this value using [workbook.TotalLine](section_159059291106.html).  

## SectionValue Object Members

The following members are available for a [workbook.SectionValue](section_163173206668.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SectionValue.section](section_163173214786.html) |  [workbook.Section](section_159008446199.html) |  Server scripts |  The section of the section value.  

## Series Object Members

The following members are available for a [workbook.Series](section_159008573032.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Series.aspects](section_159067471979.html) |  string |  Server scripts |  The aspects for the series.  

## Sort Object Members

The following members are available for a [workbook.Sort](section_159008577679.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Sort.ascending](section_159067491318.html) |  boolean |  Server scripts |  When set to true, indicates the sort is in ascending order.  
[Sort.caseSensitive](section_159067503088.html) |  boolean |  Server scripts |  When set to true, indicates the sort is case sensitive.  
[Sort.locale](section_159067507629.html) |  [query.SortLocale](section_1530819885.html) (read-only) |  Server scripts |  The locale of the sort.  
[Sort.nullsLast](section_159067526653.html) |  boolean |  Server scripts |  When set to true, indicates that nulls are placed last in the sort.  
[Sort.order](section_0508025608.html) |  number |  Server scripts |  Sort order indicator.  

## SortDefinition Object Members

The following members are available for a [workbook.SortDefinition](section_159008585696.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SortDefinition.selector](section_159067587477.html) |  [workbook.DimensionSelector](section_159008193274.html) | [workbook.PathSelector](section_159008382970.html) |  Server scripts |  The selector for the sort definition.  
[SortDefinition.sortBys](section_159068101948.html) |  Array<[workbook.SortByDataDimensionItem](section_163173379734.html) | [workbook.SortByMeasure](section_163173416538.html)> |  Server scripts |  The sort order for the sort definition.  

## SortByDataDimensionItem Object Members

The following members are available for a [workbook.SortByDataDimensionItem](section_163173379734.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SortByDataDimensionItem.item](section_163173384318.html) |  [workbook.DataDimensionItem](section_159008187726.html) |  Server scripts |  The data dimension item to use for the sort.  
[SortByDataDimensionItem.sort](section_163173396547.html) |  [workbook.Sort](section_159008577679.html) |  Server scripts |  The sort to use.  

## SortByMeasure Object Members

The following members are available for a [workbook.SortByMeasure](section_163173416538.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SortByMeasure.measure](section_163173423593.html) |  [workbook.CalculatedMeasure](section_163169891173.html) | [workbook.DataMeasure](section_163170291911.html) |  Server scripts |  The measure for the sort.  
[SortByMeasure.otherAxisSelector](section_163173440923.html) |  [workbook.DescendantorSelfNodesSelector](section_163170591936.html) | [workbook.PathSelector](section_159008382970.html) | [workbook.DimensionSelector](section_159008193274.html) |  Server scripts |  The selector for the axis that is not defined in the associated sort definition.  
[SortByMeasure.sort](section_163173466143.html) |  [workbook.Sort](section_159008577679.html) |  Server scripts |  The sort to use.  

## Style Object Members

The following members are available for a [workbook.Style](section_163173520481.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Style.backgroundColor](section_163173529458.html) |  string | [workbook.Color](section_163169970614.html) |  Server scripts |  The background color of the style.  
[Style.backgroundImage](section_163173554190.html) |  string |  Server scripts |  The background image of the style.  
[Style.backgroundPosition](section_163173571314.html) |  [workbook.PositionPercent](section_163170729070.html) | [workbook.PositionUnits](section_163170762618.html) | [workbook.PositionValues](section_163170827938.html) |  Server scripts |  The background position of the style.  
[Style.color](section_163173590854.html) |  string | [workbook.Color](section_163169970614.html) |  Server scripts |  The color of the style.  
[Style.fontSize](section_163182431041.html) |  string | [workbook.FontSize](section_163170399484.html) |  Server scripts |  The font size of the style.  
[Style.fontStyle](section_163182456446.html) |  string |  Server scripts |  The font style of the style.  
[Style.fontWeight](section_163182473243.html) |  string |  Server scripts |  The font weight of the style.  
[Style.textAlign](section_163182483502.html) |  string |  Server scripts |  The text alignment of the style.  
[Style.textDecorationColor](section_163182497527.html) |  string | [workbook.Color](section_163169970614.html) |  Server scripts |  The text decoration color of the style.  
[Style.textDecorationLine](section_163182512011.html) |  string |  Server scripts |  The text decoration line of the style.  
[Style.textDecorationStyle](section_163182537948.html) |  string |  Server scripts |  The text decoration style of the style.  

## Table Object Members

The following members are available for a [workbook.Table](section_163344915869.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Table.columns](section_163344918534.html) |  [workbook.TableColumn](section_159008606673.html) |  Server scripts |  The columns in the table view.  
[Table.dataset](section_163344998659.html) |  [dataset.Dataset](section_158948063457.html) |  Server scripts |  The dataset for the table view.  
[Table.id](section_163345007588.html) |  string |  Server scripts |  The ID of the table view.  
[Table.name](section_163345013333.html) |  string | [workbook.Expression](section_159008229845.html) |  Server scripts |  The label of the table view.  

## TableColumn Object Members

The following members are available for a [workbook.TableColumn](section_159008606673.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [TableColumn.alias](section_159068483389.html) |  string |  Server scripts |  The alias for the table column.  
[TableColumn.datasetColumnAlias](section_159068500320.html) |  string |  Server scripts |  The alias of the dataset column from which the table column was created.  
[TableColumn.fieldContext](section_159068527319.html) |  [workbook.FieldContext](section_159008243498.html) |  Server scripts |  The field context for the field used in the table column.  
[TableColumn.filters](section_159068543531.html) |  [workbook.TableColumnFilter](section_163182554335.html) |  Server scripts |  The filters for the table column.  
[TableColumn.label](section_159068554513.html) |  string |  Server scripts |  The label for the table column.  
[TableColumn.sort](section_159068560761.html) |  [workbook.Sort](section_159008577679.html) |  Server scripts |  The sort for the table column.  
[TableColumn.width](section_159068573820.html) |  number |  Server scripts |  The desired width of the table column when displayed in the UI.  

## TableColumnCondition Object Members

The following members are available for a [workbook.TableColumnCondition](section_0519040723.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [TableColumnCondition.filters](section_0519041030.html) |  [workbook.TableColumnFilter](section_163182554335.html)[] |  Server scripts |  The filters for the condition  
[TableColumnCondition.operator](section_0519041056.html) |  string |  Server scripts |  The operator for the condition.  

## TableColumnFilter Object Members

The following members are available for a [workbook.TableColumnFilter](section_163182554335.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [TableColumnFilter.operator](section_163182557155.html) |  string |  Server scripts |  The operator for the table column filter.  
[TableColumnFilter.values](section_163182580894.html) |  Array<null | Object | boolean | number | string | Date> |  Server scripts |  The values for the table column filter.  

## Workbook Object Members

The following members are available for a [workbook.Workbook](section_159008620913.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Workbook.runPivot(options)](section_159068644727.html) |  [workbook.PivotIntersection](section_163170659013.html)[] |  Server scripts |  Runs a pivot in the workbook and returns the results as a set of row-column intersections.  
Property |  [Workbook.description](section_159068729450.html) |  string |  Server scripts |  The description of the workbook.  
[Workbook.id](section_159068735130.html) |  string |  Server scripts |  The ID of the workbook.  
[Workbook.name](section_159068757322.html) |  string |  Server scripts |  The name of the workbook.  
[Workbook.pivots](section_159068761191.html) |  [workbook.Pivot](section_159008434619.html)[] |  Server scripts |  The pivots in the workbook.  
[Workbook.tables](section_159068768425.html) |  [workbook.Table](section_163344915869.html)[] |  Server scripts |  The tables in the workbook.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
