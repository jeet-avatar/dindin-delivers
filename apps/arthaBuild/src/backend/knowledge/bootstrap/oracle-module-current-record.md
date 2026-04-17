# N/current-record — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4625600928.html
> Module: N/current-record
> Version: SuiteScript 2.x / 2.1

# N/currentRecord Module

Use the N/currentRecord module to access the record that is active in the current client context. This module is always a dynamic object and mode of work is always dynamic, not deferred dynamic/standard. For more information, see [SuiteScript 2.x Standard and Dynamic Modes](section_1524156901.html). Be aware that when the current record is in view mode it cannot be edited; it is a read-only record when in view mode. As such, any set APIs do not work on the current record in view mode.

  [   ](/app/help/helpcenter.nl?fid=section_0302071622)                                

You can use the currentRecord module in the following types of scripts:

  - **Entry point client scripts** \- These scripts use the `@NScriptType ClientScript` annotation. (For details, see [SuiteScript 2.x JSDoc Validation](chapter_4387175355.html).) The system automatically provides this type of script with a [currentRecord.CurrentRecord](section_4642657958.html) object that represents the current record. For this reason, an entry point client script does not have to explicitly load the N/currentRecord module. To access the currentRecord object, create a variable and initialize it to the value of the `scriptContext.currentRecord` property, which is available in each of the [SuiteScript 2.x Client Script Entry Points and API](section_4489981198.html). For an example, see [SuiteScript Client Script Sample](bridgehead_4484779426.html).

  - **Client custom modules** \- These scripts do not use an `@NScriptType` annotation (see [SuiteScript 2.x Custom Modules](chapter_4704097697.html)). For these scripts, you must manually load the N/currentRecord module by naming it in the script's define statement. Additionally, you must actively retrieve a [currentRecord.CurrentRecord](section_4642657958.html) object by using the [currentRecord.get()](section_4637729624.html) or [currentRecord.get.promise()](section_4637734729.html) method. For an example, see [N/currentRecord Module Script Samples](section_0302071622.html).


Like the [N/record Module](section_4267255811.html), the currentRecord module provides access to body and sublist fields. However, you should use the record module for server scripts and for cases where a client script needs to interact with a record other than the currently active record. You should use the currentRecord module for client scripts that need to interact with the currently active record.

Additionally, the functionality of the two modules varies slightly. For example, the currentRecord module does not permit the editing of subrecords, although subrecords can be retrieved in view mode. For additional details, see the following topics:

## In This Help Topic

  - N/currentRecord Module Members

  - Column Object Members

  - CurrentRecord Object Members

  - Field Object Members

  - Sublist Object Members


Note: 

SuiteScript supports working with standard NetSuite records and with instances of custom record types. Supported standard record types are described in the [SuiteScript Records Browser](https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2025_2/script/index.html). Refer also to [SuiteScript Supported Records](chapter_N3170023.html). For help interacting with an instance of a custom record type, see [Custom Record](section_N3204194.html).

