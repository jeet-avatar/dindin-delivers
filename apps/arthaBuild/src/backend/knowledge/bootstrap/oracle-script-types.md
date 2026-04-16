# SuiteScript 2.x Script Types

> Source: Oracle NetSuite Official Documentation
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_4387172495.html
> Category: SuiteScript 2.x Reference

# SuiteScript 2.x Script Types

SuiteScript 2.x offers several script types each with their own entry points as described in the following table.

Script Type |  Description |  Where They Execute  
---|---|---  
[SuiteScript 2.x Bundle Installation Script Type](section_4460460309.html) |  Bundle installation scripts are specialized server scripts that perform processes in target accounts as part of a bundle installation, update, or uninstallation. These processes include setup, configuration, and data management tasks that would otherwise have to be completed by account administrators. Entry points:

  - [afterInstall(params)](section_4460460346.html) \- defines the function that executes after a bundle is installed for the first time in a target account.
  - [afterUpdate(params)](section_4460628990.html) \- defines the function that executes after a bundle in a target account is updated.
  - [beforeInstall(params)](section_4460629132.html) \- defines the function that executes before a bundle is installed for the first time in a target account.
  - [beforeUninstall(params)](section_4460629231.html) \- defines the function that executes before a bundle is uninstalled from a target account.
  - [beforeUpdate(params)](section_4460629205.html) \- defines the function that executes before a bundle in a target account is updated.

|  On the server  
[SuiteScript 2.x Client Script Type](section_4387798404.html) |  Client scripts are scripts that are executed by predefined event triggers in the client browser. They run on individual forms, can be deployed globally, and are applied to entity and transaction record types. They can validate user-entered data and auto-populate fields or sublists at various form events. Global client scripts enable centralized management of scripts that can be applied to an entire record type. Entry points:

  - [fieldChanged(scriptContext)](section_4410692508.html) \- defines the function that executes when a field is changed by a user or client call.
  - [lineInit(scriptContext)](section_4410693004.html) \- defines the function that executes when a line is initialized, such as when an existing line is selected or a new line is added (for example, to a transaction form).
  - [localizationContextEnter(scriptContext)](section_157495533652.html) \- defines the function that executes when the record enters the localization context that is specified on the script deployment record.
  - [localizationContextExit(scriptContext)](section_157495540056.html) \- defines the function that executes when the record exits the localization context.
  - [pageInit(scriptContext)](section_4410597671.html) \- defines the function that executes when the page completes loading or when the form is reset.
  - [postSourcing(scriptContext)](section_4410692646.html) \- defines the function that executes when a field that sources information from another field is modified. Executes on transaction forms only.
  - [saveRecord(scriptContext)](section_4410693749.html) \- defines the function that executes when a record is saved (that is, after the Save button is pressed but before the form is submitted).
  - [sublistChanged(scriptContext)](section_4410692812.html) \- defines the function that executes after a sublist has been inserted, removed, or edited.
  - [validateDelete(scriptContext)](section_4410693608.html) \- defines the function that executes when an existing line in an edit sublist is deleted.
  - [validateField(scriptContext)](section_4410693152.html) \- defines the function that executes when a field is changed by a user or client side call.
  - [validateInsert(scriptContext)](section_4410693455.html) \- defines the function that executes when a sublist line is inserted into an edit sublist.
  - [validateLine(scriptContext)](section_4410693302.html) \- defines the function that executes before a line is added to an inline editor sublist or editor sublist.

|  On the client's browser  
[SuiteScript 2.1 Custom Tool Script Type](article_1185045525.html) |  Custom tool scripts let external AI clients run SuiteScript code in response to natural language prompts, without you needing to log in to NetSuite. These tools have flexible entry points that are defined using a JSON schema. |  On the server  
[SuiteScript 2.x Map/Reduce Script Type](section_4387799161.html) |  The map/reduce script type is designed for scripts that need to handle large amounts of data. They provide a structured framework for processing a large number of records or a large amount of data and are best suited for situations where the data can be divided into small, independent parts. Entry points:

  - [getInputData(inputContext)](section_4412447940.html) \- defines the function that marks the beginning of the map/reduce script execution. This entry point invokes the input stage which is where input data is generated.
  - [map(mapContext)](section_4413275809.html) \- defines the function that invokes the map stage where input data is parsed into key-value pairs.
  - [reduce(reduceContext)](section_4413276172.html) \- defines the function that invokes the reduce stage where processing can occur for each key-value pair.
  - [summarize(summaryContext)](section_4413276323.html) \- defines the function that invokes the summarize stage where processed data is summarized.

