---
source: SuiteScript 2.x API Reference — Project (Job) Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Project Record (record.Type.PROJECT)

Internal record type ID: `'job'`

Note: The internal record type ID is `'job'` (not 'project'). The `record.Type.PROJECT`
constant maps to `'job'`. Projects track work, tasks, time, and resources for client
engagements.

## Record Constant

```javascript
record.Type.PROJECT   // 'job'
search.Type.JOB       // 'job'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `entityId` | Project ID | Text | System-assigned. Format: PRJ-XXX |
| `companyName` | Project Name | Text | Project/job name (required) |
| `parent` | Parent Customer | Select | The customer this project belongs to |
| `subsidiary` | Subsidiary | Select | Required for OneWorld |
| `status` | Status | Select | Project status |
| `projectType` | Project Type | Select | 'timeAndMaterials', 'fixedBid', 'costPlus' |
| `startDate` | Start Date | Date | Project start |
| `endDate` | Estimated End | Date | Planned completion date |
| `completedDate` | Completed Date | Date | Actual completion date |
| `estimatedTime` | Estimated Hrs | Float | Total estimated labor hours |
| `actualTime` | Actual Hrs | Float | Total logged hours (read-only) |
| `currency` | Currency | Select | Project billing currency |
| `projectRate` | Billing Rate | Currency | Default hourly billing rate |
| `serviceCostAmount` | Budget | Currency | Budget amount |
| `jobBillingType` | Billing Type | Select | How the project is billed |
| `isInactive` | Inactive | Checkbox | Inactive/archived project |
| `department` | Department | Select | Project department |
| `location` | Location | Select | Project location |
| `class` | Class | Select | Classification |
| `memo` | Memo | Text | Internal notes |
| `custentity_*` | Custom Fields | Various | Custom entity fields |

## Project Type Values

```javascript
// projectType field values:
'timeAndMaterials'  // T&M — bill based on actual time and expenses
'fixedBid'          // Fixed price — bill a set amount regardless of actual costs
'costPlus'          // Cost plus markup — bill costs plus a markup percentage
```

## Status Values

Common `status` field values (account-specific, but common ones):

```javascript
// Typical project status codes:
'10' // Not Started
'20' // In Progress
'30' // On Hold
'40' // Completed
'50' // Closed
```

## Task Sublist (projecttask)

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `title` | Task Name | Text | Task description |
| `status` | Status | Select | 'notstarted', 'inprogress', 'complete' |
| `startdate` | Start Date | Date | Task start date |
| `enddate` | Due Date | Date | Task due date |
| `estimatedwork` | Est. Hours | Float | Estimated labor hours |
| `actualwork` | Actual Hours | Float | Logged hours (read-only) |
| `percenttimecomplete` | % Complete | Percent | Task completion percentage |
| `assignedresource` | Assigned To | Select | Employee internal ID |
| `priority` | Priority | Select | HIGH, MEDIUM, LOW |
| `ismilestone` | Milestone | Checkbox | True = milestone task |
| `sequence` | Sequence | Integer | Task order |
| `owner` | Owner | Select | Task owner employee |

## Resource Sublist (projectresource)

Lists team members assigned to the project:

| Field ID | Label | Notes |
|----------|-------|-------|
| `resource` | Resource | Employee internal ID |
| `role` | Role | Resource role on project |
| `billingrate` | Billing Rate | Override rate for this resource |
| `unitcost` | Unit Cost | Internal cost per hour |
| `estimatedtime` | Est. Hours | Hours allocated to this resource |

## Common Operations

### Create a project
```javascript
var project = record.create({
  type: record.Type.PROJECT,
  isDynamic: true
});

project.setValue({ fieldId: 'companyName', value: 'NetSuite ERP Implementation - Acme Corp' });
project.setValue({ fieldId: 'parent', value: customerId }); // Parent customer
project.setValue({ fieldId: 'subsidiary', value: 1 });
project.setValue({ fieldId: 'projectType', value: 'fixedBid' });
project.setValue({ fieldId: 'startDate', value: new Date('2024-02-01') });
project.setValue({ fieldId: 'endDate', value: new Date('2024-06-30') });
project.setValue({ fieldId: 'serviceCostAmount', value: 150000 }); // $150K budget
project.setValue({ fieldId: 'currency', value: 1 }); // USD
project.setValue({ fieldId: 'memo', value: 'Phase 1 of Acme ERP rollout' });

