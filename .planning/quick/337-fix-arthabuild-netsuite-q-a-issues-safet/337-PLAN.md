---
phase: quick-337
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/arthaBuild/src/backend/model_utils.py
  - /Users/jeet/arthaBuild/src/backend/validators/checkers/search_api.py
  - /Users/jeet/arthaBuild/src/backend/validators/checkers/script_type.py
  - /Users/jeet/arthaBuild/tests/validators/test_linter.py
autonomous: true
requirements: [SS-BUG-01, SS-BUG-02, SS-BUG-03, SS-BUG-04, SS-BUG-05, SS-BUG-06, SS-BUG-07]

must_haves:
  truths:
    - "Asking 'how do I run code beforeLoad on Sales Order' produces a direct answer, not a safety refusal"
    - "Asking 'write a UserEvent script for Sales Order that validates the total before submit' produces code immediately without clarifying questions"
    - "Generated SS2 code does not contain nlobjSearchColumn, nlobjSearch, or nlobjSearchFilter"
    - "Linter flags nlobjSearchColumn / nlobjSearch / nlobjSearchFilter as SS1 API leaks"
    - "Linter flags search.Operator.GREATERTHAN or any search.Operator.* dot-access as invalid"
    - "System prompt instructs to use string literals ('greaterthan', 'lessthan', 'equalto') not search.Operator.*"
    - "Map/Reduce system prompt instructs: map uses context.value (not context.getRecord()), reduce uses context.values (not ctx.getBatchValues())"
    - "Linter flags context.getRecord() in Map/Reduce scripts"
    - "Scheduled script governance comment says CAN create/modify records (50,000 unit limit applies to API calls)"
  artifacts:
    - path: "/Users/jeet/arthaBuild/src/backend/model_utils.py"
      provides: "Fixed system prompts: tighter safety rule, non-over-eager clarifying questions, SS1 API ban, search operator rule, Map/Reduce entry-point facts, corrected governance limits"
    - path: "/Users/jeet/arthaBuild/src/backend/validators/checkers/search_api.py"
      provides: "New checks: SS1 API leak detection (nlobjSearch*), search.Operator.* dot-access flagging"
    - path: "/Users/jeet/arthaBuild/src/backend/validators/checkers/script_type.py"
      provides: "New check: context.getRecord() in Map/Reduce scripts"
    - path: "/Users/jeet/arthaBuild/tests/validators/test_linter.py"
      provides: "Tests covering all 3 new linter checks (7 new test cases)"
  key_links:
    - from: "_SYSTEM_SUITESCRIPT in model_utils.py"
      to: "SearchApiChecker in search_api.py"
      via: "System prompt bans SS1 APIs; linter enforces it programmatically as second line of defense"
    - from: "ScriptTypeChecker in script_type.py"
      to: "Map/Reduce entry-point rules in _SYSTEM_SUITESCRIPT"
      via: "Both must agree: context.getRecord() is wrong in MapReduce"
---

<objective>
Fix 7 SuiteScript Q&A quality bugs in ArthaBuild's chat assistant:
1. Safety refusal misfiring on innocent lifecycle questions
2. Over-eager clarifying questions when all info is already provided
3. SS1 API leaking into SS2 answers (nlobjSearchColumn etc.)
4. Fake search.Operator.GREATER_THAN usage
5. Wrong Map/Reduce entry-point API (context.getRecord(), ctx.getBatchValues())
6. record.Type.PURCHAS_ORD typo (already in whitelist as PURCHASE_ORDER — verify whitelist is correct and add to system prompt)
7. Governance limits misstating scheduled scripts cannot create/modify records

Purpose: ArthaBuild generates incorrect SuiteScript code that would fail in real NetSuite environments. These bugs erode trust and produce scripts that NetSuite will reject at runtime.

