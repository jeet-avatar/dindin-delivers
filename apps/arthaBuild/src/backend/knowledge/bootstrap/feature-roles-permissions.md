---
source: Oracle NetSuite Official Documentation — Roles and Permissions
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Roles and Permissions

## Overview

NetSuite controls access to records, features, and functionality via Roles.
Each user is assigned one or more roles. Roles define what records a user can
view/create/edit/delete, which reports they can run, and which menus they see.

**Navigation:** Setup > Users/Roles > Manage Roles

---

## Permission Levels

| Level  | Integer | Description                                          |
|--------|---------|------------------------------------------------------|
| NONE   | 0       | No access — role cannot see or interact with feature |
| VIEW   | 1       | Read-only access — can see but not create/edit       |
| CREATE | 2       | Can create new records but not edit existing ones    |
| EDIT   | 3       | Can create and edit existing records                 |
| FULL   | 4       | Full access including delete                         |

---

## Role Configuration

### Creating a Role

1. Navigate to Setup > Users/Roles > Manage Roles > New
2. Set Role Name (e.g., "AP Manager")
3. Set Script ID: `customrole_ap_manager`
4. Configure Permissions tabs:
   - **Transactions:** Sales Orders, Invoices, Purchase Orders, etc.
   - **Lists:** Items, Customers, Vendors, Employees
   - **Reports:** Saved Searches, Financial Reports
   - **Setup:** Configuration, Customization access
   - **Custom Records:** Access to each custom record type

### Standard Roles

| Role Name           | Role ID | Description                           |
|--------------------|---------|---------------------------------------|
| Administrator       | 3       | Full access — all features/records    |
| CEO (View Only)     | 14      | Read-only access to everything        |
| Accountant          | 10      | GL, AR, AP, banking access            |
| Sales Representative| 18      | Customers, Estimates, Sales Orders    |

**Administrator role ID is always 3** — this is standard across all NetSuite accounts.

---

## Checking Role in SuiteScript

```javascript
define(['N/runtime', 'N/log'], function(runtime, log) {
    var currentUser = runtime.getCurrentUser();

    var roleId = currentUser.role;         // Role internal ID (integer)
    var roleScriptId = currentUser.roleId; // Role scriptId (string, e.g., 'customrole_ap_manager')
    var userId = currentUser.id;           // Employee internal ID
    var email = currentUser.email;         // User email
    var name = currentUser.name;           // User display name
    var subsidiary = currentUser.subsidiary; // Primary subsidiary internal ID

    log.debug('User', email + ' has role ' + roleId + ' (' + roleScriptId + ')');

    // Check if Administrator
    if (roleId === 3) {
        log.debug('Admin', 'Running as administrator');
    }

    // Check by scriptId
    if (roleScriptId === 'customrole_approver') {
        log.debug('Approver', 'User can approve records');
    }
});
```

---

## Script Execution Context

SuiteScript runs as the logged-in user (not as administrator):
- User Event scripts: run as the user who triggered the event
- Scheduled scripts: run as the role specified in the script deployment
- RESTlet: run as the role specified in the access token used

### Execution Context Types

```javascript
define(['N/runtime'], function(runtime) {
    var context = runtime.executionContext;

    switch(context) {
        case runtime.ContextType.USER_INTERFACE:
            // Regular UI user action
            break;
        case runtime.ContextType.WEBSERVICES:
            // SOAP web services call
            break;
        case runtime.ContextType.REST_COMPONENT:
            // REST API / RESTlet call
            break;
        case runtime.ContextType.SCHEDULED:
            // Scheduled script execution
            break;
        case runtime.ContextType.WORKFLOW:
            // Triggered by a workflow
            break;
        case runtime.ContextType.CSV_IMPORT:
            // CSV import process
            break;
    }
});
```

---

## Script Deployments and Allowed Roles

Script deployments can restrict which roles can trigger a script:

**In UI:** Script Deployment record > Audience tab > "Roles" list

**In SuiteScript:** The deployment's `allowedRoles` list controls which roles
can trigger the script. By default: all roles can trigger.

For sensitive operations, restrict to specific roles:
```xml
<!-- In SDF deployment XML -->
<scriptdeployment scriptid="customdeploy_financial_ue">
  <status>RELEASED</status>
  <allemployees>false</allemployees>
  <allpartners>false</allpartners>
  <allsubsidiaries>true</allsubsidiaries>
  <audslctrole>
    <role scriptid="customrole_finance_manager"/>
    <role internalid="3"/> <!-- Administrator -->
  </audslctrole>
</scriptdeployment>
```

---

## Role-Based Logic in Scripts

```javascript
define(['N/runtime', 'N/error'], function(runtime, error) {
    function beforeSubmit(context) {
        var currentUser = runtime.getCurrentUser();
        var APPROVER_ROLE = 'customrole_approver';
        var ADMIN_ROLE_ID = 3;

        // Allow only approvers and admins to change status
        if (context.newRecord.getValue({ fieldId: 'custbody_approval_status' }) === 'Approved') {
            if (currentUser.roleId !== APPROVER_ROLE && currentUser.role !== ADMIN_ROLE_ID) {
                throw error.create({
                    name: 'INSUFFICIENT_PERMISSIONS',
                    message: 'Only approvers can set status to Approved',
                    notifyOff: true
                });
            }
        }
    }
    return { beforeSubmit: beforeSubmit };
});
```

---

## Elevating Permissions (Run as Admin)

When a Scheduled Script or Suitelet deployment is set to "Run as Admin":
- The script runs with Administrator permissions
- `runtime.getCurrentUser().role` returns `3` (Administrator)
- Use sparingly — follow principle of least privilege

Configure on the Script Deployment record: check "Run as Administrator"

---

## Data Segmentation by Role (Subsidiary/Department Restriction)

Access can be restricted further by:
- **Subsidiary restrictions:** Users only see records in their assigned subsidiaries
- **Department restrictions:** Users only see records in their department
- **Custom segment restrictions:** Using record-level restrictions

Configure via: Setup > Users/Roles > Manage Roles > Restrictions tab

---

## Checking Feature Permissions

```javascript
define(['N/runtime'], function(runtime) {
    // Check if current user has Sales Order EDIT permission
    var permLevel = runtime.getCurrentUser().getPermission({ name: 'TRAN_SALESORDER' });
    // Returns: 0 (none), 1 (view), 2 (create), 3 (edit), 4 (full)

    if (permLevel >= 3) {
        // Can edit sales orders
    }
});
```
