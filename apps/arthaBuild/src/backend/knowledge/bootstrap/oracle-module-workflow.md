# N/workflow — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4341725558.html
> Module: N/workflow
> Version: SuiteScript 2.x / 2.1

# N/workflow Module

Use the N/workflow module to initiate new workflow instances or trigger existing workflow instances.

  [   ](/app/help/helpcenter.nl?fid=section_0305035055)                                

## In This Help Topic

  - N/workflow Module Members


## N/workflow Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [workflow.initiate(options)](section_4344303916.html) |  number |  Server scripts |  Initiates a workflow on-demand. This method is the programmatic equivalent of the [Initiate Workflow Action](section_N2743465.html) action in SuiteFlow. Returns the internal ID of the workflow instance used to track the workflow against the record.  
[workflow.trigger(options)](section_4344892270.html) |  number |  Server scripts |  Triggers a workflow on a record. The actions and transitions of the workflow are evaluated for the record in the workflow instance, based on the current state for the workflow instance. Returns the internal ID of the workflow instance used to track the workflow against the record.  

### Related Topics

  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