|  On the server  
[SuiteScript 2.x Mass Update Script Type](section_4460452911.html) |  Mass update scripts allows you to programmatically perform custom mass updates to update fields that are not available through general mass updates. These scripts can run complex calculations across many records. Entry points:

  - [each(params)](section_4460452985.html) \- defines the function that iterates through all applicable records allowing you to add logic to each record.

|  On the server  
[SuiteScript 2.x Portlet Script Type](section_4387799288.html) |  Portlet scripts are used to create custom dashboard portlets. For example, you can use the portlet script type to create a portlet that is populated on-the-fly with company messages based on data within the system. Entry points:

  - [render(params)](section_4407951965.html) \- defines the function that executes when the Portlet script is triggered.

|  On the server, but rendered on the client's browser  
[SuiteScript 2.x RESTlet Script Type](section_4387799403.html) |  RESTlets can be used to define custom RESTful integrations to NetSuite. You can make a RESTlet available for other applications to call, either from an external application or from within NetSuite. When an application or another script calls a RESTlet, the RESTlet script executes and, in some cases, returns a value to the calling application. Entry points:

  - [delete](section_4407965553.html) \- defines the function that executes when a DELETE request is sent to a RESTlet. An HTTP response body is returned.
  - [get](section_4407965171.html) \- defines the function that executes when a GET request is sent to a RESTlet. An HTTP response body is returned.
  - [post](section_4407966008.html) \- defines the function that executes when a POST request is sent to a RESTlet. An HTTP response body is returned.
  - [put](section_4407965751.html) \- defines the function that executes when a PUT request is sent to a RESTlet. An HTTP response body is returned.

|  On the server  
[SuiteScript 2.x Scheduled Script Type](section_4387799491.html) |  Scheduled scripts are server scripts that are executed (processed) with [SuiteCloud Processors](chapter_1498571420.html). You can deploy scheduled scripts so they are submitted for processing at a future time, or at future times on a recurring basis. You can also submit scheduled scripts on demand from the deployment record or from another script with the [N/task Module](section_4345787858.html). Entry points:

  - [execute](section_4407979858.html) \- defines the function that executes when the scheduled script is triggered.

|  On the server  
[SuiteScript 2.x SDF Installation Script Type](section_1544719586.html) |  SDF installation scripts are used to perform tasks during deployment of a SuiteApp from SuiteCloud Development Framework (SDF) to your target account. They are automatically executed when a SuiteApp project is deployed. Entry points:

  - [run(scriptContext)](section_156383279814.html) \- defines what is executed when the script is specified to be run by the SDF deployment (in the deploy.xml file of an SDF project).

|  On SuiteApp project deployment  
[SuiteScript 2.x Suitelet Script Type](section_4387799600.html) |  Suitelets allow you to build custom NetSuite pages and backend logic. They are server scripts that operate in a request-response model, and are invoked by HTTP GET or POST requests to system generated URLs. Suitelets enable the creation of dynamic web content and build NetSuite-looking pages, and they can be used to implement custom front and backends. Entry points:

  - [onRequest(params)](section_4407987288.html) \- defines the function that executes when the Suitelet is triggered.

|  On the server  
[SuiteScript 2.x User Event Script Type](section_4387799721.html) |  User event scripts are executed when you perform certain actions on records, such as create, load, update, copy, delete, or submit. These scripts customize the workflow and association between your NetSuite entry forms. These scripts can also be used for additional processing before records are entered or for validating entries based on other data in the system. Entry points:

  - [afterSubmit(context)](section_4407992281.html) \- defines the function that executes immediately after a write operation on a record.
  - [beforeLoad(context)](section_4407991781.html) \- defines the function that executes whenever a read operation occurs on a record, and prior to returning the record or page.
  - [beforeSubmit(context)](section_4407992070.html) \- defines the function that executes prior to any write operation on the record.

