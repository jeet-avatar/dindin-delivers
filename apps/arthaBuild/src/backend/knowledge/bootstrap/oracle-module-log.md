# N/log — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4574548135.html
> Module: N/log
> Version: SuiteScript 2.x / 2.1

# N/log Module

Use the N/log module to manually access methods for logging script execution details. These methods can also be accessed using the global log object. For more information about the global log object, see [log Object](section_4387812838.html).

Log messages appear on the Execution Log subtab of the script deployment for deployed scripts, or on the Execution Log subtab of the SuiteScript Debugger if you are debugging a script. Log messages also appear on the Script Execution Logs page at _Customization > Scripting > Script Execution Logs_.

  [   ](/app/help/helpcenter.nl?fid=section_0303041954)                                

## In This Help Topic

  - N/log Module Guidelines

  - Using Log Levels

  - Viewing Script Execution Logs

  - N/log Module Members


## N/log Module Guidelines

The following guidelines are provided for use of the N/log module:

  - NetSuite governs the amount of logging that can be done in any specific 60 minute time period. A company is allowed to make up to 100,000 log object method calls across **all** of their scripts. Script owners are notified if NetSuite detects that one script is logging excessively and automatically adjusts the log level.

  - NetSuite purges logs older than **30 days**.

  - The Server Script Log search and the Execution Log subtab of script records and script deployment records have a log storage limit of 5 million per database. Because log persistence is not guaranteed, You should use custom records if you want to store script execution logs for extended periods. The Script Execution Logs page at _Customization > Scripting > Script Execution Logs_ does not share the same database limit.

  - The Execution Log subtab also lists notes returned by NetSuite such as error messages. For more information, see [N/error Module](section_4243798608.html).

  - If you deploy a client script to a form using [Form.clientScriptFileId](section_4340375753.html) or [Form.clientScriptModulePath](section_4625445350.html), using the N/log module adds the logs to the deployment of the parent script. The parent script can be either a `beforeLoad` user event script or a [SuiteScript 2.x Suitelet Script Type](section_4387799600.html).

  - If a client script uses the N/log module and it is attached to a form (see [SuiteScript 2.x Form-Level Script Deployments](section_4575178433.html)), calls to any log function (log.audit, log.debug, log.emergency, log.error) are ignored. The script executes successfully, however, nothing will be logged. To log messages in a client script that is attached to a form, use the console.log function.

  - When an object (that is not a string) is passed to a log object method, NetSuite runs [JSON.stringify(obj)](section_4434858442.html) on any values that are passed as the `details` parameter and equal a JavaScript object.
[code] 
                      ...  
        // log.debug(myRecord) //Shows the JSON representation of the current values in the myRecord object
          var id = myRecord.save();
        ... 


[/code]


## Using Log Levels

Use the log methods along with the Log Level field on the script deployment to specify which log messages are written to the Execution Log on the script deployment. This is useful during the debugging of a script or for providing useful execution notes for auditing or tracking purposes.

Log levels on the script deployment and N/log module methods act as a filter on the amount of information logged. The following Log Levels are supported:

Log Level |  Example Uses  
---|---  
Debug |  Use Debug to show all messages. This type of logging is suitable only for testing scripts. To avoid excessive logging, don't use Debug level for active scripts in production.  
Audit |  Use Audit to shows a record of events that have occurred during the processing of the script (for example, 'A request was made to an external site.').  
Error |  Use Error to show only unexpected script errors.  
Emergency |  Use Emergency to show only the most critical errors in the script log.  

The following table shows you which type of log messages are written based on the Log Level field selected on the script deployment and the log method used in your script.

Log Level |  Log method used in your script  
---|---  
  |  [log.emergency(options)](section_4430385611.html) |  [log.error(options)](section_4430385812.html) |  [log.audit(options)](section_4430384449.html) |  [log.debug(options)](section_4430385329.html)  
Emergency |  |  - |  - |  -  
Error |  |  |  - |  -  
Audit |  |  |  |  -  
Debug |  |  |  |   

## Viewing Script Execution Logs

Note: 

Log messages written in client scripts that are attached to a form are viewed in the browser debug console tab when the client script runs on the form. Log messages written in server scripts and client scripts (that are deployed at the record level) are viewed in NetSuite.

Log messages for a specific script are shown on the Execution Log of the script deployment for the script. These logs are not guaranteed to persist for 30 days and may be purged to enhance performance if volume is high.

To view script execution log details for server scripts, go to _Customization > Scripting > Script Execution Logs_. This list of script execution logs is an enhanced repository that stores all log details for 30 days.

On this page, you can perform the following tasks:

  - Search for specific logs using filter options, such as log level, execution date range, and script name.

  - Download the list as a CSV file or an Excel spreadsheet.

  - Print the list.


When you debug a script in the SuiteScript Debugger, log messages appear on the Execution Log subtab of the SuiteScript Debugger and do not appear on any Execution Log subtab of any script deployment.

## N/log Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [log.audit(options)](section_4430384449.html) |  void |  Client* and server scripts |  Logs an Audit message.  
[log.debug(options)](section_4430385329.html) |  void |  Client* and server scripts |  Logs a Debug message.  
[log.emergency(options)](section_4430385611.html) |  void |  Client* and server scripts |  Logs an Emergency message.  
[log.error(options)](section_4430385812.html) |  void |  Client* and server scripts |  Logs an Error message.  

* If a client script uses the N/log module and it is attached to a form (see [SuiteScript 2.x Form-Level Script Deployments](section_4575178433.html)), calls to any log function (log.audit, log.debug, log.emergency, log.error) are ignored. The script executes successfully, however, nothing will be logged. To log messages in a client script that is attached to a form, use the console.log function. You can use N/log module methods in client scripts that are deployed at the record level or are called from a server script.

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
