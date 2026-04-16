# N/task-accounting — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1554472720.html
> Module: N/task-accounting
> Version: SuiteScript 2.x / 2.1

# N/task/accounting/recognition Module

Use the N/task/accounting/recognition module to merge revenue arrangements or revenue elements. A revenue arrangement is a transaction that records the details of a sale for the purposes of revenue allocation and recognition. The N/task/accounting/recognition module lets you combine revenue arrangements or revenue elements from multiple sources to represent a single contract obligation for revenue allocation and recognition.

  [   ](/app/help/helpcenter.nl?fid=section_0305022620)                                

You can use the [recognition.create(options)](section_1554995115.html) method to create a merge task that combines entire revenue arrangements or individual revenue elements. This method returns a [recognition.MergeArrangementsTask](section_1554839832.html) object (when merging revenue arrangements) or [recognition.MergeElementsTask](section_1554924495.html) object (when merging revenue elements). After you obtain one of these objects, you can set its properties, such as the list of arrangements or elements to merge, the date on the merged revenue arrangement, whether to prospectively merge arrangements, and so on. You can use these properties to specify the same input data that you can specify when you merge revenue arrangements using the NetSuite UI. After you set its properties, you can submit the task for processing. Merge tasks are processed asynchronously.

You cannot merge more than 10,000 revenue elements at one time. An error is thrown in the script if you attempt to merge more than 10,000 revenue elements. For UI related limitations, see [Limitations for Creating Transactions](article_159361107074.html).

You can use the [recognition.checkStatus(options)](section_1555005560.html) method to check the status of a submitted merge task. This method returns a [recognition.MergeArrangementsTaskStatus](section_1554922557.html) object that describes the current status of the merge task (pending, processing, complete, or failed). This object represents the current status for either a [recognition.MergeArrangementsTask](section_1554839832.html) or a [recognition.MergeElementsTask](section_1554924495.html). If the task completes successfully, this object includes the ID of the merged revenue arrangement record that was created. If the task fails, this object includes an error message that describes the failure.

To merge revenue arrangements or revenue elements using the N/task/accounting/recognition module, the following requirements must be met:

  - The Advanced Revenue Management feature must be enabled in your account. For more information, see [Enabling the Advanced Revenue Management (Essentials) Feature](section_4331936670.html).

  - Your role must have the (Transactions) Revenue Arrangement permission assigned at a level of Create or higher. For more information, see [NetSuite Permissions Overview](section_N325094.html).


For more information about revenue arrangements, see the following help topics:

  - [Revenue Arrangement Management](section_4333740355.html) \- This topic describes revenue arrangements in general.

  - [Combination and Modification of Performance Obligations](section_4370936582.html) \- This topic describes the different types of merge results (combined revenue arrangements and prospective change orders).

  - [Revenue Arrangement](section_4544311111.html) \- This topic describes the revenue arrangement record type, including scripting considerations, supported script types, and sublist fields.


## In This Help Topic

  - N/task/accounting/recognition Module Members

  - MergeArrangementsTask Object Members

  - MergeArrangementsTaskStatus Object Members

  - MergeElementsTask Object Members


