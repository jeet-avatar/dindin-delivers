# N/task — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4345787858.html
> Module: N/task
> Version: SuiteScript 2.x / 2.1

# N/task Module

Use the N/task module to create tasks and place them in the internal NetSuite scheduling or task queue. You can use this module to create tasks for the following:

  - To submit a scheduled script

  - To run a map/reduce script

  - To import CSV files

  - To merge duplicate records

  - To execute asynchronous searches, asynchronous document capture tasks, constructed queries, SuiteQL queries, and workflows


Each task is a specific task type ([task.TaskType](section_4345806937.html)) and each task type has its own corresponding object types. Use the methods available to each object type to configure, submit, and monitor the tasks.

  [   ](/app/help/helpcenter.nl?fid=section_0305023241)                                

Note: 

Regardless of task type, tasks are always triggered asynchronously.

## In This Help Topic

  - N/task Module Members

  - CsvImportTask Object Members

  - CsvImportTaskStatus Object Members

  - DocumentCaptureTask Object Members

  - DocumentCaptureTaskStatus Object Members

  - EntityDeduplicationTask Object Members

  - EntityDeduplicationTaskStatus Object Members

  - MapReduceScriptTask Object Members

  - MapReduceScriptTaskStatus Object Members

  - QueryTask Object Members

  - QueryTaskStatus Object Members

  - RecordActionTask Object Members

  - RecordActionTaskStatus Object Members

  - ScheduledScriptTask Object Members

  - ScheduledScriptTaskStatus Object Members

  - SearchTask Object Members

  - SearchTaskStatus Object Members

  - SuiteQLTask Object Members

  - SuiteQLTaskStatus Object Members

  - WorkflowTriggerTask Object Members

  - WorkflowTriggerTaskStatus Object Members