|  On the server  
[SuiteScript 2.x Workflow Action Script Type](section_4460429314.html) |  Workflow action scripts allow you to create custom Workflow Actions that are defined on a record in a workflow. Entry points:

  - [onAction(scriptContext)](section_4460429414.html) \- defines a Workflow Action script trigger point.

|  On the server  

## SuiteScript Best Practices

  - Always thoroughly test your code before using it on your live NetSuite data.

  - Type all record, field, sublist, tab, and subtab IDs in lowercase in your SuiteScript code.

  - Prefix all custom script IDs and deployment IDs with an underscore (_).

  - Do not hard-code any passwords in scripts. The password and password2 fields are supported for scripting.

  - If the same code is used across multiple forms, ensure that you test any changes in the code for **each** form that the code is associated with.

  - Include proper error handling sequences in your script wherever data may be inconsistent, not available, or invalid for certain functions. For example, if your script requires a field value to validate another, ensure that the field value is available.

  - Organize your code into reusable chunks. Many functions can be used in a variety of forms. Any reusable functions should be stored in a common library file and then called into specific event functions for the required forms as needed.

  - Place all custom code and markup, including third party libraries, in your own namespace.

Important: 

Custom code must not be used to access the NetSuite DOM. Developers must use SuiteScript APIs to access NetSuite UI components.

  - Use the built in Library functions whenever possible for reading/writing Date/Currency fields and for querying XML documents

  - During script development, break your scripts into components, load them individually, and then test each one - inactivating all but the one you are testing when multiple components are tied to a single user event.

  - When working with script type events, your function name should correspond with the event. For example, a pageInit event can be named PageInit or formAPageInit.

  - Since name values can change, ensure that you use **static** ID values in your API calls where applicable.

  - Although you can use any desired naming conventions for functions within your code, you should use custom namespaces or unique prefixes for all your function names.

  - Thoroughly comment your code. This practice helps with debugging and development and assists NetSuite Customer Support in locating problems if necessary. However, note the inline comments are not allowed within an object.

  - You must use the [runtime.getCurrentScript()](section_4296529387.html) function in the runtime module to reference script parameters. For example, use the following code to obtain the value of a script parameter named custscript_case_field:
[code] define(['N/runtime'], function(runtime) {
            function pageInit(context) {
                var strField = runtime.getCurrentScript().getParameter('SCRIPT', 'custscript_case_field');
                ...
            }); 


[/code]

  - Make sure that your script does not take a long time to execute. A script may execute for a long time if any or all of the following occur:

    - The script performs a large number of record operations without going over the usage limit.

    - The script processes a large number of transactions for the same records, such as items or lot numbers, without exceeding the usage unit limit.

    - The script causes a large number of user event scripts or workflows to execute.

    - The script performs database searches or updates that collectively take a long time to finish

Each server script type or application has a time limit for execution. This limit is not fixed and depends on the script type or application. If a single execution of a server script or application takes longer than the time limit for that script type or application, a `SSS_TIME_LIMIT_EXCEEDED` error is thrown. This error can also be thrown from a script that is executed by another script (for example, from a user event script that is executed by a scheduled script).


You can use SuiteScript Analysis to learn about when the script was installed and how it performed in the past. For more information, see [Analyzing Scripts](section_4299098804.html).

### Related Topics

  - [SuiteScript 2.x](article_8161516336.html)
  - [SuiteScript 2.x API Introduction](chapter_4387172221.html)
  - [SuiteScript 2.1](chapter_156042690639.html)
  - [SuiteScript 2.x Analytic APIs](article_159524581218.html)
  - [SuiteScript 2.x Record Actions and Macros](chapter_1529336272.html)
  - [SuiteScript 2.x JSDoc Validation](chapter_4387175355.html)
  - [SuiteScript 2.x Entry Point Script Creation and Deployment](chapter_4525001447.html)
  - [SuiteScript 2.x Custom Modules](chapter_4704097697.html)
  - [SuiteScript 2.x Scripting Records and Subrecords](chapter_4675582755.html)
  - [SuiteScript 2.x Custom Pages](chapter_1518456405.html)
  - [Transitioning from SuiteScript 1.0 to SuiteScript 2.x](article_160098544034.html)


[General Notices](chapter_N000004.html)
