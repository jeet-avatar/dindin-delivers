# SuiteScript 2.1 Guide

> Source: Oracle NetSuite Official Documentation
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_156042690639.html
> Category: SuiteScript 2.x Reference

# SuiteScript 2.1

SuiteScript 2.1 is the latest version of SuiteScript and can be used for server and client scripts. For server scripts, the Graal runtime engine is used. This engine supports ECMAScript 2023 which lets you use new language capabilities and functions in your scripts and may also improve script performance. For client scripts, you can include functions and features supported by the ECMAScript version your browser uses.

SuiteScript 2.1 supports several new ECMAScript features you can use in your scripts. For example, the spread operator lets you expand an iterable inside another object or array. You can use the spread operator to combine values from two objects into a new one. For more information about other powerful new language features supported in SuiteScript 2.1, see [SuiteScript 2.1 Language Examples](section_156042699370.html).

SuiteScript 2.0 uses a different runtime engine and is based on a less sophisticated version of ECMAScript (ES5.1). For more information about ECMAScript, see [JavaScript language resources](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Language_Resources).

A few notes:

  - The functionality provided by the SuiteScript API is the same for SuiteScript 2.0 and SuiteScript 2.1, with a few exceptions, such as the N/llm and N/pgp modules. For more information about this API, see [SuiteScript 2.x API Reference](article_4140956840.html).

  - You can debug SuiteScript 2.1 scripts using your browser's debugger. For more information about debugging SuiteScript 2.1 scripts, see [Debugging SuiteScript 2.1 Scripts](section_160418115436.html).

  - Some SuiteScript 2.1 features are not fully supported in client scripts, such as for subrecords. For example, you may get an error if your client script is deployed for All Records, since that includes subrecords. In this case, if you need to deploy to All Records, update your 2.1 client script to use ES5.1 features instead of newer ECMAScript ones. ECMAScript features.

  - SuiteScript 2.1 client scripts are not currently supported in the Scriptable Cart. For more information about the Scriptable Cart, see [Scriptable Cart](chapter_N2545000.html) and [SuiteScript for Scriptable Cart](section_N2545233.html).

  - SuiteTax does not support SuiteScript 2.1. To use the full functionality of SuiteTax, you must use SuiteScript 2.0. For more information, see [SuiteTax Engine](chapter_1557396965.html).


For more information about how to run your script as a SuiteScript 2.1 script, see [Running Scripts Using SuiteScript 2.1](section_156632003699.html).

### Related Support Article

  - [Changes to SuiteScript 2.x Annotated Server Scripts](https://suiteanswers.custhelp.com/app/answers/detail/a_id/92635)


### Related Topics

  - [SuiteScript 2.x API Introduction](chapter_4387172221.html)
  - [SuiteScript 2.x Script Types](chapter_4387172495.html)
  - [SuiteScript 2.x Record Actions and Macros](chapter_1529336272.html)
  - [SuiteScript 2.x JSDoc Validation](chapter_4387175355.html)
  - [SuiteScript 2.x Entry Point Script Creation and Deployment](chapter_4525001447.html)
  - [SuiteScript 2.x Custom Modules](chapter_4704097697.html)
  - [SuiteScript 2.x Scripting Records and Subrecords](chapter_4675582755.html)
  - [SuiteScript 2.x Custom Pages](chapter_1518456405.html)


[General Notices](chapter_N000004.html)
