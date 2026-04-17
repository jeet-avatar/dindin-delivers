---
source: SuiteScript 2.x API Reference — N/runtime Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/runtime Module

The N/runtime module provides information about the current script execution environment:
the current user, script, execution context, account, and feature availability.
Available in all script types (server-side and client-side).

## Loading the Module

```javascript
define(['N/runtime'], function(runtime) { ... });
```

## Current User

### runtime.getCurrentUser()
Returns information about the user executing the script.

```javascript
var user = runtime.getCurrentUser();

user.id           // Internal ID of the current user (number)
user.name         // Full name (string), e.g. 'John Smith'
user.email        // Email address (string)
user.role         // Role internal ID (number)
user.roleId       // Role script ID (string), e.g. 'administrator'
user.roleName     // Role display name (string), e.g. 'Administrator'
user.location     // Location internal ID (number)
user.department   // Department internal ID (number)
user.subsidiary   // Subsidiary internal ID (number)
user.contact      // Contact record internal ID if linked (number)
```

**Common use:**
```javascript
var user = runtime.getCurrentUser();
log.debug({ title: 'Running as', details: user.name + ' (' + user.role + ')' });

// Check if user is administrator
if (user.roleId === 'administrator') {
  // Admin-only logic
}

// Get current user's subsidiary for filtering
var subsidiaryId = user.subsidiary;
```

## Current Script

### runtime.getCurrentScript()
Returns information about the currently executing script deployment.

```javascript
var script = runtime.getCurrentScript();

script.id                // Script internal ID (number)
script.deploymentId      // Deployment script ID (string)
script.getRemainingUsage() // Units remaining in governance budget (number)
script.percentComplete   // Set by script (not auto-calculated) — used for progress display
```

### Script Parameters
```javascript
var script = runtime.getCurrentScript();

// Read a script parameter (defined in deployment setup)
var paramValue = script.getParameter({ name: 'custscript_my_param' });
// Returns: string, number, boolean depending on param type
```

### Governance Check Pattern
```javascript
var script = runtime.getCurrentScript();

function processRecord(id) {
  // Always check governance before expensive operations
  if (script.getRemainingUsage() < 100) {
    log.audit({ title: 'Low governance', details: 'Stopping early — remaining: ' + script.getRemainingUsage() });
    return false; // Signal to stop processing
  }
  // ... process the record ...
  return true;
}
```

### percentComplete (Scheduled/MapReduce)
```javascript
// Set progress for monitoring in script status UI
script.percentComplete = 50; // 0-100
```

## Current Session (Suitelets only)

### runtime.getCurrentSession()
```javascript
var session = runtime.getCurrentSession();

session.get({ name: 'myKey' })             // Get session value
session.set({ name: 'myKey', value: 'xyz' }) // Set session value
session.remove({ name: 'myKey' })           // Remove session key
```

## Execution Context

### runtime.executionContext
Returns the context in which the script is running (string constant).

```javascript
var context = runtime.executionContext;

switch(context) {
  case runtime.ContextType.USER_INTERFACE:
    // Script triggered from the NetSuite UI
    break;
  case runtime.ContextType.SCHEDULED:
    // Script running as a scheduled job
    break;
  case runtime.ContextType.RESTLET:
    // Script running as a RESTlet call
    break;
  case runtime.ContextType.SUITELET:
    // Script running as a Suitelet
    break;
  case runtime.ContextType.USEREVENT:
    // Called from within a user event script
    break;
  case runtime.ContextType.CSV_IMPORT:
    // Script triggered by CSV import
    break;
  case runtime.ContextType.MAP_REDUCE:
    // Map/Reduce execution
    break;
  case runtime.ContextType.WORKFLOW:
    // Workflow action
    break;
  case runtime.ContextType.WEBSERVICES:
    // SOAP web services call
    break;
  case runtime.ContextType.WEBSTORE:
    // SuiteCommerce / web store
    break;
}
```

### runtime.ContextType Constants
```javascript
runtime.ContextType.USER_INTERFACE  // 'userinterface'
runtime.ContextType.SCHEDULED       // 'scheduled'
runtime.ContextType.RESTLET         // 'restlet'
runtime.ContextType.SUITELET        // 'suitelet'
runtime.ContextType.USEREVENT       // 'userevent'
runtime.ContextType.CSV_IMPORT      // 'csvimport'
runtime.ContextType.MAP_REDUCE      // 'mapreduce'
runtime.ContextType.WORKFLOW        // 'workflow'
runtime.ContextType.WEBSERVICES     // 'webservices'
runtime.ContextType.WEBSTORE        // 'webstore'
runtime.ContextType.ACTION          // 'action'
runtime.ContextType.PORTLET         // 'portlet'
runtime.ContextType.MASS_UPDATE     // 'massupdate'
```

## Feature Check

### runtime.isFeatureInEffect(options)
Checks if a NetSuite feature is enabled for this account.

```javascript
var hasMultiCurrency = runtime.isFeatureInEffect({ feature: 'MULTICURRENCY' });
var hasAdvancedInventory = runtime.isFeatureInEffect({ feature: 'ADVANCEDINVENTORY' });
var hasMultiBook = runtime.isFeatureInEffect({ feature: 'MULTIBOOK' });
var hasSuiteCommerce = runtime.isFeatureInEffect({ feature: 'SUITECOMMERCE' });
```

**Returns:** boolean

Common feature names:
- `'MULTICURRENCY'` — Multi-currency support
- `'ADVANCEDINVENTORY'` — Advanced Inventory
- `'MULTISUBSIDIARY'` — Multi-subsidiary (OneWorld)
- `'MULTIBOOK'` — Multi-book accounting
- `'SUITECOMMERCE'` — SuiteCommerce
- `'SERIALIZEITEMS'` — Serialized inventory
- `'LOTNUMBERING'` — Lot numbering

## Account Information

```javascript
runtime.accountId  // Account ID string (e.g. '1234567' or 'TSTDRV1234567')

// Check if this is a sandbox account
var isSandbox = runtime.accountId.indexOf('TSTDRV') !== -1;

// Check if production
var isProduction = !isSandbox && !runtime.accountId.endsWith('_SB1');
```

## Script Version

```javascript
runtime.version   // SuiteScript API version string: '2.0' or '2.1'
```

## Common Patterns

### Safe governance check before loop
```javascript
function execute(context) {
  var script = runtime.getCurrentScript();
  var results = getDataToProcess(); // returns array

  results.forEach(function(item) {
    if (script.getRemainingUsage() < 500) {
      log.audit({ title: 'Governance limit approaching', details: 'Stopping at item ' + item.id });
      // Optionally: reschedule for remaining items
      return;
    }
    processItem(item);
  });
}
```

### Role-based behavior
```javascript
var user = runtime.getCurrentUser();
var isAdmin = (user.roleId === 'administrator');
var isSalesRep = (user.role === 15); // role internal ID

if (isAdmin) {
  // Show all data
} else {
  // Filter to user's subsidiary
  filters.push(['subsidiary', search.Operator.IS, user.subsidiary.toString()]);
}
```

### Environment-aware logging
```javascript
var script = runtime.getCurrentScript();
var isDebugMode = script.getParameter({ name: 'custscript_debug_mode' }) === 'T';

function debugLog(title, details) {
  if (isDebugMode) {
    log.debug({ title: title, details: details });
  }
}
```