## N/currentRecord Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [currentRecord.Column](section_1501619693.html) |  Object |  Client scripts |  Encapsulates a column of a sublist on the current record.  
[currentRecord.CurrentRecord](section_4642657958.html) |  Object |  Client scripts |  Represents the record active on the current page.  
[currentRecord.Field](section_4793291846.html) |  Object |  Client scripts |  Represents a body or sublist field.  
[currentRecord.Sublist](section_1501618457.html) |  Object |  Client scripts |  Represents a sublist.  
Method |  [currentRecord.get()](section_4637729624.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Retrieves a record object that represents the current record.  
[currentRecord.get.promise()](section_4637734729.html) |  Promise |  Client scripts |  Retrieves a promise for an object that represents the current record.  

## Column Object Members

The following members are called on the [currentRecord.Column](section_1501619693.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Column.id](section_1501619846.html) |  string (read-only) |  Client scripts |  Returns the internal ID of the column.  
[Column.isDisabled](section_158618597707.html) |  boolean |  Client scripts |  Indicates whether the column is disabled.  
[Column.isMandatory](section_158618632629.html) |  boolean |  Client scripts |  Indicates whether the column is required.  
[Column.label](section_1501619880.html) |  string (read-only) |  Client scripts |  Returns the UI label for the column.  
[Column.sublistId](section_1501619931.html) |  string (read-only) |  Client scripts |  Returns the internal ID of the standard or custom sublist that contains the column.  
[Column.type](section_1501620041.html) |  string (read-only) |  Client scripts |  Returns the column type.  

## CurrentRecord Object Members

The following members are called on the [currentRecord.CurrentRecord](section_4642657958.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [CurrentRecord.cancelLine(options)](section_4637546866.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Cancels the changes made to the currently selected line.  
[CurrentRecord.commitLine(options)](section_4637565703.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Commits the currently selected line.  
[CurrentRecord.findMatrixSublistLineWithValue(options)](section_4637586269.html) |  number |  Client scripts |  Returns the line number of the first line that contains the specified value in the matrix column.  
[CurrentRecord.findSublistLineWithValue(options)](section_4637586103.html) |  number |  Client scripts |  Gets the line number for the first occurrence of a field value in a sublist.  
[CurrentRecord.getCurrentMatrixSublistValue(options)](section_4637585905.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value for the currently selected line in the matrix.  
[CurrentRecord.getCurrentSublistIndex(options)](section_4637585731.html) |  number |  Client scripts |  Gets the line number of the currently selected line.  
[CurrentRecord.getCurrentSublistSubrecord(options)](section_4637585570.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Gets the subrecord for the associated sublist field on the current line. The subrecord object is retrieved in view mode.  
[CurrentRecord.getCurrentSublistText(options)](section_4637585436.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value of the field in the currently selected line by text representation.  
[CurrentRecord.getCurrentSublistValue(options)](section_4637585213.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value of the field in the currently selected line.  
[CurrentRecord.getField(options)](section_4637585044.html) |  [currentRecord.Field](section_4793291846.html) |  Client scripts |  Gets a field object from the record.  
[CurrentRecord.getLineCount(options)](section_4637584890.html) |  number |  Client scripts |  Returns the number of lines in the sublist.  
[CurrentRecord.getMatrixHeaderCount(options)](section_4637584779.html) |  number |  Client scripts |  Returns the number of columns for the specified matrix.  
[CurrentRecord.getMatrixHeaderField(options)](section_4637584607.html) |  [currentRecord.Field](section_4793291846.html) |  Client scripts |  Gets the field for the specified header in the matrix.  
[CurrentRecord.getMatrixHeaderValue(options)](section_4637584433.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value for the associated header in the matrix.  
[CurrentRecord.getMatrixSublistField(options)](section_4637584261.html) |  [currentRecord.Field](section_4793291846.html) |  Client scripts |  Gets the field for the specified sublist in the matrix.  
[CurrentRecord.getMatrixSublistValue(options)](section_4637584028.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value for the associated field in the matrix.  
[CurrentRecord.getSublist(options)](section_4637583811.html) |  [currentRecord.Sublist](section_1501618457.html) |  Client scripts |  Gets the specified sublist object.  
[CurrentRecord.getSublistField(options)](section_4637583684.html) |  [currentRecord.Field](section_4793291846.html) |  Client scripts |  Gets the specified field object from the sublist.  
[CurrentRecord.getSublistText(options)](section_4637583397.html) |  string |  Client scripts |  Gets the value of the field in a sublist by a string representation.  
[CurrentRecord.getSublistValue(options)](section_4637583237.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value of the field in a sublist.  
[CurrentRecord.getSubrecord(options)](section_4637583010.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Gets the subrecord associated with the field. The subrecord object is retrieved in view mode.  
[CurrentRecord.getText(options)](section_4637582421.html) |  string |  Client scripts |  Gets the value of the field by a string representation.  
[CurrentRecord.getValue(options)](section_4637582256.html) |  number | Date | string | array | boolean |  Client scripts |  Gets the value of the field. Not to be used on custom password fields. Use [crypto.checkPasswordField(options)](section_160806904480.html) instead.  
[CurrentRecord.hasCurrentSublistSubrecord(options)](section_4637582063.html) |  boolean |  Client scripts |  Returns a value indicating whether the associated sublist field has a subrecord on the current line.  
[CurrentRecord.hasSublistSubrecord(options)](section_4637581548.html) |  boolean |  Client scripts |  Returns a value indicating whether the associated sublist field contains a subrecord.  
[CurrentRecord.hasSubrecord(options)](section_4637581381.html) |  boolean |  Client scripts |  Indicates whether the field has a subrecord.  
[CurrentRecord.insertLine(options)](section_4637581252.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Inserts a new line in a sublist.  
  |    |    |     
[CurrentRecord.removeCurrentSublistSubrecord(options)](section_4637581076.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Removes the subrecord for the associated sublist field on the current line.  
[CurrentRecord.removeLine(options)](section_4637580808.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Removes a line from a sublist.  
[CurrentRecord.removeSubrecord(options)](section_4637580399.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Removes the subrecord associated with the field.  
[CurrentRecord.selectLine(options)](section_4637580249.html) |  void |  Client scripts |  Selects a line item in a sublist.  
[CurrentRecord.selectNewLine(options)](section_4637580046.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Selects a new line at the end of the sublist.  
[CurrentRecord.setCurrentMatrixSublistValue(options)](section_4637579872.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value for the currently selected line in the matrix.  
[CurrentRecord.setCurrentSublistText(options)](section_4637579678.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value of the field in the currently selected line using a string representation.  
[CurrentRecord.setCurrentSublistValue(options)](section_4637579473.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value of the field in the currently selected line.  
[CurrentRecord.setMatrixHeaderValue(options)](section_4637579241.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value for the associated header in the matrix.  
[CurrentRecord.setMatrixSublistValue(options)](section_4637579037.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value for the associated field in the matrix.  
[CurrentRecord.setText(options)](section_4637577945.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value of the field using a string representation.  
[CurrentRecord.setValue(options)](section_4637577499.html) |  [currentRecord.CurrentRecord](section_4642657958.html) |  Client scripts |  Sets the value of the field.  
Property |  [CurrentRecord.id](section_4637576907.html) |  number (read-only) |  Client scripts |  Returns the internal record ID.  
[CurrentRecord.isDynamic](section_4637576809.html) |  boolean (read-only) |  Client scripts |  Indicates whether the record is dynamic.  
[CurrentRecord.type](section_4637576636.html) |  string (read-only) |  Client scripts |  Returns the record type.  

## Field Object Members

The following members are called on the [currentRecord.Field](section_4793291846.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Field.getSelectOptions(options)](section_4834781098.html) |  array |  Client scripts |  Returns an array of available options on a standard or custom select, multiselect, or radio field as key-value pairs. Only the first 1,000 available options are returned.  
[Field.insertSelectOption(options)](section_4779675098.html) |  void |  Client scripts |  Inserts an option into certain types of select and multiselect fields. This method is usable only in fields that were added by a front-end Suitelet or beforeLoad user event script.  
[Field.removeSelectOption(options)](section_4780315055.html) |  void |  Client scripts |  Removes an option from certain types of select and multiselect fields. This method is usable only in fields that were added by a front-end Suitelet or beforeLoad user event script. It is supported only in client scripts.  
Object |  [Field.id](section_4794247756.html) |  string (read-only) |  Client scripts |  Returns the internal ID of a standard or custom body or sublist field.  
[Field.isDisabled](section_4794215939.html) |  boolean |  Client scripts |  Returns `true` if the standard or custom field is disabled on the record form, or `false` otherwise.  
[Field.isDisplay](section_4794214205.html) |  boolean |  Client scripts |  Returns `true` if the field is set to display on the record form, or `false` otherwise. This property is read-only for sublist fields.  
[Field.isMandatory](section_4794223029.html) |  boolean |  Client scripts |  Returns `true` if the standard or custom field is mandatory on the record form, or `false` otherwise.  
[Field.isPopup](section_4794222162.html) |  boolean (read-only) |  Client scripts |  Returns `true` if the field is a popup list field, or `false` otherwise.  
[Field.isReadOnly](section_4794213415.html) |  boolean |  Client scripts |  Returns `true` if the field on the record form cannot be edited, or `false` otherwise. For textarea fields, this property can be read or written to. For all other fields, this property is read-only.  
[Field.isVisible](section_4794214500.html) |  boolean (read-only) |  Client scripts |  Returns `true` if the field is visible on the record form, or `false` otherwise.  
[Field.label](section_4794248033.html) |  string (read-only) |  Client scripts |  Returns the UI label for a standard or custom field body or sublist field.  
[Field.sublistId](section_1490026603.html) |  string (read-only) |  Client scripts |  Returns the ID of the sublist associated with the specified sublist field.  
[Field.type](section_4794225547.html) |  string (read-only) |  Client scripts |  Returns the type of a body or sublist field.  

## Sublist Object Members

The following members are called on the [currentRecord.Sublist](section_1501618457.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Sublist.getColumn(options)](section_1501619036.html) |  [currentRecord.Column](section_1501619693.html) |  Client scripts |  Returns a column in the sublist.  
Property |  [Sublist.id](section_1501619218.html) |  string (read-only) |  Client scripts |  Returns the internal ID of the sublist.  
[Sublist.isChanged](section_1501619246.html) |  boolean (read-only) |  Client scripts |  Indicates whether the sublist has changed on the current record form.  
[Sublist.isDisplay](section_1501619367.html) |  boolean (read-only) |  Client scripts |  Indicates whether the sublist is displayed on the current record form.  
[Sublist.type](section_1501619432.html) |  string (read-only) |  Client scripts |  Returns the sublist type.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
