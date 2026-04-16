# N/plugin — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4558176297.html
> Module: N/plugin
> Version: SuiteScript 2.x / 2.1

# N/plugin Module

Use the N/plugin module to load custom plug-in implementations. For more information about custom plug-ins, see the following help topics:

  - [Custom Plug-ins](book_4060648050.html)

  - [Custom Plug-in Creation](chapter_3976789939.html)

  - [Custom Plug-in Development](section_3987089571.html)

  - [Custom Plug-in Implementation](section_3987095830.html)


  [   ](/app/help/helpcenter.nl?fid=section_0303065130)                                

Important: 

You cannot use the SuiteScript Debugger to debug a script on demand that uses the N/plugin module. You must use deployed debugging. To use deployed debugging, you must complete the steps described in [Adding a Script that Instantiates a Custom Plug-in to NetSuite](section_4574689541.html). For the complete process on creating a custom plugin, see [Custom Plug-in Development](section_3987089571.html). For additional information about ad-hoc and deployed debugging, see [SuiteScript Debugger](chapter_N3014215.html).

## In This Help Topic

  - N/plugin Module Members


## N/plugin Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [plugin.findImplementations(options)](section_4558224168.html) |  string[] |  Server scripts |  Returns the script IDs of custom plug-in type implementations.  
Method |  [plugin.loadImplementation(options)](section_4558229654.html) |  Object |  Server scripts |  Instantiates an implementation of the custom plug-in type.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
