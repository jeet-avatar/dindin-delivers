---
source: Oracle NetSuite Official Documentation — SuiteFlow (Workflow Manager)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# SuiteFlow (Workflow Manager)

## Overview

SuiteFlow is NetSuite's point-and-click workflow automation tool. It lets administrators
automate business processes without custom code. Workflows respond to record events,
field changes, or run on schedules.

**Navigation:** Setup > Customization > Workflow > Workflows > New

---

## Workflow Creation

1. Navigate to Setup > Customization > Workflow > Workflows > New
2. Choose the Record Type the workflow acts on (e.g., Sales Order, Vendor Bill, Custom Record)
3. Set Trigger Type (see below)
4. Add States — at minimum one Initial State and one End State
5. Add Transitions between states (with optional conditions)
6. Add Actions within each state (what happens when a record enters that state)

---

## Trigger Types

| Trigger Type    | When It Runs                                                    |
|-----------------|-----------------------------------------------------------------|
| BEFORELOAD      | Before a record is loaded/viewed — can modify field display     |
| BEFORESUBMIT    | Before a record is saved — can validate or modify values        |
| AFTERSUBMIT     | After a record is saved — can send emails, create records       |
| SCHEDULED       | On a cron schedule — processes records matching saved search    |
| ONACTION        | When user clicks a custom workflow button                       |

**BEFORELOAD** is ideal for: hiding/showing fields, setting field display types.
**BEFORESUBMIT** is ideal for: validation, setting computed values.
**AFTERSUBMIT** is ideal for: notifications, creating child records, updating related records.
**SCHEDULED** is ideal for: reminder emails, escalation processing, batch status updates.

---

## States

Every workflow has at least two states:
- **Initial State** — the state a record enters when the workflow first triggers
- **End State** — terminal state; record exits the workflow (no further processing)

**Custom states** (e.g., "Pending Approval", "Approved", "Rejected") can be added between
Initial and End states to represent business status stages.

Each state can have:
- Entry actions (run when entering the state)
- Exit actions (run when leaving the state)
- Actions that run during the state on schedule

---

## Transitions

Transitions move a record from one state to another.

**Transition configuration:**
- **From State** → **To State**
- **Trigger:** automatic (on next trigger event), manual (button click), scheduled
- **Condition:** optional — transition only fires if condition is met

**Condition types:**
- **Formula condition:** `{amount} > 1000` evaluates to true/false
- **Field comparison:** field IS / IS NOT / CONTAINS / STARTS WITH a specific value
- **AND/OR logic:** multiple conditions combined

**Example:** Transition from "Pending Approval" to "Approved" when
condition `{custbody_approval_status} IS Approved` is true.

---

## Actions

Actions define what happens in a state or on a transition.

| Action                  | Description                                                      |
|-------------------------|------------------------------------------------------------------|
| Set Field Value         | Set a field on the record to a specific value or formula         |
| Create Record           | Create a new record (e.g., task, email, custom record)           |
| Send Email              | Send email using a template or custom content                    |
| Go To Record            | Redirect user to another record                                  |
| Custom Action Script    | Execute a Workflow Action Script (SuiteScript)                   |
| Lock Record             | Prevent editing of the record or specific fields                 |
| Return User Error       | Display error message to user and stop save                      |
| Initiate Workflow       | Start another workflow (subworkflow)                             |
| Transform Record        | Create a related record via transform (e.g., SO → Invoice)       |
| Add Button              | Add a clickable button to the record form                        |
| Remove Button           | Remove a standard or custom button from the record form          |
| Go To Page              | Navigate user to a specific URL or Suitelet                      |

---

## Set Field Value Action (Common Usage)

```
Action: Set Field Value
Field: custbody_approval_status
Value Type: Static Value
Value: Approved
```

Can also use:
- Formula: `{amount} * 0.1` — computed value
- Field: copy value from another field on the record
- Date offset: `{tranDate} + 30` (for date fields)

---

## Conditions (Formula Syntax)

NetSuite formula conditions use SuiteQL-like syntax:

```
{amount} > 1000
{status} = 'A'
{custbody_department} IS 'Finance'
{closedate} < TODAY()
NVL({custbody_approver}, '') = ''
```

---

## Scheduled Workflow

A Scheduled Workflow runs against a set of records based on a saved search:

1. Set Trigger Type to SCHEDULED
2. Define the saved search (filters the records to process)
3. Set cron expression: `0 8 * * *` (8 AM daily)
4. Add actions to run for each matched record

**Common use case:** Send reminder email for invoices with `dueDate < TODAY + 7`.

---

## Workflow Fields Accessible in SuiteScript

When a Workflow Action Script is triggered, the context provides:

```javascript
// In workflow action script
function onAction(context) {
    var workflowId = context.workflowId;           // Workflow internal ID
    var workflowInstanceId = context.workflowInstanceId; // Unique run instance
    var record = context.currentRecord;            // The record being processed
}
```

In UserEvent scripts triggered BY a workflow:
```javascript
// Detect if triggered by a workflow
if (context.workflowId) {
    log.debug('Triggered by workflow', context.workflowId);
}
```

---

## Subworkflows

Workflows can trigger other workflows using the "Initiate Workflow" action.

```
Action: Initiate Workflow
Workflow: [target workflow name]
Record: [current record or specific field value]
```

This allows modular workflow design — e.g., an "Approval Notification" workflow
used by both PO and SO approval workflows.

---

## Workflow Best Practices

- Use **AFTERSUBMIT** for notifications and related record creation (never BEFORESUBMIT)
- Use **BEFORESUBMIT** for validation — Return User Error stops the save
- Set Field Value before BEFORESUBMIT fires means the value is saved with the record
- **Test on a sandbox first** — workflow actions cannot be easily undone
- Add **logging** via the Log action for troubleshooting workflow execution
- Avoid loops: a workflow triggered by AFTERSUBMIT that updates the record will re-trigger
  AFTERSUBMIT — use conditions to prevent infinite loops

---

## Workflow Execution Log

View execution history: Setup > Log and Diagnostics > Workflow Execution Log

Filter by:
- Workflow name
- Record type and ID
- Date range
- Status (Success, Error)

---

## Integration with SuiteScript

```javascript
/**
 * @NScriptType WorkflowActionScript
 * @NApiVersion 2.1
 */
define(['N/record', 'N/log'], function(record, log) {
    function onAction(context) {
        var currentRecord = context.currentRecord;
        // Perform custom logic
        log.debug('Workflow action', 'Record: ' + currentRecord.id);
        return true;
    }
    return { onAction: onAction };
});
```

Workflow Action Scripts have governance limits: 1000 units per execution.
