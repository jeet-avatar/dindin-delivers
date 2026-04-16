# N/record — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4267255811.html
> Module: N/record
> Version: SuiteScript 2.x / 2.1

# N/record Module

Use the N/record module to work with NetSuite records. You can use this module to create, delete, copy, load, or make changes to a record.

  [   ](/app/help/helpcenter.nl?fid=section_0304042919)                                

SuiteScript supports working with standard NetSuite records and with instances of custom record types. Supported standard record types are described in the [SuiteScript Records Browser](https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2025_2/script/index.html). Refer also to [SuiteScript Supported Records](chapter_N3170023.html). For help working with an instance of a custom record type, see [Custom Record](section_N3204194.html).

For help finding a record's internal ID, see [Finding Internal IDs of Records](subsect_0416030736.html).

Important: 

SuiteScript does not support direct access to the NetSuite UI through the Document Object Model (DOM). The NetSuite UI should only be accessed with SuiteScript APIs.

## In This Help Topic

  - N/record Module Members

  - Column Object Members

  - Field Object Members

  - Macro Object Members

  - Record Object Members

  - Sublist Object Members

  - N/record Default Values


## N/record Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [record.Column](section_4600354269.html) |  Object |  Client and server scripts |  Encapsulates a column of a sublist on a standard or custom record.  
[record.Field](section_4435738444.html) |  Object |  Client and server scripts |  Encapsulates a body or sublist field on a standard or custom record.  
[record.Macro](section_1529089092.html) |  Object |  Client and server scripts |  Encapsulates a NetSuite record macro.  
Plain JavaScript Object |  Object |  Client and server scripts |  A plain JavaScript object of record macros available for a record type. This object is returned by [Record.getMacros()](section_1509992211.html).  
[record.Record](section_4205869719.html) |  Object |  Client and server scripts |  Encapsulates a NetSuite record.  
[record.Sublist](section_4600574625.html) |  Object |  Client and server scripts |  Encapsulates a sublist on a standard or custom record.  
Method |  [record.attach(options)](section_4267284169.html) |  void |  Client and server scripts |  Attaches a record to another record.  
[record.attach.promise(options)](section_4440821175.html) |  Promise |  Client scripts |  Attaches a record asynchronously to another record.  
[record.copy(options)](section_4267258260.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Creates a new record by copying an existing record in NetSuite.  
[record.copy.promise(options)](section_4440821922.html) |  Promise |  Client scripts |  Creates a new record asynchronously by copying an existing record in NetSuite.  
[record.create(options)](section_4267258059.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Creates a new record.  
[record.create.promise(options)](section_4440822690.html) |  Promise |  Client scripts |  Creates a new record asynchronously.  
[record.delete(options)](section_4267283372.html) |  number |  Client and server scripts |  Deletes a record.  
[record.delete.promise(options)](section_4440823302.html) |  Promise |  Client scripts |  Deletes a record asynchronously.  
[record.detach(options)](section_4267284360.html) |  void |  Client and server scripts |  Detaches a record from another record.  
[record.detach.promise(options)](section_4440824016.html) |  Promise |  Client scripts |  Detaches a record from another record asynchronously.  
[record.load(options)](section_4267258486.html) |  Object |  Client and server scripts |  Loads an existing record.  
[record.load.promise(options)](section_4440830173.html) |  Promise |  Client scripts |  Loads an existing record asynchronously.  
[record.submitFields(options)](section_4267283788.html) |  Object |  Client and server scripts |  Updates and submits one or more body fields on an existing record in NetSuite, and returns the internal ID of the parent record.  
[record.submitFields.promise(options)](section_4440830813.html) |  Promise |  Client scripts |  Updates and submits one or more body fields asynchronously on an existing record in NetSuite, and returns the internal ID of the parent record.  
[record.transform(options)](section_4267258715.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Transforms a record from one type into another, using data from an existing record.  
[record.transform.promise(options)](section_4440843375.html) |  Promise |  Client scripts |  Transforms a record from one type into another asynchronously, using data from an existing record.  
Enum |  [record.Type](section_4273205732.html) |  enum |  Client and server scripts |  Holds the string values for supported record types. Use this enum to set the value of the [Record.type](section_4296706984.html) property in cases where you are working with an instance of a standard NetSuite record type.  

## Column Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Column.id](section_4600364069.html) |  string (read-only) |  Client and server scripts |  Returns the internal ID of the column.  
[Column.isDisabled](section_158592991246.html) |  boolean |  Client and server scripts |  Indicates whether the column is disabled.  
[Column.isDisplay](section_158593019143.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether the column is displayed.  
[Column.isMandatory](section_158593030499.html) |  boolean |  Client and server scripts |  Indicates whether the column is required.  
[Column.isSortable](section_158593039336.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether the column is sortable.  
[Column.label](section_4600366751.html) |  string (read-only) |  Client and server scripts |  Returns the UI label for the column.  
[Column.sublistId](section_4600369846.html) |  string (read-only) |  Client and server scripts |  Returns the internal ID of the standard or custom sublist that contains the column.  
[Column.type](section_4600370892.html) |  string (read-only) |  Client and server scripts |  Returns the column type.  

## Field Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Field.getSelectOptions(options)](section_4435756013.html) |  array |  Client and server scripts |  Returns an array of available options on a standard or custom select, multiselect, or radio field as key-value pairs. Only the first 1,000 available options are returned.  
Property |  [Field.label](section_4435738555.html) |  string (read-only) |  Client and server scripts |  Returns the UI label for a standard or custom field body or sublist field.  
[Field.id](section_4435754429.html) |  string (read-only) |  Client and server scripts |  Returns the internal ID of a standard or custom body or sublist field.  
[Field.type](section_4435754577.html) |  string (read-only) |  Client and server scripts |  Returns the type of a body or sublist field.  
[Field.isMandatory](section_4435755588.html) |  boolean |  Client and server scripts |  Returns `true` if the standard or custom field is required on the record form, or `false` otherwise.  
[Field.sublistId](section_4834774974.html) |  string (read-only) |  Client and server scripts |  Returns the ID of the sublist associated with the specified sublist field. This property is available only when working with a record in dynamic mode.  
[Field.isDisplay](section_1526056555.html) |  boolean |  Client and server scripts |  Returns `true` if the field is visible on the record form, or `false` if it is not. This property is available only when working with a record in dynamic mode.  

## Macro Object Members

The following members are called on the [record.Macro](section_1529089092.html) object. For information about record macros, see [Overview of Record Action and Macro APIs](section_1509640242.html).

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Macro.execute(options)](section_1509730726.html) |  Object |  Client and server scripts |  Performs a macro operation and returns its result in an object.  
[Macro.execute.promise(options)](section_1509730748.html) |  Promise |  Client scripts |  Performs a macro operation asynchronously.  
[Macro(options)](section_1509730768.html) |  Object |  Client and server scripts |  Performs a macro operation and returns its result in an object.  
[Macro.promise(options)](section_1509730798.html) |  Promise |  Client scripts |  Performs a macro operation asynchronously.  
Property |  [Macro.id](section_1509731173.html) |  string |  Client and server scripts |  The ID of the macro. For a list of macro IDs, see [Supported Record Macros](section_1516982642.html)  
[Macro.label](section_1509731186.html) |  string |  Client and server scripts |  The macro label.  
[Macro.description](section_1509731199.html) |  string |  Client and server scripts |  The macro description.  
[Macro.attributes](section_1509731214.html) |  Object |  Client and server scripts |  The macro defined attributes.  

## Record Object Members

The following members are called on the [record.Record](section_4205869719.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Record.cancelLine(options)](section_4273168483.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Cancels the currently selected line on a sublist.  
[Record.commitLine(options)](section_4273168899.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Commits the currently selected line on a sublist.  
[Record.executeMacro(options)](section_1509992174.html) |  Object |  Client and server scripts |  Performs macro operation and returns its result in a plain JavaScript object.  
[Record.getMacros()](section_1509992211.html) |  Object |  Client and server scripts |  Provides a plain JavaScript object that contains macro objects defined for a record type, indexed by the Macro ID.  
[Record.findMatrixSublistLineWithValue(options)](section_4597993860.html) |  number |  Client and server scripts |  Returns the line number of the first instance where a specified value is found in a specified column of the matrix.  
[Record.findSublistLineWithValue(options)](section_4273157398.html) |  number |  Client and server scripts |  Returns the line number for the first occurrence of a field value in a sublist.  
[Record.getCurrentMatrixSublistValue(options)](section_4599582937.html) |  number | Date | string | array | boolean |  Client and server scripts |  Gets the value for the currently selected line in the matrix.  
[Record.getCurrentSublistField(options)](section_4659853446.html) |  [record.Field](section_4435738444.html) |  Client and server scripts |  Returns a field object from a sublist.  
[Record.getCurrentSublistIndex(options)](section_4273172440.html) |  number |  Client and server scripts |  Returns the line number of the currently selected line.  
[Record.getCurrentSublistSubrecord(options)](section_4296710967.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Gets the subrecord for the associated sublist field on the current line.  
[Record.getCurrentSublistText(options)](section_4273172039.html) |  string |  Client and server scripts |  Returns a text representation of the field value in the currently selected line.  
[Record.getCurrentSublistValue(options)](section_4273170578.html) |  number | Date | string | array | boolean |  Client and server scripts |  Returns the value of a sublist field on the currently selected sublist line.  
[Record.getField(options)](section_4273153320.html) |  [record.Field](section_4435738444.html) |  Client and server scripts |  Returns a field object from a record.  
[Record.getFields()](section_4273152646.html) |  string[] |  Client and server scripts |  Returns the body field names (internal ids) of all the fields in the record, including machine header field and matrix header fields.  
[Record.getLineCount(options)](section_4273157892.html) |  number |  Client and server scripts |  Returns the number of lines in a sublist.  
[Record.getMacro(options)](section_1509992196.html) |  [record.Macro](section_1529089092.html) |  Client and server scripts |  Provides a macro to execute.  
[Record.getMacros()](section_1509992211.html) |  Object |  Client and server scripts |  Provides a plain JavaScript object that contains macro objects defined for a record type, indexed by the Macro ID.  
[Record.getMatrixHeaderCount(options)](section_4599668537.html) |  number |  Client and server scripts |  Returns the number of columns for the specified matrix.  
[Record.getMatrixHeaderField(options)](section_4599679237.html) |  [record.Field](section_4435738444.html) |  Client and server scripts |  Gets the field for the specified header in the matrix.  
[Record.getMatrixHeaderValue(options)](section_4599703938.html) |  number | Date | string | array | boolean |  Client and server scripts |  Gets the value for the associated header in the matrix.  
[Record.getMatrixSublistField(options)](section_4599708431.html) |  [record.Field](section_4435738444.html) |  Client and server scripts |  Gets the field for the specified sublist in the matrix.  
[Record.getMatrixSublistValue(options)](section_4599712373.html) |  number | Date | string | array | boolean |  Client and server scripts |  Gets the value for the associated field in the matrix.  
[Record.getSublist(options)](section_4599715398.html) |  [record.Sublist](section_4600574625.html) |  Client and server scripts |  Returns the specified sublist.  
[Record.getSublists()](section_4599718205.html) |  string[] |  Client and server scripts |  Returns all the names of all the sublists.  
[Record.getSublistField(options)](section_4273153882.html) |  [record.Field](section_4435738444.html) |  Client and server scripts |  Returns a field object from a sublist.  
[Record.getSublistFields(options)](section_4273152943.html) |  string[] |  Client and server scripts |  Returns all the field names in a sublist.  
[Record.getSublistSubrecord(options)](section_4296711506.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Gets the subrecord associated with a sublist field. (standard mode only)  
[Record.getSublistText(options)](section_4273167233.html) |  string |  Client and server scripts |  Returns the value of a sublist field in a text representation.  
[Record.getSublistValue(options)](section_4273166148.html) |  number | Date | string | array | boolean |  Client and server scripts |  Returns the value of a sublist field.  
[Record.getSubrecord(options)](section_4296709996.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Gets the subrecord for the associated field.  
[Record.getText(options)](section_4273156769.html) |  string |  Client and server scripts |  Returns the text representation of a field value.  
[Record.getValue(options)](section_4273154686.html) |  number | Date | string | array | boolean |  Client and server scripts |  Returns the value of a field. Not to be used on custom password fields. Use [crypto.checkPasswordField(options)](section_160806904480.html) instead.  
[Record.hasCurrentSublistSubrecord(options)](section_4600423347.html) |  boolean |  Client and server scripts |  Returns a value indicating whether the associated sublist field has a subrecord on the current line.  
[Record.hasSublistSubrecord(options)](section_4600435332.html) |  boolean |  Client and server scripts |  Returns a value indicating whether the associated sublist field contains a subrecord.  
[Record.hasSubrecord(options)](section_4600438392.html) |  boolean |  Client and server scripts |  Returns a value indicating whether the field contains a subrecord.  
[Record.insertLine(options)](section_4273158210.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Inserts a sublist line.  
  |    |    |     
[Record.removeCurrentSublistSubrecord(options)](section_4296712054.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Removes the subrecord for the associated sublist field on the current line.  
[Record.removeLine(options)](section_4273165479.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Removes a sublist line.  
[Record.removeSublistSubrecord(options)](section_4296712585.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Removes the subrecord for the associated sublist field. (standard mode only)  
[Record.removeSubrecord(options)](section_4296710374.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Removes the subrecord for the associated field.  
[Record.save(options)](section_4267286323.html) |  number |  Client and server scripts |  Submits a new record or saves edits to an existing record. This method is not available to subrecords.  
[Record.save.promise(options)](section_4440842328.html) |  number |  Client scripts |  Submits a new record asynchronously or saves edits to an existing record asynchronously. This method is not available to subrecords.  
[Record.selectLine(options)](section_4273169163.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Selects an existing line in a sublist.  
[Record.selectNewLine(options)](section_4273170152.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Selects a new line at the end of a sublist.  
[Record.setCurrentMatrixSublistValue(options)](section_4600520541.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value for the line currently selected in the matrix.  
[Record.setCurrentSublistText(options)](section_4296709001.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value for the field in the currently selected line by a text representation.  
[Record.setCurrentSublistValue(options)](section_4273171484.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value for the field in the currently selected line.  
[Record.setMatrixHeaderValue(options)](section_4600547643.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value for the associated header in the matrix.  
[Record.setMatrixSublistValue(options)](section_4600551458.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value for the associated field in the matrix.  
[Record.setSublistText(options)](section_4273167591.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value of a sublist field by a text representation. (standard mode only)  
[Record.setSublistValue(options)](section_4273166777.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value of a sublist field. (standard mode only)  
[Record.setText(options)](section_4273157034.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value of the field by a text representation.  
[Record.setValue(options)](section_4273155868.html) |  [record.Record](section_4205869719.html) |  Client and server scripts |  Sets the value of a field.  
Property |  [Record.id](section_4296706656.html) |  number (read-only) |  Client and server scripts |  The internal ID of a specific record. This property is not available to subrecords.  
[Record.isDynamic](section_4296707316.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether the record is in dynamic or standard mode.  
[Record.type](section_4296706984.html) |  string (read-only) |  Client and server scripts |  The record type. This property is not available to subrecords.  

## Sublist Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Sublist.getColumn(options)](section_4600579417.html) |  [record.Column](section_4600354269.html) |  Client and server scripts |  Returns a column in the sublist.  
Property |  [Sublist.id](section_4600577122.html) |  string (read-only) |  Client and server scripts |  Returns the internal ID of the sublist.  
[Sublist.isChanged](section_4600574626.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether the sublist has changed on the record form.  
[Sublist.isDisplay](section_4600593345.html) |  boolean (read-only) |  Client and server scripts |  Indicates whether the sublist is displayed on the record form.  
[Sublist.type](section_4600594177.html) |  string (read-only) |  Client and server scripts |  Returns the sublist type.  

## N/record Default Values

You can specify record initialization parameters that default when creating, copying, loading, and transforming records. To enable this behavior, use the optional `defaultValues` parameter in the following APIs:

  - [record.create(options)](section_4267258059.html)

  - [record.copy(options)](section_4267258260.html)

  - [record.transform(options)](section_4267258715.html)

  - [record.load(options)](section_4267258486.html)


The following table lists initialization types that are available to certain SuiteScript-supported records and the values they can contain.

Record |  Initialization Type |  Values  
---|---|---  
All SuiteScript-supported records that support form customization. |  customform |  _< customformid>_  
Assembly Build |  assemblyitem |  _< assemblyitemid>_  
Cash Refund |  entity |  _< entityid>_  
Cash Sale |  entity |  _< entityid>_  
Charge Rule |  entity |  _< entityid>_  
Check |  entity |  _< entityid>_  
Credit Memo |  entity |  _< entityid>_  
Customer Payment |  entity |  _< entityid>_  
Customer Refund |  entity |  _< entityid>_  
Deposit |  disablepaymentfilters |  _< disablepaymentfilters>_  
Estimate |  entity |  _< entityid>_  
Expense Report |  entity |  _< entityid>_  
Invoice |  entity |  _< entityid>_  
Item Receipt |  entity |  _< entityid>_  
Non-Inventory Part |  subtype |  sale | resale | purchase  
Opportunity |  entity |  _< entityid>_  
Other Charge Item |  subtype |  sale | resale | purchase  
Purchase Order |  entity |  _< entityid>_  
Return Authorization |  entity |  _< entityid>_  
Sales Order |  entity |  _< entityid>_  
Script Deployment |  script |  _< scriptid>_  
Service |  subtype |  sale | resale | purchase  
Subscription Change Order |    |  _< scriptid>_ See [Default Values](section_1493322182.html#bridgehead_160261472010).  
Tax Group |  nexuscountry |  _< countrycode>_ See Country Codes Used for Initialization Parameters.  
Tax Type |  country |  _< countrycode>_ See Country Codes Used for Initialization Parameters.  
Topic |  parenttopic |  _< parenttopicid>_  
Vendor Bill |  entity |  _< entityid>_  
Vendor Payment |  entity |  _< entityid>_  
Work Order |  assemblyitem |  _< assemblyitemid>_  

## Country Codes Used for Initialization Parameters

If you are scripting the Tax Group or Tax Type records, you can initialize the record to source all values related to a specific country. In your script, use the country code for the _countrycodeid_ value, for example:
[code] 
              record.create('taxgroup', {nexuscountry: 'AR'}); 


[/code]

**Country Code** |  **Country Name**  
---|---  
AD |  Andorra  
AE |  United Arab Emirates  
AF |  Afghanistan  
AG |  Antigua and Barbuda  
AI |  Anguilla  
AL |  Albania  
AM |  Armenia  
AO |  Angola  
AQ |  Antarctica  
AR |  Argentina  
AS |  American Samoa  
AT |  Austria  
AU |  Australia  
AW |  Aruba  
AX |  Ã land Islands  
AZ |  Azerbaijan  
BA |  Bosnia and Herzegovina  
BB |  Barbados  
BD |  Bangladesh  
BE |  Belgium  
BF |  Burkina Faso  
BG |  Bulgaria  
BH |  Bahrain  
BI |  Burundi  
BJ |  Benin  
BL |  Saint BarthÃ©lemy  
BM |  Bermuda  
BN |  Brunei Darrussalam  
BO |  Bolivia (Plurinational State of)  
BQ |  Bonaire, Sint Eustatius and Saba  
BR |  Brazil  
BS |  Bahamas  
BT |  Bhutan  
BV |  Bouvet Island  
BW |  Botswana  
BY |  Belarus  
BZ |  Belize  
CA |  Canada  
CC |  Cocos (Keeling) Islands  
CD |  Congo (the Democratic Republic of the)  
CF |  Central African Republic  
CG |  Congo  
CH |  Switzerland  
CI |  CÃ´te d'Ivoire  
CK |  Cook Islands  
CL |  Chile  
CM |  Cameroon  
CN |  China  
CO |  Colombia  
CR |  Costa Rica  
CU |  Cuba  
CV |  Cabo Verde  
CW |  Curacao  
CX |  Christmas Island  
CY |  Cyprus  
CZ |  Czechia  
DE |  Germany  
DJ |  Djibouti  
DK |  Denmark  
DM |  Dominica  
DO |  Dominican Republic  
DZ |  Algeria  
EA |  Ceuta and Melilla  
EC |  Ecuador  
EE |  Estonia  
EG |  Egypt  
EH |  Western Sahara  
ER |  Eritrea  
ES |  Spain  
ET |  Ethiopia  
FI |  Finland  
FJ |  Fiji  
FK |  Falkland Islands (Malvinas)  
FM |  Micronesia (Federated States of)  
FO |  Faroe Islands  
FR |  France  
GA |  Gabon  
GB |  United Kingdom  
GD |  Grenada  
GE |  Georgia  
GF |  French Guiana  
GG |  Guernsey  
GH |  Ghana  
GI |  Gibraltar  
GL |  Greenland  
GM |  Gambia  
GN |  Guinea  
GP |  Guadeloupe  
GQ |  Equatorial Guinea  
GR |  Greece  
GS |  South Georgia and the South Sandwich Islands  
GT |  Guatemala  
GU |  Guam  
GW |  Guinea-Bissau  
GY |  Guyana  
HK |  Hong Kong  
HM |  Heard Island and McDonald Islands  
HN |  Honduras  
HR |  Croatia  
HT |  Haiti  
HU |  Hungary  
IC |  Canary Islands  
ID |  Indonesia  
IE |  Ireland  
IL |  Israel  
IM |  Isle of Man  
IN |  India  
IO |  British Indian Ocean Territory  
IQ |  Iraq  
IR |  Iran (Islamic Republic of)  
IS |  Iceland  
IT |  Italy  
JE |  Jersey  
JM |  Jamaica  
JO |  Jordan  
JP |  Japan  
KE |  Kenya  
KG |  Kyrgyzstan  
KH |  Cambodia  
KI |  Kiribati  
KM |  Comoros  
KN |  Saint Kitts and Nevis  
KP |  Korea (the Democratic People's Republic of)  
KR |  Korea (the Republic of)  
KW |  Kuwait  
KY |  Cayman Islands  
KZ |  Kazakhstan  
LA |  Lao People's Democratic Republic  
LB |  Lebanon  
LC |  Saint Lucia  
LI |  Liechtenstein  
LK |  Sri Lanka  
LR |  Liberia  
LS |  Lesotho  
LT |  Lithuania  
LU |  Luxembourg  
LV |  Latvia  
LY |  Libya  
MA |  Morocco  
MC |  Monaco  
MD |  Moldova (the Republic of)  
ME |  Montenegro  
MF |  Saint Martin (French part)  
MG |  Madagascar  
MH |  Marshall Islands  
MK |  North Macedonia  
ML |  Mali  
MM |  Myanmar  
MN |  Mongolia  
MO |  Macao  
MP |  Northern Mariana Islands  
MQ |  Martinique  
MR |  Mauritania  
MS |  Montserrat  
MT |  Malta  
MU |  Mauritius  
MV |  Maldives  
MW |  Malawi  
MX |  Mexico  
MY |  Malaysia  
MZ |  Mozambique  
NA |  Namibia  
NC |  New Caledonia  
NE |  Niger  
NF |  Norfolk Island  
NG |  Nigeria  
NI |  Nicaragua  
NL |  Netherlands  
NO |  Norway  
NP |  Nepal  
NR |  Nauru  
NU |  Niue  
NZ |  New Zealand  
OM |  Oman  
PA |  Panama  
PE |  Peru  
PF |  French Polynesia  
PG |  Papua New Guinea  
PH |  Philippines  
PK |  Pakistan  
PL |  Poland  
PM |  Saint Pierre and Miquelon  
PN |  Pitcairn  
PR |  Puerto Rico  
PS |  Palestine, State of  
PT |  Portugal  
PW |  Palau  
PY |  Paraguay  
QA |  Qatar  
RE |  RÃ©union  
RO |  Romania  
RS |  Serbia  
RU |  Russian Federation  
RW |  Rwanda  
SA |  Saudi Arabia  
SB |  Solomon Islands  
SC |  Seychelles  
SD |  Sudan  
SE |  Sweden  
SG |  Singapore  
SH |  Saint Helena, Ascension and Tristan da Cunha  
SI |  Slovenia  
SJ |  Svalbard and Jan Mayen  
SK |  Slovakia  
SL |  Sierra Leone  
SM |  San Marino  
SN |  Senegal  
SO |  Somalia  
SR |  Suriname  
SS |  South Sudan  
ST |  Sao Tome and Principe  
SV |  El Salvador  
SX |  Sint Maarten (Dutch part)  
SY |  Syrian Arab Republic  
SZ |  Eswatini  
TC |  Turks and Caicos Islands  
TD |  Chad  
TF |  French Southern Territories  
TG |  Togo  
TH |  Thailand  
TJ |  Tajikistan  
TK |  Tokelau  
TM |  Turkmenistan  
TN |  Tunisia  
TO |  Tonga  
TP |  Timor-Leste  
TR |  TÃ¼rkiye  
TT |  Trinidad and Tobago  
TV |  Tuvalu  
TW |  Taiwan (Province of China)  
TZ |  Tanzania, the United Republic of  
UA |  Ukraine  
UG |  Uganda  
UM |  United States Minor Outlying Islands  
US |  United States  
UY |  Uruguay  
UZ |  Uzbekistan  
VA |  Holy See  
VC |  Saint Vincent and the Grenadines  
VE |  Venezuela (Bolivarian Republic of)  
VG |  Virgin Islands (British)  
VI |  Virgin Islands (U.S.)  
VN |  Viet Nam  
VU |  Vanuatu  
WF |  Wallis and Futuna Islands  
WS |  Samoa  
XK |  Kosovo  
YE |  Yemen  
YT |  Mayotte  
ZA |  South Africa  
ZM |  Zambia  
ZW |  Zimbabwe  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
