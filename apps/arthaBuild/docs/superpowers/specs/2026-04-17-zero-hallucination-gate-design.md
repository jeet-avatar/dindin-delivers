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
| `search.*` method | `search\.([a-z][A-Za-z]*)\s*\(` |

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

### Drift detection

A CI test regenerates the whitelist in a temp file and diffs it against the committed `validators/whitelist.py`. If they differ, the test fails with a message telling the developer to re-run `scripts/build_whitelist.py` and commit the result.

## Integration

The validator runs post-generation, pre-response, inside the `generate_suitescript` intent block at `apps/arthaBuild/src/backend/rawapi.py:542-578`.

```python
if intent == "generate_suitescript":
    # existing quota + prompt-build steps unchanged
    response_text = run_llm_pipeline(user_input)
    code = extract_first_code_block(response_text)

    result = SuiteScriptLinter().lint(code)
    attempts = 0
    while not result.valid and attempts < 2:
        attempts += 1
        response_text = await reprompt_with_violations(
            user_input, response_text, result
        )
        code = extract_first_code_block(response_text)
        result = SuiteScriptLinter().lint(code)

    if not result.valid:
        response_text = build_refusal_message(result)

    # existing persist + return unchanged
```

Total change in `rawapi.py`: ~15 lines.

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

1. **Clean** — generator emits valid code on attempt 1
2. **Recovered** — re-prompt 1 or 2 produces valid code
3. **Hard-blocked** — all 3 attempts fail; user sees refusal

Outcomes 1 and 3 both count as zero-hallucination wins. Only 2 improves user-visible score.

## Metrics

Logged per `generate_suitescript` call:

```python
{
  "validator_elapsed_ms": int,
  "violations_attempt_1": int,
  "violations_attempt_2": int,
  "violations_attempt_3": int,
  "outcome": "clean" | "recovered" | "hard_blocked",
  "categories_hit": ["record_type", "module", ...],
}
```

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
- 160 new edge cases crafted to provoke hallucination — ~40 per category, prompts engineered to push the model toward fabricated identifiers (e.g. "use the `ReceivingVoucher` record type", "load `N/banking/wire`", "search for `tranId` column")

Pass = zero invalid identifiers across all 200. Hard-blocks count as pass.

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
| `apps/arthaBuild/src/backend/rawapi.py` | MODIFY (+~15 lines at 542-578) |
| `apps/arthaBuild/tests/validators/test_record_type.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_module.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_script_type.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_search_api.py` | CREATE |
| `apps/arthaBuild/tests/validators/test_whitelist_drift.py` | CREATE (CI drift check) |
| `apps/arthaBuild/tests/eval/stress/` | CREATE (160 new edge cases) |
