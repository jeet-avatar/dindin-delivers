---
title: Zero-Hallucination Gate — Design
date: 2026-04-17
status: draft
branch: gsd/netsuite-eval-harness
related:
  - apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md
  - apps/arthaBuild/tests/eval/runs/2026-04-17T18-10-58Z/REPORT.md
---

# Zero-Hallucination Gate — Design

## North Star

Make arthaBuild the #1 AI assistant for NetSuite scripting with a **zero-hallucination guarantee** on every generated SuiteScript. Any code returned to a user must contain no invalid NetSuite identifiers. If the generator cannot produce valid code after a bounded retry, the system refuses rather than returns a lie.

## V1 Scope

The gate inspects generated code blocks only — not prose, not conceptual explanations. It validates four categories of identifiers against a whitelist extracted from the Oracle NetSuite documentation already in `knowledge/bootstrap/`.

V1 categories:

1. `record.Type.*` enums (e.g. `record.Type.SALES_ORDER`)
2. `N/*` module paths (e.g. `N/record`, `N/ui/serverWidget`)
3. `@NScriptType` values and `search.Type.*` enums
4. `search.*` API methods (e.g. `search.create`, `search.load`)

Deferred to V2: sublist IDs, field IDs, prose-level linting, conceptual accuracy.

## Architecture

Pluggable validators module at `apps/arthaBuild/src/backend/validators/`.

```
validators/
├── __init__.py
├── linter.py            # SuiteScriptLinter orchestrator
├── whitelist.py         # Generated, committed to git
├── ast_utils.py         # Regex-first JS extraction helpers
└── checkers/
    ├── __init__.py
    ├── base.py          # Checker ABC
    ├── record_type.py   # record.Type.*
    ├── module.py        # N/* imports
    ├── script_type.py   # @NScriptType, search.Type.*
    └── search_api.py    # search.* methods
```

### Dataclasses

```python
@dataclass
class Violation:
    category: str              # "record_type" | "module" | "script_type" | "search_api"
    identifier: str            # the invalid token as it appeared in code
    line: int                  # 1-indexed line within the code block
    suggestions: list[str]     # top-3 nearest valid identifiers via Levenshtein
    message: str               # human-readable, used in re-prompt

@dataclass
class LintResult:
    valid: bool
    violations: list[Violation]
    elapsed_ms: int
```

### Checker ABC

```python
class Checker(ABC):
    category: str

    @abstractmethod
    def extract(self, code: str) -> list[tuple[str, int]]:
        """Return (identifier, line_number) pairs found in code."""

    @abstractmethod
    def whitelist(self) -> set[str]:
        """Valid identifiers for this category."""

    def check(self, code: str) -> list[Violation]:
        wl = self.whitelist()
        out = []
        for ident, line in self.extract(code):
            if ident not in wl:
                out.append(Violation(
                    category=self.category,
                    identifier=ident,
                    line=line,
                    suggestions=nearest(ident, wl, k=3),
                    message=f"{ident!r} is not a valid {self.category}",
                ))
        return out
```

### Extraction strategy

Regex-first. Esprima-python is deferred until we have false-positive data to justify the dependency.

| Category | Regex |
|---|---|
| `record.Type.*` | `record\.Type\.([A-Z_]+)` |
| `N/*` module | `define\(\[['\"]([^'\"]+)['\"]` and `require\(\[['\"]([^'\"]+)['\"]` |
| `@NScriptType` | `@NScriptType\s+(\w+)` |
| `search.Type.*` | `search\.Type\.([A-Z_]+)` |
| `search.*` method | `(?:^|[\s=;,(])search\.([a-z][A-Za-z]*)\s*\(` |

The `search.*` regex anchors at start-of-line or after whitespace/`=`/`;`/`,`/`(` to avoid false positives on member expressions like `result.search.getValue(...)`. A unit test asserts that pattern does not produce a violation.

### Suggestion algorithm (`nearest`)

```python
import difflib

def nearest(ident: str, whitelist: set[str], k: int = 3) -> list[str]:
    return difflib.get_close_matches(ident, whitelist, n=k, cutoff=0.6)
```

Stdlib only — no new dependency. Case-sensitive (capture groups already normalize). Returns empty list if nothing meets the 0.6 ratio cutoff; callers must tolerate empty suggestions.

### Non-ASCII pre-pass (homoglyph defense)

Before any checker runs, the linter scans for non-ASCII code points in the code block:

```python
if re.search(r"[^\x00-\x7f]", code):
    return LintResult(valid=False, violations=[Violation(
        category="non_ascii",
        identifier="<non-ASCII code point>",
        line=first_non_ascii_line,
        suggestions=[],
        message="Code contains non-ASCII characters; NetSuite identifiers must be ASCII",
    )], elapsed_ms=...)
```