## N/task Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [task.CsvImportTask](section_4345798668.html) |  Object |  Server scripts |  The properties of a CSV import task. Use the methods and properties for this object to submit a CSV import task into the task queue and asynchronously import record data into NetSuite.  
[task.CsvImportTaskStatus](section_4345798793.html) |  Object |  Server scripts |  The status of a CSV import task placed into the NetSuite scheduling queue.  
[task.DocumentCaptureTask](article_78075142728.html) |  Object |  Server scripts |  The properties of a document capture task. Use the methods and properties of this object to submit a document capture task into the NetSuite task queue.  
[task.DocumentCaptureTaskStatus](article_84075519375.html) |  Object |  Server scripts |  The status of a document capture task placed into the NetSuite task queue.  
[task.EntityDeduplicationTask](section_4345799008.html) |  Object |  Server scripts |  All the properties of a merge duplicate records task request. Use the methods and properties of this object to submit a merge duplicate record job task into the NetSuite task queue.  
[task.EntityDeduplicationTaskStatus](section_4345799153.html) |  Object |  Server scripts |  The status of a merge duplicate record task placed into the NetSuite task queue.  
[task.MapReduceScriptTask](section_4345798404.html) |  Object |  Server scripts |  A map/reduce script deployment.  
[task.MapReduceScriptTaskStatus](section_4345798546.html) |  Object |  Server scripts |  The status of a map/reduce script deployment that has been submitted for processing.  
[task.QueryTask](section_159223655124.html) |  Object |  Server scripts |  The properties of a query task. Use the methods and properties of this object to submit a query task into the NetSuite task queue.  
[task.QueryTaskStatus](section_159223798559.html) |  Object |  Server scripts |  The status of a query task placed into the NetSuite task queue.  
[task.RecordActionTask](section_1544121429.html) |  Object |  Server scripts |  The properties of a record action task. Use this object to place a record action task into the NetSuite scheduling queue.  
[task.RecordActionTaskStatus](section_1544125423.html) |  Object |  Server scripts |  The status of a record action task in the NetSuite scheduling queue.  
[task.ScheduledScriptTask](section_4392318707.html) |  Object |  Server scripts |  All the properties of a scheduled script task in SuiteScript. Use this object to place a scheduled script deployment into the NetSuite scheduling queue.  
[task.ScheduledScriptTaskStatus](section_4345798266.html) |  Object |  Server scripts |  The status of a scheduled script placed into the NetSuite scheduling queue.  
[task.SearchTask](section_4799343953.html) |  Object |  Server scripts |  The properties required to initiate an asynchronous search.  
[task.SearchTaskStatus](section_4799344334.html) |  Object |  Server scripts |  The status of an asynchronous search initiation task that is placed into the NetSuite task queue.  
[task.SuiteQLTask](section_159223833809.html) |  Object |  Server scripts |  The properties of a SuiteQL task. Use the methods and properties of this object to submit a query task into the NetSuite task queue.  
[task.SuiteQLTaskStatus](section_159223884561.html) |  Object |  Server scripts |  The status of a SuiteQL task placed into the NetSuite task queue.  
[task.WorkflowTriggerTask](section_4345799266.html) |  Object |  Server scripts |  All the properties required to asynchronously initiate a workflow. Use WorkflowTriggerTask to create a task that initiates an instance of a specific workflow.  
[task.WorkflowTriggerTaskStatus](section_4345799392.html) |  Object |  Server scripts |  The status of an asynchronous workflow initiation task placed into the NetSuite task queue.  
Method |  [task.checkStatus(options)](section_4345805891.html) |  [task.CsvImportTaskStatus](section_4345798793.html) | [task.DocumentCaptureTaskStatus](article_84075519375.html) | [task.EntityDeduplicationTaskStatus](section_4345799153.html) | [task.MapReduceScriptTaskStatus](section_4345798546.html) | [task.QueryTaskStatus](section_159223798559.html) | [task.RecordActionTaskStatus](section_1544125423.html) | [task.ScheduledScriptTaskStatus](section_4345798266.html) | [task.SearchTaskStatus](section_4799344334.html) | [task.SuiteQLTaskStatus](section_159223884561.html) |[task.WorkflowTriggerTaskStatus](section_4345799392.html) |  Server scripts |  Returns a task status object associated with a specific task ID.  
[task.create(options)](section_4392320106.html) |  [task.CsvImportTask](section_4345798668.html) | [task.DocumentCaptureTask](article_78075142728.html) | [task.EntityDeduplicationTask](section_4345799008.html) | [task.MapReduceScriptTask](section_4345798404.html) | [task.QueryTask](section_159223655124.html) | [task.RecordActionTask](section_1544121429.html) | [task.ScheduledScriptTask](section_4392318707.html) | [task.SearchTask](section_4799343953.html) | [task.SuiteQLTask](section_159223833809.html) | [task.WorkflowTriggerTask](section_4345799266.html) |  Server scripts |  Creates an object for a specific task type and returns the task object.  
Enum |  [task.ActionCondition](section_1544128916.html) |  enum |  Server scripts |  Holds the string values for the possible record action conditions. This enum is returned by [RecordActionTask.condition](section_1544123142.html).  
[task.DedupeEntityType](section_4345807845.html) |  enum |  Server scripts |  Holds the string values for entity types for which you can merge duplicate records with [task.EntityDeduplicationTask](section_4345799008.html).  
[task.DedupeMode](section_4345807658.html) |  enum |  Server scripts |  Holds the string values for available deduplication modes when merging duplicate records with [task.EntityDeduplicationTask](section_4345799008.html). Use this enum to set the [EntityDeduplicationTask.entityType](section_458601928710.html).  
[task.MapReduceStage](section_4345808152.html) |  enum |  Server scripts |  Holds the string values for the stages of a map/reduce script deployment, which is encapsulated by the [task.MapReduceScriptTask](section_4345798404.html) object. This enum is returned by [MapReduceScriptTaskStatus.stage](section_460753112791.html).  
[task.MasterSelectionMode](section_4345807507.html) |  enum |  Server scripts |  Holds the string values for supported master selection modes when merging duplicate records with [task.EntityDeduplicationTask](section_4345799008.html). Use this enum to set the [EntityDeduplicationTask.masterSelectionMode](section_46682983398.html) property.  
[task.TaskStatus](section_4345807357.html) |  enum |  Server scripts |  Holds the string values for the possible status of tasks created and submitted with the [N/task Module](section_4345787858.html).  
[task.TaskType](section_4345806937.html) |  enum |  Server scripts |  Holds the string values for the types of task objects you can create using [task.create(options)](section_4392320106.html). Use this enum to set the value for the `options.taskType` parameter of the [task.create(options)](section_4392320106.html) method.  

## CsvImportTask Object Members

