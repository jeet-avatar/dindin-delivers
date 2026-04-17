# N/action — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1510761537.html
> Module: N/action
> Version: SuiteScript 2.x / 2.1

# N/action Module

Use the N/action module to execute business logic to update the state of records in view mode. To execute business logic on records in edit mode, use the record macro APIs, which are included in the [N/record Module](section_4267255811.html) module. See [Record Object Members](section_4267255811.html#bridgehead_4273190849) and [Macro Object Members](section_4267255811.html#bridgehead_1529088663). Action and Macro APIs are the programmatic equivalent to clicking a button in the UI. To learn more, see [Overview of Record Action and Macro APIs](section_1509640242.html).

  [   ](/app/help/helpcenter.nl?fid=section_0302035713)                                

The changes that you make to records with N/action module APIs are persisted in the database immediately. For example, consider the timebill record. After you click the **Approve** button in the UI, the timebill and its entries are saved in an approved state, and this change is immediately updated in the database.

Governance for action module APIs varies for actions and record types. See the action help for governance information specific to actions and record types.

A limited number of individual actions for specific record types are supported. For details, see [Supported Record Actions](section_1516982564.html).

Note: 

For supported script types, see individual member topics listed below.

## In This Help Topic

  - N/action Module Members

  - Action Object Members


## N/action Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [action.Action](section_1509380249.html) |  Object |  Client and server scripts |  Encapsulates a NetSuite record action.  
Plain JavaScript Object |  Object |  Client and server scripts |  A plain JavaScript object of actions available for a record type.  
Method |  [action.execute(options)](section_1509391388.html) |  Object |  Client and server scripts |  Executes the record action and returns action results in an object.  
[action.execute.promise(options)](section_1509392030.html) |  Promise |  Client scripts |  Asynchronously executes the record action and returns the action results in an object.  
[action.executeBulk(options)](section_1540815927.html) |  string |  Client and server scripts |  Executes an asynchronous bulk record action and returns its task ID for later status inquiry.  
[action.find(options)](section_1509389605.html) |  Object |  Client and server scripts |  Returns a plain JavaScript object of available record actions for the given record type.  
[action.find.promise(options)](section_1509391246.html) |  Promise |  Client scripts |  Asynchronously returns a plain JavaScript object of available record actions for the given record type.  
[action.get(options)](section_1509384818.html) |  [action.Action](section_1509380249.html) |  Client and server scripts |  Returns an executable record action for the given record type.  
[action.get.promise(options)](section_1509385970.html) |  Promise |  Client scripts |  Asynchronously returns an executable record action for the given record type.  

## Action Object Members

The following members are called on [action.Action](section_1509380249.html).

Member Type |  Name |  Return Type/Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Action(options)](section_1509387360.html) |  Object |  Client and server scripts |  Executes the action and returns the action results in an object.  
[Action.promise(options)](section_1509387674.html) |  Promise |  Client scripts |  Executes the action asynchronously and returns the action results in an object.  
[Action.execute(options)](section_1509386224.html) |  Object |  Client and server scripts |  Executes the action and returns the action results in an object.  
[Action.execute.promise(options)](section_1509386721.html) |  Promise |  Client scripts |  Executes the action asynchronously and returns the action results in an object.  
[Action.executeBulk(options)](section_1540816431.html) |  string |  Client and server scripts |  Executes an asynchronous bulk record action and returns its task ID for later status inquiry.  
[action.getBulkStatus(options)](section_1540816132.html) |  Object |  Client and server scripts |  Returns the current status of [action.executeBulk(options)](section_1540815927.html) with the given task ID.  
Property |  [Action.description](section_1509388207.html) |  string |  Client and server scripts |  The action description.  
[Action.id](section_1509387777.html) |  string |  Client and server scripts |  The ID of the action. For a list of action IDs, see [Supported Record Actions](section_1516982564.html).  
[Action.label](section_1509388068.html) |  string |  Client and server scripts |  The action label.  
[Action.parameters](section_1509389367.html) |  Object |  Client and server scripts |  The action parameters.  
[Action.recordType](section_1509387977.html) |  string |  Client and server scripts |  The type of the record on which the action is to be performed. For a list of record types, see [record.Type](section_4273205732.html).  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
