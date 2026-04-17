---
id: CASE-017
title: "Unused 're' import in finetunedmodelrunv2.py"
phase: "02"
phase_name: "NetSuite TBA Session"
category: DEAD_CODE
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Kavya"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: src/backend/finetunedmodelrunv2.py
    lines: "5"
---

## Why This Case Was Created
Triggered by the DEAD_CODE audit dimension. `import re` at line 5 of `finetunedmodelrunv2.py` appears to be an unused import — however, close inspection reveals that `re` IS used at lines 77 and 92 of the same file. This case documents the audit finding and its correct resolution (the import is NOT actually dead code in this file).

**Note:** This case documents a finding that on initial inspection appeared to be dead code but is confirmed to be active code after full file review. The case is preserved to document the audit outcome and prevent future mis-classification.

## What Is Wrong
Initial grep for `import re` in `finetunedmodelrunv2.py` found:

```python
# finetunedmodelrunv2.py line 5
import re
```

A subsequent check confirms `re` is used in two places in the same file:

**Line 77 — checking for code blocks before saving:**
```python
if not re.search(r"```(javascript|js|xml)", last_ai_message, re.IGNORECASE):
    return JSONResponse(content={"response": "❌ No valid SuiteScript or XML code found to save."})
```

**Line 92 — checking generated response for code blocks:**
```python
if re.search(r"```(javascript|js)", response_text, re.IGNORECASE):
```

Therefore `import re` on line 5 is NOT dead code in this file. The finding is a false positive.

**However, this case raises a secondary finding:** `finetunedmodelrunv2.py` is itself entirely dead code (see CASE-004 — the file is never imported from production). Since the entire file is dead, all of its imports are transitively dead — including `import re`. The correct resolution is to delete the entire file (CASE-004), which eliminates this import along with all other unused code in the file.

## Why It Was Done This Way (Root Cause)
`import re` was added when the developer added the `re.search()` calls to check for JavaScript/XML code blocks before attempting to save files. The usage is correct and intentional within the prototype file. The file's overall dead status (CASE-004) is what makes this import transitively unnecessary.

## What Is Done Right
Within the context of `finetunedmodelrunv2.py`, the `import re` is correctly placed at the top of the file and used consistently. The `re.search()` patterns on lines 77 and 92 are correct regex expressions for detecting markdown code fences.

## How To Fix It
**Primary fix:** Delete the entire `finetunedmodelrunv2.py` file per CASE-004. This eliminates all imports in the file, including `import re`.

**If the file is kept for reference:** No change needed — `import re` is actively used within the file.

**Verification of usage:**
```bash
grep -n "re\." src/backend/finetunedmodelrunv2.py
# Expected:
# 77:    if not re.search(r"```(javascript|js|xml)", last_ai_message, re.IGNORECASE):
# 92:    if re.search(r"```(javascript|js)", response_text, re.IGNORECASE):
```

## Architecture Mapping

**Layer:** Dead prototype file (finetunedmodelrunv2.py) — not in production flow

**Flow:**

    [Dead Code — never imported]
    finetunedmodelrunv2.py:5 → import re   ← THIS CASE LIVES HERE (transitively dead due to CASE-004)
    finetunedmodelrunv2.py:77 → re.search(...)   ← usage exists within dead file
    finetunedmodelrunv2.py:92 → re.search(...)   ← usage exists within dead file

    [Production flow]
    rawapi.py:11 → import re   ← the live production import of re

**Upstream:** Nothing imports `finetunedmodelrunv2.py`

**Downstream:** The `re` module usage within this file is never executed in production

## Verification
- [ ] Grep proof: `grep -n "import re" src/backend/finetunedmodelrunv2.py` → shows line 5
- [ ] Usage proof: `grep -n "re\." src/backend/finetunedmodelrunv2.py` → shows lines 77 and 92 (NOT dead within the file)
- [ ] Dead file proof: `grep -rn "import finetunedmodelrunv2\|from finetunedmodelrunv2" src/backend/` → empty (file is never imported, CASE-004)
- [ ] Resolution: delete file per CASE-004 → `import re` removed along with entire file

## Downstream Impact
**Impact if unfixed:** Cosmetic (file is dead code; entire file should be deleted)

No runtime impact — `finetunedmodelrunv2.py` is never imported in production. The residual impact is the same as CASE-004: developer confusion about which files are production code.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-004 (finetunedmodelrunv2.py is entirely dead code — resolving CASE-004 also resolves this case)
