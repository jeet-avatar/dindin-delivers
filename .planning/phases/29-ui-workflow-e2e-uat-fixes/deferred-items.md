# Phase 29 — Deferred Items

## 1. `gsd-tools.cjs state add-decision` duplicates the STATE.md Accumulated Context block (pre-existing tooling bug)

- **Discovered during:** Plan 29-01 execution (running `node gsd-tools.cjs state add-decision --phase 29 --summary "..."`).
- **Symptom:** Each invocation re-appends the entire `## Accumulated Context` section (Roadmap Evolution + Decisions + Performance Metrics + …) to the END of `.planning/STATE.md`, roughly doubling the file every time. By the time Plan 29-01 ran, STATE.md was already 110,656 lines (≈110 KB? no — ≈37 MB worth of repeated text by Plan 29-02's commit `6616ef3c`); the `add-decision` call in 29-01 took it to 219,798 lines / ≈38 MB.
- **Root cause:** the gsd-tools `state add-decision` command's STATE.md mutation logic — it does not de-duplicate / replace the Accumulated Context block, it appends a fresh full copy. (Also: the "Decisions" list inside it has accumulated malformed entries like `- [Phase 24-03]: ## Performance Metrics` where a header got absorbed into a decision string.)
- **Action taken in 29-01:** truncated STATE.md back to lines 1–130 + a single copy of each block (commit `301e3496` on `gsd/phase-26-data-densification`). The legit Current Position narrative + the new `[Phase 29]` decision entry are preserved. File is now 131 lines / ≈40 KB.
- **NOT fixed (out of scope for Phase 29):** the gsd-tools `state add-decision` / `state record-session` bug itself, and the malformed historical decision entries. Recommend a dedicated quick task: (a) make `add-decision` REPLACE the Accumulated Context block rather than append; (b) clean the malformed `- [Phase 24-03]: ## Performance Metrics`-style entries; (c) consider capping the Decisions list. Also note `state advance-plan` / `state update-progress` / `state record-session` all fail against this STATE.md because it's free-form narrative, not the structured format those commands expect ("Cannot parse Current Plan or Total Plans", "Progress field not found", "No session fields found") — Plan 29-01 updated STATE.md's Current Position manually instead.

## 2. (no other out-of-scope discoveries during Plan 29-01)

The button/endpoint audit reported 0 violations against the current codebase — no dead buttons, no missing endpoints, no pre-existing UI bugs surfaced. F2 (the 4 `/api/integration/sync-*` routes with no UI) is handled in Plan 29-02 (documented as API-only). The 2 Phase 28 deferred items (`instance_index>1` instances lack own WO/PR; `ns_invoice_id` always NULL) are acknowledged — F5's hint explains the first one to UAT walkers.