Output: Fixed model_utils.py system prompts + enhanced search_api.py and script_type.py linter checks + new tests in test_linter.py.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/arthaBuild/src/backend/model_utils.py
@/Users/jeet/arthaBuild/src/backend/validators/checkers/search_api.py
@/Users/jeet/arthaBuild/src/backend/validators/checkers/script_type.py
@/Users/jeet/arthaBuild/src/backend/validators/whitelist.py
@/Users/jeet/arthaBuild/tests/validators/test_linter.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix _SYSTEM_SUITESCRIPT prompt — safety, clarifying-questions, SS1 ban, search operators, Map/Reduce, governance</name>
  <files>/Users/jeet/arthaBuild/src/backend/model_utils.py</files>
  <action>
Six targeted edits to `_SYSTEM_SUITESCRIPT` (lines 291–510 in the file). Do NOT touch `_SYSTEM_GUIDE` or `_SYSTEM_GENERAL` unless they share the same bugs (check each section independently).

**Edit 1 — Tighten safety refusal (Bug 1)**

The current system prompt has no explicit safety-refusal clause, but the LLM occasionally interprets lifecycle event questions (like "run code beforeLoad") as suspicious. Add an explicit rule under section C (ENTRY-POINT SIGNATURES) or create a new section F:

```
F. SAFETY REFUSAL SCOPE (Phase 337 fix)
   - ONLY refuse or add safety warnings for requests that are clearly malicious:
     data exfiltration (sending data to external attacker servers), credential theft
     (reading vault/keychain/JWT secrets to transmit externally), or bypassing NetSuite
     authentication/role checks to gain unauthorized access.
   - Standard SuiteScript lifecycle events (beforeLoad, beforeSubmit, afterSubmit),
     record reads/writes, search execution, sending legitimate business emails,
     calling approved external APIs — these are ALL normal NetSuite operations.
     Answer them directly. NEVER treat "how do I run code beforeLoad" or any
     legitimate SuiteScript operation as suspicious.
```

**Edit 2 — Fix over-eager clarifying questions (Bug 2)**

The CLARIFYING-QUESTION RULE currently says: ask if request has NO record type, NO field names, NO business trigger. This is correct logic but add a negative case to make it explicit:

In the CLARIFYING-QUESTION RULE section, append after the last bullet point:

```
Do NOT ask clarifying questions when the user has already specified ALL of:
  (a) the record type (e.g., "Sales Order", "Purchase Order", "Customer"),
  (b) the trigger or event type (e.g., "beforeSubmit", "on save", "scheduled"), AND
  (c) the action (e.g., "validate the total", "send an email", "update a field").
When all three are provided — even informally — proceed directly to generating the script.
Example: "write a UserEvent script for Sales Order that validates the total before submit"
has all three → generate immediately, no clarifying questions.
```

**Edit 3 — Ban SS1 API names in SS2 answers (Bug 3)**

In section E (WHEN UNCERTAIN) or after section E, add a new section:

```
G. SUITESCRIPT 1.0 API — NEVER USE IN SS2 ANSWERS (Phase 337 fix)
   - The following are SuiteScript 1.0 API names. They do NOT exist in SuiteScript 2.x.
     Never use them in any SS2 code block:
     nlobjSearch, nlobjSearchColumn, nlobjSearchFilter, nlobjSearchResult,
     nlobjRecord, nlobjFile, nlobjContext, nlobjSubrecord,
     nlapiSearchRecord, nlapiCreateRecord, nlapiSubmitRecord, nlapiLoadRecord,
     nlapiSendEmail, nlapiGetContext, nlapiGetUser, nlapiLookupField.
   - In SS2: use search.create({...}), search.createColumn({...}),
     search.createFilter({...}) — all from the N/search module.
   - If a user pastes SS1 code and asks to convert it, convert FULLY to SS2 API
     and call out every SS1 name you replaced.
```

**Edit 4 — Correct search operators (Bug 4)**

In section E (WHEN UNCERTAIN) or in a new section, add:

```
H. SEARCH OPERATOR VALUES — STRING LITERALS ONLY (Phase 337 fix)
   - search.Operator is NOT an enum object with dot-accessible properties.
     search.Operator.GREATER_THAN does NOT exist. search.Operator.LESS_THAN does NOT exist.
   - Operator values in SuiteScript 2.x are plain string literals passed directly to
     search.createFilter(). Correct values (use exactly these strings):
       'equalto', 'notequalto', 'lessthan', 'greaterthan',
       'lessthanorequalto', 'greaterthanorequalto',
       'startswith', 'contains', 'doesnotcontain',
       'isempty', 'isnotempty', 'between', 'within',
       'anyof', 'noneof', 'after', 'before', 'on', 'noton'.
   - Correct usage: search.createFilter({ name: 'amount', operator: 'greaterthan', values: [100] })
   - NEVER write: search.Operator.GREATERTHAN, search.Operator.GREATER_THAN, or any
     search.Operator.* dot-access. There is no search.Operator object in SS2.
```

**Edit 5 — Fix Map/Reduce entry-point API facts (Bug 5)**

Find the existing section C (ENTRY-POINT SIGNATURES). Currently it documents UserEventScript and ClientScript. Extend it with MapReduceScript facts:

Append to section C:
```
   - MapReduceScript entry points and their context objects:
     * getInputData(context): return an array/search/file. context has no record data.
     * map(context): context.value = the JSON string of one input item (call JSON.parse).
       context.key = the map key (string). DO NOT call context.getRecord() — that method
       does not exist in MapReduce. DO NOT use context.newRecord — that is UserEventScript.
     * reduce(context): context.key = the group key, context.values = array of strings
       (the values from map for this key). DO NOT call ctx.getBatchValues() — that method
       does not exist. Iterate context.values directly.
     * summarize(context): context.mapSummary, context.reduceSummary for error inspection.
```

**Edit 6 — Fix scheduled script governance facts (Bug 7)**

Find section D (GOVERNANCE UNITS). Add a clarifying note:

Append to section D:
```
   - Governance limits by script type:
     * UserEventScript: 1,000 units per execution (synchronous, fires on record save)
     * ScheduledScript: 10,000 units per execution (CAN create/modify/delete records;
       the governance limit applies to API calls, NOT to whether record operations are allowed)
     * MapReduceScript: 10,000 units per map/reduce/summarize stage
     * Suitelet: 1,000 units per request
     * RESTlet: 1,000 units per request
     * ClientScript: 1,000 units per page load
   - IMPORTANT: ScheduledScript CAN and routinely DOES create records, modify records,
     and delete records. That is a primary use case. The limit is on how many governance
     units (API calls) it can use, not on what operations it can perform.
```

After all edits: run `grep -n "search\.Operator\|nlobjSearch\|getBatchValues\|context\.getRecord\|cannot create\|PURCHAS_ORD" /Users/jeet/arthaBuild/src/backend/model_utils.py` to confirm none of the bad patterns were accidentally introduced by the edit. Verify the six new sections are present with `grep -n "Phase 337\|SUITESCRIPT 1\.0\|STRING LITERALS ONLY\|MapReduceScript entry\|ScheduledScript: 10,000" /Users/jeet/arthaBuild/src/backend/model_utils.py`.
  </action>
  <verify>
