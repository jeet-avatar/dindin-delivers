---
phase: 339
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/339-delete-6-import-smoke-338-1-test-residue/339-PROOF.md
autonomous: true
requirements:
  - SB-RESIDUE-339-01  # 6 IMPORT-SMOKE-338-1-* rows deleted from solobrands turion.items
  - SB-RESIDUE-339-02  # Solo Brands turion.items count returns to exactly 109 (Phase 65-01 baseline)
  - SB-RESIDUE-339-03  # Turion tenant turion.items count is byte-equal before vs after (zero collateral)
must_haves:
  truths:
    - "Before the operation, exactly 6 rows in turion.items match (tenant_id=45896e95-4683-4894-8a4e-bcd5b76f6404 AND id LIKE 'IMPORT-SMOKE-338-%')"
    - "Before the operation, exactly 0 rows in turion.items match (tenant_id=turion-uuid AND id LIKE 'IMPORT-SMOKE-338-%') — defense in depth"
    - "After the operation, the 6 matching solobrands rows are gone"
    - "After the operation, Solo Brands turion.items count is exactly 109 (Phase 65-01 baseline restored)"
    - "After the operation, Turion tenant turion.items count is BYTE-EQUAL to the BEFORE snapshot — zero collateral"
    - "The DELETE statement aborts with EXCEPTION if it would touch any tenant_id other than the solobrands UUID"
  artifacts:
    - path: ".planning/quick/339-delete-6-import-smoke-338-1-test-residue/339-PROOF.md"
      provides: "BEFORE/AFTER counts + DELETE row count + transaction log proving Turion data preserved"
      contains: "BEFORE_SOLOBRANDS_COUNT, BEFORE_TURION_COUNT, ROWS_DELETED, AFTER_SOLOBRANDS_COUNT, AFTER_TURION_COUNT"
  key_links:
    - from: "DELETE statement"
      to: "turion.items"
      via: "double-filter WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404' AND id LIKE 'IMPORT-SMOKE-338-%'"
      pattern: "tenant_id\\s*=\\s*'45896e95.*AND\\s+id\\s+LIKE\\s+'IMPORT-SMOKE-338-%'"
    - from: "Pre-flight guard CTE"
      to: "RAISE EXCEPTION"
      via: "DO block asserts every targeted row has tenant_id = solobrands UUID before commit"
      pattern: "RAISE EXCEPTION"
---

<objective>
Delete exactly 6 `IMPORT-SMOKE-338-1-*` test residue rows from `turion.items` belonging to the Solo Brands tenant (`tenant_id = 45896e95-4683-4894-8a4e-bcd5b76f6404`), restoring the Solo Brands item count to the Phase 65-01 baseline of exactly 109. The operation MUST NOT touch any row in the `turion` tenant or any other tenant under any circumstance.

Purpose: Phase 65.2-04 SUMMARY documented `IMPORT-SMOKE-338-*` row drift in Solo Brands (items 109→169) as out-of-scope cleanup debt. Quick 338 SUMMARY also noted the 4 named `SMOKE-338-*` rows were purged but explicitly punted the additional `IMPORT-SMOKE-338-1-*` residue created by the 65.2-04 Plan 04 round-trip work. This Quick task closes that debt with a Turion-safety-guarded DELETE.

Output: 6 rows deleted from solobrands; Solo Brands items=109; Turion items count unchanged byte-equal; PROOF.md with BEFORE/AFTER/DELETE counts.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/quick/338-solobrands-onboarding-smoke-verify-file-/338-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/phases/65.2-data-aware-per-tenant-dynamic-onboarding-wizard/65.2-04-SUMMARY.md
@/Users/jeet/turion-space-demo/scripts/smoke-onboarding.sh