var projectId = project.save();
log.audit({ title: 'Project created', details: 'ID: ' + projectId });
```

### Add tasks to project
```javascript
var project = record.load({ type: record.Type.PROJECT, id: projectId, isDynamic: true });

// Add project tasks
var tasks = [
  { title: 'Requirements Gathering', hours: 40, startdate: '2024-02-01', enddate: '2024-02-14' },
  { title: 'System Design', hours: 60, startdate: '2024-02-15', enddate: '2024-03-01' },
  { title: 'Development', hours: 120, startdate: '2024-03-01', enddate: '2024-05-01' },
  { title: 'Testing & UAT', hours: 80, startdate: '2024-05-01', enddate: '2024-06-01' },
  { title: 'Go Live', hours: 20, startdate: '2024-06-15', enddate: '2024-06-30', milestone: true }
];

tasks.forEach(function(task) {
  project.selectNewLine({ sublistId: 'projecttask' });
  project.setCurrentSublistValue({ sublistId: 'projecttask', fieldId: 'title', value: task.title });
  project.setCurrentSublistValue({ sublistId: 'projecttask', fieldId: 'estimatedwork', value: task.hours });
  project.setCurrentSublistValue({ sublistId: 'projecttask', fieldId: 'startdate', value: new Date(task.startdate) });
  project.setCurrentSublistValue({ sublistId: 'projecttask', fieldId: 'enddate', value: new Date(task.enddate) });
  if (task.milestone) {
    project.setCurrentSublistValue({ sublistId: 'projecttask', fieldId: 'ismilestone', value: true });
  }
  project.commitLine({ sublistId: 'projecttask' });
});

project.save();
```

### Assign resources
```javascript
var project = record.load({ type: record.Type.PROJECT, id: projectId, isDynamic: true });

project.selectNewLine({ sublistId: 'projectresource' });
project.setCurrentSublistValue({ sublistId: 'projectresource', fieldId: 'resource', value: consultantId });
project.setCurrentSublistValue({ sublistId: 'projectresource', fieldId: 'billingrate', value: 150 }); // $150/hr
project.setCurrentSublistValue({ sublistId: 'projectresource', fieldId: 'estimatedtime', value: 200 }); // 200 hrs
project.commitLine({ sublistId: 'projectresource' });

project.save();
```

### Search active projects
```javascript
var projectSearch = search.create({
  type: search.Type.JOB,
  filters: [
    ['isinactive', search.Operator.IS, 'F'],
    'AND',
    ['status', search.Operator.IS_NOT, 'Completed']
  ],
  columns: [
    search.createColumn({ name: 'entityId' }),
    search.createColumn({ name: 'companyName' }),
    search.createColumn({ name: 'parent' }),
    search.createColumn({ name: 'projectType' }),
    search.createColumn({ name: 'estimatedtime' }),
    search.createColumn({ name: 'actualtime' }),
    search.createColumn({ name: 'enddate' })
  ]
});
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `isinactive` | IS | 'F' = active projects |
| `status` | IS | Filter by project status |
| `parent` | IS | Projects for a specific customer |
| `projecttype` | IS | T&M vs. Fixed Bid projects |
| `startdate` | WITHIN | Projects starting in date range |
| `enddate` | BEFORE | Overdue projects |
| `subsidiary` | IS | Filter by subsidiary |

## Notes

- The record type constant is `record.Type.PROJECT` but the internal type string is `'job'`
- When searching, use `search.Type.JOB` (not a SEARCH_TYPE.PROJECT constant)
- `parent` links the project to a Customer record — required for billing
- Time entries link to projects via the `customer`/`job` field on Time Entry records
- Project billing generates invoices via the Billing Schedule associated with the project
- For T&M projects, charge time by creating Time Entry records (type `'timebill'`) referencing
  the project in the `customer` field