```bash
grep -c "Phase 337" /Users/jeet/arthaBuild/src/backend/model_utils.py
# Expect: 4 or more (one per new section)
grep -n "nlobjSearch\|nlobjSearchColumn\|SUITESCRIPT 1\.0" /Users/jeet/arthaBuild/src/backend/model_utils.py | head -5
# Expect: lines in the "NEVER USE" ban section
grep -n "search\.Operator.*does NOT exist\|STRING LITERALS ONLY" /Users/jeet/arthaBuild/src/backend/model_utils.py
# Expect: match found in section H
grep -n "context\.values.*array\|getBatchValues.*does not exist\|MapReduceScript entry" /Users/jeet/arthaBuild/src/backend/model_utils.py
# Expect: match in MapReduceScript section
grep -n "ScheduledScript.*10,000\|ScheduledScript CAN.*create" /Users/jeet/arthaBuild/src/backend/model_utils.py
# Expect: match in governance section
grep -n "Do NOT ask clarifying questions when.*record type" /Users/jeet/arthaBuild/src/backend/model_utils.py
# Expect: match in clarifying-question rule section
grep -n "ONLY refuse.*malicious\|data exfiltration\|SAFETY REFUSAL SCOPE" /Users/jeet/arthaBuild/src/backend/model_utils.py
# Expect: match in new safety section F
```
  </verify>
  <done>All 7 grep checks return at least one match. No `search.Operator.GREATER_THAN`, `nlobjSearchColumn`, `getBatchValues()`, or "cannot create records" (re: ScheduledScript) patterns remain uncorrected in the prompt text.</done>
</task>

<task type="auto">
  <name>Task 2: Enhance linter — SS1 API leak detection, search.Operator.* flagging, MapReduce context.getRecord() detection + new tests</name>
  <files>
    /Users/jeet/arthaBuild/src/backend/validators/checkers/search_api.py
    /Users/jeet/arthaBuild/src/backend/validators/checkers/script_type.py
    /Users/jeet/arthaBuild/tests/validators/test_linter.py
  </files>
  <action>
**search_api.py — add 2 new pattern checks:**

The current `SearchApiChecker` only checks `search.<method>(` dot-method calls. It needs two additional patterns that operate independently of the method-whitelist logic. Override `check()` to add these:

```python
# New pattern 1: SS1 API names in SS2 code
_SS1_API_RE = re.compile(
    r"\b(nlobjSearch|nlobjSearchColumn|nlobjSearchFilter|nlobjSearchResult"
    r"|nlapiSearchRecord|nlapiLoadRecord|nlapiCreateRecord|nlapiSubmitRecord"
    r"|nlapiSendEmail|nlobjRecord|nlobjFile)\s*[\(\.]",
    re.IGNORECASE,
)

# New pattern 2: search.Operator.* dot-access (the object does not exist in SS2)
_SEARCH_OPERATOR_RE = re.compile(r"\bsearch\.Operator\.[A-Z_]+")
```

Override `check()` in `SearchApiChecker` to run the base class logic PLUS these two new scans:

```python
def check(self, code: str) -> list[Violation]:
    violations = super().check(code)  # existing method whitelist check
    lines = code.splitlines()
    for line_no, line in enumerate(lines, 1):
        # SS1 API leak check
        for m in _SS1_API_RE.finditer(line):
            violations.append(Violation(
                category="ss1_api_leak",
                identifier=m.group(1),
                line=line_no,
                suggestions=["Use SuiteScript 2.x API: search.create(), search.createColumn(), search.createFilter() from N/search"],
                message=f"`{m.group(1)}` is a SuiteScript 1.0 API — not available in SS2",
            ))
        # search.Operator.* dot-access check
        for m in _SEARCH_OPERATOR_RE.finditer(line):
            ident = m.group(0)
            violations.append(Violation(
                category="search_operator",
                identifier=ident,
                line=line_no,
                suggestions=["Use string literals: 'greaterthan', 'lessthan', 'equalto', 'contains', etc."],
                message=f"`search.Operator` is not a valid SS2 object. Use string literals for operators.",
            ))
    return violations
```

Ensure the two new regex patterns are module-level constants (not inside the method).

**script_type.py — add MapReduce context.getRecord() detection:**

Add a new pattern at module level:

