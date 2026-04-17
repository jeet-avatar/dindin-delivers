# N/ui-server-widget — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4321345532.html
> Module: N/ui-server-widget
> Version: SuiteScript 2.x / 2.1

# N/ui/serverWidget Module

Use the N/ui/serverWidget module to work with the user interface within NetSuite. You can use Suitelets to build custom pages and wizards that have a NetSuite look-and-feel. You can also create various components of the NetSuite UI (for example, forms, fields, sublists, tabs).

Important: 

SuiteScript does not support direct access to the NetSuite UI through the Document Object Model (DOM). The NetSuite UI should only be accessed using SuiteScript APIs.

Important: 

When you add a UI object to an existing NetSuite page, to minimize the occurrence of field/object name conflicts, the internal ID that references the object must be prefixed with `custpage`.

  [   ](/app/help/helpcenter.nl?fid=subsect_6164157284)                                

## In This Help Topic

  - N/ui/serverWidget Module Members

  - Assistant Object Members

  - AssistantStep Object Members

  - Button Object Members

  - Field Object Members

  - FieldGroup Object Members

  - Form Object Members

  - List Object Members

  - ListColumn Object Members

  - Sublist Object Members

  - Tab Object Members


## N/ui/serverWidget Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [serverWidget.Assistant](section_4325849970.html) |  Object |  Suitelets |  A scriptable, multi-step NetSuite assistant.  
[serverWidget.AssistantStep](section_4325851003.html) |  Object |  Suitelets |  A step within a custom NetSuite assistant.  
[serverWidget.Button](section_4325806317.html) |  Object |  Suitelets and beforeLoad user events |  A button that appears in a UI object.  
[serverWidget.Field](section_4325837128.html) |  Object |  Suitelets and beforeLoad user events |  A NetSuite field.  
[serverWidget.FieldGroup](section_4325835878.html) |  Object |  Suitelets and beforeLoad user events |  A field group.  
[serverWidget.Form](section_4325835149.html) |  Object |  Suitelets and beforeLoad user events |  A NetSuite form.  
[serverWidget.List](section_4325856174.html) |  Object |  Suitelets |  A list.  
[serverWidget.ListColumn](section_4325856768.html) |  Object |  Suitelets |  A list column.  
[serverWidget.Sublist](section_4325844858.html) |  Object |  Suitelets and beforeLoad user events |  A NetSuite sublist.  
[serverWidget.Tab](section_4325849420.html) |  Object |  Suitelets and beforeLoad user events |  A NetSuite tab and subtabs.  
Method |  [serverWidget.createAssistant(options)](section_4325753291.html) |  [serverWidget.Assistant](section_4325849970.html) |  Suitelets |  Creates and returns a new assistant object.  
[serverWidget.createForm(options)](section_4329245048.html) |  [serverWidget.Form](section_4325835149.html) |  Suitelets |  Creates and returns a new form object.  
[serverWidget.createList(options)](section_4329247625.html) |  [serverWidget.List](section_4325856174.html) |  Suitelets |  Creates a List object (specifying the title, and whether to hide the navigation bar).  
Enum |  [serverWidget.AssistantSubmitAction](section_4329254732.html) |  string (read-only) |  Suitelets |  Holds the string values for submit actions performed by the user. This enum is used to set the value of the [Assistant.getLastAction()](section_4333442841.html).  
[serverWidget.FieldBreakType](section_4332670010.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for supported field break types. This enum is used to set the value of the [Field.updateBreakType(options)](section_4335187732.html) property.  
[serverWidget.FieldDisplayType](section_4332670964.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for supported field display types. This enum is used to set the value of the [Field.updateDisplayType(options)](section_4335287288.html) property.  
[serverWidget.FieldLayoutType](section_4332671038.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for the supported types of field layouts. This enum is used to set the value of the [Field.updateLayoutType(options)](section_4335294907.html) property.  
[serverWidget.FieldType](section_4332671056.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the values for supported field types. This enum is used to set the value of the `type` parameter when [Form.addField(options)](section_4337905245.html) is called.  
[serverWidget.FormPageLinkType](section_4332671075.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for supported page link types on a form. This enum is used to set the value of the `type` parameter for [Form.addPageLink(options)](section_4338794048.html).  
[serverWidget.LayoutJustification](section_4332671154.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for supported justification layouts. This enum is used to set the value of the align parameter when [List.addColumn(options)](section_4344848479.html) is called.  
[serverWidget.ListStyle](section_4332669117.html) |  string (read-only) |  Suitelets |  Holds the string values for supported list styles. This enum is used to set the value of the [List.style](section_4537550409.html) property.  
[serverWidget.SublistDisplayType](section_4332704261.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for supported sublist display types. This enum is used to set the value of the [Sublist.displayType](section_460338073729.html) property.  
[serverWidget.SublistType](section_4332704307.html) |  string (read-only) |  Suitelets and beforeLoad user events |  Holds the string values for valid sublist types. This enum is used to define the `type` parameter when [Form.addSublist(options)](section_4339569512.html) is called.  

## Assistant Object Members

The following members are called on the [serverWidget.Assistant](section_4325849970.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Assistant.addField(options)](section_4332747915.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets |  Adds a field to an assistant.  
[Assistant.addFieldGroup(options)](section_4332762451.html) |  [serverWidget.FieldGroup](section_4325835878.html) |  Suitelets |  Adds a field group to an assistant.  
[Assistant.addStep(options)](section_4332773236.html) |  [serverWidget.AssistantStep](section_4325851003.html) |  Suitelets |  Adds a step to an assistant.  
[Assistant.addSublist(options)](section_4333407203.html) |  [serverWidget.Sublist](section_4325844858.html) |  Suitelets |  Adds a sublist to an assistant.  
[Assistant.getField(options)](section_4378406680.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets |  Gets a field object.  
[Assistant.getFieldGroup(options)](section_4378406710.html) |  [serverWidget.FieldGroup](section_4325835878.html) |  Suitelets |  Gets a field group object.  
[Assistant.getFieldGroupIds()](section_4333419693.html) |  string[] |  Suitelets |  Gets all the field group IDs in an assistant.  
[Assistant.getFieldIds()](section_4333410160.html) |  string[] |  Suitelets |  Gets all the field IDs in an assistant.  
[Assistant.getFieldIdsByFieldGroup(fieldGroup)](section_4549847352.html) |  string[] |  Suitelets |  Gets all field IDs in the assistant field group.  
[Assistant.getLastAction()](section_4333442841.html) |  string |  Suitelets |  Gets the last action submitted by the user.  
[Assistant.getLastStep()](section_4333461766.html) |  [serverWidget.AssistantStep](section_4325851003.html) |  Suitelets |  Gets the step that the last submitted action came from.  
[Assistant.getNextStep()](section_4333467641.html) |  [serverWidget.AssistantStep](section_4325851003.html) |  Suitelets |  Gets the next step prompted by the assistant.  
[Assistant.getStep(options)](section_4333472133.html) |  [serverWidget.AssistantStep](section_4325851003.html) |  Suitelets |  Returns a step in an assistant.  
[Assistant.getStepCount()](section_4333478410.html) |  number |  Suitelets |  Gets the total count of steps in the assistant.  
[Assistant.getSteps()](section_4333424096.html) |  [serverWidget.AssistantStep](section_4325851003.html)[] |  Suitelets |  Gets all the steps in the assistant.  
[Assistant.getSublist(options)](section_4378445760.html) |  [serverWidget.Sublist](section_4325844858.html) |  Suitelets |  Get a Sublist object from its ID.  
[Assistant.getSublistIds()](section_4333425688.html) |  string[] |  Suitelets |  Gets all the sublist IDs in an assistant.  
[Assistant.hasErrorHtml()](section_4333490823.html) |  Boolean |  Suitelets |  Indicates whether the assistant has an error message to display.  
[Assistant.isFinished()](section_4333493801.html) |  Boolean |  Suitelets |  Indicates the status of the assistant. If set to true, the assistant is finished.  
[Assistant.sendRedirect(options)](section_4333517010.html) |  void |  Suitelets |  Manages redirects in an assistant.  
[Assistant.setSplash(options)](section_4333549069.html) |  void |  Suitelets |  Define a splash message.  
[Assistant.updateDefaultValues(values)](section_4333537728.html) |  void |  Suitelets |  Sets the default values of an array of fields that are specific to the assistant.  
Property |  [Assistant.clientScriptFileId](section_4333547812.html) |  number |  Suitelets |  The File Cabinet ID of client script file to be used in this assistant.  
[Assistant.clientScriptModulePath](section_4625432742.html) |  string |  Suitelets |  The relative path to the client script file to be used in this assistant.  
[Assistant.currentStep](section_4333435322.html) |  [serverWidget.AssistantStep](section_4325851003.html) (read-only) |  Suitelets |  The current step.  
[Assistant.errorHtml](section_4333532370.html) |  string |  Suitelets |  The error message text.  
[Assistant.finishedHtml](section_4333540884.html) |  string |  Suitelets |  The text displayed after an assistant is finished.  
[Assistant.hideAddToShortcutsLink](section_4333553611.html) |  Boolean |  Suitelets |  Whether the Add to Shortcuts Link is displayed in the UI.  
[Assistant.hideStepNumber](section_4333543298.html) |  Boolean |  Suitelets |  Whether the current and total step numbers are displayed in the UI.  
[Assistant.isNotOrdered](section_4333544993.html) |  Boolean |  Suitelets |  Whether assistant steps are ordered or unordered.  
[Assistant.title](section_4333559476.html) |  string |  Suitelets |  The title of the assistant.  

## AssistantStep Object Members

The following members are called on the [serverWidget.AssistantStep](section_4325851003.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [AssistantStep.getFieldIds()](section_4610728749.html) |  string[] |  Suitelets |  Gets all the field IDs in an assistant step.  
[AssistantStep.getLineCount(options)](section_4334385888.html) |  number |  Suitelets |  Gets the number of lines previously entered by a user in a step.  
[AssistantStep.getLineCount(options)](section_4334385888.html) |  string[] |  Suitelets |  Gets all the field IDs in a list.  
[AssistantStep.getSublistValue(options)](section_4334431322.html) |  string |  Suitelets |  Gets the current value of a sublist field (line item) in a step.  
[AssistantStep.getSubmittedSublistIds()](section_4334385704.html) |  string[] |  Suitelets |  Gets the IDs for all the sublist fields (line items) in a step.  
[AssistantStep.getValue(options)](section_4334418504.html) |  string | string[] |  Suitelets |  Gets the current value of a field.  
Property |  [AssistantStep.helpText](section_4334438434.html) |  string |  Suitelets |  The help text for a step.  
[AssistantStep.id](section_4334447959.html) |  string (read-only) |  Suitelets |  The internal ID of the step.  
[AssistantStep.label](section_4334444607.html) |  string |  Suitelets |  The label for a step.  
[AssistantStep.stepNumber](section_4334434327.html) |  number |  Suitelets |  Indicates where this step appears sequentially in an assistant.  

## Button Object Members

The following members are called on the [serverWidget.Button](section_4325806317.html) object.

Member Type |  Name |  Property Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Button.isDisabled](section_4325807642.html) |  Boolean |  Suitelets and beforeLoad user events |  Determines whether a button is dimmed.  
[Button.isHidden](section_4325806318.html) |  Boolean |  Suitelets and beforeLoad user events |  Determines whether the button is hidden in the UI.  
[Button.label](section_4325807686.html) |  string |  Suitelets and beforeLoad user events |  The label for the button.  

## Field Object Members

The following members are called on the [serverWidget.Field](section_4325837128.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Field.addSelectOption(options)](section_4449822161.html) |  void |  Suitelets and beforeLoad user events |  Adds a select option to a dropdown list for a selectable field.  
[Field.getSelectOptions(options)](section_4335162417.html) |  Object[] |  Suitelets and beforeLoad user events |  Returns the internal ID and label of the options for a select field as name/value pairs.  
[Field.setHelpText(options)](section_4335195721.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Sets the help text that appears in the field help popup.  
[Field.updateBreakType(options)](section_4335187732.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Updates the break type used to add a break in flow layout for the field.  
[Field.updateDisplaySize(options)](section_4335279800.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Updates the height and width for the field.  
[Field.updateDisplayType(options)](section_4335287288.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Updates the type of display for the field.  
[Field.updateLayoutType(options)](section_4335294907.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Updates the layout type for the field.  
Property |  [Field.alias](section_4335158000.html) |  string |  Suitelets and beforeLoad user events |  The alias used to set the field value.  
[Field.defaultValue](section_4335275520.html) |  string |  Suitelets and beforeLoad user events |  The default value for the field.  
[Field.helpText](section_158166710285.html) |  string (read-only) |  Suitelets and beforeLoad user events |  The help text for the field.  
[Field.id](section_4335174387.html) |  string (read-only) |  Suitelets and beforeLoad user events |  The internal ID for the field.  
[Field.isMandatory](section_4335318155.html) |  Boolean |  Suitelets and beforeLoad user events |  Whether the field is required.  
[Field.label](section_4335154548.html) |  string |  Suitelets and beforeLoad user events |  The label for the field.  
[Field.linkText](section_4335304242.html) |  string |  Suitelets and beforeLoad user events |  The text displayed for a link in place of the URL.  
[Field.maxLength](section_4335324500.html) |  number |  Suitelets and beforeLoad user events |  The maximum length, in characters, for the field.  
[Field.padding](section_4335328468.html) |  number |  Suitelets and beforeLoad user events |  The number of empty vertical character spaces above the field.  
[Field.richTextHeight](section_4335331512.html) |  number |  Suitelets and beforeLoad user events |  The height of a rich text field, in pixels.  
[Field.richTextWidth](section_4335332981.html) |  number |  Suitelets and beforeLoad user events |  The width of a rich text field, in pixels.  
[Field.type](section_4335171133.html) |  string (read-only) |  Suitelets and beforeLoad user events |  The type of field.  

## FieldGroup Object Members

The following members are called on the [serverWidget.FieldGroup](section_4325835878.html) object.

Member Type |  Name |  Property Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [FieldGroup.isBorderHidden](section_4335382771.html) |  Boolean |  Suitelets and beforeLoad user events |  Whether a border appears around the field group.  
[FieldGroup.isCollapsible](section_4335348134.html) |  Boolean |  Suitelets and beforeLoad user events |  Whether the field group is collapsible.  
[FieldGroup.isCollapsed](section_4335356208.html) |  Boolean |  Suitelets and beforeLoad user events |  Whether the field group is initially collapsed or expanded in the default view.  
[FieldGroup.isSingleColumn](section_4335387515.html) |  Boolean |  Suitelets and beforeLoad user events |  Whether the field group is displayed in a single column.  
[FieldGroup.label](section_4335362250.html) |  string |  Suitelets and beforeLoad user events |  The label for the field group.  

## Form Object Members

The following members are called on the [serverWidget.Form](section_4325835149.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Form.addButton(options)](section_4337761696.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets and beforeLoad user events |  Adds a button to the form.  
[Form.addCredentialField(options)](section_4337770901.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Adds a field that store credentials in NetSuite for invoking services provided by third parties.  
[Form.addField(options)](section_4337905245.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Adds a field to the form.  
[Form.addFieldGroup(options)](section_4337960739.html) |  [serverWidget.FieldGroup](section_4325835878.html) |  Suitelets and beforeLoad user events |  Adds a group of fields to the form.  
[Form.addPageInitMessage(options)](section_1530198114.html) |  void |  Suitelets and beforeLoad user events |  Shows a message on a form in view mode. You can use this method to show a message on a form based on its user event script context.  
[Form.addPageLink(options)](section_4338794048.html) |  void |  Suitelets and beforeLoad user events |  Adds a link to a form.  
[Form.addResetButton(options)](section_4338808398.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets and beforeLoad user events |  Adds a Reset button to a form that clears the values of all fields.  
[Form.addSecretKeyField(options)](section_4550325064.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Add a secret key field to the form.  
[Form.addSublist(options)](section_4339569512.html) |  [serverWidget.Sublist](section_4325844858.html) |  Suitelets and beforeLoad user events |  Adds a sublist to the form.  
[Form.addSubmitButton(options)](section_4543597606.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets and beforeLoad user events |  Adds a submit button to a form that saves user inputs.  
[Form.addSubtab(options)](section_4338820096.html) |  [serverWidget.Tab](section_4325849420.html) |  Suitelets and beforeLoad user events |  Adds a subtab to a form.  
[Form.addTab(options)](section_4339625909.html) |  [serverWidget.Tab](section_4325849420.html) |  Suitelets and beforeLoad user events |  Adds a tab to a form.  
[Form.getButton(options)](section_4339637102.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets and beforeLoad user events |  Returns a button by internal ID.  
[Form.getField(options)](section_4339676625.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Returns a field by internal ID.  
[Form.getSublist(options)](section_4339685468.html) |  [serverWidget.Sublist](section_4325844858.html) |  Suitelets and beforeLoad user events |  Returns a sublist by internal ID.  
[Form.getSubtab(options)](section_4339693214.html) |  [serverWidget.Tab](section_4325849420.html) |  Suitelets and beforeLoad user events |  Returns a subtab by internal ID.  
[Form.getTab(options)](section_4550406903.html) |  [serverWidget.Tab](section_4325849420.html) |  Suitelets and beforeLoad user events |  Returns a tab object from its internal ID.  
[Form.getTabs()](section_4339699645.html) |  string[] |  Suitelets and beforeLoad user events |  Returns the internal IDs of all tabs.  
[Form.insertField(options)](section_4339707334.html) |  void |  Suitelets and beforeLoad user events |  Inserts a field before another field within a form.  
[Form.insertSublist(options)](section_4340337306.html) |  void |  Suitelets and beforeLoad user events |  Inserts a sublist before another sublist on a form.  
[Form.insertSubtab(options)](section_4340316428.html) |  void |  Suitelets and beforeLoad user events |  Inserts a subtab before another subtab on a form.  
[Form.insertTab(options)](section_4340351224.html) |  void |  Suitelets and beforeLoad user events |  Inserts a tab before another tab on a form.  
[Form.removeButton(options)](section_4340356412.html) |  void |  Suitelets and beforeLoad user events |  Removes a button from a form.  
[Form.updateDefaultValues(options)](section_4340360899.html) |  void |  Suitelets and beforeLoad user events |  Sets the default values of many fields on a form.  
Property |  [Form.clientScriptFileId](section_4340375753.html) |  number |  Suitelets and beforeLoad user events |  The File Cabinet ID of client script file to be used in this form.  
[Form.clientScriptModulePath](section_4625445350.html) |  string |  Suitelets and beforeLoad user events |  The relative path to the client script file to be used in this form.  
[Form.title](section_4340389560.html) |  string |  Suitelets and beforeLoad user events |  The title used for the form.  

## List Object Members

The following members are called on the [serverWidget.List](section_4325856174.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [List.addButton(options)](section_4340555101.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets |  Adds a button to a list.  
[List.addColumn(options)](section_4344848479.html) |  [serverWidget.ListColumn](section_4325856768.html) |  Suitelets |  Adds a column to a list.  
[List.addEditColumn(options)](section_4344858957.html) |  [serverWidget.ListColumn](section_4325856768.html) |  Suitelets |  Adds a column containing Edit or Edit/View links to a Suitelet or Portlet list.  
[List.addPageLink(options)](section_4346411913.html) |  [serverWidget.List](section_4325856174.html) |  Suitelets |  Adds a link to a list.  
[List.addRow(options)](section_4346428830.html) |  [serverWidget.List](section_4325856174.html) |  Suitelets |  Adds a single row to a list.  
[List.addRows(options)](section_4346482649.html) |  [serverWidget.List](section_4325856174.html) |  Suitelets |  Adds multiple rows to a list.  
Property |  [List.clientScriptFileId](section_4346492713.html) |  number |  Suitelets |  The File Cabinet ID of client script file to be used in this list.  
[List.clientScriptModulePath](section_4625450746.html) |  string |  Suitelets |  The relative path to the client script file to be used in this list.  
[List.style](section_4537550409.html) |  string |  Suitelets |  The display style for this list.  
[List.title](section_4537553901.html) |  string |  Suitelets |  The List title.  

## ListColumn Object Members

The following members are called on the [serverWidget.ListColumn](section_4325856768.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [ListColumn.addParamToURL(options)](section_4539150168.html) |  [serverWidget.ListColumn](section_4325856768.html) |  Suitelets |  Adds a URL parameter (optionally defined per row) to the list column's URL.  
[ListColumn.setURL(options)](section_4539229925.html) |  [serverWidget.ListColumn](section_4325856768.html) |  Suitelets |  Sets the base URL for the list column.  
Property |  [ListColumn.label](section_4539273209.html) |  string |  Suitelets |  The label of this list column.  

## Sublist Object Members

The following members are called on the [serverWidget.Sublist](section_4325844858.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Sublist.addButton(options)](section_453578124999.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets and beforeLoad user events |  Adds a button to a sublist.  
[Sublist.addField(options)](section_456415649413.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Add a field to a sublist.  
[Sublist.addMarkAllButtons()](section_456862121581.html) |  [serverWidget.Button](section_4325806317.html)[] |  Suitelets and beforeLoad user events |  Adds a Mark All or Unmark All button.  
[Sublist.addRefreshButton()](section_458060852050.html) |  [serverWidget.Button](section_4325806317.html) |  Suitelets and beforeLoad user events |  Adds a Reset button.  
[Sublist.getField(options)](section_4793350468.html) |  [serverWidget.Field](section_4325837128.html) |  Suitelets and beforeLoad user events |  Returns a Field object on a specified sublist.  
[Sublist.getSublistValue(options)](section_452837158202.html) |  string |  Suitelets and beforeLoad user events |  Gets a field value on a sublist.  
[Sublist.insertField(options)](article_0311105505.html) |  void |  Suitelets and beforeLoad user events |  Inserts a field before another field on a sublist.  
[Sublist.setSublistValue(options)](section_456052185058.html) |  void |  Suitelets and beforeLoad user events |  Sets the value of a sublist field.  
[Sublist.updateTotallingFieldId(options)](section_457052856444.html) |  [serverWidget.Sublist](section_4325844858.html) |  Suitelets and beforeLoad user events |  Updates the ID of a field designated as a totalling column, which is used to calculate and display a running total for the sublist.  
[Sublist.updateUniqueFieldId(options)](section_46467834472.html) |  [serverWidget.Sublist](section_4325844858.html) |  Suitelets and beforeLoad user events |  Updates a field ID that is to have unique values across the rows in the sublist.  
Property |  [Sublist.displayType](section_460338073729.html) |  string |  Suitelets and beforeLoad user events |  The display style for a sublist.  
[Sublist.helpText](section_456982666015.html) |  string |  Suitelets and beforeLoad user events |  The inline help text for a sublist.  
[Sublist.label](section_455521179198.html) |  string |  Suitelets and beforeLoad user events |  The label for a sublist.  
[Sublist.lineCount](section_452748962402.html) |  number (read-only) |  Suitelets and beforeLoad user events |  The number of line items in a sublist.  

## Tab Object Members

The following members are called on the [serverWidget.Tab](section_4325849420.html) object.

Member Type |  Name |  Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Property |  [Tab.helpText](section_46605773925.html) |  string |  Suitelets and beforeLoad user events |  The inline help text for a tab or subtab.  
[Tab.label](section_454571472167.html) |  string |  Suitelets and beforeLoad user events |  The label for a tab or subtab.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)
  - [SuiteScript Versioning Guidelines](section_4417231053.html)
  - [SuiteScript 2.1](chapter_156042690639.html)
  - [Creating Custom Assistants](section_1518456420.html)


[General Notices](chapter_N000004.html)