# Key constants (verified from contexts above):
# - Solo Brands tenant_id: 45896e95-4683-4894-8a4e-bcd5b76f6404 (per 65.2-04 verification snapshot)
# - Runner Lambda: zietra-rls-runner-55-05
# - Runner secret bundle: smoke-onboarding.sh lines 24-26 (RUNNER_USER='zietra_app', password inline OR fetch fresh)
# - Phase 65-01 baseline: Solo Brands turion.items count = 109
# - Payload format: {"sql": "...", "password": "...", "user": "zietra_admin"|"zietra_app"}
# - Invocation: aws lambda invoke --function-name zietra-rls-runner-55-05 --region us-east-1 \
#     --payload fileb:///tmp/...pl.json --cli-binary-format raw-in-base64-out /tmp/...out.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight verify + guarded DELETE + post-verify in a single transactional pass</name>
  <files>.planning/quick/339-delete-6-import-smoke-338-1-test-residue/339-PROOF.md</files>
  <action>
**Strategy:** Single Lambda invocation runs a transactional SQL block containing pre-flight asserts, the guarded DELETE, and post-flight asserts. If ANY assert fails, the entire transaction ROLLBACKs and zero rows are deleted.

**Step 1 — Capture exact turion baseline first (READ-ONLY, separate invocation):**
- Look up the turion tenant_id by slug:
  ```sql
  SELECT id::text AS turion_tenant_id FROM public.tenants WHERE slug = 'turion';
  ```
- Store the returned UUID in shell var `TURION_TENANT_ID`. If lookup returns zero rows → FAIL the task and stop.

**Step 2 — Capture BEFORE counts (READ-ONLY, separate invocation as `zietra_admin` since this is a multi-tenant read that bypasses RLS for the audit):**
  ```sql
  SELECT
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404') AS sb_items_total,
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404' AND id LIKE 'IMPORT-SMOKE-338-%') AS sb_residue_matches,
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '<TURION_TENANT_ID>') AS turion_items_total,
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '<TURION_TENANT_ID>' AND id LIKE 'IMPORT-SMOKE-338-%') AS turion_residue_false_positives;
  ```
- Assert in shell: `sb_residue_matches == 6` (the documented count). If != 6, STOP and write PROOF.md noting the discrepancy. If 0 in turion_residue_false_positives, proceed (defense-in-depth check passed).

**Step 3 — Guarded DELETE in a single transaction (as `zietra_admin` via the runner Lambda — `zietra_app` is RLS-gated and we want the multi-tenant safety guard to execute server-side, which `zietra_admin` permits):**

Build this exact SQL payload (parameterized into a single string for the runner Lambda):

```sql
BEGIN;

-- Pre-flight assertion #1: confirm exactly 6 target rows in solobrands BEFORE deleting
DO $$
DECLARE
  v_sb_target_count INTEGER;
  v_turion_collateral_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sb_target_count
  FROM turion.items
  WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404'
    AND id LIKE 'IMPORT-SMOKE-338-%';

  IF v_sb_target_count <> 6 THEN
    RAISE EXCEPTION 'GUARD-FAIL: expected 6 IMPORT-SMOKE-338-* rows in solobrands, found %', v_sb_target_count;
  END IF;

  -- Pre-flight assertion #2: defense-in-depth — confirm Turion tenant has ZERO matching rows
  SELECT COUNT(*) INTO v_turion_collateral_count
  FROM turion.items
  WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'turion')
    AND id LIKE 'IMPORT-SMOKE-338-%';

  IF v_turion_collateral_count <> 0 THEN
    RAISE EXCEPTION 'GUARD-FAIL: Turion tenant has % IMPORT-SMOKE-338-* rows; refusing to proceed', v_turion_collateral_count;
  END IF;

  -- Pre-flight assertion #3: no IMPORT-SMOKE-338-* rows exist in ANY tenant other than solobrands
  IF EXISTS (
    SELECT 1 FROM turion.items
    WHERE id LIKE 'IMPORT-SMOKE-338-%'
      AND tenant_id <> '45896e95-4683-4894-8a4e-bcd5b76f6404'
  ) THEN
    RAISE EXCEPTION 'GUARD-FAIL: IMPORT-SMOKE-338-* rows exist outside solobrands tenant; refusing to proceed';
  END IF;
END $$;

-- The DELETE — DOUBLE-FILTERED (tenant_id AND id pattern). Both filters required.
WITH deleted AS (
  DELETE FROM turion.items
  WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404'
    AND id LIKE 'IMPORT-SMOKE-338-%'
  RETURNING id, tenant_id
)
SELECT id, tenant_id::text FROM deleted;

-- Post-flight assertion: confirm exactly 6 rows were deleted (target now zero) AND
-- confirm no cross-tenant rows were affected
DO $$
DECLARE
  v_sb_residue_remaining INTEGER;
  v_sb_total_after INTEGER;
  v_turion_total_after INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sb_residue_remaining
  FROM turion.items
  WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404'
    AND id LIKE 'IMPORT-SMOKE-338-%';

  IF v_sb_residue_remaining <> 0 THEN
    RAISE EXCEPTION 'POST-FAIL: expected 0 residue rows after DELETE, found %', v_sb_residue_remaining;
  END IF;

  SELECT COUNT(*) INTO v_sb_total_after
  FROM turion.items
  WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404';

  IF v_sb_total_after <> 109 THEN
    RAISE EXCEPTION 'POST-FAIL: Solo Brands items=%, expected 109 (Phase 65-01 baseline)', v_sb_total_after;
  END IF;
END $$;

COMMIT;
```