```python
# Map/Reduce: context.getRecord() does not exist — SS1 habit leaking into SS2 MapReduce
_MR_GETRECORD_RE = re.compile(r"\bcontext\.getRecord\s*\(")
# Also flag the script type so we can conditionally apply this check only to MapReduceScript
_MR_SCRIPT_TYPE_RE = re.compile(r"@NScriptType\s+MapReduceScript")
```

In `ScriptTypeChecker.check()`, after the existing `@NScriptType` and `search.Type.*` checks, add:

```python
# MapReduce context.getRecord() check — only flag when code declares MapReduceScript
if _MR_SCRIPT_TYPE_RE.search(code):
    for line_no, line in enumerate(code.splitlines(), 1):
        if _MR_GETRECORD_RE.search(line):
            out.append(Violation(
                category="mapreduce_api",
                identifier="context.getRecord()",
                line=line_no,
                suggestions=["In MapReduceScript map stage: use JSON.parse(context.value) to get record data. In reduce: use context.values (array)."],
                message="`context.getRecord()` does not exist in MapReduceScript. Use `context.value` (map) or `context.values` (reduce).",
            ))
```

**test_linter.py — add 7 new test cases:**

Append to the existing test file (do not touch existing tests):

```python
# ── Bug 3: SS1 API leak detection ──────────────────────────────────────────

def test_ss1_nlobjSearchColumn_flagged():
    from src.backend.validators.linter import SuiteScriptLinter
    code = "var col = new nlobjSearchColumn('amount');"
    r = SuiteScriptLinter().lint(code)
    assert r.valid is False
    cats = {v.category for v in r.violations}
    assert "ss1_api_leak" in cats

def test_ss1_nlobjSearch_flagged():
    from src.backend.validators.linter import SuiteScriptLinter
    code = "var results = nlobjSearch('salesorder', null, [], []);"
    r = SuiteScriptLinter().lint(code)
    assert r.valid is False
    assert any(v.category == "ss1_api_leak" for v in r.violations)

def test_ss1_nlapiSearchRecord_flagged():
    from src.backend.validators.linter import SuiteScriptLinter
    code = "var rows = nlapiSearchRecord('customer', null, filters, columns);"
    r = SuiteScriptLinter().lint(code)
    assert r.valid is False
    assert any(v.category == "ss1_api_leak" for v in r.violations)

# ── Bug 4: search.Operator.* dot-access ──────────────────────────────────

def test_search_operator_dot_flagged():
    from src.backend.validators.linter import SuiteScriptLinter
    code = "var f = search.createFilter({name:'amount', operator: search.Operator.GREATER_THAN, values:[100]});"
    r = SuiteScriptLinter().lint(code)
    assert r.valid is False
    assert any(v.category == "search_operator" for v in r.violations)

def test_search_operator_string_literal_passes():
    from src.backend.validators.linter import SuiteScriptLinter
    code = "var f = search.createFilter({name:'amount', operator: 'greaterthan', values:[100]});"
    r = SuiteScriptLinter().lint(code)
    # Only checking search_operator violations are absent; other violations may exist
    assert not any(v.category == "search_operator" for v in r.violations)

# ── Bug 5: MapReduce context.getRecord() ─────────────────────────────────

def test_mapreduce_context_getRecord_flagged():
    from src.backend.validators.linter import SuiteScriptLinter
    code = """
    /** @NApiVersion 2.1 @NScriptType MapReduceScript */
    define(['N/record'], function(record) {
        function map(context) {
            var rec = context.getRecord();
        }
        return { map: map };
    });
    """
    r = SuiteScriptLinter().lint(code)
    assert r.valid is False
    assert any(v.category == "mapreduce_api" for v in r.violations)

def test_userevent_context_getRecord_not_flagged_by_mr_checker():
    from src.backend.validators.linter import SuiteScriptLinter
    # context.getRecord() in a NON-MapReduce script should NOT trigger mapreduce_api
    code = """
    /** @NApiVersion 2.1 @NScriptType UserEventScript */
    define(['N/record'], function(record) {
        function beforeSubmit(context) {
            var rec = context.getRecord();
        }
        return { beforeSubmit: beforeSubmit };
    });
    """
    r = SuiteScriptLinter().lint(code)
    assert not any(v.category == "mapreduce_api" for v in r.violations)
```

