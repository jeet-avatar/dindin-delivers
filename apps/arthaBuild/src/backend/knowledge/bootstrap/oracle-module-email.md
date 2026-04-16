# N/email — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4358552361.html
> Module: N/email
> Version: SuiteScript 2.x / 2.1

# N/email Module

Use the N/email module to send email messages from within NetSuite. You can use the N/email module to send regular, bulk, and campaign email.

  [   ](/app/help/helpcenter.nl?fid=section_0303024311)                                

## In This Help Topic

  - N/email Module Members


## N/email Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [email.send(options)](section_4358681681.html) |  void |  Client and server scripts |  Sends transactional email to an individual or group of recipients and receives bounceback notifications. Note:  To send email on another user's behalf, the user triggering the email send must have a role with the Vicarious Email (ADMI_VICARIOUS_EMAIL) permission. If a user without this permission executes SuiteScript that sends email, a Permission Violation error is returned.  
[email.send.promise(options)](section_4440805906.html) |  void |  Client scripts |  Sends transactional email asynchronously to an individual or group of recipients and receives bounceback notifications.  
[email.sendBulk(options)](section_4358667505.html) |  void |  Client and server scripts |  Sends bulk email (for use when a bounceback notification is not required).  
[email.sendBulk.promise(options)](section_4440806437.html) |  void |  Client scripts |  Sends bulk email asynchronously (for use when a bounceback notification is not required).  
[email.sendCampaignEvent(options)](section_4431144897.html) |  number |  Client and server scripts |  Sends a single 'on-demand' campaign email to a specified recipient and return a campaign response ID.  
[email.sendCampaignEvent.promise(options)](section_4440807100.html) |  number |  Client and server scripts |  Sends a single 'on-demand' campaign email asynchronously to a specified recipient and return a campaign response ID.  

Note: 

Some email recipients may have another record type or types listed on their record in the **Other Recipients** field. Because records with other relationship types share the same internal ID across types, email sent with SuiteScript is saved on each record type for the recipient. For more information, see [Records as Multiple Types](section_N1099012.html).

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
