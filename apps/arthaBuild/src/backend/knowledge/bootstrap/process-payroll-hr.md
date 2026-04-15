---
source: Oracle NetSuite Official Documentation — Payroll and HR
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Payroll and HR

## Overview

NetSuite provides payroll processing (US-focused) and HR management including
employee records, time tracking, expense reports, and PTO management.
The payroll module integrates with the GL to post payroll journal entries automatically.

---

## Employee Setup for Payroll

**Navigation:** Lists > Employees > New

### Key Employee Fields

| Field               | Description                                              |
|---------------------|----------------------------------------------------------|
| firstName           | First name (required)                                    |
| lastName            | Last name (required)                                     |
| email               | Employee email                                           |
| department          | Department assignment                                    |
| subsidiary          | Subsidiary (OneWorld)                                    |
| location            | Work location                                            |
| employeeStatus      | Active, Inactive, Terminated                            |
| startDate           | Employment start date                                    |
| endDate             | Termination date                                         |
| supervisor          | Manager (employee internal ID)                           |
| payFrequency        | Weekly, Biweekly, Semi-Monthly, Monthly                 |
| workCalendar        | Work schedule                                           |

### Payroll Tab Fields

| Field               | Description                                              |
|---------------------|----------------------------------------------------------|
| payItem             | Base salary or hourly rate pay item                     |
| payRate             | Salary amount or hourly rate                            |
| payType             | Salary, Hourly                                           |
| federalTaxCode      | W-4 federal withholding allowances                      |
| stateTaxCode        | State-specific withholding setup                        |
| directDeposit       | Bank routing + account for direct deposit               |

---

## Payroll Items

Payroll items define the types of earnings, deductions, and taxes:

**Navigation:** Setup > Payroll > Payroll Items > New

| Type           | Examples                                              |
|----------------|-------------------------------------------------------|
| Earnings       | Regular Pay, Overtime, Bonus, Commission              |
| Deductions     | 401(k), Health Insurance, FSA, HSA                   |
| Employer Taxes | FICA Social Security, FICA Medicare, FUTA, SUTA       |
| Employee Taxes | Federal Income Tax, State Income Tax, Social Security |
| Benefits       | Life Insurance (employer-paid), Company Car           |

---

## Processing Payroll

**Navigation:** Setup > Payroll > Process Payroll

### Payroll Run Steps

1. Select pay period (e.g., Jan 1-15, 2024)
2. NetSuite calculates:
   - Gross pay (base salary or hours × rate)
   - Tax withholdings (based on W-4 + state setup)
   - Deductions (health insurance, 401k, etc.)
   - Net pay
3. Review payroll register — verify all amounts
4. Approve payroll
5. Post payroll journal entries to GL
6. Generate direct deposit file (ACH) or print checks

### Payroll GL Entries

```
DR  Salary Expense           $100,000  (gross wages)
CR  Federal Withholding Payable  $22,000
CR  State Withholding Payable     $6,000
CR  FICA Employee Payable         $6,200
CR  401(k) Payable                $5,000
CR  Net Payroll Payable          $60,800  (bank payment to employees)

Employer taxes (separate entry):
DR  Payroll Tax Expense      $7,650
CR  FICA Employer Payable     $6,200  (Social Security + Medicare employer share)
CR  FUTA Payable              $1,450
```

---

## Time Tracking

Employees log hours worked for:
- Payroll processing (hourly employees)
- Project billing (see process-project-accounting.md)
- Overtime tracking

**Navigation:** Transactions > Time & Expenses > Track Time

**Record Type:** `record.Type.TIME_BILL`

```javascript
define(['N/record'], function(record) {
    var timeEntry = record.create({ type: record.Type.TIME_BILL });
    timeEntry.setValue({ fieldId: 'employee', value: 100 });
    timeEntry.setValue({ fieldId: 'hours', value: 8 });
    timeEntry.setValue({ fieldId: 'payrollItem', value: 5 }); // Regular Pay item
    timeEntry.setValue({ fieldId: 'trandate', value: new Date() });
    timeEntry.save();
});
```

### Time Approval

Time entries go through approval before affecting payroll:
1. Employee submits time
2. Manager receives notification (workflow)
3. Manager approves time
4. Approved time is included in payroll run

---

## Expense Reports

Employee expense reimbursement:

**Navigation:** Transactions > Time & Expenses > Enter Expense Reports

```javascript
define(['N/record'], function(record) {
    var expReport = record.create({ type: record.Type.EXPENSE_REPORT, isDynamic: true });
    expReport.setValue({ fieldId: 'entity', value: 100 }); // Employee
    expReport.setValue({ fieldId: 'trandate', value: new Date() });

    expReport.selectNewLine({ sublistId: 'expense' });
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'expensedate', value: new Date() });
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'category', value: 3 }); // Meals
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: 85 });
    expReport.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'memo', value: 'Team lunch' });
    expReport.commitLine({ sublistId: 'expense' });

    expReport.save();
});
```

Approved expense reports are reimbursed via:
- Payroll (added to next paycheck)
- Check payment (separate from payroll)
- Credit card reconciliation

---

## PTO Tracking

**Navigation:** Setup > HR > Accrual Plans > New

### PTO Accrual

Rules define how PTO accrues:
- **Rate:** hours per pay period (e.g., 4 hours/biweekly)
- **Max Accrual:** cap on PTO balance (e.g., 120 hours)
- **Carryover:** how much can carry to next year

PTO balance is displayed on:
- Employee record > PTO Balance tab
- Employee pay stub
- Manager view of team balances

### Requesting PTO

Employee submits a time-off request → manager approves → balance decrements.

---

## Payroll Reports

| Report                        | Navigation                                              |
|-------------------------------|----------------------------------------------------------|
| Payroll Register              | Reports > Payroll > Payroll Register                    |
| Payroll Summary               | Reports > Payroll > Payroll Summary                     |
| Tax Liability Report          | Reports > Payroll > Tax Liability                       |
| 941 (Federal Tax Form)        | Reports > Payroll > Quarterly Federal Tax               |
| W-2 Forms                     | Reports > Payroll > W-2 Forms                           |
| PTO Balance Report            | Reports > HR > PTO Balances                             |