After writing all three files, run the test suite:
```bash
cd /Users/jeet/arthaBuild && python -m pytest tests/validators/test_linter.py -v 2>&1 | tail -30
```
All tests must pass. If there are import errors, check that `_SS1_API_RE`, `_SEARCH_OPERATOR_RE`, and `_MR_GETRECORD_RE` are at module level (not inside methods), and that `super().check(code)` is called correctly in `SearchApiChecker`.
  </action>
  <verify>
```bash
cd /Users/jeet/arthaBuild && python -m pytest tests/validators/test_linter.py -v 2>&1 | tail -40
# Expect: all tests PASSED including the 7 new ones
# Expect: no FAILED or ERROR lines

# Spot-check the new patterns are in the files:
grep -n "ss1_api_leak\|nlobjSearch\|_SS1_API_RE" /Users/jeet/arthaBuild/src/backend/validators/checkers/search_api.py
grep -n "search_operator\|_SEARCH_OPERATOR_RE\|Operator\." /Users/jeet/arthaBuild/src/backend/validators/checkers/search_api.py
grep -n "mapreduce_api\|_MR_GETRECORD_RE\|context\.getRecord" /Users/jeet/arthaBuild/src/backend/validators/checkers/script_type.py
```
  </verify>
  <done>All tests in tests/validators/test_linter.py pass (including the 7 new ones). The linter correctly flags: nlobjSearchColumn/nlobjSearch (ss1_api_leak), search.Operator.GREATER_THAN (search_operator), context.getRecord() in MapReduceScript (mapreduce_api). String literal operators and UserEventScript context.getRecord() do not trigger false positives.</done>
</task>

<task type="auto">
  <name>Task 3: CR ticket, full backend test suite, git commit</name>
  <files>none (verification and commit only)</files>
  <action>
**Step 1 — Create Change Request ticket** (ticketed-task skill):
```bash
CR=$(curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/?secret_key=$ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix 7 ArthaBuild NetSuite Q&A bugs: safety refusal, SS1 leak, search.Operator, MapReduce API, governance",
    "description": "Fix misfiring safety refusal on lifecycle questions, over-eager clarifying questions, SS1 API leaking into SS2 answers, fake search.Operator.GREATER_THAN, wrong MapReduce entry-point API (context.getRecord/getBatchValues), and incorrect scheduled script governance claim. Fixes in model_utils.py system prompts + new linter checks in search_api.py and script_type.py.",
    "change_type": "code",
    "priority": "High",
    "requested_by": "support@dollor.ai"
  }')
echo $CR
CR_ID=$(echo $CR | python3 -c "import sys,json; print(json.load(sys.stdin)['cr_id'])")
curl -s -X POST "https://api.dollor.ai/api/admin/change-requests/${CR_ID}/submit?secret_key=$ADMIN_SECRET_KEY"
echo "CR created and submitted: $CR_ID"
```