**Implementation note on payload construction:**
Build the payload via python3 to avoid shell-quoting hazards on the long SQL string:
```bash
SOLOBRANDS_UUID="45896e95-4683-4894-8a4e-bcd5b76f6404"
ADMIN_PASS=$(/opt/homebrew/bin/aws secretsmanager get-secret-value \
  --secret-id "zietra-aurora/admin-bypass-role" \
  --region us-east-1 --query SecretString --output text \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["password"])')
python3 - <<'PYEOF' > /tmp/339_delete_pl.json
import json
sql = """<the full SQL block above, verbatim>"""
print(json.dumps({"sql": sql, "password": __import__('os').environ['ADMIN_PASS'], "user": "zietra_admin"}))
PYEOF
ADMIN_PASS="$ADMIN_PASS" python3 ...   # OR inline-substitute via shell
/opt/homebrew/bin/aws lambda invoke --function-name zietra-rls-runner-55-05 --region us-east-1 \
  --payload fileb:///tmp/339_delete_pl.json --cli-binary-format raw-in-base64-out \
  /tmp/339_delete_out.json
```

**If the runner Lambda's `zietra_admin` secret is unavailable or the role lacks IAM access (per Quick 338 punted note about `zietra-aurora/admin-bypass-role-pTsZjr`):** fall back to `zietra_app` with the password from `smoke-onboarding.sh:26` AND prepend `SET app.tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404';` to the SQL — RLS itself will then enforce that the DELETE cannot touch any other tenant's rows. The DO-block assertions still run since `zietra_app` can SELECT public.tenants and run plpgsql blocks within its RLS scope.

**Step 4 — Capture AFTER counts (READ-ONLY, fresh invocation to prove the COMMIT landed and to record final state):**
  ```sql
  SELECT
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404') AS sb_items_total_after,
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404' AND id LIKE 'IMPORT-SMOKE-338-%') AS sb_residue_after,
    (SELECT COUNT(*) FROM turion.items WHERE tenant_id = '<TURION_TENANT_ID>') AS turion_items_total_after;
  ```

**Step 5 — Write PROOF.md with the structured table below.**

**Why this avoids touching turion:**
1. The DELETE WHERE clause has two filters joined by AND: `tenant_id = '45896e95-…'` AND `id LIKE 'IMPORT-SMOKE-338-%'`. Even if the LIKE matched rows in another tenant, the tenant_id filter would block them.
2. The pre-flight DO block asserts (a) exactly 6 rows in solobrands match the prefix, (b) zero matching rows exist in turion, and (c) zero matching rows exist in ANY other tenant. If any assert fails, RAISE EXCEPTION rolls the transaction back BEFORE the DELETE runs.
3. The DELETE is wrapped in BEGIN…COMMIT — partial application is impossible.
4. The post-flight DO block asserts exactly 0 residue rows remain and exactly 109 total Solo Brands items (Phase 65-01 baseline) — if either fails, ROLLBACK fires and nothing persists.

**Out of scope (do NOT do, even if tempted):**
- Do NOT touch any row in the turion tenant.
- Do NOT touch `turion.vendors`, `turion.customers`, `turion.sales_orders` — Quick 338 already purged the 4 named SMOKE-338-* rows there; the 65.2-04 SUMMARY's data-drift notes for vendors/customers/sales_orders are a separate cleanup not in scope here.
- Do NOT modify schema, RLS policies, indexes, or any DDL.
- Do NOT delete the `IMPORT-SMOKE-338-1` rows in any other tenant — none should exist (the pre-flight asserts this); if they DO exist, ABORT and surface to user.
- Do NOT modify `tenant_onboarding_profile`, `tenant_features`, or `tenants` rows.
  </action>
  <verify>
1. PROOF.md exists at the path in `files_modified`.
2. PROOF.md contains a single results table with the six numeric fields populated:
   - `BEFORE_SOLOBRANDS_ITEMS_TOTAL` (expected: 115 — 109 baseline + 6 residue; record actual)
   - `BEFORE_SOLOBRANDS_RESIDUE_MATCHES` (expected: 6)
   - `BEFORE_TURION_ITEMS_TOTAL` (expected: any positive integer — record actual as the baseline-to-preserve)
   - `BEFORE_TURION_RESIDUE_FALSE_POSITIVES` (expected: 0)
   - `ROWS_DELETED` (expected: 6 — from the DELETE…RETURNING output)
   - `AFTER_SOLOBRANDS_ITEMS_TOTAL` (expected: 109)
   - `AFTER_SOLOBRANDS_RESIDUE_MATCHES` (expected: 0)
   - `AFTER_TURION_ITEMS_TOTAL` (MUST equal `BEFORE_TURION_ITEMS_TOTAL` — byte-equal)
3. Lambda invocation output `/tmp/339_delete_out.json` shows `{"ok": true, ...}` — if `ok:false`, the transaction rolled back and no changes persist.
4. The 6 deleted row IDs are listed verbatim in PROOF.md (from the DELETE…RETURNING output) and they all start with `IMPORT-SMOKE-338-1-`.
5. PROOF.md asserts in plain English: "Turion tenant items count UNCHANGED: BEFORE=X, AFTER=X" and "Solo Brands items count restored to Phase 65-01 baseline: 109."
6. Re-run Step 4 (AFTER count query) a second time as a fresh invocation 30 seconds later — confirm Solo Brands count still 109 (catches any caching artifacts).
  </verify>
  <done>
- Exactly 6 rows deleted from `turion.items` where `tenant_id = '45896e95-4683-4894-8a4e-bcd5b76f6404'` AND `id LIKE 'IMPORT-SMOKE-338-%'`.
- Solo Brands `turion.items` count is exactly 109 (Phase 65-01 baseline).
- Turion tenant `turion.items` count is byte-equal before vs after (zero collateral).
- No other tenant's data modified.
- PROOF.md committed (via `gsd-tools commit`) with all 8 numeric proofs + the 6 deleted row IDs.
- No RAISE EXCEPTION fired (if one did, the txn rolled back — re-investigate and re-plan, do NOT bypass the guard).
  </done>
</task>

</tasks>

<verification>
End-to-end smoke after task completion:
1. `aws lambda invoke` with a SELECT-only query confirms Solo Brands `turion.items` count = 109.
2. Same query against the turion tenant_id returns the same count as the BEFORE snapshot recorded in PROOF.md.
3. `grep IMPORT-SMOKE-338` against the runner Lambda's final SELECT output returns ZERO matches across BOTH tenants.
4. PROOF.md exists in `.planning/quick/339-…/` and is committed to git.
</verification>

<success_criteria>
- Solo Brands `turion.items` count returns to exactly 109 (Phase 65-01 baseline).
- Turion tenant `turion.items` count is unchanged byte-equal — no collateral damage.
- The 6 `IMPORT-SMOKE-338-1-*` rows in solobrands are gone.
- No rows in any other tenant were touched (Turion safety guard held).
- PROOF.md committed with BEFORE/AFTER counts, the 6 deleted IDs, and explicit Turion-preservation assertion.
- Zero schema/DDL/policy changes.
</success_criteria>

<output>
After completion, create `.planning/quick/339-delete-6-import-smoke-338-1-test-residue/339-SUMMARY.md` per the standard quick-task summary template, citing PROOF.md as the proof artifact.
</output>
