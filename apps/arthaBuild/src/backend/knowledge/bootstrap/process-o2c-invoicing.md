---
source: Oracle NetSuite Official Documentation — O2C Invoicing
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# O2C: Invoicing

## Overview

The Invoice is the formal billing document sent to the customer.
It records the revenue event and creates the AR entry.
Invoices can be created from Sales Orders, manually, or via billing schedules
for complex billing arrangements.

---

## Creating an Invoice from Sales Order

**Navigation:** Open the Sales Order > Actions > Bill

**Record Type:** `record.Type.INVOICE`

```javascript
define(['N/record'], function(record) {
    var invoice = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.INVOICE,
        isDynamic: true
    });

    invoice.setValue({ fieldId: 'trandate', value: new Date() });
    invoice.setValue({ fieldId: 'memo', value: 'Invoice for Q1 2024 services' });

    var invoiceId = invoice.save();
});
```

---

## Key Invoice Fields

| Field              | Description                                             |
|--------------------|---------------------------------------------------------|
| entity             | Customer (required)                                     |
| tranDate           | Invoice date                                            |
| dueDate            | Due date (auto-calculated from terms + invoice date)    |
| terms              | Payment terms (drives dueDate calculation)              |
| status             | CustInvc:A=Open, CustInvc:B=Paid in Full               |
| amountRemaining    | Balance due (total - payments applied)                  |
| total              | Invoice total (base currency)                           |
| foreignTotal       | Invoice total in transaction currency                   |
| memo               | Internal note                                           |
| message            | Message printed on invoice document                     |
| dueDate            | Auto-calculated: tranDate + terms.daysUntilNetDue       |
| printStatement     | T/F — include in customer statements                    |

---

## Payment Terms and Due Date Calculation

Payment terms determine when payment is due:

| Terms Name    | Rule                                         | Example                         |
|---------------|----------------------------------------------|---------------------------------|
| Net 30        | Due 30 days from invoice date                | Invoice Jan 1 → Due Jan 31      |
| 2/10 Net 30   | 2% discount if paid in 10 days, else Net 30  | Invoice Jan 1 → Discount Jan 11, Due Jan 31 |
| Net 60        | Due 60 days from invoice date                | Invoice Jan 1 → Due Mar 1       |
| Due on Receipt| Due immediately                              | Invoice Jan 1 → Due Jan 1       |
| EOM           | Due at end of month of invoice               | Invoice Jan 15 → Due Jan 31     |

NetSuite auto-calculates `dueDate` when terms are set on the invoice.

---

## Billing Schedules

Billing Schedules automate recurring invoicing for contracts/subscriptions:

### Types of Billing Schedules

| Type                    | How it Works                                       |
|-------------------------|----------------------------------------------------|
| Milestone               | Invoice created on specific dates or events        |
| Percent of Completion   | Invoice for % of contract value at each stage      |
| Time & Materials        | Invoice based on logged time + expenses            |
| Recurrence              | Fixed amount invoiced on a regular interval        |

**Setup:** Setup > Accounting > Billing Schedules > New

**Attaching to a SO Line:**
- On the SO item line, set the "Billing Schedule" field
- NetSuite creates invoice stubs on the specified dates

---

## Progress Billing

For long-term contracts, invoice customers progressively:

1. Create Sales Order for full contract value
2. Create Invoice from SO for partial amount
3. Set quantity on invoice line to partial amount
4. Remaining amount stays on SO as "Pending Billing"

```javascript
define(['N/record'], function(record) {
    var invoice = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.INVOICE,
        isDynamic: true
    });

    // Bill only 40% of the line amount (progress billing)
    invoice.selectLine({ sublistId: 'item', line: 0 });
    invoice.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 4  // 40% of the 10 originally ordered
    });
    invoice.commitLine({ sublistId: 'item' });

    invoice.save();
});
```

---

## Credit Memos

Credit memos reverse or reduce invoice amounts:

```javascript
define(['N/record'], function(record) {
    // Create credit memo from invoice
    var creditMemo = record.transform({
        fromType: record.Type.INVOICE,
        fromId: invoiceId,
        toType: record.Type.CREDIT_MEMO,
        isDynamic: true
    });

    // Reduce quantity (partial credit)
    creditMemo.selectLine({ sublistId: 'item', line: 0 });
    creditMemo.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: 2 // Credit for 2 units returned
    });
    creditMemo.commitLine({ sublistId: 'item' });

    var creditMemoId = creditMemo.save();
});
```

**Credit Memo Application:**
After creating, apply the credit memo to outstanding invoices:
- Transactions > Sales > Accept Customer Payments
- Select customer, check the credit memo and the invoice to offset

---

## Mass Invoicing

Invoice multiple sales orders at once:

**Navigation:** Customers > Accounts Receivable > Invoice Customers

1. Set filters (customer, date range, SO status)
2. Select which SOs to bill
3. Click "Invoice" — creates one invoice per SO (or combines per customer)

---

## Invoice Email/Print

From the invoice record:
- **Print:** Actions > Print — generates PDF using the active invoice form template
- **Email:** Actions > Email — sends PDF attachment to customer email
- **Customize Template:** Setup > Customization > Forms > Transaction Forms > Invoice (PDF)

---

## Invoice in SuiteQL

```sql
-- Open invoices (unpaid)
SELECT t.id, t.tranId, c.companyName, t.total, t.amountRemaining, t.dueDate
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'CustInvc'
  AND t.amountRemaining > 0
ORDER BY t.dueDate ASC
```

---

## Accounting Impact of Invoice

When an Invoice is saved and posted:

| Account                 | Debit   | Credit  |
|-------------------------|---------|---------|
| Accounts Receivable     | Amount  |         |
| Revenue / Deferred Rev  |         | Amount  |
| (and if taxable)        |         |         |
| Tax Liability           |         | Tax Amt |
