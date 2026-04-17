# N/piremoval — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156173791240.html
> Module: N/piremoval
> Version: SuiteScript 2.x / 2.1

# N/piremoval Module

Use the N/piremoval module to remove personal information (PI) from system notes, workflow history, and specific field values. Use the N/piremoval module to comply with privacy regulations, specifically the right to be forgotten. You can remove personal information from system notes only, or you can also remove workflow history and field values on the record. Entity records, transactions, and custom records are supported.

  [   ](/app/help/helpcenter.nl?fid=section_0303064653)                                

You can use the [piremoval.createTask(options)](section_156174907211.html) method to create a PI removal task, or use [piremoval.loadTask(options)](section_156174989271.html) to load an existing PI removal task. Both of these methods return a [piremoval.PiRemovalTask](section_156174263975.html) object that represents the task. Create a [piremoval.PiRemovalTask](section_156174263975.html) object for each record type that requires removal of personal information. Use the [PiRemovalTask.save()](section_156174691190.html) method to save the task, then use the [PiRemovalTask.run()](section_156174672468.html) method to process the task and remove the personal information.

You can use the [piremoval.getTaskStatus(options)](section_156174976129.html) method to check the status of a submitted PI removal task. This method returns a [piremoval.PiRemovalTaskStatus](section_156174751485.html) object that describes the current status of the removal task. The [piremoval.PiRemovalTaskStatus](section_156174751485.html) object uses an iterator to provide a list of log entries in the [PiRemovalTaskStatus.logList](section_156174788348.html) object.

To use the N/piremoval module, the following requirements must be met:

  - Remove Personal Information Create permission is required to create a PI removal task.

  - Remove Personal Information Run permission is required to run a PI removal task.


For more information, see [Personal Information (PI) Removal](chapter_156596387080.html).

## In This Help Topic

  - N/piremoval Module Members

  - PiRemovalTask Object Members

  - PiRemovalTaskLogItem Object Members

  - PiRemovalTaskStatus Object Members


## N/piremoval Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [piremoval.PiRemovalTask](section_156174263975.html) |  Object |  Server scripts |  Encapsulates a personal information removal task. Use [piremoval.createTask(options)](section_156174907211.html) to create this object.  
[piremoval.PiRemovalTaskLogItem](section_156174820776.html) |  Object |  Server scripts |  Encapsulates a log item of the personal information removal task status.  
[piremoval.PiRemovalTaskStatus](section_156174751485.html) |  Object |  Server scripts |  Encapsulates the status of a personal information removal task. Use [piremoval.getTaskStatus(options)](section_156174976129.html) to create this object.  
Method |  [piremoval.createTask(options)](section_156174907211.html) |  [piremoval.PiRemovalTask](section_156174263975.html) |  Server scripts |  Creates a personal information removal task.  
[piremoval.deleteTask(options)](section_156174955494.html) |  void |  Server scripts |  Deletes a personal information removal task.  
[piremoval.getTaskStatus(options)](section_156174976129.html) |  [piremoval.PiRemovalTaskStatus](section_156174751485.html) |  Server scripts |  Retrieves the status of a personal information removal task.  
[piremoval.loadTask(options)](section_156174989271.html) |  [piremoval.PiRemovalTask](section_156174263975.html) |  Server scripts |  Loads a personal information removal task.  

## PiRemovalTask Object Members

The following members are available for a [piremoval.PiRemovalTask](section_156174263975.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [PiRemovalTask.deleteTask()](section_156174490300.html) |  void |  Server scripts |  Deletes the personal information removal task.  
[PiRemovalTask.run()](section_156174672468.html) |  void |  Server scripts |  Runs the personal information removal task.  
[PiRemovalTask.save()](section_156174691190.html) |  void |  Server scripts |  Saves the personal information removal task.  
Property |  [PiRemovalTask.fieldIds](section_156174501852.html) |  string[] (read-only) |  Server scripts |  Represents the field IDs that are processed by the PI removal task.  
[PiRemovalTask.historyOnly](section_156174552829.html) |  boolean |  Server scripts |  Indicates whether the PI removal task removes system note information only, not field values or workflow history.  
[PiRemovalTask.historyReplacement](section_156174597006.html) |  string (read-only) |  Server scripts |  Represents the text used in system notes to replace the original values.  
[PiRemovalTask.id](section_156174615502.html) |  number (read-only) |  Server scripts |  Represents the ID of the personal information removal task.  
[PiRemovalTask.recordIds](section_156174629555.html) |  number[] (read-only) |  Server scripts |  Represents the record IDs that are processed by the PI removal task.  
[PiRemovalTask.recordType](section_156174658201.html) |  string (read-only) |  Server scripts |  Describes the record type updated by the PI removal task.  
[PiRemovalTask.status](section_156174701248.html) |  [piremoval.PiRemovalTaskStatus](section_156174751485.html) |  Server scripts |  Describes the status of the submitted personal information removal task.  
[PiRemovalTask.workflowIds](section_156174717892.html) |  number[] (read-only) |  Server scripts |  Represents the workflow IDs whose history is processed by the PI removal task.  

## PiRemovalTaskLogItem Object Members

The following members are available for a [piremoval.PiRemovalTaskLogItem](section_156174820776.html) object.

Member Type |  Name |  Return Type/Value Type |  Support Script Type |  Description  
---|---|---|---|---  
Property |  [PiRemovalTaskLogItem.exception](section_156174844834.html) |  string (read-only) |  Server scripts |  Describes the exception for the log item, including and what caused it.  
[PiRemovalTaskLogItem.message](section_156174862773.html) |  string (read-only) |  Server scripts |  Describes the message for the log item and an explanation for any errors.  
[PiRemovalTaskLogItem.status](section_156174870975.html) |  string (read-only) |  Server scripts |  Describes the status of the log item. This property takes its values from [task.TaskStatus](section_4345807357.html).  
[PiRemovalTaskLogItem.type](section_156174886448.html) |  string (read-only) |  Server scripts |  Describes the type of personal information that was removed, one of `FieldValue`, `SystemNote`, or `Workflow`.  

## PiRemovalTaskStatus Object Members

The following members are available for a [piremoval.PiRemovalTaskStatus](section_156174751485.html) object.

Member Type |  Name |  Return Type/Value Type |  Support Script Type |  Description  
---|---|---|---|---  
Property |  [PiRemovalTaskStatus.logList](section_156174788348.html) |  list |  Server scripts |  Represents a list of logs for the PI removal task job.  
[PiRemovalTaskStatus.status](section_156174807831.html) |  string |  Server scripts |  Describes the status of the submitted personal information removal task.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [Personal Information (PI) Removal](chapter_156596387080.html)


[General Notices](chapter_N000004.html)
