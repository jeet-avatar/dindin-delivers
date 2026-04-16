# N/runtime — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4296359529.html
> Module: N/runtime
> Version: SuiteScript 2.x / 2.1

# N/runtime Module

Use the N/runtime module to view runtime settings for the script, the session, or the user. You can also use this module to set a session key and to see whether a particular feature is enabled in your account.

  [   ](/app/help/helpcenter.nl?fid=section_0304045354)                                

## In This Help Topic

  - N/runtime Module Members

  - Script Object Members

  - Session Object Members

  - User Object Members


## N/runtime Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [runtime.Script](section_4296527813.html) |  Object |  Client and server scripts |  Encapsulates the runtime settings of the currently executing script.  
[runtime.Session](section_4296528369.html) |  Object |  Client and server scripts |  Encapsulates the user session for the currently executing script.  
[runtime.User](section_4296528504.html) |  Object |  Client and server scripts |  Encapsulates the properties and preferences of the user currently executing the script.  
Method |  [runtime.getCurrentScript()](section_4296529387.html) |  [runtime.Script](section_4296527813.html) |  Client and server scripts |  Returns a [runtime.Script](section_4296527813.html) object that represents the currently executing script.  
[runtime.getCurrentSession()](section_4296529736.html) |  [runtime.Session](section_4296528369.html) |  Client and server scripts |  Returns a [runtime.Session](section_4296528369.html) object that represents the user session for the currently executing script.  
[runtime.getCurrentUser()](section_4296529105.html) |  [runtime.User](section_4296528504.html) |  Client and server scripts |  Returns a [runtime.User](section_4296528504.html) object that represents the properties and preferences of the user currently executing the script.  
[runtime.isFeatureInEffect(options)](section_4296530135.html) |  boolean |  Client and server scripts |  Indicates whether a particular feature is enabled in a NetSuite account. These are the features that appear on the Enable Features page.  
Property |  [runtime.accountId](section_4296530806.html) |  string (read-only) |  Client and server scripts |  The account ID for the current user.  
[runtime.country](section_159983960584.html) |  string (read-only) |  Client and server scripts |  The country for the current company.  
[runtime.envType](section_4296531123.html) |  string (read-only) |  Client and server scripts |  The current environment in which the script is executing. This property uses values from the [runtime.EnvType](section_4296647065.html) enum.  
[runtime.executionContext](section_4296531348.html) |  string (read-only) |  Client and server scripts |  The trigger of the current script. This property uses values from the [runtime.ContextType](section_4296646855.html) enum.  
[runtime.processorCount](section_1513808179.html) |  number (read-only) |  Client and server scripts |  The number of processors available to the current account.  
[runtime.queueCount](section_4296531705.html) |  number (read-only) |  Client and server scripts |  The number of scheduled script queues available to the current account.  
[runtime.version](section_4296531948.html) |  string (read-only) |  Client and server scripts |  The version of NetSuite that the method is called in. For example, this property in an account running NetSuite 2023.2 is 2023.2.  
Enum |  [runtime.ContextType](section_4296646855.html) |  enum |  Client and server scripts |  Holds the context values for script triggers. This is the type for the [runtime.executionContext](section_4296531348.html) property.  
[runtime.EnvType](section_4296647065.html) |  enum |  Client and server scripts |  Holds all possible environment types that the current script can execute in. This is the type for the [runtime.envType](section_4296531123.html) property.  
[runtime.Permission](section_4296647244.html) |  enum |  Client and server scripts |  Holds the user permission level for a specific permission ID. This is the type returned by the [User.getPermission(options)](section_4296668393.html) method.  

## Script Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Script.getParameter(options)](section_4296661592.html) |  number | Date | string | boolean |  Client and server scripts |  Returns the value of a script parameter for the currently executing script.  
[Script.getRemainingUsage()](section_4296661153.html) |  number |  Client and server scripts |  Returns the number of units remaining (per governance limitations) for the currently executing script.  
Property |  [Script.apiVersion](section_1550072971.html) |  string (read-only) |  Client and server scripts |  The current script's runtime version.  
[Script.bundleIds](section_4439977567.html) |  Array (read-only) |  Client and server scripts |  An array of bundle IDs for the bundles that include the currently executing script.  
[Script.deploymentId](section_4439939144.html) |  string (read-only) |  Server scripts |  The deployment ID for the script deployment of the currently executing script.  
[Script.id](section_4296662491.html) |  string (read-only) |  Client and server scripts |  The script ID for the currently executing script.  
[Script.logLevel](section_4296662791.html) |  string (read-only) |  Server scripts |  The script logging level for the currently executing script.  
[Script.percentComplete](section_4296662993.html) |  number |  Client and server scripts |  The percent complete for the current scheduled script execution. This value will appear in the % Complete column on the Scheduled Script Status page.  

## Session Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Session.get(options)](section_4296666278.html) |  string | null |  Server scripts |  Returns the user-defined session object value associated with the session object key. Both the session object value and associated key are defined using [Session.set(options)](section_4296667139.html).  
[Session.set(options)](section_4296667139.html) |  void |  Server scripts |  Sets a key and value for a user-defined session object.  

## User Object Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [User.getPermission(options)](section_4296668393.html) |  string |  Client and server scripts |  Returns a [runtime.Permission](section_4296647244.html) user permission level for the specified permission.  
[User.getPreference(options)](section_4296668859.html) |  string |  Client and server scripts |  Returns the value of a NetSuite preference. Currently only General Preferences and Accounting Preferences are exposed in SuiteScript. For more information about these preferences, see [General Preferences](bridgehead_N3251492.html) and [Accounting Preferences](bridgehead_N3258805.html).  
Property |  [User.contact](section_1554920187.html) |  number(read-only) |  Client and server scripts |  The internal ID of the currently logged-in contact.  
[User.department](section_4296669751.html) |  number (read-only) |  Client and server scripts |  The internal ID of the department for the current user.  
[User.email](section_4296669120.html) |  string (read-only) |  Client and server scripts |  The email address of the current user.  
[User.id](section_4296670466.html) |  number (read-only) |  Client and server scripts |  The internal ID of the current user.  
[User.location](section_4296669502.html) |  number (read-only) |  Client and server scripts |  The internal ID of the location of the current user.  
[User.name](section_4296669367.html) |  string (read-only) |  Client and server scripts |  The name of the current user.  
[User.role](section_4296669948.html) |  number (read-only) |  Client and server scripts |  The internal ID of the role for the current user.  
[User.roleCenter](section_4296670081.html) |  string (read-only) |  Client and server scripts |  The string value of the center type, or role center, for the current user.  
[User.roleId](section_4296670260.html) |  string (read-only) |  Client and server scripts |  The custom scriptId of the role for the current user.  
[User.subsidiary](section_4296670612.html) |  number (read-only) |  Client and server scripts |  The internal ID of the subsidiary for the current user.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
