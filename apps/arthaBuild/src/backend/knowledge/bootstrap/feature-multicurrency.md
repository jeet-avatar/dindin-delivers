---
source: Oracle NetSuite Official Documentation — Multi-Currency
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Multi-Currency in NetSuite

## Overview

NetSuite Multi-Currency enables transactions, customers, vendors, and bank accounts
in foreign currencies while reporting in the company's base (functional) currency.
Exchange rates are maintained in the Currency Exchange Rates table and can be
auto-updated from market feeds.

**Navigation:** Lists > Accounting > Currencies

---

## Currency Setup

### Enable Multi-Currency

Navigate: Setup > Company > Enable Features > Transactions tab > check "Multiple Currencies"

### Managing Currencies

Navigate: Lists > Accounting > Currencies
- Add currencies by ISO code (USD, EUR, GBP, JPY, etc.)
- Set exchange rate type: Monthly Closing Rate, Daily Rate, or Historical Rate

### Exchange Rate Tables

Navigate: Lists > Accounting > Currency Exchange Rates

- Set exchange rate type (Monthly, Daily, Average, etc.)
- Manual entry or market-feed auto-update
- Rates are period-specific

---

## Currency Fields on Records

### Customer/Vendor Currency

```javascript
define(['N/record'], function(record) {
    // Set default currency on customer
    var customer = record.create({ type: record.Type.CUSTOMER });
    customer.setValue({ fieldId: 'currency', value: 2 }); // EUR currency ID
    // Note: Currency internal ID varies by account — use search to find it
});
```

### Transaction Currency Fields

When a transaction is in a foreign currency, three amount fields exist:

| Field            | Description                                              |
|------------------|----------------------------------------------------------|
| `foreignAmount`  | Amount in the transaction currency (e.g., EUR)          |
| `amount`         | Amount converted to base currency (e.g., USD)           |
| `tranFxAmount`   | Same as foreignAmount (used on transaction lines)        |
| `exchangeRate`   | Exchange rate applied for conversion                     |

```javascript
define(['N/record', 'N/log'], function(record, log) {
    var invoice = record.load({ type: record.Type.INVOICE, id: 123 });

    var currency = invoice.getValue({ fieldId: 'currency' });        // Currency internal ID
    var currencyText = invoice.getText({ fieldId: 'currency' });     // "EUR"
    var exchangeRate = invoice.getValue({ fieldId: 'exchangerate' }); // e.g., 1.08
    var foreignAmount = invoice.getValue({ fieldId: 'foreigntotal' }); // Amount in EUR
    var baseAmount = invoice.getValue({ fieldId: 'total' });          // Amount in USD
});
```

---

## Exchange Rate Retrieval in SuiteScript

```javascript
define(['N/currency'], function(currency) {
    // Get exchange rate for a specific date
    var rate = currency.exchangeRate({
        source: 'USD',      // From currency (ISO code)
        target: 'EUR',      // To currency
        date: new Date()    // Date for rate lookup
    });
    log.debug('Rate', 'USD to EUR: ' + rate);

    // Convert amount
    var usdAmount = 1000;
    var eurAmount = usdAmount / rate;
});
```

---

## Multi-Currency Transactions

### Creating a Foreign Currency Invoice

```javascript
define(['N/record'], function(record) {
    var invoice = record.create({ type: record.Type.INVOICE });
    invoice.setValue({ fieldId: 'entity', value: 456 });          // Customer
    invoice.setValue({ fieldId: 'currency', value: 3 });           // EUR currency ID
    invoice.setValue({ fieldId: 'exchangerate', value: 1.0876 });  // Override rate

    invoice.selectNewLine({ sublistId: 'item' });
    invoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 100 });
    invoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 5 });
    invoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 200 }); // EUR price
    invoice.commitLine({ sublistId: 'item' });

    invoice.save();
});
```

---

## Multi-Currency Bank Accounts

Bank accounts can be in any currency:
1. Navigate: Lists > Accounting > Accounts > New (Type = Bank)
2. Set "Currency" field to the bank account's currency
3. Bank register shows transactions in the account's native currency

**Key rule:** When reconciling a foreign currency bank account, use the bank's
statement amounts (in foreign currency) — not the base currency equivalents.

---

## Currency Revaluation

Revaluation adjusts open foreign-currency balances to current exchange rates:
- Revalues: unpaid invoices, unpaid bills, bank balances
- Creates unrealized gain/loss journal entries
- Run at period end before closing

**Navigation:** Transactions > Financial > Revalue Open Currency Balances

Required setup: Setup > Accounting > Accounting Preferences > check "Automatically
Apply Available Credits / Payments"

---

## SuiteQL with Currency

```sql
-- Get invoices with foreign currency details
SELECT t.id, t.tranId, t.currency, c.symbol, t.exchangerate,
       t.foreigntotal AS amountForeignCurrency,
       t.total AS amountBaseCurrency
FROM transaction t
JOIN currency c ON t.currency = c.id
WHERE t.type = 'CustInvc'
  AND t.currency != (SELECT id FROM currency WHERE symbol = 'USD')
ORDER BY t.tranDate DESC
```

---

## Currency-Aware Reporting

Reports support currency display:
- **Consolidated reports:** convert all currencies to base (parent subsidiary currency)
- **By currency:** group transactions by transaction currency for FX analysis
- **Budget vs Actual in foreign currency:** budget can be in functional or transaction currency

---

## Consolidation Translation (OneWorld)

When consolidating subsidiary financial statements:
- Assets/Liabilities: translated at closing rate (balance sheet rate)
- Revenue/Expense: translated at average rate for the period
- Translation adjustment: difference posted to Cumulative Translation Adjustment (CTA) account

---

## Common Issues

| Issue                         | Cause                                           | Fix                                                    |
|-------------------------------|--------------------------------------------------|--------------------------------------------------------|
| Wrong exchange rate on record | Rate not updated for period                     | Manually set `exchangerate` field or update rate table |
| Revaluation not running       | Period not open for adjustment                  | Open the period or use prior period adjustment         |
| Customer currency mismatch    | Customer default currency differs from SO       | Match the SO currency to customer's default             |
| Base amount missing           | `amount` field is in base currency only         | Use `foreignAmount` for foreign currency display       |