This prevents silent bypass via Cyrillic/Greek look-alikes (e.g. `record.Type.SАLES_ORDER` with a Cyrillic `А`).

### Code-block extraction policy

`extract_first_code_block(response_text)` returns `(code: str | None, language: str | None)`.

| Case | Behavior |
|---|---|
| No fence found | Return `(None, None)`. Linter is skipped. Response passes through unchanged — prose-only responses are not our target. |
| Single fence, language `js` / `javascript` / unlabeled | Validate this block. |
| Single fence, language is `python`/`bash`/other | Return `(None, "wrong_language")`. Skip validation; log a warning. One-shot re-prompt with message "Please return JavaScript in a fenced code block." |
| Multiple fences | Validate the first `js` / `javascript` / unlabeled block. Warn in logs. |
| Empty code block | Treated as no code — same as "no fence found". |

## Whitelist Generation

### Source of truth

The 58 `oracle-*.md` files in `apps/arthaBuild/src/backend/knowledge/bootstrap/`. These were scraped from the official NetSuite 2024.2 documentation in commit `a34f092a`.

### Build script

`apps/arthaBuild/scripts/build_whitelist.py` parses those markdown files and emits a committed Python file `validators/whitelist.py`:

```python
RECORD_TYPES: set[str] = {"SALES_ORDER", "INVOICE", "CUSTOMER", ...}  # ~180
MODULES: set[str] = {"N/record", "N/search", "N/ui/serverWidget", ...}  # ~50
SCRIPT_TYPES: set[str] = {"UserEventScript", "Scheduled", ...}  # ~15
SEARCH_TYPES: set[str] = {"TRANSACTION", "CUSTOMER", ...}  # ~180
SEARCH_APIS: set[str] = {"create", "load", "lookupFields", ...}  # ~20
```

Typical output size is under 20 KB. The file is committed so reviewers can eyeball the surface area.

### Parser contract

The parser reads each `oracle-*.md` file and looks for known section headings. A representative snippet from `oracle-record-types.md`:

```markdown
## Record Types

| Enum | String ID | Description |
|---|---|---|
| SALES_ORDER | salesorder | Sales Order record |
| INVOICE | invoice | Invoice record |
```

Verified source files (all exist in `apps/arthaBuild/src/backend/knowledge/bootstrap/` as of commit `053d995d`):

| Category | Source file(s) | Extraction target |
|---|---|---|
| `RECORD_TYPES` | `oracle-records-guide.md` (and linked section files if needed) | `record.Type` enum values — uppercase strings like `SALES_ORDER`, `INVOICE`, `CUSTOMER` |
| `MODULES` | All 28 `oracle-module-*.md` filenames in the bootstrap dir | One `N/*` entry per file, derived from the filename stem (e.g. `oracle-module-record.md` → `N/record`, `oracle-module-crypto-certificate.md` → `N/crypto/certificate`) |
| `SCRIPT_TYPES` | `oracle-script-types.md` | Values referenced as valid `@NScriptType` annotations |
| `SEARCH_TYPES` | `oracle-module-search.md` | `search.Type` enum values — uppercase strings like `TRANSACTION`, `CUSTOMER`, `ITEM` |
| `SEARCH_APIS` | `oracle-module-search.md` | Table rows matching `\[search\.([a-z][A-Za-z]*)\(` in the "Module Members" table |

Wave 1 of implementation inspects each file and pins the exact table / heading / regex rule. The floor checks below guarantee that if Wave 1's rule under-extracts, CI fails loudly rather than silently shipping an empty whitelist.

