---
title: Zero-Hallucination Gate — Parser Inspection Findings
date: 2026-04-17
status: complete
branch: gsd/netsuite-eval-harness
task: 1.1 — Inspect oracle files
related:
  - apps/arthaBuild/docs/superpowers/specs/2026-04-17-zero-hallucination-gate-design.md
---

# Zero-Hallucination Gate — Parser Inspection Findings

This document records the findings from Task 1.1: a pure inspection of the oracle bootstrap
files. Tasks 1.3–1.5 should implement the five extractors based on the patterns documented here.

---

## Step 1: File Count

```
ls apps/arthaBuild/src/backend/knowledge/bootstrap/oracle-*.md | wc -l
```

**Result: 58.** Confirmed. The 58 files break down as:

- 50 `oracle-module-*.md` files (one per N/* module)
- 8 non-module oracle files:
  `oracle-api-governance.md`, `oracle-entry-point.md`, `oracle-error-reference.md`,
  `oracle-global-objects.md`, `oracle-records-guide.md`, `oracle-script-types.md`,
  `oracle-suitescript-2-1.md`, `oracle-suitescript-2x.md`

**Important:** The bootstrap directory also contains 100+ non-oracle files (`module-*.md`,
`record-*.md`, `script-*.md`, `process-*.md`, etc.) that are NOT oracle scraped files but ARE
a valid and richer data source. Extractors should search all `*.md` files in the directory,
not only `oracle-*.md` files, to maximize coverage.

---

## Category 1: RECORD_TYPES

### Source files
- Primary: all `*.md` files in `apps/arthaBuild/src/backend/knowledge/bootstrap/`
- `oracle-module-record.md` — references `record.Type` enum by hyperlink only (line 65),
  does NOT list enum values inline
- `oracle-records-guide.md` — 32-line index file; no enum values, only links
- `module-record.md` — non-oracle file with 27 inlined `record.Type.XXX` examples
- Scattered mentions across process files, pattern files, and record-specific files

### Winning pattern
```python
import re
pattern = re.compile(r'record\.Type\.([A-Z_]+)')
```

Applied to all `*.md` files in the bootstrap directory (not just oracle files).

### Count produced
**54 unique values** across the full bootstrap directory:

```
ACCOUNT, ASSEMBLY_BUILD, ASSEMBLY_ITEM, ASSEMBLY_UNBUILD, BANK_TRANSFER, BOM,
CAMPAIGN, CASH_SALE, CREDIT_MEMO, CUSTOM_RECORD_TYPE, CUSTOMER, CUSTOMER_PAYMENT,
DEPOSIT, EMAIL_TEMPLATE, EMPLOYEE, ESTIMATE, EVENT, EXPENSE_REPORT, FIXED_ASSET,
INTERCOMPANY_SALES_ORDER, INTERCOMPANY_TRANSFER_ORDER, INVENTORY_ADJUSTMENT,
INVENTORY_ITEM, INVOICE, ITEM_FULFILLMENT, ITEM_RECEIPT, JOURNAL_ENTRY, KIT_ITEM,
LEAD, NON_INVENTORY_ITEM, OPPORTUNITY, PHONE_CALL, PROJECT, PROJECT_BUDGET,
PROJECT_TASK, PURCHASE_ORDER, PURCHASE_REQUISITION, RESOURCE_ALLOCATION,
RETURN_AUTHORIZATION, ROUTING, SALES_ORDER, SERVICE_ITEM, SUBSCRIPTION,
SUBSCRIPTION_PLAN, SUPPORT_CASE, TASK, TIME_BILL, TRANSFER_ORDER, VENDOR,
VENDOR_BILL, VENDOR_CREDIT, VENDOR_PAYMENT, VENDOR_PREPAYMENT, WORK_ORDER
```

### CRITICAL GAP — Floor not met

**The design floor is 100. Current bootstrap files yield only 54.**

The design doc's stated source (`oracle-records-guide.md`) is a 32-line index file with zero
inline enum values. The full `record.Type` enum has ~180 values (per the design doc comment
`# ~180`) but these are documented in the NetSuite SuiteScript Records Browser
(`system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2025_2/`) — an external URL that
was not scraped into the bootstrap files.

**Resolution options for Task 1.3:**

Option A (recommended): Scrape the SuiteScript Records Browser and add a new bootstrap file
`oracle-record-types-full.md` containing the complete `record.Type` enum table. Then parse it
with the `record\.Type\.([A-Z_]+)` pattern.

Option B: Emit the 54 values and lower the floor to 50 (conservative but loses the guarantee
for the remaining ~130 types).

Option C: Hard-code a supplemental list derived from the NetSuite 2024.2 records browser and
commit it as `validators/whitelist_supplement.py`.

**The extractor implementor MUST resolve this before Task 1.5.** The `build_whitelist.py`
floor check at 100 will exit non-zero if the source data is not expanded.

### Edge cases
- `record.Type.CUSTOM_RECORD_TYPE` appears — this is the enum value for the meta-type, not a
  specific custom record. Custom records use string literals like `'customrecord_xxxx'`, which
  the linter should NOT check (they are user-defined).
- Case-sensitive match only. All valid values are UPPER_CASE_WITH_UNDERSCORES.

### Extractor recommendation
```python
# In record_type.py Checker
def extract(self, code: str) -> list[tuple[str, int]]:
    results = []
    for i, line in enumerate(code.splitlines(), start=1):
        for m in re.finditer(r'record\.Type\.([A-Z_]+)', line):
            results.append((m.group(1), i))
    return results

def whitelist(self) -> set[str]:
    return RECORD_TYPES  # from validators/whitelist.py
```

---

## Category 2: MODULES

### Source files
- All 50 `oracle-module-*.md` files
- Header line (line 1) of each file: `# N/<module-name> — SuiteScript 2.x Module`
- This is the authoritative module name declaration

### Winning pattern

Step 1 — derive list from oracle file header lines:
```bash
for f in oracle-module-*.md; do
  head -1 "$f" | grep -oE 'N/[a-z][a-z0-9/-]+'
done | sort -u
```

Note: the regex MUST include `[0-9]` to correctly capture `N/format-i18n` (without digits,
it truncates to `N/format-i`).

Step 2 — in `build_whitelist.py`, parse each header:
```python
import re, pathlib

BOOTSTRAP_DIR = pathlib.Path("apps/arthaBuild/src/backend/knowledge/bootstrap")
module_pattern = re.compile(r'^# (N/[a-z][a-z0-9/-]+)\s+—')

modules = set()
for md_file in sorted(BOOTSTRAP_DIR.glob("oracle-module-*.md")):
    first_line = md_file.read_text().splitlines()[0]
    m = module_pattern.match(first_line)
    if m:
        modules.add(m.group(1))
```

### Count produced
**50 unique module names** (one per oracle-module-*.md file):

```
N/action, N/auth, N/cache, N/certificate-control, N/compress, N/config,
N/crypto, N/crypto-certificate, N/crypto-random, N/currency, N/current-record,
N/dataset, N/document-capture, N/email, N/encode, N/error, N/file, N/format,
N/format-i18n, N/http, N/https, N/https-client-certificate, N/key-control,
N/llm, N/log, N/machine-translation, N/pgp, N/piremoval, N/plugin, N/portlet,
N/query, N/record, N/record-context, N/redirect, N/render, N/runtime, N/search,
N/sftp, N/suite-app-info, N/task, N/task-accounting, N/transaction, N/translation,
N/ui-dialog, N/ui-message, N/ui-server-widget, N/url, N/util, N/workbook, N/workflow
```

**Floor check: 50 >= 30. PASSES.**

### CRITICAL: Slash vs hyphen ambiguity

The oracle header files use **hyphens throughout** (e.g., `N/ui-dialog`, `N/crypto-certificate`,
`N/ui-server-widget`). The non-oracle `module-*.md` files use **slashes** for the same modules
(e.g., `N/ui/dialog`, `N/ui/serverWidget`, `N/crypto/certificate`).

**Which is canonical?** The oracle files scrape the official Oracle NetSuite docs — these are
authoritative. However, actual JavaScript `define()` and `require()` calls in SuiteScript use
**slashes**, not hyphens:

```javascript
// Actual SuiteScript usage (correct):
define(['N/ui/serverWidget', 'N/crypto/certificate'], ...)

// Oracle header format (documentation convention):
# N/ui-server-widget — SuiteScript 2.x Module
```

Confirmed by the non-oracle `module-ui-serverwidget.md` which declares:
```
source: SuiteScript 2.x API Reference — N/ui/serverWidget Module
```

**Resolution for Task 1.3:**
The extractor must maintain BOTH forms and normalize hyphens to slashes for multi-segment
module names. The mapping rules are:

| Oracle header (hyphens) | Actual import path (slashes) | Rule |
|---|---|---|
| `N/ui-dialog` | `N/ui/dialog` | `ui-X` → `N/ui/X` |
| `N/ui-message` | `N/ui/message` | `ui-X` → `N/ui/X` |
| `N/ui-server-widget` | `N/ui/serverWidget` | special case |
| `N/crypto-certificate` | `N/crypto/certificate` | `crypto-X` → `N/crypto/X` |
| `N/crypto-random` | `N/crypto/random` | `crypto-X` → `N/crypto/X` |
| `N/https-client-certificate` | `N/https/clientCertificate` | special case |
| `N/format-i18n` | `N/format/i18n` | `format-X` → `N/format/X` |
| `N/certificate-control` | `N/certificate/control` (rare) | see Note |
| `N/suite-app-info` | `N/suiteAppInfo` or `N/suite-app-info` | verify |
| `N/task-accounting` | `N/task/accounting` | see Note |
| `N/key-control` | `N/keyControl` | see Note |
| `N/record-context` | `N/record/context` (rare) | verify |
| `N/document-capture` | `N/documentCapture` | verify |
| `N/machine-translation` | `N/machineTranslation` | verify |

**Recommended implementation:** Build the whitelist with BOTH hyphen form AND slash form
for ambiguous entries. Accept either in the linter. Include `N/xml` from non-oracle files
(module-xml.md exists but has no oracle counterpart — it's a legitimate module).

### Additional modules not in oracle-module-*.md
Non-oracle `module-*.md` files reference `N/xml` which has no oracle module file. Add it.

### Edge cases
- `N/current-record` vs `N/currentRecord` — oracle says `N/current-record`; actual use
  in the files shows `N/current-record` only. Include both to be safe.
- Extractor for code inspects `define(['...'])` and `require(['...'])` statements.

### Extractor recommendation
```python
# In module.py Checker
MODULE_PATTERN = re.compile(
    r"""(?:define|require)\s*\(\s*\[([^\]]+)\]""",
    re.DOTALL
)
STRING_PATTERN = re.compile(r"""['"]([^'"]+)['"]""")

def extract(self, code: str) -> list[tuple[str, int]]:
    results = []
    for i, line in enumerate(code.splitlines(), start=1):
        # also handles single-line define calls
        for m in re.finditer(r"""['"]N/[^'"]+['"]""", line):
            module = m.group(0).strip("'\"")
            if module.startswith('N/'):
                results.append((module, i))
    return results
```

---

## Category 3: SCRIPT_TYPES

### Source files
- `oracle-script-types.md` — 12 script types described in full-sentence table rows
- `script-*.md` files (11 non-oracle files) — contain inline `@NScriptType` JSDoc examples

### Winning pattern

From `oracle-script-types.md`, extract via the table link text:
```python
import re
pattern = re.compile(
    r'\[SuiteScript\s+2\.[x1]+\s+([\w/ ]+?)\s+Script Type\]'
)
```
This yields the human-readable names. To convert to `@NScriptType` values, the mapping
must be manual (see below).

For `script-*.md` files, extract directly from JSDoc:
```python
pattern = re.compile(r'@NScriptType\s+([A-Za-z]+)')
```

### Count produced

From `@NScriptType` annotations in `script-*.md` files: **10 unique values**:
```
ClientScript, MapReduceScript, MassUpdateScript, Portlet, RESTlet,
ScheduledScript, Suitelet, UserEventScript, WorkflowActionScript,
customglplugin (note: appears in pattern-custom-gl-lines.md)
```

From `oracle-script-types.md` table (human names → @NScriptType mapping):
```
Bundle Installation Script Type → BundleInstallationScript (not confirmed in @NScriptType)
Client Script Type              → ClientScript
Custom Tool Script Type         → CustomToolScript (2.1 only, not confirmed in @NScriptType)
Map/Reduce Script Type          → MapReduceScript
Mass Update Script Type         → MassUpdateScript
Portlet Script Type             → Portlet
RESTlet Script Type             → RESTlet
Scheduled Script Type           → ScheduledScript
SDF Installation Script Type    → SDFInstallationScript (not confirmed in @NScriptType)
Suitelet Script Type            → Suitelet
User Event Script Type          → UserEventScript
Workflow Action Script Type     → WorkflowActionScript
```

**Confirmed @NScriptType values with evidence in bootstrap files: 10**
```
ClientScript, MapReduceScript, MassUpdateScript, Portlet, RESTlet,
ScheduledScript, Suitelet, UserEventScript, WorkflowActionScript,
customglplugin
```

**Unconfirmed (from oracle table only, no @NScriptType example found): 3**
```
BundleInstallationScript, SDFInstallationScript, CustomToolScript
```

**Floor check: 10 (confirmed) >= 10. PASSES.**

Note: `Restlet` (capital R lowercase e) appears once in bootstrap files alongside `RESTlet`.
The canonical NetSuite form is `RESTlet`. Include both in the whitelist (case mismatch yields
a violation, but the suggestion will recommend the correct form).

### Edge cases
- `@NScriptType` is a JSDoc tag in the script file header, NOT inside JS syntax.
  The checker inspects the entire code block including comments.
- `customglplugin` is lowercase — it's a GL plugin type, valid for custom GL lines.

### Extractor recommendation
```python
# In script_type.py Checker
NSCRIPTTYPE_PATTERN = re.compile(r'@NScriptType\s+(\S+)')

def extract(self, code: str) -> list[tuple[str, int]]:
    results = []
    for i, line in enumerate(code.splitlines(), start=1):
        m = NSCRIPTTYPE_PATTERN.search(line)
        if m:
            results.append((m.group(1), i))
    return results
```

The whitelist should include all confirmed values plus the 3 unconfirmed ones from the
oracle table (add them; they are valid even if not illustrated in bootstrap files).

---

## Category 4: SEARCH_TYPES

### Source files
- `oracle-module-search.md` — references `search.Type` enum via hyperlink only (line 85),
  does NOT list values inline
- `module-search.md` — non-oracle file with 16 inlined `search.Type.XXX` examples
- Scattered mentions in process and pattern files

### Winning pattern
```python
pattern = re.compile(r'search\.Type\.([A-Z_]+)')
```

Applied to all `*.md` files in the bootstrap directory.

### Count produced
**21 unique values** across the full bootstrap directory:

```
CUSTOM_LIST, CUSTOM_RECORD, CUSTOMER, CUSTOMER_PAYMENT, EMPLOYEE, ESTIMATE,
INVENTORY_ITEM, INVOICE, ITEM, JOB, JOURNAL_ENTRY, OPPORTUNITY, PROJECT,
PURCHASE_ORDER, SALES_ORDER, SUPPORT_CASE, TRANSACTION, VENDOR, VENDOR_BILL,
VENDOR_PAYMENT, WORK_ORDER
```

### CRITICAL GAP — Floor not met

**The design floor is 100. Current bootstrap files yield only 21.**

The `search.Type` enum in NetSuite has ~180 values (mirrors `record.Type` plus additional
report/transaction-specific types). The oracle file (`oracle-module-search.md`) only provides
a link to the enum — no inline values. The `module-search.md` non-oracle file lists only 16
representative examples.

**Resolution options for Task 1.3:**

Option A (recommended): Scrape the NetSuite `search.Type` enum page and add
`oracle-search-types-full.md`. The `search.Type` enum largely mirrors `record.Type` (same
uppercase string names). The `build_whitelist.py` can derive `SEARCH_TYPES` from the same
comprehensive record type list with minimal modifications.

Option B: Lower the floor to 20 (permissive — allows most common types but misses ~160 less
common search types; an LLM is unlikely to hallucinate these anyway).

Option C: Treat `SEARCH_TYPES` as an alias to `RECORD_TYPES` at build time. Since
`search.Type` and `record.Type` share the same string values (e.g., `SALES_ORDER` works for
both), a single comprehensive enum list serves both extractors.

**Recommended:** Option C is pragmatic and eliminates duplication. Build one comprehensive
type list and use it as the whitelist for both `RECORD_TYPES` and `SEARCH_TYPES`.

### Edge cases
- `search.Type.JOB` and `search.Type.PROJECT` appear — these are aliases for the same record
  type (`job`). Both should be in the whitelist.
- `search.Type.CUSTOM_RECORD` with comment `// + type: 'customrecord_xxxx'` — the enum value
  `CUSTOM_RECORD` is valid; custom record type strings are NOT validated.
- `search.Type.CUSTOM_LIST` — valid but rare; include.

### Extractor recommendation
```python
# In script_type.py Checker (search.Type is part of the same checker per design)
SEARCH_TYPE_PATTERN = re.compile(r'search\.Type\.([A-Z_]+)')

def extract(self, code: str) -> list[tuple[str, int]]:
    results = []
    for i, line in enumerate(code.splitlines(), start=1):
        for m in re.finditer(SEARCH_TYPE_PATTERN, line):
            results.append((m.group(1), i))
    return results
```

---

## Category 5: SEARCH_APIS

### Source files
- `oracle-module-search.md` — "N/query Module Members" table lists all top-level `search.*`
  methods in the format `[search.methodName(options)](section_...)`. Lines 67–81.
- `module-search.md` — inline examples of `search.create()`, `search.load()`, etc.

### Winning pattern

From `oracle-module-search.md`, parse the Module Members table:
```python
pattern = re.compile(r'\[search\.([a-z][A-Za-z]*)\s*\(')
```

This yields method names from markdown link text like `[search.create(options)]`.

For extraction from generated code (the checker's `extract()` method):
```python
# As specified in the design doc
pattern = re.compile(r'(?:^|[\s=;,(])search\.([a-z][A-Za-z]*)\s*\(')
```

### Count produced
**18 unique method names** from oracle-module-search.md + module-search.md:

```
create, create.promise, createColumn, createFilter, createSetting,
delete, delete.promise, duplicates, duplicates.promise,
global, global.promise, load, load.promise, lookupFields, lookupFields.promise,
run, runPaged, save
```

Normalized to top-level names (stripping `.promise` suffix): **12 unique base methods**:
```
create, createColumn, createFilter, createSetting, delete, duplicates,
global, load, lookupFields, run, runPaged, save
```

**Floor check: 12 >= 10. PASSES (both raw 18 and normalized 12).**

### Design note on `.promise` variants

The design's checker regex `(?:^|[\s=;,(])search\.([a-z][A-Za-z]*)\s*\(` captures
`search.create(` but NOT `search.create.promise(` (because `promise` comes after a `.`).
This is correct — `.promise` is a variant suffix that should be validated at the base-method
level. The whitelist should store base method names only (`create`, not `create.promise`).

### Edge cases
- `search.run()` does NOT appear in the oracle module members table (it's a method on the
  `Search` object, not on the module). The oracle table lists `Search.run()`, not `search.run()`.
  However, LLMs commonly write `mySearch.run()` where `mySearch` is a variable name, not the
  module. The checker anchors at `search\.` which would NOT match `mySearch.run()`.
  Add `run` and `runPaged` to the whitelist anyway as they appear in non-oracle files as examples
  using `search.run()` and `search.runPaged()`.
- `search.create.promise` — the oracle file shows this as a separate table row. It uses
  the `.promise` suffix pattern and should NOT flag as a violation when written as
  `search.create.promise(options)`. The extractor regex will capture `create` (stopping at `.`),
  which is valid. No action needed.

### Extractor recommendation
```python
# In search_api.py Checker
SEARCH_API_PATTERN = re.compile(
    r'(?:^|[\s=;,(])search\.([a-z][A-Za-z]*)\s*\('
)

def extract(self, code: str) -> list[tuple[str, int]]:
    results = []
    for i, line in enumerate(code.splitlines(), start=1):
        for m in re.finditer(SEARCH_API_PATTERN, line):
            results.append((m.group(1), i))
    return results

def whitelist(self) -> set[str]:
    return SEARCH_APIS  # from validators/whitelist.py
```

---

## Summary Table

| Category | Floor | Found (current files) | Gap | Winning pattern |
|---|---|---|---|---|
| RECORD_TYPES | 100 | 54 | **YES — 46 short** | `record\.Type\.([A-Z_]+)` across all `*.md` |
| MODULES | 30 | 50 | none | `^# (N/[a-z][a-z0-9/-]+)\s+—` from oracle-module-*.md line 1 |
| SCRIPT_TYPES | 10 | 10 (confirmed) + 3 (oracle table) | none | `@NScriptType\s+(\S+)` from script-*.md |
| SEARCH_TYPES | 100 | 21 | **YES — 79 short** | `search\.Type\.([A-Z_]+)` across all `*.md` |
| SEARCH_APIS | 10 | 12 (base) / 18 (with .promise) | none | `\[search\.([a-z][A-Za-z]*)\s*\(` from oracle-module-search.md |

---

## Critical Gaps for Task 1.3

1. **RECORD_TYPES and SEARCH_TYPES floors cannot be met from current bootstrap files.**
   The design assumed `oracle-records-guide.md` contained a type enum table — it does not
   (only 32 lines, pure index). The complete `record.Type` enum (~180 values) is in the
   NetSuite SuiteScript Records Browser, which was not scraped.

   **Recommended action before Task 1.3:** Either (a) scrape the Records Browser and add a
   new bootstrap file, or (b) lower floors to 50/20 respectively for V1 and note that the
   linter only validates the most common types.

2. **Module slash/hyphen ambiguity.** Oracle headers use hyphens (`N/ui-server-widget`)
   but actual SuiteScript code uses slashes (`N/ui/serverWidget`). The whitelist must include
   both forms or normalize on ingest. See the full mapping table in Category 2.

3. **N/xml is not covered by any oracle file** but is a valid module mentioned in
   `module-xml.md`. Add it explicitly to the whitelist.

4. **BundleInstallationScript, SDFInstallationScript, CustomToolScript** are in the oracle
   script types table but no `@NScriptType` example was found in bootstrap files. Include
   them in the whitelist regardless — they are valid per Oracle docs.

---

## Files Inspected

| File | Lines | Key finding |
|---|---|---|
| `oracle-records-guide.md` | 32 | Index only; no inline record types |
| `oracle-module-record.md` | 498 | Links to record.Type enum; no values listed |
| `oracle-module-search.md` | 219 | Links to search.Type enum; method table present (lines 67–85) |
| `oracle-script-types.md` | ~300 | Full table of 12 script types; no @NScriptType annotations |
| `module-record.md` | 286 | 27 `record.Type.XXX` examples (non-oracle, richer source) |
| `module-search.md` | 274 | 16 `search.Type.XXX` examples + method examples (non-oracle) |
| `script-*.md` (11 files) | varies | @NScriptType annotations present; 9 unique confirmed types |
| `oracle-module-*.md` (50 files) | varies | Header line = authoritative module name |
