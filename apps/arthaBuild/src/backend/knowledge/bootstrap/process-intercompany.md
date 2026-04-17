---
source: Oracle NetSuite Official Documentation — Intercompany Transactions (OneWorld)
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Intercompany Transactions

## Overview

In NetSuite OneWorld, Intercompany (ICO) transactions flow between subsidiaries.
NetSuite automates the creation of mirror transactions and supports elimination
for consolidated reporting, ensuring intercompany activity is properly accounted for.

---

## Types of Intercompany Transactions

| Type                         | Description                                              |
|------------------------------|----------------------------------------------------------|
| Intercompany Sales Order     | Subsidiary A sells goods to Subsidiary B                |
| Intercompany Transfer Order  | Transfer inventory between subsidiaries                 |
| Intercompany Journal Entry   | Recharge costs, allocate expenses between subs           |
| Intercompany Netting         | Offset AR (Sub A owed by Sub B) vs AP (Sub A owes Sub B)|

---

## Intercompany Sales Order

When one subsidiary sells to another:

**Record Type:** `record.Type.INTERCOMPANY_SALES_ORDER`

```javascript
define(['N/record'], function(record) {
    // Subsidiary A creates an intercompany sales order to sell to Subsidiary B
    var icoSO = record.create({
        type: record.Type.INTERCOMPANY_SALES_ORDER,
        isDynamic: true
    });

    icoSO.setValue({ fieldId: 'subsidiary', value: 1 });         // Selling subsidiary (Sub A)
    icoSO.setValue({ fieldId: 'intercostomer', value: 500 });    // Intercompany customer (Sub B entity)
    icoSO.setValue({ fieldId: 'currency', value: 1 });           // USD

    icoSO.selectNewLine({ sublistId: 'item' });
    icoSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 456 });
    icoSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 100 });
    icoSO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 50 });
    icoSO.commitLine({ sublistId: 'item' });

    var icoSOId = icoSO.save();
    // NetSuite auto-creates mirror PO in Sub B
});
```

**Mirror Transaction:** When the ICO Sales Order is saved, NetSuite automatically
creates a matching Purchase Order in Subsidiary B. Sub B's PO is linked to Sub A's SO.

---

## Intercompany Transfer Order

Transfer inventory from one subsidiary to another:

```javascript
define(['N/record'], function(record) {
    var ito = record.create({ type: record.Type.INTERCOMPANY_TRANSFER_ORDER, isDynamic: true });
    ito.setValue({ fieldId: 'subsidiary', value: 1 });            // Source subsidiary
    ito.setValue({ fieldId: 'tosubsidiary', value: 2 });          // Destination subsidiary
    ito.setValue({ fieldId: 'transferlocation', value: 3 });      // Source location
    ito.setValue({ fieldId: 'location', value: 8 });              // Destination location
    ito.setValue({ fieldId: 'memo', value: 'Rebalance stock between US and EU subs' });

    ito.selectNewLine({ sublistId: 'item' });
    ito.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 456 });
    ito.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 50 });
    ito.commitLine({ sublistId: 'item' });

    var itoId = ito.save();
});
```

---

## Intercompany Journal Entries

Manual ICO JEs span two subsidiaries for cost recharges:

```javascript
define(['N/record'], function(record) {
    var je = record.create({ type: record.Type.JOURNAL_ENTRY, isDynamic: true });
    je.setValue({ fieldId: 'subsidiary', value: 1 });  // Primary subsidiary
    je.setValue({ fieldId: 'memo', value: 'Q1 Management fee recharge: Sub A → Sub B' });

    // Sub A: Recognize management fee revenue
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 1 });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 800 }); // Mgmt Fee Revenue
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 25000 });
    je.commitLine({ sublistId: 'line' });

    // Sub A: Record receivable from Sub B
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 1 });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 150 }); // Due from Sub B
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 25000 });
    je.commitLine({ sublistId: 'line' });

    // Sub B: Record management fee expense
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 2 });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 700 }); // Mgmt Fee Expense
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: 25000 });
    je.commitLine({ sublistId: 'line' });

    // Sub B: Record payable to Sub A
    je.selectNewLine({ sublistId: 'line' });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'subsidiary', value: 2 });
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 300 }); // Due to Sub A
    je.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: 25000 });
    je.commitLine({ sublistId: 'line' });

    je.save();
});
```

---

## Intercompany Netting

Netting offsets AR from one subsidiary against AP to another:

**Example:**
- Sub A has $100K AR due from Sub B (sold goods to Sub B)
- Sub B has $60K AP owed to Sub A (from management fee)
- Net position: Sub B owes Sub A $40K (rather than two gross payments)

**Navigation:** Transactions > Financial > Intercompany Netting

1. Select subsidiaries to net
2. System shows all outstanding ICO AR and AP
3. Approve netting — creates offsetting journal entries
4. Remaining balance settled by one net payment

---

## Elimination Rules Setup

**Navigation:** Setup > Accounting > Elimination Rules > New

Define which accounts eliminate in consolidation:

| Rule                  | Account in Sub A           | Eliminated By       | Account in Sub B         |
|-----------------------|----------------------------|---------------------|--------------------------|
| Mgmt Fee              | Mgmt Fee Revenue (800)    | Mgmt Fee Expense (700)| in Sub B                |
| ICO AR/AP             | Due From Sub B (150)       | Due To Sub A (300)  | in Sub B                 |
| ICO Sales/COGS        | ICO Revenue (900)          | ICO COGS (500)      | in Sub B                 |

---

## Consolidated Reporting

Run consolidated financials with elimination:

**Navigation:** Reports > Financial > Balance Sheet > check "Consolidate"

- Select subsidiary level (roll up all under parent)
- NetSuite auto-applies elimination rules
- Intercompany AR/AP and revenue/cost are eliminated
- Minority interest (if applicable) is calculated

---

## ICO Reports

| Report                          | Navigation                                              |
|---------------------------------|---------------------------------------------------------|
| Intercompany Account Balance    | Reports > Financial > Intercompany Balance              |
| ICO Transactions by Period      | Custom saved search on transaction type = ICO           |
| Netting Report                  | Reports > Financial > Intercompany Netting              |
| Elimination Entries             | Reports > Financial > Elimination Entries               |
