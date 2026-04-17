# Eval Cases — Schema & Authoring Guide

## Case Schema

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | `<dim>-<n>`, e.g. `A-1` |
| `dimension` | yes | `A`, `B`, `C`, `D`, or `E` |
| `prompt` | yes | User message sent to `/api/chatbot/process` |
| `must_include` | yes | Substrings that MUST appear in the response |
| `must_not_include` | yes | Substrings that MUST NOT appear |
| `expected_record_types` | yes | NetSuite record type IDs the response should mention |
| `expected_files` | C only | Filenames the response should reference (SDF project files) |
| `requires_code` | yes | If false, scorer skips JS-parse check and reweights |
| `rubric` | yes | Case-specific guidance for the LLM judge |

`must_include` should always include `define(` for code-producing cases (A, C, D) and the relevant `N/*` module(s). `must_not_include` always includes `TODO` and `placeholder`.

## Per-Dimension Authoring Tips

### Dimension A — Coverage Breadth
- One case per SuiteScript type: Map/Reduce, User Event, Workflow Action, RESTlet, Scheduled, Client Script, Suitelet, Portlet.
- Every `must_include` must reference the correct entry-point function name for that script type.
- Use real `*Context` type names from the oracle docs — e.g. `MapReduceScriptContext`, `UserEventContext`, `WorkflowActionContext`.
- `requires_code: true` for all A cases.

### Dimension B — Accuracy Depth (Hallucination Traps)
- These cases probe commonly hallucinated identifiers.
- `must_not_include` should list 2–4 plausible-but-fake NetSuite field/module names.
- Verify every trap: confirm the fake identifier does NOT appear in any oracle/feature/module doc.
- `requires_code` may be false when the scenario is a knowledge question, not a code task.

### Dimension C — Execution / SDF Project
- Every case asks for a deployable SDF project.
- `expected_files` must list real SDF filenames only: `manifest.xml`, `deploy.xml`, `Objects/<scriptid>.xml`, `FileCabinet/SuiteScripts/<module>/<name>.js`.
- `requires_code: true` for all C cases.
- Rubric must mention that both the XML objects AND the JS file must be present.

### Dimension D — Pattern Quality / Governance
- Focus on production-hardened, governance-aware patterns.
- Real governance limits: User Event = 1000 units, Scheduled = 10000 units, Map/Reduce = 5000 units/stage.
- Real error codes from `errors-troubleshooting.md`: `RCRD_HAS_BEEN_CHANGED` (optimistic lock), `SSS_REQUEST_LIMIT_EXCEEDED`, `SSS_TIME_LIMIT_EXCEEDED`, `RCRD_DSNT_EXIST`.
- `must_include` should reference `getRemainingUsage()` for governance checks.

### Dimension E — Real-Scenario Fluency
- Multi-step business flows covering major NetSuite processes.
- `expected_record_types` must list EVERY record touched in the flow (use lowercase internal IDs).
- Many E cases are narrative/explanatory: `requires_code: false`.
- Rubric should require the response to identify the correct sequence of transactions and GL impact.
