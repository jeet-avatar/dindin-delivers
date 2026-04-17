---
source: SuiteScript 2.x API Reference — N/currency Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/currency Module

The N/currency module provides currency exchange rate lookup and currency formatting
utilities. Available in server-side scripts. Requires the Multi-Currency feature to be
enabled in the NetSuite account.

## Loading the Module

```javascript
define(['N/currency'], function(currency) { ... });
```

## Core Methods

### currency.exchangeRate(options)
Returns the exchange rate between two currencies for a given date.

```javascript
var rate = currency.exchangeRate({
  source: 'EUR',       // Source currency code (ISO 4217)
  target: 'USD',       // Target currency code
  date: new Date()     // Optional: defaults to current date if omitted
});

log.debug({ title: 'EUR/USD Rate', details: rate });
// Returns: number, e.g. 1.0823
```

**Parameters:**
- `source` (string): Required. Source currency ISO code (e.g., 'EUR', 'GBP', 'JPY')
- `target` (string): Required. Target currency ISO code
- `date` (Date): Optional. The date for the exchange rate lookup. Defaults to current date.

**Returns:** number (the exchange rate)

**Common currency codes:**
```
USD — US Dollar
EUR — Euro
GBP — British Pound
JPY — Japanese Yen
CAD — Canadian Dollar
AUD — Australian Dollar
INR — Indian Rupee
CNY — Chinese Yuan
MXN — Mexican Peso
BRL — Brazilian Real
CHF — Swiss Franc
SGD — Singapore Dollar
```

### currency.formatCurrency(options)
Formats a number as a currency string according to the currency's display rules.

```javascript
var formatted = currency.formatCurrency({
  number: 1234567.89,
  currency: 'USD'
});
// Returns: '$1,234,567.89'

var euroFormatted = currency.formatCurrency({
  number: 9999.5,
  currency: 'EUR'
});
// Returns: '€9,999.50' (format varies by currency/locale settings)
```

**Parameters:**
- `number` (number): Required. The numeric value to format
- `currency` (string): Required. Currency code (ISO 4217)

**Returns:** string (formatted currency string)

## Governance

| Operation | Governance Units |
|-----------|-----------------|
| `currency.exchangeRate()` | 0 units |
| `currency.formatCurrency()` | 0 units |

## Common Patterns

### Convert amount between currencies
```javascript
require(['N/currency'], function(currency) {

  function convertAmount(amountInSource, sourceCurrency, targetCurrency, onDate) {
    if (sourceCurrency === targetCurrency) return amountInSource;

    var rate = currency.exchangeRate({
      source: sourceCurrency,
      target: targetCurrency,
      date: onDate || new Date()
    });

    return amountInSource * rate;
  }

  var eurAmount = 1000;
  var usdAmount = convertAmount(eurAmount, 'EUR', 'USD', new Date('2024-01-15'));
  log.debug({ title: 'Converted', details: eurAmount + ' EUR = ' + usdAmount.toFixed(2) + ' USD' });
});
```

### Format amounts on a Sales Order
```javascript
require(['N/currency', 'N/record'], function(currency, record) {

  var so = record.load({ type: record.Type.SALES_ORDER, id: 1234 });
  var amount = so.getValue({ fieldId: 'amount' });
  var currencyCode = so.getText({ fieldId: 'currency' }); // e.g. 'USD', 'EUR'

  var displayAmount = currency.formatCurrency({
    number: amount,
    currency: currencyCode
  });

  log.audit({ title: 'Order Total', details: displayAmount });
});
```

### Multi-currency invoice conversion
```javascript
require(['N/currency'], function(currency) {

  // Get historical exchange rates for reporting
  var invoiceDate = new Date('2024-06-30');

  var currencies = ['EUR', 'GBP', 'CAD', 'AUD'];
  var rates = {};

  currencies.forEach(function(code) {
    rates[code] = currency.exchangeRate({
      source: code,
      target: 'USD',
      date: invoiceDate
    });
    log.debug({ title: code + ' to USD', details: rates[code] });
  });

  return rates;
});
```

## Notes

- Exchange rates must be configured in NetSuite under Lists > Accounting > Currency Exchange Rates
- If no rate exists for the requested date, NetSuite uses the most recent rate before that date
- The `currency.exchangeRate()` method reads from NetSuite's stored rate table — it does NOT
  call an external service
- For displaying currency amounts in UI, consider using `format.format()` with `format.Type.CURRENCY`
  which respects the current user's locale settings
- Always use `parseFloat()` or `Number()` on retrieved field values before passing to `exchangeRate()`,
  as record field values are often returned as strings

## Feature Requirement

This module requires the **Multi-Currency** feature to be active. Check availability:

```javascript
require(['N/runtime'], function(runtime) {
  if (!runtime.isFeatureInEffect({ feature: 'MULTICURRENCY' })) {
    log.error({ title: 'Feature Missing', details: 'Multi-Currency not enabled in this account' });
    return;
  }
  // Safe to use currency module
});
```
