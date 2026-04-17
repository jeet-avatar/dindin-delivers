---
source: SuiteScript 2.x API Reference — Employee Record Schema
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# Employee Record (record.Type.EMPLOYEE)

Internal record type ID: `'employee'`

The Employee record represents people who work for the organization. Employees can be
referenced as authors in email.send(), as sales reps on orders, as supervisors in
approval workflows, and as users with NetSuite login access.

## Record Constant

```javascript
record.Type.EMPLOYEE   // 'employee'
search.Type.EMPLOYEE   // 'employee'
```

## Body Fields

| Field ID | Label | Type | Notes |
|----------|-------|------|-------|
| `entityId` | Employee ID | Text | System-assigned. Format: EMP-XXX |
| `firstName` | First Name | Text | Required |
| `middleName` | Middle Name | Text | Optional |
| `lastName` | Last Name | Text | Required |
| `salutation` | Salutation | Select | Mr./Ms./Dr. |
| `email` | Email | Email | Used as NetSuite login (if login enabled) |
| `phone` | Phone | Phone | Work phone |
| `mobilePhone` | Mobile | Phone | Mobile phone |
| `fax` | Fax | Phone | |
| `subsidiary` | Subsidiary | Select | Required. Employee's home subsidiary |
| `department` | Department | Select | Employee's department |
| `location` | Location | Select | Work location |
| `class` | Class | Select | Classification |
| `supervisor` | Supervisor | Select | Reports-to (Employee internal ID) |
| `title` | Job Title | Text | Position/title |
| `hireDate` | Hire Date | Date | Start date |
| `releaseDate` | Termination Date | Date | End date (when terminated) |
| `startDatePayroll` | Payroll Start | Date | Payroll processing start |
| `terminationReason` | Term. Reason | Select | Reason for termination |
| `employeeStatus` | Status | Select | Active/Terminated/On Leave |
| `employeeType` | Type | Select | Full-time/Part-time/Contractor |
| `isInactive` | Inactive | Checkbox | True = terminated/inactive |
| `giveAccess` | Give Access | Checkbox | True = this employee can log in to NetSuite |
| `accessRole` | Access Role | Select | NetSuite role (if giveAccess=true) |
| `gender` | Gender | Select | Gender |
| `birthDate` | Birth Date | Date | Employee's date of birth |
| `address` | Address | Text | Home address |
| `directDeposit` | Direct Deposit | Select | Payroll direct deposit |
| `custentity_*` | Custom Fields | Various | Custom entity fields |

## Roles Sublist (roles)

Controls NetSuite login access — which roles and subsidiaries the employee can access.

| Field ID | Label | Notes |
|----------|-------|-------|
| `selectedrole` | Role | NetSuite role internal ID |
| `subsidiary` | Subsidiary | Subsidiary this role applies to |
| `isinactive` | Inactive | Whether this role access is disabled |

## Emergency Contacts Sublist (emergencycontact)

| Field ID | Label | Notes |
|----------|-------|-------|
| `emergencycontactname` | Name | Emergency contact name |
| `relationship` | Relationship | Relationship to employee |
| `contactphone` | Phone | Emergency contact phone |

## HR Sublists

### dependents
| Field ID | Notes |
|----------|-------|
| `dependentfirstname` | First name |
| `dependentlastname` | Last name |
| `dependentbirthdate` | Birth date |
| `dependentrelationship` | Relationship |

## Common Operations

### Create an employee
```javascript
var emp = record.create({
  type: record.Type.EMPLOYEE,
  isDynamic: true
});
emp.setValue({ fieldId: 'firstName', value: 'Jane' });
emp.setValue({ fieldId: 'lastName', value: 'Doe' });
emp.setValue({ fieldId: 'email', value: 'jane.doe@company.com' });
emp.setValue({ fieldId: 'title', value: 'Sales Representative' });
emp.setValue({ fieldId: 'subsidiary', value: 1 });
emp.setValue({ fieldId: 'department', value: salesDeptId });
emp.setValue({ fieldId: 'location', value: hqLocationId });
emp.setValue({ fieldId: 'hireDate', value: new Date('2024-01-15') });
emp.setValue({ fieldId: 'supervisor', value: managerId });
var empId = emp.save();
```

### Load employee details
```javascript
var emp = record.load({ type: record.Type.EMPLOYEE, id: empId });
var fullName = emp.getValue({ fieldId: 'firstName' }) + ' ' + emp.getValue({ fieldId: 'lastName' });
var email = emp.getValue({ fieldId: 'email' });
var dept = emp.getText({ fieldId: 'department' });
var supervisor = emp.getText({ fieldId: 'supervisor' });
```

### Update employee supervisor
```javascript
record.submitFields({
  type: record.Type.EMPLOYEE,
  id: empId,
  values: {
    supervisor: newManagerId,
    department: newDeptId
  }
});
```

### Grant NetSuite access
```javascript
var emp = record.load({ type: record.Type.EMPLOYEE, id: empId, isDynamic: true });
emp.setValue({ fieldId: 'giveAccess', value: true });

// Add a role
emp.selectNewLine({ sublistId: 'roles' });
emp.setCurrentSublistValue({ sublistId: 'roles', fieldId: 'selectedrole', value: salesRepRoleId });
emp.setCurrentSublistValue({ sublistId: 'roles', fieldId: 'subsidiary', value: 1 });
emp.commitLine({ sublistId: 'roles' });

emp.save();
```

### Search employees
```javascript
var empSearch = search.create({
  type: search.Type.EMPLOYEE,
  filters: [
    ['isinactive', search.Operator.IS, 'F'],
    'AND',
    ['department', search.Operator.IS, salesDeptId.toString()]
  ],
  columns: [
    search.createColumn({ name: 'entityId' }),
    search.createColumn({ name: 'firstName' }),
    search.createColumn({ name: 'lastName' }),
    search.createColumn({ name: 'email' }),
    search.createColumn({ name: 'title' }),
    search.createColumn({ name: 'department' }),
    search.createColumn({ name: 'supervisor' })
  ]
});
```

### Quick lookup by email
```javascript
var emailSearch = search.create({
  type: search.Type.EMPLOYEE,
  filters: [
    ['email', search.Operator.IS, 'jane.doe@company.com'],
    'AND',
    ['isinactive', search.Operator.IS, 'F']
  ],
  columns: [search.createColumn({ name: 'internalid' })]
});
var results = emailSearch.run().getRange({ start: 0, end: 1 });
var empId = results.length > 0 ? parseInt(results[0].id) : null;
```

## Common Search Filters

| Field | Operator | Use Case |
|-------|----------|----------|
| `isinactive` | IS | 'F' = active employees only |
| `department` | IS | Filter by department |
| `subsidiary` | IS | Filter by subsidiary |
| `supervisor` | IS | Find direct reports |
| `title` | CONTAINS | Search by job title |
| `email` | IS | Find by email address |
| `hiredate` | AFTER | New hires after a date |

## Notes

- `entityId` (e.g., 'EMP-001') vs `internalid` (numeric DB ID) — both can identify the record
- Employees with `giveAccess = true` can log into NetSuite using their `email` as username
- The `email` field is the NetSuite login username — must be unique across all employees
- `supervisor` field creates the organizational hierarchy used in approval workflows
- Employee records are referenced in `email.send()` as the `author` parameter (uses employee's email as From address)
- Deactivate by setting `isInactive = true` — do NOT delete employee records (breaks audit trail)
