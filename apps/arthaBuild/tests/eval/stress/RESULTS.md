# Stress Run Results — Zero-Hallucination Gate (Path A)

## Summary

| Metric | Value |
|---|---|
| Date | 2026-04-17 |
| Approach | Path A — static linter-coverage (no backend / no LLM) |
| Runner | `tests/eval/run_stress.py` |
| Total cases | 280 |
| Passed (>=1 violation) | **280** |
| Failed (zero violations) | **0** |
| Pass rate | **100.0%** |

## Per-Category Results

| Category | Cases | Flagged | Gaps |
|---|---:|---:|---:|
| record_type | 40 | 40 | 0 |
| module | 40 | 40 | 0 |
| script_type | 40 | 40 | 0 |
| search_api | 40 | 40 | 0 |
| file_type | 40 | 40 | 0 |
| http_method | 40 | 40 | 0 |
| record_script_id | 40 | 40 | 0 |
| **Total** | **280** | **280** | **0** |

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
| `script_type` (@NScriptType) | `/** @NScriptType {TARGET} */` — when `synth_mode=nscripttype` |
| `script_type` (search.Type) | `var t = search.Type.{TARGET};` — when `synth_mode=searchtype` |
| `search_api` | `search.{TARGET}();` |
| `file_type` | `var t = file.Type.{TARGET};` |
| `http_method` | `var m = http.Method.{TARGET};` |
| `record_script_id` | `var r = record.load({type: '{TARGET}', id: 1});` |

The `script_type` category uses an explicit `synth_mode` field in its JSONL
rows (`nscripttype` for 20 cases, `searchtype` for 20 cases) rather than an
ALL_UPPER heuristic, so a genuinely hallucinated ALL_CAPS `@NScriptType` can
be authored in future corpora without being silently rerouted.

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
- Corpus: `tests/eval/stress/{record_type,module,script_type,search,file_type,http_method,record_script_id}.jsonl`
- Linter: `src/backend/validators/linter.py`
- Gate: `src/backend/validators/reprompt.py`
- Phase plan: `docs/superpowers/plans/2026-04-17-zero-hallucination-gate-implementation.md`