The module-name slash conversion (`oracle-module-crypto-certificate.md` → `N/crypto/certificate`) is based on the naming convention observed in the N/* module reference, but multi-hyphen filenames need per-case verification (is `oracle-module-format-i18n.md` → `N/format/i18n` or `N/format-i18n`? Is `oracle-module-task-accounting.md` → `N/task/accounting` or a single `N/task-accounting` module?). Wave 1 resolves ambiguous names by opening each file and reading the declared module name from its header line (`# N/... — SuiteScript 2.x Module`), not by mechanically splitting hyphens. Floor check alone won't catch a wrong-but-consistent mapping, so this cross-check is mandatory.

### Floor checks (circuit breaker)

If any category set falls below a floor, `build_whitelist.py` exits non-zero with a loud error. This prevents a parser regression from silently producing an empty whitelist (which would 100%-hard-block every user request).

| Category | Floor |
|---|---|
| `RECORD_TYPES` | 100 |
| `MODULES` | 30 |
| `SCRIPT_TYPES` | 10 |
| `SEARCH_TYPES` | 100 |
| `SEARCH_APIS` | 10 |

### Drift detection

A CI test regenerates the whitelist in a temp file and diffs it against the committed `validators/whitelist.py`. If they differ, the test fails with a message telling the developer to re-run `scripts/build_whitelist.py` and commit the result. The same test also asserts the floor checks above on the committed file.

## Integration

The validator runs post-generation, pre-response, inside the `generate_suitescript` intent block at `apps/arthaBuild/src/backend/rawapi.py:542-578`.

```python
if intent == "generate_suitescript":
    # existing quota + prompt-build steps unchanged
    response_text = run_llm_pipeline(user_input)
    code, lang = extract_first_code_block(response_text)

    if code is None:
        # prose-only response — linter does not apply
        return response_text

    result = SuiteScriptLinter().lint(code)
    attempts = 0
    while not result.valid and attempts < REPROMPT_MAX_ATTEMPTS:
        if elapsed_seconds() > PIPELINE_BUDGET_SECONDS:
            break  # budget exhausted — fall through to refusal
        attempts += 1
        response_text = await reprompt_with_violations(
            user_input, response_text, result
        )
        code, _ = extract_first_code_block(response_text)
        if code is None:
            break
        result = SuiteScriptLinter().lint(code)

    if not result.valid:
        response_text = build_refusal_message(result)

    # existing persist + return unchanged
```

Total change in `rawapi.py`: ~20 lines.

## Re-Prompt Loop

Two attempts maximum. On each attempt, inject **only the relevant category slice** of the whitelist — not the full 400+ identifiers — to keep the prompt short.

Template:

```
Your previous response contained invalid NetSuite identifiers:

- Line {v.line}: {v.identifier!r} is not a valid {v.category}.
  Did you mean one of: {v.suggestions[:3]}?

Valid {category_name} values are:
{whitelist_slice}

Regenerate the complete script using only valid identifiers.
```

Latency budget:
- Clean case: 20-50 ms (regex pass + set lookups)
- One re-prompt: +15 s (model round-trip)
- Worst case (2 re-prompts + hard block): ~45 s

### Timeout reconciliation

Current nginx `proxy_read_timeout` on `artha.build` is 120 s (verified in `apps/arthaBuild/nginx/nginx.prod.conf:48`). The worst-case ~45 s pipeline fits with a 75 s safety margin. (The dev config at `apps/arthaBuild/nginx/nginx.conf:56,104` uses 300 s; prod is the binding constraint.)

Constants (codified, tunable in one place):

```python
REPROMPT_MAX_ATTEMPTS = 2
PIPELINE_BUDGET_SECONDS = 90  # nginx_timeout - 30s safety margin
SINGLE_LLM_CALL_TIMEOUT_SECONDS = 25
```

If `elapsed_seconds()` since request start exceeds `PIPELINE_BUDGET_SECONDS`, the loop breaks early and returns the refusal message rather than risking an nginx 504. Nginx 504s produce generic error pages and defeat the "refuse rather than lie" promise.

### Refusal message format

When the validator cannot produce a clean script, the user sees:

```
I couldn't verify every NetSuite identifier in the script I was about to return,
so I'm holding it back rather than risk sending you something that won't run.

What I flagged:
  • Line {v.line}: {v.identifier} — not a valid {v.category_human}
    Closest known values: {v.suggestions[:3] or "no close match"}

You can:
  • Rephrase the request with more specific record names, or
  • Check the NetSuite 2024.2 Records Browser for the exact identifier,
    then try again.
```

The original (invalid) code is **not** shown — showing it would normalize the hallucination. Violation list is included so the user can adjust their prompt.

`category_human` mapping: `record_type` → "record type", `module` → "module path", `script_type` → "script type annotation", `search_type` → "search type", `search_api` → "search API method", `non_ascii` → "ASCII identifier".

## Testing

### Unit tests

One test file per checker at `apps/arthaBuild/tests/validators/test_<checker>.py`. Each file contains 8-10 hallucinated fixtures and 8-10 valid fixtures, yielding ~160 total unit tests.

Hallucinated fixtures are sourced from the worst-10 eval cases in the Apr 17 run:

| Checker | Hallucinated fixtures (source case) |
|---|---|
| `record_type` | `RECEIVING` (E-2), `VENDOR_INVOICE` (E-2), `CURRENCY_REVALUATION` (E-8) |
| `module` | `N/currencyRevaluation` (E-8), `N/customList` (fabricated) |
| `script_type` | `SavedSearch` (B-7), `BatchProcess` (fabricated) |
| `search_api` | `search.columns.internalId` (B-4), `search.columns.tranId` (B-4) |

Each test asserts `violations[0].category`, `.identifier`, and `.suggestions[0]`.

### Eval integration

Re-run the 40-case eval suite with the validator wired in. Each case produces one of three outcomes:

1. **Clean** — generator emits valid code on the initial attempt
2. **Recovered** — re-prompt 1 or 2 produces valid code
3. **Hard-blocked** — initial attempt + both re-prompts fail (1 + 2 = 3 LLM calls total); user sees refusal

Outcomes 1 and 3 both count as zero-hallucination wins. Only 2 improves user-visible score.

## Metrics

Logged per `generate_suitescript` call:

```python
{
  "validator_elapsed_ms": int,
  "violations_initial": int,
  "violations_reprompt_1": int,
  "violations_reprompt_2": int,
  "outcome": "clean" | "recovered" | "hard_blocked",
  "categories_hit": ["record_type", "module", ...],
}
```

`violations_initial` is the violation count on the first generation. `violations_reprompt_1` and `violations_reprompt_2` are null if the loop exited earlier.

Aggregate signals:

- `validator_catch_rate` = (recovered + hard_blocked) / total
- `reprompt_success_rate` = recovered / (recovered + hard_blocked)
- `hard_block_rate` = hard_blocked / total
- `validator_p50_ms`, `validator_p99_ms`

## Success Criteria

### Primary (V1 gate)

**Zero invalid `record.Type.*` / `N/*` / `@NScriptType` / `search.Type.*` / `search.*` tokens in any returned script across a 200-case stress suite.**

Stress suite composition:
- 40 original eval cases (regression check)
- 160 new adversarial cases, hand-authored, stored at `apps/arthaBuild/tests/eval/stress/stress_cases.jsonl`

Pass = zero invalid identifiers across all 200. Hard-blocks count as pass.

### Adversarial case authoring method

Each of the four categories gets 40 cases. Within a category, use four strategies (10 cases each):

| Strategy | Example prompt | Target |
|---|---|---|
| **Near-miss** | "Write a Map/Reduce that processes `ReceivingVoucher` records" | Model reaches for `record.Type.RECEIVING_VOUCHER` (invalid) instead of `ITEM_RECEIPT` |
| **Plausible-but-nonexistent** | "Use the `N/banking/wire` module to create a wire transfer" | Module sounds real, isn't |
| **Typo of a real identifier** | "Use `record.Type.SALE_ORDER` (singular) to load the record" | Model may pass through the user-supplied typo verbatim |
| **Cross-module confusion** | "Call `search.columns.internalId()` to fetch the ID column" | Confuses option-key (`internalid`) with a method |

Each case is a JSONL row with:

```json
{
  "id": "STRESS-RT-001",
  "prompt": "...",
  "adversarial_target": "RECEIVING_VOUCHER",
  "target_category": "record_type",
  "strategy": "near_miss"
}
```

Authoring is human-driven. LLM-generated candidates may be used as a starting point but must be human-reviewed to confirm the adversarial target actually doesn't exist (Claude-generated cases that accidentally name real identifiers would pollute the suite).

### Secondary ceilings

1. `hard_block_rate` < 10% — false-refusal ceiling
2. `validator_p50_ms` < 50 ms — latency ceiling

Overall eval score may regress slightly by design: hard-blocks score 0 from the judge, and we accept that trade ("refuse rather than lie"). No score-regression ceiling is enforced.

## Out of Scope for V1

- Prose / conceptual lint
- Sublist IDs, field IDs (V2 categories 3 and 5)
- Esprima AST parsing (deferred until regex false-positive data justifies it)
- Whitelist sourced from anything other than `oracle-*.md`
- Multi-script files (V1 validates the first extracted code block only)

## Project-Law Compatibility

- **Ollama-only inference**: validator is pure Python + regex + set lookup. No LLM calls from inside the validator.
- **All MD files separate**: this spec lives in its own file.
- **60% context rule**: implementation will be broken into a phase plan with atomic-commit waves.
- **Autonomous execution**: no approval gates inside waves.

## Files Created / Modified

| File | Action |
|---|---|
| `apps/arthaBuild/src/backend/validators/linter.py` | CREATE |
| `apps/arthaBuild/src/backend/validators/whitelist.py` | CREATE (generated, committed) |
| `apps/arthaBuild/src/backend/validators/ast_utils.py` | CREATE |
| `apps/arthaBuild/src/backend/validators/checkers/base.py` | CREATE |
| `apps/arthaBuild/src/backend/validators/checkers/record_type.py` | CREATE |
| `apps/arthaBuild/src/backend/validators/checkers/module.py` | CREATE |
| `apps/arthaBuild/src/backend/validators/checkers/script_type.py` | CREATE |
| `apps/arthaBuild/src/backend/validators/checkers/search_api.py` | CREATE |
| `apps/arthaBuild/scripts/build_whitelist.py` | CREATE |
| `apps/arthaBuild/src/backend/rawapi.py` | MODIFY (+~20 lines at 542-578) |
| `apps/arthaBuild/tests/validators/test_record_type.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_module.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_script_type.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_search_api.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_whitelist_drift.py` | CREATE (CI drift check) |
| `apps/arthaBuild/tests/eval/stress/` | CREATE (160 new edge cases) |
