---
source: Oracle NetSuite Official Documentation — Fixed Asset Management
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Fixed Asset Management

## Overview

Fixed Asset Management (FAM) in NetSuite tracks the lifecycle of capital assets:
acquisition, depreciation, revaluation, and disposal.
It integrates with the GL to post depreciation entries automatically.

**License:** Fixed Asset Management is a module add-on.

---

## Asset Creation

Assets are created from Vendor Bills (most common) or manually.

**From Vendor Bill:**
1. On a Vendor Bill line, check "Fixed Asset" or set the expense account to a capital account
2. NetSuite prompts to create an asset record from the line
3. Fill in asset details: description, category, in-service date

**Manual creation:**

**Navigation:** Lists > Accounting > Fixed Assets > New

**Record Type:** `record.Type.FIXED_ASSET`

---

## Key Asset Fields

| Field               | Description                                              |
|---------------------|----------------------------------------------------------|
| name                | Asset description                                        |
| assetNumber         | Asset tag / serial number                                |
| assetCategory       | Category (determines depreciation method)                |
| inServiceDate       | Date depreciation begins                                 |
| originalCost        | Purchase price (acquisition cost)                        |
| salvageValue        | Estimated residual value at end of useful life          |
| usefulLife          | Useful life in months/years                              |
| depreciationMethod  | SL, DB, SYD, ACRS, etc.                                |
| location            | Physical location of the asset                           |
| department          | Department responsible for asset                        |
| subsidiary          | Subsidiary (OneWorld)                                    |
| assetAccount        | Balance sheet GL account for asset                       |
| depreciationAccount | Accumulated depreciation GL account                      |
| expenseAccount      | Depreciation expense GL account                          |

---

## Depreciation Methods

| Method                  | Code | Description                                          |
|-------------------------|------|------------------------------------------------------|
| Straight Line           | SL   | Equal amount per period over useful life             |
| Declining Balance       | DB   | Fixed percentage of remaining book value             |
| Double Declining Balance| DDB  | Double the straight-line rate on remaining book value|
| Sum-of-Years-Digits     | SYD  | Decreasing amount based on sum of years denominator  |
| Units of Production     | UOP  | Based on actual usage/output                         |
| MACRS                   | MACRS| US tax depreciation (Modified Accelerated Cost Recovery)|
| ACRS                    | ACRS | US tax depreciation (older method)                   |

### Straight Line Example

```
Asset Cost: $12,000
Salvage Value: $2,000
Useful Life: 5 years

Depreciable Base: $12,000 - $2,000 = $10,000
Annual Depreciation: $10,000 / 5 = $2,000/year ($166.67/month)
```

### Declining Balance Example

```
Asset Cost: $10,000
Rate: 20% declining balance
Year 1: $10,000 × 20% = $2,000
Year 2: $8,000 × 20% = $1,600
Year 3: $6,400 × 20% = $1,280
```

---

## Asset Register

The Asset Register shows all assets with their current values:

**Navigation:** Reports > Accounting > Fixed Assets > Asset Register

| Column              | Description                                              |
|---------------------|----------------------------------------------------------|
| Asset Name          | Description                                              |
| Original Cost       | Acquisition cost                                         |
| Accumulated Depr.   | Total depreciation to date                               |
| Net Book Value      | Original Cost - Accumulated Depreciation                 |
| In Service Date     | Start of depreciation                                    |
| End of Life Date    | When fully depreciated                                   |

---

## Running Depreciation

**Navigation:** Transactions > Financial > Post Depreciation

1. Select the period to depreciate (current month/year)
2. Preview depreciation entries before posting
3. Post — creates journal entries per asset:

```
DR  Depreciation Expense    $166.67
CR  Accumulated Depreciation $166.67
```

---

## Asset Disposal

When an asset is sold, scrapped, or retired:

**Navigation:** Lists > Accounting > Fixed Assets > [select asset] > Actions > Dispose

### Disposal Journal Entry

```
Example: Asset sold for $5,000, Net Book Value was $3,500

DR  Cash/Bank               $5,000   (proceeds received)
DR  Accumulated Depreciation $8,500  (remove accumulated depr.)
CR  Fixed Asset Account     $12,000  (remove original cost)
CR  Gain on Asset Disposal   $1,500  (gain = proceeds - NBV)
```

If sold for LESS than NBV:
```
DR  Cash                    $2,000
DR  Accumulated Depreciation $8,500
DR  Loss on Asset Disposal  $1,500   (loss = NBV - proceeds)
CR  Fixed Asset Account     $12,000
```

---

## Asset Revaluation

For multi-currency assets or when fair value changes significantly:

1. Navigate to Asset record
2. Adjust "Original Cost" for revaluation
3. Post a revaluation journal entry to reflect change

For currencies: assets are periodically revalued at current exchange rates —
difference posted to "Unrealized Gain/Loss on Asset Revaluation" account.

---

## Asset Categories

Asset categories group similar assets for depreciation policy:

**Navigation:** Setup > Accounting > Fixed Asset Categories > New

| Category            | Typical Depreciation    | Useful Life   |
|---------------------|-------------------------|---------------|
| Computer Equipment  | Straight Line           | 3-5 years     |
| Furniture           | Straight Line           | 7-10 years    |
| Buildings           | Straight Line           | 30-40 years   |
| Vehicles            | Declining Balance       | 5 years       |
| Leasehold Improvements | Straight Line        | Lease term    |

---

## Integration with GL

All asset transactions create GL entries automatically:
- Acquisition: DR Asset Account / CR AP or Cash
- Depreciation: DR Depreciation Expense / CR Accumulated Depreciation
- Disposal: complex (as shown above)

Asset accounts appear on the Balance Sheet; depreciation expense on the Income Statement.
