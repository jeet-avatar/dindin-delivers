---
source: Oracle NetSuite Official Documentation — Lead to Cash (CRM to O2C)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Lead to Cash

## Overview

Lead to Cash is the complete cycle from first customer contact through
revenue collection. It bridges NetSuite CRM (Lead/Opportunity/Quote) with
the O2C financial process (Sales Order through Payment).

---

## Process Flow

```
Lead (Marketing Contact)
     ↓
Contact / Prospect
     ↓
Opportunity
     ↓
Estimate / Quote
     ↓
Sales Order
     ↓
Item Fulfillment
     ↓
Invoice
     ↓
Customer Payment
```

---

## CRM Record Types

### Lead

A Lead is a potential customer that has been identified but not yet qualified.

**Record Type:** `record.Type.LEAD`

```javascript
define(['N/record'], function(record) {
    var lead = record.create({ type: record.Type.LEAD, isDynamic: true });
    lead.setValue({ fieldId: 'companyname', value: 'Acme Corp' });
    lead.setValue({ fieldId: 'subsidiary', value: 1 });
    lead.setValue({ fieldId: 'leadsource', value: 5 }); // Lead source list item
    var leadId = lead.save();
});
```

### Prospect

A Prospect is a qualified lead that has a real buying intent.
Leads are converted to Prospects by changing the stage:
- Customer Stage field: `customerstatus` → Customer Statuses list

### Opportunity

An Opportunity is a formal sales pursuit with a probability and expected close date.

**Record Type:** `record.Type.OPPORTUNITY`

```javascript
define(['N/record'], function(record) {
    var opp = record.create({ type: record.Type.OPPORTUNITY, isDynamic: true });
    opp.setValue({ fieldId: 'entity', value: 456 });          // Customer/Prospect
    opp.setValue({ fieldId: 'probability', value: 70 });       // 70% likely to close
    opp.setValue({ fieldId: 'expectedclosedate', value: new Date(Date.now() + 45*86400000) });
    opp.setValue({ fieldId: 'projectedtotal', value: 50000 });  // Estimated deal size
    opp.setValue({ fieldId: 'salesrep', value: 789 });          // Assigned sales rep
    opp.setValue({ fieldId: 'forecasttype', value: 2 });        // 2=Commit, 3=Upside, 4=Pipeline

    // Add items to opportunity
    opp.selectNewLine({ sublistId: 'item' });
    opp.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 100 });
    opp.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 10 });
    opp.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 5000 });
    opp.commitLine({ sublistId: 'item' });

    var oppId = opp.save();
});
```

---

## Opportunity Key Fields

| Field               | Description                                           |
|---------------------|-------------------------------------------------------|
| entity              | Customer or Prospect internal ID                      |
| probability         | Likelihood to close (0-100%)                          |
| expectedclosedate   | Target close date                                     |
| projectedtotal      | Estimated deal value                                  |
| actualclosedate     | Actual date won/lost                                  |
| forecasttype        | Pipeline, Upside, Commit, Omit                        |
| salesrep            | Assigned sales representative                         |
| nextstep            | Next action (text field)                              |
| status              | Win, Loss, In Progress                                |
| title               | Opportunity name/title                                |

---

## Pipeline Stages

Opportunities move through stages (customizable):

| Stage            | Probability Range | Description                          |
|------------------|-------------------|--------------------------------------|
| Prospect         | 10-20%            | Initial contact, qualifying           |
| Qualified        | 30-40%            | Need confirmed, budget discussed      |
| Proposal         | 50-60%            | Quote/proposal submitted              |
| Negotiation      | 70-80%            | Terms being negotiated                |
| Commit           | 90%               | Verbal commitment received            |
| Closed Won       | 100%              | Contract signed                       |
| Closed Lost      | 0%                | Lost to competitor or no decision     |

---

## Activity Linking (Calls, Tasks, Events)

Activities link to the opportunity to track all interactions:

```javascript
define(['N/record'], function(record) {
    // Create a Phone Call linked to opportunity
    var call = record.create({ type: record.Type.PHONE_CALL });
    call.setValue({ fieldId: 'title', value: 'Discovery call — Acme Corp' });
    call.setValue({ fieldId: 'transaction', value: oppId });  // Link to opportunity
    call.setValue({ fieldId: 'assigned', value: salesRepId });
    call.setValue({ fieldId: 'startdate', value: new Date() });
    call.setValue({ fieldId: 'status', value: 'COMPLETE' });
    call.save();

    // Create a Task linked to opportunity
    var task = record.create({ type: record.Type.TASK });
    task.setValue({ fieldId: 'title', value: 'Send proposal to Acme Corp' });
    task.setValue({ fieldId: 'assigned', value: salesRepId });
    task.setValue({ fieldId: 'dueDate', value: new Date(Date.now() + 3*86400000) });
    task.setValue({ fieldId: 'transaction', value: oppId });
    task.save();
});
```

The `activity` sublist on the Opportunity record shows all linked tasks, calls, and events.

---

## Opportunity to Estimate (Quote)

```javascript
define(['N/record'], function(record) {
    var estimate = record.transform({
        fromType: record.Type.OPPORTUNITY,
        fromId: oppId,
        toType: record.Type.ESTIMATE
    });
    var estimateId = estimate.save();
});
```

---

## Forecast Types

| Forecast Type | Value | Meaning                                         |
|---------------|-------|-------------------------------------------------|
| Pipeline      | 1     | Early stage, uncertain                          |
| Upside        | 3     | Possible win, not fully committed               |
| Commit        | 2     | Sales rep expects to close                      |
| Omit          | 4     | Excluded from forecast                          |
| Closed        | 5     | Won or lost (auto-set)                          |

---

## CRM Reports and Pipeline

| Report                         | Navigation                                            |
|--------------------------------|-------------------------------------------------------|
| Sales Pipeline                 | Reports > Sales > Opportunities > Pipeline            |
| Forecast by Sales Rep          | Reports > Sales > Opportunities > Forecast            |
| Win/Loss Analysis              | Reports > Sales > Opportunities > Win/Loss            |
| Lead Source Effectiveness      | Reports > Marketing > Lead Source Summary             |
| Activity Report                | Reports > CRM > Activity Report                       |
