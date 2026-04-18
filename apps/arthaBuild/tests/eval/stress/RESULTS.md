# Stress Run Results — Zero-Hallucination Gate (Path A)

## Summary

| Metric | Value |
|---|---|
| Date | 2026-04-17 |
| Approach | Path A — static linter-coverage (no backend / no LLM) |
| Runner | `tests/eval/run_stress.py` |
| Total cases | 160 |
| Passed (>=1 violation) | **160** |
| Failed (zero violations) | **0** |
| Pass rate | **100.0%** |

## Per-Category Results

| Category | Cases | Flagged | Gaps |
|---|---:|---:|---:|
| record_type | 40 | 40 | 0 |
| module | 40 | 40 | 0 |
| script_type | 40 | 40 | 0 |
| search_api | 40 | 40 | 0 |
| **Total** | **160** | **160** | **0** |

## Methodology

For each stress case, the runner synthesizes minimal JavaScript exercising the
`adversarial_target` in its `target_category`'s canonical form, then feeds it
through `SuiteScriptLinter`. A case "passes" if the linter returns >=1
violation — i.e. the adversarial identifier is correctly flagged.

Synthesis templates:

| Category | Synthesized code |
|---|---|
| `record_type` | `var x = record.Type.{TARGET};` |
| `module` | `define(['{TARGET}'], function(m) { return {}; });` |
| `script_type` (@NScriptType) | `/** @NScriptType {TARGET} */` — when target is CamelCase |
| `script_type` (search.Type) | `var t = search.Type.{TARGET};` — when target is ALL_CAPS |
| `search_api` | `search.{TARGET}();` |

Split for `script_type` uses `^[A-Z_]+$` on the target: ALL-CAPS => `search.Type.*`,
anything with lowercase => `@NScriptType`. This matches how the stress file
mixes 20 @NScriptType + 20 search.Type cases.

## Scope

Path A validates **linter coverage**, not end-to-end LLM hallucination rate.
It proves that every adversarial identifier in the stress corpus is detected
by at least one checker, which is the pre-condition for the `run_validation_loop`
re-prompt / hard-block behavior to activate.

End-to-end LLM metrics (hallucination rate, recovery rate, hard-block rate)
come from production `validator_metrics` logs emitted by `rawapi.py` once
the gate is deployed. See `src/backend/validators/reprompt.py:run_validation_loop`.

## Reproducing

```bash
cd apps/arthaBuild
python3 tests/eval/run_stress.py           # human summary
python3 tests/eval/run_stress.py --json    # machine-readable
python3 -m pytest tests/eval/run_stress.py -v
```

## Related

- Runner: `tests/eval/run_stress.py`
- Corpus: `tests/eval/stress/{record_type,module,script_type,search}.jsonl`
- Linter: `src/backend/validators/linter.py`
- Gate: `src/backend/validators/reprompt.py`
- Phase plan: `docs/superpowers/plans/2026-04-17-zero-hallucination-gate-implementation.md`
