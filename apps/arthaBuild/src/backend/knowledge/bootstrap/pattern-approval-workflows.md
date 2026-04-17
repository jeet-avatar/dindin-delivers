---
source: Oracle NetSuite Official Documentation — Approval Workflow Patterns
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Approval Workflow Patterns

## Overview

Approval workflows in NetSuite can be implemented in two ways:
1. **SuiteFlow (no-code):** Point-and-click workflow with states and transitions
2. **Custom Script:** Programmatic control via SuiteScript

Both approaches support escalation, delegation, and multi-level approvals.

---

## Approach 1: SuiteFlow Workflow

### Workflow Configuration

Navigate: Setup > Customization > Workflow > Workflows > New

**States:**
- Initial State (workflow entry)
- Pending Approval (approval required)
- Approved (workflow terminal positive)
- Rejected (workflow terminal negative)
- End State

**Transitions:**
- Initial → Pending Approval (always, on AFTERSUBMIT)
- Pending Approval → Approved (condition: `{custbody_approver_decision} = 'Approved'`)
- Pending Approval → Rejected (condition: `{custbody_approver_decision} = 'Rejected'`)

---

### State: Pending Approval

**Actions (on entry to state):**

1. **Set Field Value:** `custbody_approval_status = 'Pending'`
2. **Send Email:** notify approver
3. **Add Button:** "Approve" and "Reject" buttons on the record

**Email Action Configuration:**
- Recipient: `{custbody_approver}` (field reference to employee)
- Template: Approval Request email template
- Subject: `Approval Required: {tranid} - ${amount}`

---

### State: Approved

**Actions (on entry to state):**

1. **Set Field Value:** `custbody_approval_status = 'Approved'`
2. **Set Field Value:** `custbody_approval_date = {now}` (today's date)
3. **Send Email:** notify requestor of approval
4. **Unlock Record:** if record was locked during approval

---

### State: Rejected

**Actions (on entry to state):**

1. **Set Field Value:** `custbody_approval_status = 'Rejected'`
2. **Send Email:** notify requestor with rejection reason
3. **Return User Error** (optional): if rejecting should prevent save

---

### SuiteFlow: Custom Fields Needed

| Field ScriptId                | Type         | Description                          |
|-------------------------------|--------------|--------------------------------------|
| `custbody_approval_status`    | List/Record  | Pending, Approved, Rejected          |
| `custbody_approver`           | List/Record  | Employee who must approve            |
| `custbody_approver_decision`  | List/Record  | Set by approver: Approved/Rejected   |
| `custbody_approval_notes`     | Long Text    | Comments from approver               |
| `custbody_approval_date`      | Date/Time    | Timestamp of approval action         |
| `custbody_approval_requested` | Date/Time    | When approval was first requested    |

---

## Approach 2: Custom Script

```javascript
/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 */
define(['N/record', 'N/email', 'N/runtime', 'N/log', 'N/error'], function(record, email, runtime, log, error) {

    function beforeSubmit(context) {
        var newRecord = context.newRecord;
        var execContext = context.type;

        // Handle "Approve" action (custom button click)
        if (execContext === context.UserEventType.APPROVE) {
            var currentUser = runtime.getCurrentUser();
            var approver = newRecord.getValue({ fieldId: 'custbody_approver' });

            if (currentUser.id != approver) {
                throw error.create({
                    name: 'WRONG_APPROVER',
                    message: 'Only the designated approver can approve this record',
                    notifyOff: true
                });
            }

            newRecord.setValue({ fieldId: 'custbody_approval_status', value: 'Approved' });
            newRecord.setValue({ fieldId: 'custbody_approval_date', value: new Date() });
        }
    }

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        var status = newRecord.getValue({ fieldId: 'custbody_approval_status' });

        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            if (status === 'Pending') {
                sendApprovalRequest(newRecord);
            } else if (status === 'Approved') {
                sendApprovalConfirmation(newRecord);
            } else if (status === 'Rejected') {
                sendRejectionNotice(newRecord);
            }
        }
    }

    function sendApprovalRequest(rec) {
        var approverId = rec.getValue({ fieldId: 'custbody_approver' });
        var tranId = rec.getValue({ fieldId: 'tranid' });
        var total = rec.getValue({ fieldId: 'total' });
        var recUrl = 'https://system.netsuite.com/app/accounting/transactions/salesord.nl?id=' + rec.id;

        email.send({
            author: runtime.getCurrentUser().id,
            recipients: approverId,  // Employee internal ID
            subject: 'Approval Required: ' + tranId,
            body: 'A record requires your approval.\n\n' +
                  'Record: ' + tranId + '\n' +
                  'Amount: $' + total + '\n\n' +
                  'Click here to review: ' + recUrl
        });
        log.audit('Approval email sent', 'To: ' + approverId + ' for ' + tranId);
    }

    return { beforeSubmit: beforeSubmit, afterSubmit: afterSubmit };
});
```

---

## Escalation

When an approval is not acted upon within a deadline, escalate:

```javascript
/**
 * @NScriptType ScheduledScript
 * @NApiVersion 2.1
 */
define(['N/search', 'N/email', 'N/record', 'N/log'], function(search, email, record, log) {
    function execute(context) {
        var escThresholdDays = 2;
        var cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - escThresholdDays);

        var overdueApprovals = search.create({
            type: search.Type.SALES_ORDER,
            filters: [
                search.createFilter({ name: 'custbody_approval_status', operator: search.Operator.IS, values: ['Pending'] }),
                search.createFilter({ name: 'custbody_approval_requested', operator: search.Operator.BEFORE, values: [cutoffDate] })
            ],
            columns: [
                search.createColumn({ name: 'tranid' }),
                search.createColumn({ name: 'custbody_approver' }),
                search.createColumn({ name: 'custbody_escalation_sent' })
            ]
        }).run().getRange({ start: 0, end: 100 });

        overdueApprovals.forEach(function(result) {
            var alreadyEscalated = result.getValue({ name: 'custbody_escalation_sent' });
            if (!alreadyEscalated) {
                // Send escalation to manager
                email.send({
                    author: -5,
                    recipients: 'manager@company.com',
                    subject: 'ESCALATION: Pending approval for ' + result.getValue({ name: 'tranid' }),
                    body: 'This record has been awaiting approval for ' + escThresholdDays + '+ days.'
                });
                // Mark as escalated to avoid repeat emails
                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: result.id,
                    values: { custbody_escalation_sent: true }
                });
                log.audit('Escalated', 'Approval ' + result.getValue({ name: 'tranid' }));
            }
        });
    }
    return { execute: execute };
});
```

---

## Delegation

Allow an approver to re-assign to another employee:

1. Add `custbody_delegate_approver` field to the record
2. When `custbody_delegate_approver` is set, workflow transitions to re-notify
3. New approver receives notification
4. Original approver can still view

---

## Multi-Level Approvals

For tiered approval (manager → VP → CFO based on amount):

```javascript
function getRequiredApprover(total) {
    if (total < 10000) return 'custbody_manager_approver';
    if (total < 100000) return 'custbody_vp_approver';
    return 'custbody_cfo_approver';
}

// In afterSubmit: set appropriate approver field and send notification
var approverFieldId = getRequiredApprover(total);
var approverEmployeeId = rec.getValue({ fieldId: approverFieldId });
```
