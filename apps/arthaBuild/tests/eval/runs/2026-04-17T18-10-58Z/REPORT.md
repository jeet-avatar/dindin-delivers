# NetSuite Eval Run — REPORT

## Headline
- **Overall:** 59.8/100 across 40 cases
- **Total time:** 18.1 min
- **Total cost:** $1.87
- **Run:** `2026-04-17T18-10-58Z`
- **Commit:** `dfb59677`
- **Backend:** https://artha.build
- **Model under test:** qwen2.5:14b
- **Judge:** claude-opus-4-7

## Per-Dimension
| Dim | Name | Score | Signal |
|-----|------|-------|--------|
| A | Coverage breadth | 66.6/100 | moderate |
| B | Accuracy depth | 57.1/100 | moderate |
| C | Execution loop | 57.8/100 | moderate |
| D | Pattern quality | 66.6/100 | moderate |
| E | Real-scenario fluency | 50.8/100 | moderate |

## Worst 10 Cases
| # | ID | Dim | Score | Summary |
|---|----|----|-------|---------|
| 1 | E-2 | E | 36.5 | Multiple hallucinations: record.Type.RECEIVING and record.Type.VENDOR_INVOICE are not valid (correct IDs are itemreceipt/ITEM_RECEIPT and vendorbill/VENDOR_BILL). The response conflates Vendor Bill wi |
| 2 | E-8 | E | 41.6 | The response correctly identifies the UI path (Transactions > Financial > Revalue Open Currency Balances) and mentions unrealized gain/loss accounts, but invents a non-existent 'currencyRevaluation' A |
| 3 | B-7 | B | 42.0 | The join column uses name 'subsidiaryname' which is a hallucination — the correct approach is name: 'name', join: 'subsidiary'. Additionally, @NScriptType 'SavedSearch' is not a valid script type, and |
| 4 | E-5 | E | 45.3 | The response contains several inaccuracies: it claims an Item Receipt is generated in a drop ship flow, but the rubric explicitly states vendor receipt is what triggers billing and there is no Item Fu |
| 5 | E-6 | E | 45.9 | The response misses critical rubric requirements: no mention of revrecstartdate/revrecenddate on invoice lines, no mention of the revenuerecognitionrule field, and no discussion of billing schedule re |
| 6 | B-4 | B | 46.5 | The response correctly states the core answer (lowercase 'tranid' and 'internalid'), but the code example introduces hallucinated APIs: search.columns.internalId() and search.columns.tranId() do not e |
| 7 | E-1 | E | 48.8 | Major issue: the response skips Item Fulfillment entirely, which is a core step in the O2C sequence (SO → IF → Invoice → Payment) and explicitly required by the rubric. It also mentions record.transfo |
| 8 | C-5 | C | 49.2 | Multiple technical errors: sort is ASC instead of DESC (wrong direction for 'top' customers), no limit of 10 applied to the search iteration, and the rubric required N/ui/serverWidget.createForm() whi |
| 9 | D-1 | D | 49.6 | Multiple major errors: N/record module is never loaded but record.load/record.Type.CUSTOMER is used (ReferenceError); N/log not loaded but log.debug used; getInputData returns getRange (max 1000 resul |
| 10 | B-3 | B | 52.0 | The response uses record.SublistId.LINES which is not a valid enum — the correct sublist ID for Sales Order lines is the string 'item'. This is a hallucinated identifier. Also, the prompt asked for us |

## Failure Clusters
- **Hallucinated APIs/Enums** (E-2, E-8, B-7, B-4, B-3): Responses invent non-existent record types, enums, fields, or API methods that do not exist in the NetSuite SDK.
- **Missing Rubric Requirements** (E-5, E-6, E-1, E-4, B-1): Responses omit critical steps or required elements explicitly mandated by the rubric, such as key workflow stages or runtime context usage.
- **Wrong Entry Points/Script Structure** (C-8, A-3, C-5): Responses use incorrect script entry points, wrong API modules, or wrong configuration that prevents the script from functioning as required.
- **Fabricated Config/Module Loading Errors** (D-1, C-1): Responses fabricate SDF project files or fail to properly load required modules, causing runtime or deployment failures.

## Recommended Priority Fix
The weakest dimension is **Real-scenario fluency** (score 50.8/100, signal: moderate). This should be the focus of the next improvement cycle. See the failure clusters above to scope the specific intervention.
