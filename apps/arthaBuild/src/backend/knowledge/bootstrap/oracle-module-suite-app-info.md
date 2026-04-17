# N/suite-app-info — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_160236086332.html
> Module: N/suite-app-info
> Version: SuiteScript 2.x / 2.1

# N/suiteAppInfo Module

Use the N/suiteAppInfo module to access information related to SuiteApps and Bundles. This module is available for all script types.

  [   ](/app/help/helpcenter.nl?fid=section_0303051612)                                

## In This Help Topic

  - N/suiteAppInfo Module Members


## N/suiteAppInfo Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [suiteAppInfo.isBundleInstalled(options)](section_160236055067.html) |  boolean |  Client and server scripts |  Returns `true` if the specific bundle is installed.  
[suiteAppInfo.isSuiteAppInstalled(options)](section_160236079756.html) |  boolean |  Client and server scripts |  Returns `true` if the specified SDF SuiteApp is installed.  
[suiteAppInfo.listBundlesContainingScripts(options)](section_160236064276.html) |  Object |  Client and server scripts |  Returns the IDs for bundles that contain the specified script, for each script specified.  
[suiteAppInfo.listInstalledBundles()](section_160236062593.html) |  Object[] |  Client and server scripts |  Returns a list of bundles that are installed.  
[suiteAppInfo.listInstalledSuiteApps()](section_160236082257.html) |  Object[] |  Client and server scripts |  Returns a list of SDF SuiteApps that are installed.  
[suiteAppInfo.listSuiteAppsContainingScripts(options)](section_160236084150.html) |  Object |  Client and server scripts |  Returns the ID for the SDF SuiteApp that contains the specified script, for each script specified.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
