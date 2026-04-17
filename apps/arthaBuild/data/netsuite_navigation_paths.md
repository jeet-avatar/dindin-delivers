## NetSuite Navigation Paths — Complete Reference

This document covers the most common NetSuite UI navigation paths organized by menu area.

---

### Setup Menu
- Setup > Company > General Preferences
- Setup > Company > Enable Features
- Setup > Accounting > Accounting Preferences (Items/Transactions tab — "Use Multiple Prices")
- Setup > Accounting > Chart of Accounts
- Setup > Users/Roles > Manage Roles
- Setup > Users/Roles > Manage Users
- Setup > Integration > Manage Integrations (for SuiteScript/TBA)
- Setup > Integration > Manage Authentication (TBA tokens)

### Lists Menu
- Lists > Accounting > Price Levels
- Lists > Accounting > Price Levels > New (create new price level)
- Lists > Accounting > Accounts
- Lists > Accounting > Payment Terms
- Lists > Accounting > Tax Codes
- Lists > Items > Items (all item types)
- Lists > Relationships > Customers
- Lists > Relationships > Vendors
- Lists > Relationships > Employees
- Lists > Supply Chain > Locations
- Lists > Supply Chain > Subsidiaries (OneWorld only)

### Transactions Menu
- Transactions > Sales > Enter Sales Orders
- Transactions > Sales > Create Invoices
- Transactions > Sales > Invoice > Apply Credits
- Transactions > Purchases > Enter Bills
- Transactions > Purchases > Pay Bills
- Transactions > Purchases > Enter Purchase Orders
- Transactions > Inventory > Adjust Inventory
- Transactions > Inventory > Transfer Inventory
- Transactions > Bank > Make Deposits
- Transactions > Bank > Reconcile Bank Statement
- Transactions > Payroll > Enter Paychecks (if Payroll module enabled)

### Reports Menu
- Reports > Financial > Income Statement (Profit & Loss)
- Reports > Financial > Balance Sheet
- Reports > Financial > Cash Flow Statement
- Reports > Financial > General Ledger
- Reports > Accounts Receivable > A/R Aging Summary
- Reports > Accounts Payable > A/P Aging Summary
- Reports > Sales > Sales by Customer
- Reports > Inventory > Inventory Valuation Summary
- Reports > Saved Searches (custom saved searches)

### Customization Menu
- Customization > Scripting > Scripts (manage all scripts)
- Customization > Scripting > Scripts > New (create new script)
- Customization > Scripting > Script Deployments
- Customization > Scripting > Script Execution Log
- Customization > Workflow > Workflows
- Customization > Workflow > Workflow Actions
- Customization > Forms > Entry Forms (custom record/transaction forms)
- Customization > Forms > Transaction Forms
- Customization > Lists, Records & Fields > Record Types (custom records)
- Customization > Lists, Records & Fields > Transaction Body Fields
- Customization > Lists, Records & Fields > Transaction Column Fields
- Customization > Lists, Records & Fields > Item Fields
- Customization > Lists, Records & Fields > CRM Fields

### SuiteAnalytics / Reports
- Reports > New Search (saved search builder)
- Reports > Saved Searches (list all)
- Analytics > Workbooks (SuiteAnalytics Workbook)

### OneWorld (Multi-Subsidiary)
- Setup > Company > Subsidiaries
- Transactions require selecting a subsidiary before proceeding

---

## Common Task → Navigation Quick Reference

| Task | Navigation Path |
|------|----------------|
| Create a customer | Lists > Relationships > Customers > New |
| Create a sales order | Transactions > Sales > Enter Sales Orders |
| Create an invoice from SO | Transactions > Sales > Create Invoices |
| Receive payment | Transactions > Customers > Receive Payments |
| Enter a vendor bill | Transactions > Purchases > Enter Bills |
| Pay a vendor | Transactions > Purchases > Pay Bills |
| Create a purchase order | Transactions > Purchases > Enter Purchase Orders |
| Adjust inventory | Transactions > Inventory > Adjust Inventory |
| Create a price level | Lists > Accounting > Price Levels > New |
| Enable price levels | Setup > Accounting > Accounting Preferences > Items/Transactions |
| Create a SuiteScript | Customization > Scripting > Scripts > New |
| View script logs | Customization > Scripting > Script Execution Log |
| Create a workflow | Customization > Workflow > Workflows > New |
| Create a custom field | Customization > Lists, Records & Fields > [field type] > New |
| Create a saved search | Reports > New Search |
| Manage user roles | Setup > Users/Roles > Manage Roles |
| Set up TBA tokens | Setup > Integration > Manage Authentication |
| View A/R aging | Reports > Accounts Receivable > A/R Aging Summary |
| View income statement | Reports > Financial > Income Statement |

---

## Important Notes
- **Exact paths vary slightly by NetSuite version and enabled modules.** If a path is not found, use the Global Search (top navigation bar) and type the feature name.
- **Role-based visibility:** Some menu items only appear if your role has access. An Administrator role sees all paths above.
- **OneWorld:** Subsidiaries add an extra selection step before most transactions.
