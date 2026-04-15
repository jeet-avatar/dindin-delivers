---
source: Oracle NetSuite Official Documentation — CRM (Customer Relationship Management)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# CRM (Customer Relationship Management)

## Overview

NetSuite CRM manages the complete customer lifecycle: leads, contacts, cases,
campaigns, and activities. CRM data is tightly integrated with financial records —
customers, vendors, employees all share the same entity framework.

---

## Support Cases

Support Cases track customer issues and service requests.

**Navigation:** Lists > Support > Cases

**Record Type:** `record.Type.SUPPORT_CASE`

### Key Case Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| title              | Case subject/title                                       |
| company            | Customer company                                         |
| contact            | Customer contact who raised the case                     |
| status             | Open, In Progress, Closed (customizable list)           |
| priority           | High, Medium, Low                                        |
| assignedTo         | Assigned support agent (employee)                        |
| escalateTo         | Escalation contact/team                                  |
| origin             | How case was raised: Email, Phone, Portal, Chat          |
| category           | Case category/type                                       |
| closeDate          | Date case was resolved                                   |
| startDate          | Date case was opened                                     |
| helpDesk           | The support queue/group                                  |

### Creating a Support Case

```javascript
define(['N/record'], function(record) {
    var supportCase = record.create({ type: record.Type.SUPPORT_CASE });
    supportCase.setValue({ fieldId: 'company', value: 456 });     // Customer
    supportCase.setValue({ fieldId: 'title', value: 'Invoice discrepancy - PO-2024-001' });
    supportCase.setValue({ fieldId: 'priority', value: 2 });       // 2 = Medium
    supportCase.setValue({ fieldId: 'assignedto', value: 789 });   // Support agent
    supportCase.setValue({ fieldId: 'status', value: 1 });         // 1 = Open
    supportCase.setValue({ fieldId: 'origin', value: 2 });         // 2 = Phone
    var caseId = supportCase.save();
});
```

---

## Case Escalation Workflow

Typical escalation setup:

1. Case created → assignedTo = L1 support agent
2. If not resolved in 24 hours → escalate to L2 (Scheduled workflow)
3. If not resolved in 48 hours → escalate to supervisor

```
SCHEDULED Workflow:
- Every hour, find cases where:
  - Status = 'In Progress'
  - startDate < NOW - 24h
  - escalateTo is empty
- Action: Set escalateTo = L2 supervisor, Send email notification
```

---

## Activities

Activities track all customer interactions: calls, tasks, events (meetings).

### Phone Call

```javascript
define(['N/record'], function(record) {
    var call = record.create({ type: record.Type.PHONE_CALL });
    call.setValue({ fieldId: 'title', value: 'Follow-up on proposal' });
    call.setValue({ fieldId: 'company', value: 456 });     // Customer
    call.setValue({ fieldId: 'contact', value: 789 });     // Contact
    call.setValue({ fieldId: 'assigned', value: 100 });    // Sales rep
    call.setValue({ fieldId: 'status', value: 'SCHEDULED' });
    call.setValue({ fieldId: 'startdate', value: new Date() });
    call.setValue({ fieldId: 'starttime', value: '14:00' });
    call.save();
});
```

### Task

```javascript
define(['N/record'], function(record) {
    var task = record.create({ type: record.Type.TASK });
    task.setValue({ fieldId: 'title', value: 'Send contract to customer' });
    task.setValue({ fieldId: 'assigned', value: 100 });         // Assignee
    task.setValue({ fieldId: 'dueDate', value: new Date(Date.now() + 3*86400000) });
    task.setValue({ fieldId: 'priority', value: 'NORMAL' });
    task.setValue({ fieldId: 'status', value: 'IN_PROGRESS' });
    task.setValue({ fieldId: 'company', value: 456 });          // Customer link
    task.save();
});
```

### Event (Meeting)

```javascript
define(['N/record'], function(record) {
    var event = record.create({ type: record.Type.EVENT });
    event.setValue({ fieldId: 'title', value: 'Q4 Business Review' });
    event.setValue({ fieldId: 'company', value: 456 });
    event.setValue({ fieldId: 'location', value: 'Customer HQ - Board Room' });
    event.setValue({ fieldId: 'startdate', value: new Date() });
    event.setValue({ fieldId: 'enddate', value: new Date(Date.now() + 2*3600000) }); // 2 hours
    event.save();
});
```

---

## Campaigns

Campaigns automate mass marketing communications.

**Navigation:** Lists > CRM > Campaigns

**Record Type:** `record.Type.CAMPAIGN`

### Key Campaign Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| title              | Campaign name                                            |
| startDate          | Campaign start date                                      |
| endDate            | Campaign end date                                        |
| category           | Campaign type (Email, Event, Direct Mail)               |
| campaignDirectMail | T = direct mail campaign                                 |
| audience           | Customer segment / saved search as audience             |
| owner              | Responsible employee                                     |

### Email Merge

```javascript
define(['N/record'], function(record) {
    var campaign = record.create({ type: record.Type.CAMPAIGN });
    campaign.setValue({ fieldId: 'title', value: 'Q1 2024 Product Launch' });
    campaign.setValue({ fieldId: 'startdate', value: new Date() });
    campaign.setValue({ fieldId: 'category', value: 3 }); // Email campaign

    // Add recipients from saved search
    campaign.setValue({ fieldId: 'audience', value: 'customsearch_enterprise_customers' });
    var campaignId = campaign.save();
});
```

---

## Customer Portal Integration

NetSuite includes a Customer Portal (Website) for self-service:
- Customers log in to view their orders, invoices, and case status
- Submit new support cases
- Track shipment status

**Setup:** Setup > Commerce > Web Site Setup

---

## CRM Reports

| Report                         | Navigation                                            |
|--------------------------------|-------------------------------------------------------|
| Open Cases by Status           | Reports > CRM > Cases > Open Cases                    |
| Case Resolution Time           | Reports > CRM > Cases > Resolution Time               |
| Activities by Sales Rep        | Reports > CRM > Activities                            |
| Customer Satisfaction          | Reports > CRM > Customer Satisfaction                 |
| Campaign ROI                   | Reports > Marketing > Campaign Report                 |

---

## CRM SuiteQL

```sql
-- Open support cases
SELECT sc.id, sc.casenumber, sc.title, c.companyname, sc.status,
       sc.priority, sc.assignedto, sc.startdate
FROM supportcase sc
LEFT JOIN customer c ON sc.company = c.id
WHERE sc.status != 'Closed'
ORDER BY sc.priority ASC, sc.startdate ASC

-- Activities by sales rep this month
SELECT e.firstname || ' ' || e.lastname AS salesRep,
       COUNT(pa.id) AS totalActivities
FROM phonecall pa
JOIN employee e ON pa.assigned = e.id
WHERE pa.startdate >= TRUNC(SYSDATE, 'MONTH')
GROUP BY e.firstname, e.lastname
ORDER BY totalActivities DESC
```