The following members are available for a [task.CsvImportTask](section_4345798668.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [CsvImportTask.submit()](section_5594909667.html) |  string |  Server scripts |  Directs NetSuite to place a CSV import task into the NetSuite task queue and returns a unique ID for the task. You can use this method only in bundle installation scripts, scheduled scripts, and RESTlets.  
Property |  [CsvImportTask.id](section_158228669163.html) |  string |  Server scripts |  The ID of the task.  
[CsvImportTask.importFile](section_459367004393.html) |  [file.File](section_4247974825.html) | string |  Server scripts |  CSV file to import. Use a [file.File](section_4247974825.html) object or a string that represents the CSV text to be imported.  
[CsvImportTask.linkedFiles](section_458306823729.html) |  Object |  Server scripts |  A map of key-value pairs that sets the data to be imported in a linked file for a multi-file import job, by referencing a file in the File Cabinet or the raw CSV data to import.  
[CsvImportTask.mappingId](section_457792297362.html) |  number | string |  Server scripts |  Script ID or internal ID of the saved import map that you created when you ran the Import Assistant.  
[CsvImportTask.name](section_454580627441.html) |  string |  Server scripts |  Name for the CSV import task.  
[CsvImportTask.queueId](section_454650817870.html) |  number |  Server scripts |  Overrides the **Queue Number** property under **Advanced Options** on the **Import Options** page of the Import Assistant.  

## CsvImportTaskStatus Object Members

The following members are available for a [task.CsvImportTaskStatus](section_4345798793.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [CsvImportTaskStatus.status](section_453959899902.html) |  string (read-only) |  Server scripts |  Status for a CSV import task. Returns a [task.TaskStatus](section_4345807357.html) enum value.  
[CsvImportTaskStatus.taskId](section_158228614995.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

## DocumentCaptureTask Object Members

The following members are available for a [task.DocumentCaptureTask](article_78075142728.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [DocumentCaptureTask.addInboundDependency(options)](article_3075210437.html) |  void |  Server scripts |  Adds a scheduled script task to the document capture task as a dependent task.  
[DocumentCaptureTask.submit()](article_11075253797.html) |  string |  Server scripts |  Submits the document capture task for asynchronous processing and returns the task ID.  
Property |  [DocumentCaptureTask.documentType](article_25082104010.html) |  string |  Server scripts |  The document type.  
[DocumentCaptureTask.features](article_23082157954.html) |  string[] |  Server scripts |  The features to extract from the document (such as fields, tables, or text).  
[DocumentCaptureTask.id](article_13075403661.html) |  string |  Server scripts |  The ID of the task.  
[DocumentCaptureTask.inboundDependencies](article_51075433575.html) |  Object[] |  Server scripts |  Key-value pairs that contain information about the dependent tasks added to the document capture task.  
[DocumentCaptureTask.inputFile](article_75075322173.html) |  [file.File](section_4247974825.html) |  Server scripts |  The document to extract content from.  
[DocumentCaptureTask.language](article_25082336704.html) |  string |  Server scripts |  The language of the document.  
[DocumentCaptureTask.outputFilePath](article_4082548662.html) |  string |  Server scripts |  The path of the JSON file to export document capture results to.  
[DocumentCaptureTask.ociConfig](article_93075458095.html) |  Object |  Server scripts |  Oracle Cloud Infrastructure (OCI) credentials when using unlimited usage mode.  

## DocumentCaptureTaskStatus Object Members

The following members are available for a [task.DocumentCaptureTaskStatus](article_84075519375.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [DocumentCaptureTaskStatus.status](article_78075616074.html) |  string (read-only) |  Server scripts |  The status for a document capture task (as a [task.TaskStatus](section_4345807357.html) enum value).  
[DocumentCaptureTaskStatus.taskId](article_38075637279.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

## EntityDeduplicationTask Object Members

The following members are available for a [task.EntityDeduplicationTask](section_4345799008.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [EntityDeduplicationTask.submit()](section_459274536131.html) |  string |  Server scripts |  Directs NetSuite to place the merge duplicate records task into the NetSuite task queue and returns a unique ID for the task.  
Property |  [EntityDeduplicationTask.dedupeMode](section_456247802733.html) |  string |  Server scripts |  The mode in which to merge or delete duplicate records. Use values from the [task.DedupeMode](section_4345807658.html) enum.  
[EntityDeduplicationTask.entityType](section_458601928710.html) |  string |  Server scripts |  The type of entity on which you want to merge duplicate records. Use a [task.DedupeEntityType](section_4345807845.html) enum to set the value.  
[EntityDeduplicationTask.id](section_158228488492.html) |  string |  Server scripts |  The ID of the task.  
[EntityDeduplicationTask.masterRecordId](section_456971679686.html) |  number |  Server scripts |  Master record ID. When you merge duplicate records, you can delete all duplicates for a record or merge information from the duplicate records into the master record.  
[EntityDeduplicationTask.masterSelectionMode](section_46682983398.html) |  string |  Server scripts |  Master selection mode. Use values from the [task.MasterSelectionMode](section_4345807507.html) enum.  
[EntityDeduplicationTask.recordIds](section_456050964354.html) |  number[] |  Server scripts |  Number array of record internal IDs to perform the merge or delete operation on.  

## EntityDeduplicationTaskStatus Object Members

The following members are available for a [task.EntityDeduplicationTaskStatus](section_4345799153.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [EntityDeduplicationTaskStatus.status](section_452162109374.html) |  string (read-only) |  Server scripts |  Status for a merge duplicate record task. Returns a [task.TaskStatus](section_4345807357.html) enum value.  
[EntityDeduplicationTaskStatus.taskId](section_158228461568.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

## MapReduceScriptTask Object Members

The following members are available for a [task.MapReduceScriptTask](section_4345798404.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [MapReduceScriptTask.submit()](section_453639770507.html) |  string |  Server scripts |  Submits a map/reduce script deployment for processing.  
Property |  [MapReduceScriptTask.deploymentId](section_456020446776.html) |  string |  Server scripts |  Script ID (as a string), for the script deployment record for a map/reduce script.  
[MapReduceScriptTask.id](section_158227558782.html) |  string |  Server scripts |  The ID of the task.  
[MapReduceScriptTask.params](section_457650390624.html) |  Object |  Server scripts |  Object that represents key-value pairs that override static script parameter field values on the script deployment record.  
[MapReduceScriptTask.scriptId](section_456008239745.html) |  number | string |  Server scripts |  Internal ID (as a number), or script ID (as a string), for the map/reduce script record.  

## MapReduceScriptTaskStatus Object Members

The following members are available for a [task.MapReduceScriptTaskStatus](section_4345798546.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [MapReduceScriptTaskStatus.getCurrentTotalSize()](section_455688720702.html) |  number |  Server scripts |  Returns the total size in bytes of all stored work in progress by a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPendingMapCount()](section_454059082030.html) |  number |  Server scripts |  Returns the total number of records or rows not yet processed by the map stage of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPendingMapSize()](section_456033874511.html) |  number |  Server scripts |  Returns the total number of bytes not yet processed by the map stage, as a component of total size, of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPendingOutputCount()](section_453068786620.html) |  number |  Server scripts |  Returns the total number of records or rows not yet processed by a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPendingOutputSize()](section_458842102049.html) |  number |  Server scripts |  Returns the total size in bytes of all key-value pairs written as output, as a component of total size, by a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPendingReduceCount()](section_453019348144.html) |  number |  Server scripts |  Returns the total number of records or rows not yet processed by the reduce stage of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPendingReduceSize()](section_454281860351.html) |  number |  Server scripts |  Returns the total number of bytes not yet processed by the reduce stage, as a component of total size, of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getPercentageCompleted()](section_456839538573.html) |  number |  Server scripts |  Returns the current percentage complete for the current stage of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getTotalMapCount()](section_459523559569.html) |  number |  Server scripts |  Returns the total number of records or rows passed as input to the map stage of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getTotalOutputCount()](section_452285705566.html) |  number |  Server scripts |  Returns the total number of records or rows passed as inputs to the output phase of a [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.getTotalReduceCount()](section_458279663085.html) |  number |  Server scripts |  Returns the total number of record or row inputs to the reduce stage of a [task.MapReduceScriptTask](section_4345798404.html).  
Property |  [MapReduceScriptTaskStatus.deploymentId](section_453416076659.html) |  string (read-only) |  Server scripts |  Script ID for a script deployment record associated with a specific [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.scriptId](section_453886657714.html) |  number (read-only) |  Server scripts |  Internal ID for a map/reduce script record associated with a specific [task.MapReduceScriptTask](section_4345798404.html).  
[MapReduceScriptTaskStatus.stage](section_460753112791.html) |  string (read-only) |  Server scripts |  The current stage of a map/reduce script deployment that is being processed. See [task.MapReduceStage](section_4345808152.html) for supported values.  
[MapReduceScriptTaskStatus.status](section_457534118651.html) |  string (read-only) |  Server scripts |  Status for a map/reduce script task. Returns a [task.TaskStatus](section_4345807357.html) enum value.  
[MapReduceScriptTaskStatus.taskId](section_158227552252.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

## QueryTask Object Members

The following members are available for a [task.QueryTask](section_159223655124.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [QueryTask.addInboundDependency(options)](section_159223731551.html) |  void |  Server scripts |  Adds a scheduled script task or map/reduce script task to the query task as a dependent task.  
[QueryTask.submit()](section_159223745979.html) |  string |  Server scripts |  Submits the query task for asynchronous processing and returns the task ID.  
Property |  [QueryTask.fileId](section_159223756577.html) |  number |  Server scripts |  Internal ID of the CSV file to export query results to. This property is mutually exclusive with the [QueryTask.filePath](section_159223771684.html) parameter.  
[QueryTask.filePath](section_159223771684.html) |  string |  Server scripts |  Path of the CSV file to export query results to. This property is mutually exclusive with the [QueryTask.fileId](section_159223756577.html) property.  
[QueryTask.id](article_42123818803.html) |  string |  Server scripts |  The ID of the task.  
[QueryTask.inboundDependencies](section_159223776276.html) |  Object[] |  Server scripts |  Key-value pairs that contain information about the dependent tasks added to the query task.  
[QueryTask.query](section_159223782030.html) |  string |  Server scripts |  Query definition for the query task.  

## QueryTaskStatus Object Members

The following members are available for a [task.QueryTaskStatus](section_159223798559.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [QueryTaskStatus.fileId](section_159223806776.html) |  number (read-only) |  Server scripts |  Internal ID of the CSV file that query results are exported to.  
[QueryTaskStatus.query](section_159223809924.html) |  [query.Query](section_1510275177.html) (read-only) |  Server scripts |  Query definition for the submitted query task.  
[QueryTaskStatus.status](section_159223812701.html) |  string (read-only) |  Server scripts |  Status of the submitted query task.  
[QueryTaskStatus.taskId](section_159223815752.html) |  string (read-only) |  Server scripts |  ID of the submitted query task.  

## RecordActionTask Object Members

The following members are available for a [task.RecordActionTaskStatus](section_1544125423.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [RecordActionTask.submit()](section_1544121926.html) |  string |  Server scripts |  Submits a record action task for processing and returns its task ID.  
Property |  [RecordActionTask.action](section_1544123083.html) |  string |  Server scripts |  The ID of the action to be invoked.  
[RecordActionTask.condition](section_1544123142.html) |  Object |  Server scripts |  The condition used to select record IDs of records for which the action is to be executed. Only the action.ALL_QUALIFIED_INSTANCES constant is currently supported.  
[RecordActionTask.id](section_158221148568.html) |  string |  Server scripts |  The ID of the task.  
[RecordActionTask.paramCallback](section_1544131790.html) |  Object |  Server scripts |  Function that takes record ID and returns the parameter object for the specified record ID.  
[RecordActionTask.params](section_1544132018.html) |  Object[] |  Server scripts |  An array of parameter objects. Each object corresponds to one record ID of the record for which the action is to be executed. The object has the following form: {recordId: 1, someParam: 'example1', otherParam: 'example2'}  
[RecordActionTask.recordType](section_1544122891.html) |  string |  Server scripts |  The record type on which the action is to be performed. For a list of record types, see [record.Type](section_4273205732.html).  

## RecordActionTaskStatus Object Members

The following members are available for a [task.RecordActionTaskStatus](section_1544125423.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [RecordActionTaskStatus.complete](section_1544128319.html) |  number (read-only) |  Server scripts |  The number of record action tasks with a completed status.  
[RecordActionTaskStatus.errors](section_1544128200.html) |  Object (read-only) |  Server scripts |  The error details of failed action executions. The value of the property is the record instance ID and the corresponding error details. The error details are returned in an unnamed object with two properties: code and message.  
[RecordActionTaskStatus.failed](section_1544128556.html) |  number (read-only) |  Server scripts |  The number of record action tasks with a failed status.  
[RecordActionTaskStatus.pending](section_1544128774.html) |  number (read-only) |  Server scripts |  The number of record action tasks with a pending status.  
[RecordActionTaskStatus.results](section_1544128024.html) |  Object (read-only) |  Server scripts |  The results of successfully executed record action tasks. The value of the property is the task instance ID and the corresponding action result.  
[RecordActionTaskStatus.status](section_1544127664.html) |  string (read-only) |  Server scripts |  Represents the record action task status. Returns a value from the [task.TaskStatus](section_4345807357.html) enum.  
[RecordActionTaskStatus.succeeded](section_1544128436.html) |  number (read-only) |  Server scripts |  The number of record action tasks with a succeeded status.  
[RecordActionTaskStatus.taskId](section_158221207526.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

## ScheduledScriptTask Object Members

The following members are available for a [task.ScheduledScriptTask](section_4392318707.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ScheduledScriptTask.submit()](section_460871520995.html) |  string |  Server scripts |  Directs NetSuite to place a scheduled script deployment into the NetSuite scheduling queue and returns a unique ID for the task.  
Property |  [ScheduledScriptTask.deploymentId](section_46258483886.html) |  string |  Server scripts |  Script ID (as a string), for the script deployment record associated with a [task.ScheduledScriptTask](section_4392318707.html) object.  
[ScheduledScriptTask.id](section_158220774438.html) |  string |  Server scripts |  The ID of the task.  
[ScheduledScriptTask.params](section_459205261229.html) |  Object |  Server scripts |  Object with key-value pairs that override the static script parameter field values on the script deployment.  
[ScheduledScriptTask.scriptId](section_459331604003.html) |  number | string |  Server scripts |  Internal ID (as a number), or script ID (as a string) for the script record associated with a [task.ScheduledScriptTask](section_4392318707.html) object.  

## ScheduledScriptTaskStatus Object Members

The following members are available for a [task.ScheduledScriptTaskStatus](section_4345798266.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [ScheduledScriptTaskStatus.deploymentId](section_454809204101.html) |  string (read-only) |  Server scripts |  Script ID for a script deployment record associated with a specific [task.ScheduledScriptTask](section_4392318707.html) object.  
[ScheduledScriptTaskStatus.scriptId](section_460720153807.html) |  number (read-only) |  Server scripts |  Internal ID for a script record associated with a specific [task.ScheduledScriptTask](section_4392318707.html) object.  
[ScheduledScriptTaskStatus.status](section_458090454100.html) |  string (read-only) |  Server scripts |  Status for a scheduled script task. Returns a [task.TaskStatus](section_4345807357.html) enum value.  
[ScheduledScriptTaskStatus.taskId](section_158220908669.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

## SearchTask Object Members

The following members are available for a [task.SearchTask](section_4799343953.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [SearchTask.addInboundDependency()](section_1530711128.html) |  void |  Server scripts |  Adds a scheduled script task or map/reduce script task to the search task as a dependent script. Dependent scripts are processed automatically when the search task is complete. For more information, see [SuiteCloud Processors](chapter_1498571420.html).  
[SearchTask.submit()](section_4804558173.html) |  string |  Server scripts |  Places the asynchronous search initiation task into the SuiteScript task queue, and returns a unique ID for the task.  
Property |  [SearchTask.fileId](section_4804562077.html) |  number |  Server scripts |  ID of the CSV file to export search results into.  
[SearchTask.filePath](section_4804562119.html) |  string |  Server scripts |  Path of the CSV file to export search results into.  
[SearchTask.id](section_158229269880.html) |  string |  Server scripts |  The ID of the task.  
[SearchTask.inboundDependencies](section_1530715682.html) |  Object[] (read-only) |  Server scripts |  Key-value pairs to describe the dependent scripts added to the search task.  
[SearchTask.savedSearchId](section_4804561931.html) |  number |  Server scripts |  ID of the saved search to be executed during the task.  

## SearchTaskStatus Object Members

The following members are available for a [task.SearchTaskStatus](section_4799344334.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SearchTaskStatus.fileId](section_4804572988.html) |  number (read-only) |  Server scripts |  ID of the CSV file into which search results are exported.  
[SearchTaskStatus.savedSearchId](section_4804572868.html) |  number (read-only) |  Server scripts |  ID of the saved search executed during the task.  
[SearchTaskStatus.status](section_4804572441.html) |  string (read-only) |  Server scripts |  Status of an asynchronous search task placed in the NetSuite task queue. Returns one of the [task.TaskStatus](section_4345807357.html) enum values.  
[SearchTaskStatus.taskId](section_4804572729.html) |  string (read-only) |  Server scripts |  ID of the asynchronous task.  

## SuiteQLTask Object Members

The following members are available for a [task.SuiteQLTask](section_159223833809.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [SuiteQLTask.addInboundDependency(options)](section_159223844941.html) |  void |  Server scripts |  Adds a scheduled script task or map/reduce script task to the SuiteQL task as a dependent task.  
[SuiteQLTask.submit()](section_159223847318.html) |  string |  Server scripts |  Submits the SuiteQL task for asynchronous processing and returns the task ID.  
Property |  [SuiteQLTask.fileId](section_159223852102.html) |  number |  Server scripts |  Internal ID of the CSV file to export SuiteQL query results to. This property is mutually exclusive with the [SuiteQLTask.filePath](section_159223855624.html) parameter.  
[SuiteQLTask.filePath](section_159223855624.html) |  string |  Server scripts |  Path of the CSV file to export SuiteQL query results to. This property is mutually exclusive with the [SuiteQLTask.fileId](section_159223852102.html) property.  
[SuiteQLTask.id](article_62124146357.html) |  string |  Server scripts |  The ID of the task.  
[SuiteQLTask.inboundDependencies](section_159223858725.html) |  Object[] |  Server scripts |  Key-value pairs that contain information about the dependent tasks added to the SuiteQL task.  
[SuiteQLTask.params](section_159223862155.html) |  Array<string | boolean | number> |  Server scripts |  Parameters for the SuiteQL query.  
[SuiteQLTask.query](section_159223864743.html) |  string |  Server scripts |  SuiteQL query definition for the SuiteQL task.  

## SuiteQLTaskStatus Object Members

The following members are available for a [task.SuiteQLTaskStatus](section_159223884561.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [SuiteQLTaskStatus.fileId](section_159223887802.html) |  number (read-only) |  Server scripts |  Internal ID of the CSV file that SuiteQL query results are exported to.  
[SuiteQLTaskStatus.params](section_159223893036.html) |  Array<string | boolean | number> (read-only) |  Server scripts |  Parameters for the SuiteQL query.  
[SuiteQLTaskStatus.query](section_159223889689.html) |  string (read-only) |  Server scripts |  SuiteQL query definition for the SuiteQL task.  
[SuiteQLTaskStatus.status](section_159223896074.html) |  string (read-only) |  Server scripts |  Status of the SuiteQL task.  
[SuiteQLTaskStatus.taskId](section_159223898107.html) |  string (read-only) |  Server scripts |  ID of the submitted SuiteQL task.  

## WorkflowTriggerTask Object Members

The following members are available for a [task.WorkflowTriggerTask](section_4345799266.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [WorkflowTriggerTask.submit()](section_459607788085.html) |  string |  Server scripts |  Directs NetSuite to place the asynchronous workflow initiation task into the NetSuite scheduling queue and returns a unique ID for the task.  
Property |  [WorkflowTriggerTask.id](section_158228405355.html) |  string |  Server scripts |  The ID of the task.  
[WorkflowTriggerTask.params](section_457660766600.html) |  Object |  Server scripts |  Object that contains key-value pairs to set default values on fields specific to the workflow.  
[WorkflowTriggerTask.recordId](section_456538635253.html) |  number |  Server scripts |  Internal ID of the workflow definition base record. For example, 55 or 124.  
[WorkflowTriggerTask.recordType](section_452073913574.html) |  string |  Server scripts |  Record type of the workflow base record. For example, customer, salesorder, or lead.  
[WorkflowTriggerTask.workflowId](section_46870056152.html) |  number | string |  Server scripts |  Internal ID (as a number), or script ID (as a string), for the workflow definition.  

## WorkflowTriggerTaskStatus Object Members

The following members are available for a [task.WorkflowTriggerTaskStatus](section_4345799392.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [WorkflowTriggerTaskStatus.status](section_46640258788.html) |  string (read-only) |  Server scripts |  Status for a asynchronous workflow placed in the NetSuite task queue. Returns a value from the [task.TaskStatus](section_4345807357.html) enum.  
[WorkflowTriggerTaskStatus.taskId](section_158221094722.html) |  string (read-only) |  Server scripts |  The task ID associated with the specified task.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
