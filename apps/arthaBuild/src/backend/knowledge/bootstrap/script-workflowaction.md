---
source: SuiteScript 2.x API Reference — Workflow Action Script
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Workflow Action Script

Workflow Action scripts execute custom SuiteScript logic as a step within a NetSuite
Workflow. They are triggered when the workflow reaches a specific action step, allowing
complex business logic to be embedded in workflow automation.

## Script Header (Required JSDoc)

```javascript
/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/email', 'N/log'], function(record, search, email, log) {

  function onAction(context) { ... }

  return { onAction: onAction };
});
```

## Entry Point

### onAction(context)
Called when the workflow reaches this action step.

```javascript
function onAction(context) {
  var rec = context.newRecord;         // The record the workflow is acting on
  var oldRec = context.oldRecord;      // Previous state of the record (read-only)
  var workflowId = context.workflowId; // Internal ID of the triggering workflow
  var form = context.form;             // UI form object (if in UI context)

  log.audit({ title: 'Workflow Action', details: 'Workflow: ' + workflowId + ', Record: ' + rec.id });

  // Perform custom logic
  var customerId = rec.getValue({ fieldId: 'entity' });
  var amount = rec.getValue({ fieldId: 'amount' });

  if (amount > 10000) {
    // Create a high-value notification record
    createHighValueAlert(rec.id, customerId, amount);
  }

  // Set a field on the record (will be saved after onAction completes)
  rec.setValue({ fieldId: 'custbody_workflow_processed', value: true });
  rec.setValue({ fieldId: 'custbody_wf_processed_date', value: new Date() });
}
```

## context Properties

```javascript
context.newRecord    // Record being processed (can be modified)
context.oldRecord    // Previous record state (read-only, null if unavailable)
context.workflowId   // Internal ID of the workflow (string)
context.form         // serverWidget.Form — for form modifications (UI context only)
context.type         // Execution context type
```

## Modifying the Record in onAction

Changes made to `context.newRecord` are saved when the action completes:

```javascript
function onAction(context) {
  var rec = context.newRecord;

  // Direct setValue — changes are committed by the workflow engine
  rec.setValue({ fieldId: 'custbody_status', value: 'PROCESSED' });
  rec.setValue({ fieldId: 'custbody_processed_at', value: new Date().toISOString() });

  // You do NOT call rec.save() — the workflow engine handles saving
}
```

## Creating Related Records

```javascript
function onAction(context) {
  var rec = context.newRecord;
  var entity = rec.getValue({ fieldId: 'entity' });

  // Create an activity record linked to this order
  var activity = record.create({
    type: 'phonecall',
    isDynamic: true,
    defaultValues: { entity: entity }
  });
  activity.setValue({ fieldId: 'title', value: 'Follow up on order ' + rec.getValue({ fieldId: 'tranId' }) });
  activity.setValue({ fieldId: 'assigned', value: rec.getValue({ fieldId: 'salesrep' }) });
  activity.setValue({ fieldId: 'startdate', value: new Date() });
  var activityId = activity.save();

  log.audit({ title: 'Activity created', details: 'Phone call: ' + activityId });
}
```

## Sending Emails from Workflow Action

```javascript
function onAction(context) {
  var rec = context.newRecord;
  var entity = rec.getValue({ fieldId: 'entity' });
  var tranId = rec.getValue({ fieldId: 'tranId' });

  try {
    email.send({
      author: 5,
      recipients: [{ entityId: entity }],
      subject: 'Order ' + tranId + ' Status Update',
      body: '<p>Your order status has been updated. Order #: ' + tranId + '</p>',
      relatedRecords: {
        transactionId: parseInt(rec.id),
        entityId: entity
      }
    });
    log.audit({ title: 'Email sent', details: 'To customer: ' + entity });
  } catch (e) {
    log.error({ title: 'Email failed', details: e.message });
    // Don't re-throw — workflow should continue even if email fails
  }
}
```

## Returning Values to the Workflow

Workflow Action scripts can return values that the workflow engine uses for field updates
or condition branching:

```javascript
function onAction(context) {
  var rec = context.newRecord;

  // Perform calculation
  var taxAmount = calculateTax(
    rec.getValue({ fieldId: 'subtotal' }),
    rec.getValue({ fieldId: 'subsidiary' })
  );

  // Return value is set on the "Result Field" configured in the workflow action step
  return taxAmount;
}
```

## Common Patterns

### Risk scoring action
```javascript
function onAction(context) {
  var rec = context.newRecord;
  var amount = parseFloat(rec.getValue({ fieldId: 'amount' }) || 0);
  var custId = rec.getValue({ fieldId: 'entity' });

  // Load customer data
  var custData = search.lookupFields({
    type: search.Type.CUSTOMER,
    id: custId,
    columns: ['creditlimit', 'balance', 'credithold']
  });

  var creditLimit = parseFloat(custData.creditlimit || 0);
  var currentBalance = parseFloat(custData.balance || 0);
  var onCreditHold = custData.credithold === 'Auto';

  var riskScore = 0;
  if (onCreditHold) riskScore += 50;
  if (currentBalance > creditLimit * 0.9) riskScore += 30;
  if (amount > 5000) riskScore += 20;

  rec.setValue({ fieldId: 'custbody_risk_score', value: riskScore });

  var riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';
  rec.setValue({ fieldId: 'custbody_risk_level', value: riskLevel });

  log.audit({ title: 'Risk scored', details: 'Order: ' + rec.id + ', Score: ' + riskScore + ' (' + riskLevel + ')' });
  return riskScore;
}
```

### External API call action
```javascript
function onAction(context) {
  require(['N/https'], function(https) {
    var rec = context.newRecord;
    var payload = {
      orderId: rec.id,
      amount: rec.getValue({ fieldId: 'amount' }),
      customer: rec.getValue({ fieldId: 'entity' })
    };

    var response = https.post({
      url: 'https://api.erp-integration.com/notify',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': '{{customsecret_erp_key}}' },
      body: JSON.stringify(payload)
    });

    if (response.code === 200) {
      var result = JSON.parse(response.body);
      rec.setValue({ fieldId: 'custbody_external_id', value: result.externalId });
      log.audit({ title: 'ERP notified', details: 'External ID: ' + result.externalId });
    } else {
      log.error({ title: 'ERP notification failed', details: response.code + ': ' + response.body });
    }
  });
}
```

## Governance

- **1,000 units per invocation** (same as User Event)
- Workflow actions run synchronously within the workflow state transition

## Deployment

| Setting | Description |
|---------|-------------|
| Script Type | Workflow Action Script |
| Associated Workflow | Optionally lock to a specific workflow |
| Log Level | DEBUG (dev) / AUDIT (prod) |

## Notes

- Do NOT call `rec.save()` inside `onAction()` — the record save is managed by the workflow engine
- `context.form` is only available when the workflow triggers in the UI context
- If the workflow action fails (throws), the workflow may retry or halt depending on workflow configuration
- Multiple workflow actions can target the same script — check `context.workflowId` if behavior
  must differ per workflow
