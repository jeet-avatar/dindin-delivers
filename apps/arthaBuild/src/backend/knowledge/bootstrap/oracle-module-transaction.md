# N/transaction — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4413162576.html
> Module: N/transaction
> Version: SuiteScript 2.x / 2.1

# N/transaction Module

Use the N/transaction module to void transactions.

When you void a transaction, the total and all the line items for the transaction are set to zero. The transaction is not removed from the system. NetSuite supports two types of voids: direct voids and voids by reversing journal. For additional information, see [Voiding, Deleting, or Closing Transactions](section_N563543.html).

The type of void performed with your script depends on the targeted account's preference settings:

  - If the Using Reversing Journals preference is **disabled** , a **direct void** is performed.

  - If the Using Reversing Journals preference is **enabled** , a **void by reversing journal** is performed.


Important: 

After you successfully void a transaction, you can no longer make changes to the transaction that impact the general ledger.

  [   ](/app/help/helpcenter.nl?fid=section_0305024705)                                

## In This Help Topic

  - N/transaction Module Members


## N/transaction Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [transaction.void(options)](section_4413165692.html) |  number |  Client and server scripts |  Voids a transaction record.  
[transaction.void.promise(options)](section_4440850256.html) |  number |  Client and server scripts |  Voids a transaction record asynchronously.  
Enum |  [transaction.Type](section_4483109897.html) |  enum |  Client and server scripts |  Holds the string values for supported record types. This enum is used for the `options.type` parameter of the [transaction.void(options)](section_4413165692.html) method.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
