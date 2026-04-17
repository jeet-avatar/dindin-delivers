# NetSuite Eval Run — REPORT

## Headline
- **Overall:** 26.9/100 across 40 cases
- **Total time:** 497.0 min
- **Total cost:** $0.87
- **Run:** `2026-04-17T08-06-06Z`
- **Commit:** `bd3ee508`
- **Backend:** https://artha.build
- **Model under test:** qwen2.5:14b
- **Judge:** claude-opus-4-7

## Per-Dimension
| Dim | Name | Score | Signal |
|-----|------|-------|--------|
| A | Coverage breadth | 24.3/100 | very weak |
| B | Accuracy depth | 61.4/100 | moderate |
| C | Execution loop | 0.0/100 | very weak |
| D | Pattern quality | 7.7/100 | very weak |
| E | Real-scenario fluency | 41.0/100 | weak |

## Worst 10 Cases
| # | ID | Dim | Score | Summary |
|---|----|----|-------|---------|
| 1 | A-4 | A | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-A-4-202 |
| 2 | A-5 | A | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-A-5-202 |
| 3 | A-6 | A | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-A-6-202 |
| 4 | A-7 | A | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-A-7-202 |
| 5 | A-8 | A | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-A-8-202 |
| 6 | B-7 | B | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-B-7-202 |
| 7 | C-1 | C | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-C-1-202 |
| 8 | C-2 | C | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-C-2-202 |
| 9 | C-3 | C | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-C-3-202 |
| 10 | C-4 | C | 0.0 | {"response":"🚫 You've used all 5 free script generations this month. Upgrade to a paid plan — contact sales@techcloudpro.com to get started.","intent":"generate_suitescript","session_id":"eval-C-4-202 |

## Failure Clusters
- **Free Tier Quota Exhausted** (A-4, A-5, A-6, A-7, A-8, B-7, C-1, C-2, C-3, C-4, C-5, C-6, C-7, C-8, D-1): All failures stem from the free-tier limit of 5 script generations per month being exceeded, causing the system to block requests and prompt users to upgrade.

## Recommended Priority Fix
The weakest dimension is **Execution loop** (score 0.0/100, signal: very weak). This should be the focus of the next improvement cycle. See the failure clusters above to scope the specific intervention.