## N/task/accounting/recognition Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [recognition.MergeArrangementsTask](section_1554839832.html) |  Object |  Server scripts |  Encapsulates a task to merge all of the revenue elements from a specified list of revenue arrangements. Use [recognition.create(options)](section_1554995115.html) to create this object.  
[recognition.MergeArrangementsTaskStatus](section_1554922557.html) |  Object |  Server scripts |  Encapsulates the current status of a submitted merge task. Use [recognition.checkStatus(options)](section_1555005560.html) to create this object.  
[recognition.MergeElementsTask](section_1554924495.html) |  Object |  Server scripts |  Encapsulates a task to merge all of the specified revenue elements. Use [recognition.create(options)](section_1554995115.html) to create this object.  
Method |  [recognition.checkStatus(options)](section_1555005560.html) |  [recognition.MergeArrangementsTaskStatus](section_1554922557.html) |  Server scripts |  Checks the status of a submitted merge task.  
[recognition.create(options)](section_1554995115.html) |  [recognition.MergeArrangementsTask](section_1554839832.html) | [recognition.MergeElementsTask](section_1554924495.html) |  Server scripts |  Creates a merge task that combines entire revenue arrangements or individual revenue elements. Use values in the [recognition.TaskType](section_1555011882.html) enum to specify the type of merge task to create.  
Enum |  [recognition.TaskStatus](section_1555011639.html) |  enum |  Server scripts |  Holds the string values for supported merge task statuses. This enum is used to represent the task status in a [recognition.MergeArrangementsTaskStatus](section_1554922557.html) object.  
[recognition.TaskType](section_1555011882.html) |  enum |  Server scripts |  Holds the string values for supported merge task types. This enum is used to pass the task type argument to [recognition.create(options)](section_1554995115.html).  

## MergeArrangementsTask Object Members

