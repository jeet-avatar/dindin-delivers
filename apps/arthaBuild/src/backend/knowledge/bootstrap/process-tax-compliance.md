---
source: Oracle NetSuite Official Documentation — Tax Compliance
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Tax Compliance

## Overview

NetSuite supports multiple tax frameworks for global compliance:
US Sales Tax, VAT (EU/UK/global), GST (Australia/Canada/India), and 1099 reporting.
The SuiteTax module (modern) and the legacy tax framework are both supported.

---

## US Sales Tax

### Tax Setup

**Navigation:** Setup > Accounting > Tax Codes > New

Or use TaxJar / Avalara integration for automated tax calculation.

### Tax Codes

Tax codes define the rate applied to transactions:

| Field           | Description                                          |
|-----------------|------------------------------------------------------|
| name            | Tax code name (e.g., "CA-Sales-Tax-9.25%")          |
| rate            | Tax percentage (e.g., 9.25)                          |
| taxable         | T = taxable lines, F = exempt                        |
| taxType         | SALES, PURCHASE, WITHHOLDING                         |
| state           | State the rate applies to                            |
| nexus           | Physical presence / economic nexus                  |

### Nexus

Nexus = legal obligation to collect tax in a jurisdiction.

**Types:**
- **Physical Nexus:** office, warehouse, employee in the state
- **Economic Nexus:** $100K or 200 transactions/year in a state (post-South Dakota v. Wayfair)

**Navigation:** Setup > Accounting > Tax > Nexus > New

---

## SuiteTax (Modern Tax Framework)

SuiteTax is the modern replacement for the legacy tax module.

**Enable:** Setup > Company > Enable Features > Tax tab > check "SuiteTax"

Key concepts:
- **Tax Groups:** Combine multiple tax rates (e.g., state + county + city)
- **Tax Codes:** Applied per line item
- **Nexus mapping:** Automatic rate lookup based on ship-to address

### Configuring Tax Groups

```
Tax Group "CA Combined Rate":
- CA State Sales Tax: 6.0%
- LA County: 1.0%
- City of Los Angeles: 1.0%
- District Tax: 1.25%
Total Rate: 9.25%
```

---

## VAT (Value Added Tax)

VAT applies in EU, UK, and many other countries.

**Enable:** Setup > Company > Enable Features > Accounting tab > check "International Tax Reports"

### VAT Setup

**Navigation:** Setup > Accounting > Tax > VAT/GST Rates > New

| Field           | Description                                          |
|-----------------|------------------------------------------------------|
| name            | Rate name (e.g., "UK Standard 20%")                 |
| rate            | Tax percentage                                       |
| country         | Country the rate applies to                          |
| vatType         | Standard, Reduced, Zero, Exempt, Outside Scope      |

### VAT on Transactions

- **Input VAT:** VAT paid on purchases (recoverable by VAT-registered businesses)
- **Output VAT:** VAT charged on sales (collected on behalf of government)
- **Net VAT:** Output VAT - Input VAT = amount remitted to tax authority

### VAT Return

**Navigation:** Reports > Taxes > VAT Return

Box breakdown (UK example):
- Box 1: VAT due on sales (output VAT)
- Box 4: VAT reclaimed on purchases (input VAT)
- Box 5: Net VAT to pay (Box 1 - Box 4)

---

## 1099 Vendor Reporting (US)

US companies must file 1099 forms for independent contractors paid > $600/year.

### Setting Up 1099 Vendors

```javascript
define(['N/record'], function(record) {
    var vendor = record.load({ type: record.Type.VENDOR, id: 789 });
    vendor.setValue({ fieldId: 'is1099eligible', value: true });    // Must be true
    vendor.setValue({ fieldId: 'taxidentificationtype', value: 'EIN' }); // or SSN
    vendor.setValue({ fieldId: 'taxidnum', value: '12-3456789' });  // EIN
    vendor.save();
});
```

**Also set:**
- Federal Tax Code on vendor record (for withholding type)
- 1099 form type: 1099-NEC (non-employee compensation), 1099-MISC, 1099-INT, etc.

### 1099 Report

**Navigation:** Reports > Vendors > 1099

Filter by calendar year. Export to generate 1099 forms or file electronically.

---

## GST (Goods and Services Tax)

GST applies in Australia, Canada, India, Singapore, and others.

### Australia GST

- Standard rate: 10%
- Input tax credit: GST paid on purchases is recoverable
- BAS (Business Activity Statement) filed quarterly

### Canada GST/HST/PST

- **GST:** Federal 5%
- **HST:** Harmonized (combined federal + provincial): 13-15%
- **PST/QST:** Province-specific sales tax (separate from GST)

### India GST

- **CGST:** Central GST (federal)
- **SGST:** State GST
- **IGST:** Integrated GST (interstate transactions)
- GST rates: 0%, 5%, 12%, 18%, 28% by item category

---

## Tax Compliance Calendar

| Event                        | Frequency          | Jurisdiction     |
|------------------------------|--------------------|------------------|
| Sales Tax Return (US)        | Monthly/Quarterly  | Each nexus state |
| VAT Return                   | Monthly/Quarterly  | UK, EU countries |
| BAS (Australia GST)          | Quarterly          | Australia        |
| 1099-NEC Filing              | Annual (Jan 31)    | US Federal       |
| W-2 Filing                   | Annual (Jan 31)    | US Federal       |
| GST/HST Return (Canada)      | Monthly/Quarterly  | Canada           |

---

## Tax Reports in NetSuite

| Report                    | Navigation                                        |
|---------------------------|---------------------------------------------------|
| Sales Tax Liability       | Reports > Taxes > Sales Tax Liability             |
| Tax Audit Report          | Reports > Taxes > Tax Audit                       |
| VAT Return                | Reports > Taxes > VAT Return                      |
| 1099 Summary              | Reports > Vendors > 1099                          |
| Tax Details by Transaction| Reports > Taxes > Transaction Tax Details         |
