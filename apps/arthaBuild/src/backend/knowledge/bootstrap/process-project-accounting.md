---
source: Oracle NetSuite Official Documentation — Project Accounting
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Project Accounting

## Overview

Project Accounting tracks revenue, costs, time, and expenses against specific
projects or jobs. It supports time & materials billing, fixed-fee billing,
and percentage-of-completion revenue recognition.

---

## Project Record

**Navigation:** Lists > Relationships > Projects > New

Projects are customer-linked records that serve as cost and revenue tracking entities.

### Key Project Fields

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| projectName        | Project name/title                                       |
| customer           | Customer the project is for                              |
| projectManager     | Assigned project manager (employee)                      |
| estimatedCost      | Budget/estimated total cost                              |
| estimatedRevenue   | Estimated total billable amount                         |
| startDate          | Project start date                                       |
| projectedEndDate   | Expected completion date                                 |
| status             | Not Started, In Progress, Complete, Cancelled           |
| percentTimeLogged  | Auto-calculated: logged hours / budgeted hours          |

---

## Project Tasks

Projects have tasks (milestones and work items):

```javascript
define(['N/record'], function(record) {
    var project = record.load({ type: record.Type.PROJECT_TASK, id: projectId });
    // Add tasks via the tasks sublist on the Project record

    var task = record.create({ type: record.Type.PROJECT_TASK });
    task.setValue({ fieldId: 'project', value: projectId });
    task.setValue({ fieldId: 'title', value: 'Phase 1: Requirements Gathering' });
    task.setValue({ fieldId: 'owner', value: pmEmployeeId });
    task.setValue({ fieldId: 'startdate', value: new Date() });
    task.setValue({ fieldId: 'enddate', value: new Date(Date.now() + 14*86400000) });
    task.setValue({ fieldId: 'estimatedwork', value: 80 }); // 80 hours budgeted
    task.setValue({ fieldId: 'milestone', value: false }); // true = this is a milestone
    task.save();
});
```

---

## Time Tracking

Employees log time against project tasks:

**Navigation:** Transactions > Time & Expenses > Track Time

**Record Type:** `record.Type.TIME_BILL`

```javascript
define(['N/record'], function(record) {
    var timeEntry = record.create({ type: record.Type.TIME_BILL });
    timeEntry.setValue({ fieldId: 'employee', value: 100 });      // Employee
    timeEntry.setValue({ fieldId: 'customer', value: 456 });      // Customer
    timeEntry.setValue({ fieldId: 'caseTaskEvent', value: taskId }); // Project task
    timeEntry.setValue({ fieldId: 'hours', value: 4.5 });          // Hours worked
    timeEntry.setValue({ fieldId: 'serviceitem', value: 200 });    // Service item (billing rate)
    timeEntry.setValue({ fieldId: 'trandate', value: new Date() });
    timeEntry.setValue({ fieldId: 'memo', value: 'Requirements workshop' });
    timeEntry.save();
});
```

---

## Expense Reports

Employees submit expense reports for project-related expenses:

**Navigation:** Transactions > Time & Expenses > Enter Expense Reports

**Record Type:** `record.Type.EXPENSE_REPORT`

```javascript
define(['N/record'], function(record) {
    var expReport = record.create({ type: record.Type.EXPENSE_REPORT, isDynamic: true });
    expReport.setValue({ fieldId: 'entity', value: 100 }); // Employee
    expReport.setValue({ fieldId: 'trandate', value: new Date() });
    expReport.setValue({ fieldId: 'memo', value: 'Travel to customer site' });

    expReport.selectNewLine({ sublistId: 'expense' });
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'expensedate', value: new Date() });
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'category', value: 5 }); // Travel
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: 350 });
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'customer', value: 456 }); // Bill to customer
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'isbillable', value: true });
    expReport.commitLine({ sublistId: 'expense' });

    expReport.save();
});
```

---

## Billing Methods

### Time & Materials Billing

Invoice customers based on actual time logged and expenses:
1. Employee logs time → approved time entries accumulated
2. Run billing from project: Transactions > Sales > Create Time & Materials Invoice
3. Invoice includes all approved, unbilled time entries and expenses
4. Each time entry appears as a line item on the invoice

### Fixed-Fee Billing

Invoice on milestone completion or billing schedule:
1. Set up billing schedule on the project's Sales Order
2. Define milestones (e.g., 25% on kickoff, 50% on delivery, 25% on acceptance)
3. When milestone is complete, create invoice for that percentage

---

## Resource Allocation

**Navigation:** Transactions > Projects > Resource Allocation

Assign employees to project tasks with planned hours:

```javascript
define(['N/record'], function(record) {
    var allocation = record.create({ type: record.Type.RESOURCE_ALLOCATION });
    allocation.setValue({ fieldId: 'project', value: projectId });
    allocation.setValue({ fieldId: 'projecttask', value: taskId });
    allocation.setValue({ fieldId: 'resource', value: employeeId });
    allocation.setValue({ fieldId: 'allocationunit', value: 'HOURS' });
    allocation.setValue({ fieldId: 'allocationvalue', value: 40 }); // 40 hours allocated
    allocation.setValue({ fieldId: 'startdate', value: new Date() });
    allocation.setValue({ fieldId: 'enddate', value: new Date(Date.now() + 7*86400000) });
    allocation.save();
});
```

---

## Project Budget

**Navigation:** Transactions > Financial > Project Budgets > New

**Record Type:** `record.Type.PROJECT_BUDGET`

Tracks budget vs actual for:
- Revenue (contract value vs invoiced)
- Cost (budgeted hours × rate vs actual logged)
- Expenses (budgeted expenses vs submitted)

---

## Project Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Project Profitability         | Reports > Projects > Profitability                      |
| Time Utilization              | Reports > Projects > Time Tracking                      |
| Budget vs Actual              | Reports > Projects > Budget vs Actual                   |
| Unbilled Time by Project      | Custom saved search on Time Bill (isBillable=T, billed=F)|
| Project Status Summary        | Reports > Projects > Project Status                     |
