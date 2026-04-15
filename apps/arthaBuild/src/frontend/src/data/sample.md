# Q&A Canned Responses

## What is NetSuite and what are its primary functions?
NetSuite is a cloud-based business management suite that integrates key operations into a single platform.  

Primary functions include:  
- Financial Management & Accounting – automates general ledger, accounts payable/receivable, tax compliance, and reporting.  
- Customer Relationship Management (CRM) – manages sales, marketing, and customer support in one system.  
- Inventory & Supply Chain Management – tracks stock, demand planning, procurement, and distribution.  
- Order & Billing Management – handles order processing, invoicing, and revenue recognition.  
- E-commerce Integration – supports online stores with seamless back-office connectivity.  
- Human Capital Management (HCM) – manages payroll, HR, and workforce planning.  

## What is SuiteScript and what is it used for in NetSuite?
SuiteScript is NetSuite’s JavaScript-based API framework.  

It is used to:  
- Customize NetSuite’s standard functionality.  
- Automate business processes (workflows, validations, approvals).  
- Extend NetSuite with custom apps and dashboards.  
- Manipulate records and data (create, update, delete, search).  
- Integrate with external systems using REST or SOAP.  

## Explain the architectural difference between SuiteScript 1.0 and 2.0. Why is this change significant?
SuiteScript 1.0  
- Global objects, no modularity.  
- Harder to maintain.  

SuiteScript 2.0  
- Modular AMD-style architecture.  
- Explicit imports (`N/record`, `N/search`).  
- Cleaner, reusable, scalable.  

Why significant?  
- Easier to debug, maintain, and scale.  
- Reduces naming conflicts.  
- Modern JS practices.