The following members are available for a [recognition.MergeArrangementsTask](section_1554839832.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [MergeArrangementsTask.submit()](section_1554926010.html) |  number (read-only) |  Server scripts |  Submits the merge task for processing. This method returns a task ID that uniquely identifies the merge task.  
Property |  [MergeArrangementsTask.arrangements](section_1554917062.html) |  Array<number | string> (read-only) |  Server scripts |  Holds an array of internal IDs of the revenue arrangement records to merge.  
[MergeArrangementsTask.contractAcquisitionDeferredExpenseAccount](section_1554921345.html) |  number | string (read-only) |  Server scripts |  References the contract acquisition deferred expense account for the new revenue arrangement. This property is valid only if the accounting preference Enable Advanced Cost Amortization is enabled. For more information, see [Advanced Cost Amortization](section_4381088247.html). The default value is the account specified by the accounting preference Contract Acquisition Deferred Expense Account in your account.  
[MergeArrangementsTask.contractAcquisitionExpenseAccount](section_1554920949.html) |  number | string (read-only) |  Server scripts |  References the contract acquisition expense account for the new revenue arrangement. This property is valid only if the accounting preference Enable Advanced Cost Amortization is enabled. For more information, see [Advanced Cost Amortization](section_4381088247.html). The default value is the account specified by the accounting preference Contract Acquisition Expense Account in your account.  
[MergeArrangementsTask.contractCostAccrualDate](section_1554921464.html) |  [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) (read-only) |  Server scripts |  Describes the contract cost accrual date to use for the new revenue arrangement. This property is valid only if the accounting preference Enable Advanced Cost Amortization is enabled. For more information, see [Advanced Cost Amortization](section_4381088247.html). The default value is today's date.  
[MergeArrangementsTask.mergeResidualRevenueAmounts](section_1554921647.html) |  boolean (read-only) |  Server scripts |  Indicates whether the revenue arrangements are merged prospectively. For more information about prospective merges, see [Prospective Merges](section_1498077674.html). The default value is `false`.  
[MergeArrangementsTask.recalculateResidualFairValue](section_1554921873.html) |  boolean (read-only) |  Server scripts |  Indicates whether to recalculate the fair value on residual elements when revenue arrangements are prospectively merged. For more information about prospective merges, see [Prospective Merges](section_1498077674.html). This property can be set to `true` only if the [MergeArrangementsTask.mergeResidualRevenueAmounts](section_1554921647.html) property is also set to `true`. The default value is `false`.  
[MergeArrangementsTask.revenueArrangementDate](section_1554921989.html) |  [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) (read-only) |  Server scripts |  Describes the date of the new revenue arrangement. The default value is today's date.  

## MergeArrangementsTaskStatus Object Members

The following members are available for a [recognition.MergeArrangementsTaskStatus](section_1554922557.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [MergeArrangementsTaskStatus.errorMessage](section_1554923349.html) |  string (read-only) |  Server scripts |  Holds an error message that describes the failure of the merge task. This property is valid only if the value of the status property is `TaskStatus.FAILED`.  
[MergeArrangementsTaskStatus.inputArrangements](section_1554923372.html) |  number[] (read-only) |  Server scripts |  Holds an array of internal IDs of the revenue arrangement records to merge. This property is valid only if the merge task was created using a task type of `TaskType.MERGE_ARRANGEMENTS_TASK`.  
[MergeArrangementsTaskStatus.inputElements](section_1554923579.html) |  number[] (read-only) |  Server scripts |  Holds an array of internal IDs of the revenue elements to merge. This property is valid only if the merge task was created using a task type of `TaskType.MERGE_ELEMENTS_TASK`.  
[MergeArrangementsTaskStatus.resultingArrangement](section_1554923835.html) |  number | string (read-only) |  Server scripts |  References the internal ID of the new revenue arrangement that was created. This property is valid only if the value of the status property is `TaskStatus.COMPLETE`.  
[MergeArrangementsTaskStatus.status](section_1554924176.html) |  string (read-only) |  Server scripts |  Represents the current status of the merge task. This property uses values in the [recognition.TaskStatus](section_1555011639.html) enum.  
[MergeArrangementsTaskStatus.submissionId](section_1554924308.html) |  number | string (read-only) |  Server scripts |  References the submission ID of the merge arrangements bulk process.  
[MergeArrangementsTaskStatus.taskId](section_1554924405.html) |  number | string (read-only) |  Server scripts |  Holds the task ID of the merge task. The task ID is assigned to the merge task when you call [recognition.create(options)](section_1554995115.html).  

## MergeElementsTask Object Members

The following members are available for a [recognition.MergeElementsTask](section_1554924495.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [MergeElementsTask.submit()](section_1554994855.html) |  number (read-only) |  Server scripts |  Submits the merge task for processing. This method returns a task ID that uniquely identifies the merge task.  
Property |  [MergeElementsTask.contractAcquisitionDeferredExpenseAccount](section_1554925170.html) |  number | string (read-only) |  Server scripts |  References the contract acquisition deferred expense account for the new revenue arrangement. This property is valid only if the accounting preference Enable Advanced Cost Amortization is enabled. For more information, see [Advanced Cost Amortization](section_4381088247.html). The default value is the account specified by the accounting preference Contract Acquisition Deferred Expense Account in your account.  
[MergeElementsTask.contractAcquisitionExpenseAccount](section_1554924516.html) |  number | string (read-only) |  Server scripts |  References the contract acquisition expense account for the new revenue arrangement. This property is valid only if the accounting preference Enable Advanced Cost Amortization is enabled. For more information, see [Advanced Cost Amortization](section_4381088247.html). The default value is the account specified by the accounting preference Contract Acquisition Expense Account in your account.  
[MergeElementsTask.contractCostAccrualDate](section_1554925269.html) |  [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) (read-only) |  Server scripts |  Describes the contract cost accrual date to use for the new revenue arrangement. This property is valid only if the accounting preference Enable Advanced Cost Amortization is enabled. For more information, see [Advanced Cost Amortization](section_4381088247.html). The default value is today's date.  
[MergeElementsTask.elements](section_1554925375.html) |  Array<number | string> (read-only) |  Server scripts |  Holds an array of internal IDs of the revenue element records to merge.  
[MergeElementsTask.revenueArrangementDate](section_1554925489.html) |  [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) (read-only) |  Server scripts |  Describes the date of the new revenue arrangement. The default value is today's date.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [Revenue Arrangement Management](section_4333740355.html)
  - [Merging to Combine Revenue Arrangements](section_1498517429.html)
  - [Revenue Arrangement](section_4544311111.html)


[General Notices](chapter_N000004.html)