**Step 2 — Run full ArthaBuild backend test suite** to confirm no regressions:
```bash
cd /Users/jeet/arthaBuild/src/backend && python -m pytest tests/ -v --tb=short 2>&1 | tail -20
```
If failures exist that are NOT in the linter tests, investigate before committing. Failures only in the new linter tests mean the linter implementation needs fixing (fix it, don't skip).

**Step 3 — Git commit** (arthaBuild repo, not doordash-p2p):
```bash
cd /Users/jeet/arthaBuild && git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" add \
  src/backend/model_utils.py \
  src/backend/validators/checkers/search_api.py \
  src/backend/validators/checkers/script_type.py \
  tests/validators/test_linter.py

git -c user.email="jm@techcloudpro.com" -c user.name="jeet-avatar" commit -m "$(cat <<'EOF'
fix(quick-337): fix 7 NetSuite Q&A bugs — safety refusal, SS1 leak, search.Operator, MapReduce API, governance

- Tighten safety refusal: only block clearly malicious requests (exfiltration/credential theft/auth bypass); never flag lifecycle events
- Fix over-eager clarifying questions: proceed directly when record type + event + action are all specified
- Ban SS1 API names in SS2 answers (nlobjSearch*, nlapiSearchRecord*, etc.) — new section G in system prompt
- Fix search operators: document string literals ('greaterthan' etc.), explicitly ban search.Operator.* dot-access — new section H
- Fix MapReduce entry-point facts: context.value (map), context.values (reduce), no context.getRecord() or getBatchValues()
- Fix scheduled script governance: ScheduledScript CAN create/modify records; 10,000 unit limit is for API calls
- Linter: new ss1_api_leak check (nlobjSearch*/nlapiSearchRecord*), search_operator check (search.Operator.*), mapreduce_api check (context.getRecord() in MapReduceScript)
- Tests: 7 new test cases covering all 3 new linter checks

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git log --oneline -1
```
  </action>
  <verify>
```bash
cd /Users/jeet/arthaBuild && git log --oneline -1
# Expect: commit message starts with "fix(quick-337):"
cd /Users/jeet/arthaBuild/src/backend && python -m pytest tests/ -q 2>&1 | tail -5
# Expect: X passed (no new failures vs. baseline)
```
  </verify>
  <done>CR ticket created and submitted. Full backend test suite passes (no regressions). Git commit on arthaBuild main under jeet-avatar with all 4 changed files.</done>
</task>

</tasks>

<verification>
Run these checks after all tasks complete:

```bash
# 1. All 7 system prompt fixes present
grep -c "Phase 337" /Users/jeet/arthaBuild/src/backend/model_utils.py

# 2. No SS1 API names in _SYSTEM_SUITESCRIPT (they should only appear in the BAN section)
grep -n "nlobjSearchColumn\|search\.Operator\.GREATER" /Users/jeet/arthaBuild/src/backend/model_utils.py

# 3. Linter tests all pass
cd /Users/jeet/arthaBuild && python -m pytest tests/validators/test_linter.py -v 2>&1 | grep -E "PASSED|FAILED|ERROR"

# 4. New linter violations fire correctly
python3 -c "
import sys; sys.path.insert(0, '/Users/jeet/arthaBuild/src')
from backend.validators.linter import SuiteScriptLinter
r = SuiteScriptLinter().lint(\"var c = new nlobjSearchColumn('amount');\")
print('SS1 check:', 'PASS' if any(v.category=='ss1_api_leak' for v in r.violations) else 'FAIL')
r2 = SuiteScriptLinter().lint(\"search.Operator.GREATER_THAN\")
print('Operator check:', 'PASS' if any(v.category=='search_operator' for v in r2.violations) else 'FAIL')
"
```
</verification>

<success_criteria>
- All 7 system prompt bug fixes are in _SYSTEM_SUITESCRIPT in model_utils.py (verified by grep)
- Linter flags nlobjSearchColumn / nlobjSearch as ss1_api_leak
- Linter flags search.Operator.GREATER_THAN (and any search.Operator.*) as search_operator
- Linter flags context.getRecord() in MapReduceScript as mapreduce_api
- String literal operators ('greaterthan') do NOT trigger search_operator violation
- context.getRecord() in UserEventScript does NOT trigger mapreduce_api violation
- All tests in tests/validators/test_linter.py pass including 7 new ones
- Full backend test suite passes (no regressions)
- Commit pushed on arthaBuild main under jeet-avatar
</success_criteria>

<output>
After completion, create `.planning/quick/337-fix-arthabuild-netsuite-q-a-issues-safet/337-SUMMARY.md`
</output>
