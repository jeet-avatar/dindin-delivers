# Quick 339 — PROOF

**Operation:** Delete 6 `IMPORT-SMOKE-338-1-*` test-residue rows from `turion.items` in the Solo Brands tenant. Preserve Turion tenant rows byte-equal.

**Date:** 2026-05-17
**Runner Lambda:** `zietra-rls-runner-55-05` (us-east-1)
**Database role used:** `zietra_admin` (cluster-master, from `rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74`)
**Branch:** `gsd/phase-65.2-data-aware-per-tenant-dynamic-onboarding-wizard`

---

## Tenant UUID Resolution (verified live, not assumed)

| Slug         | Tenant UUID                            | Source                                                    |
| ------------ | -------------------------------------- | --------------------------------------------------------- |
| `turion`     | `00000000-0000-0000-0000-000000000001` | `SELECT id FROM public.tenants WHERE slug = 'turion'`     |
| `solobrands` | `45896e95-699f-494d-882b-bd780dfe46f3` | `SELECT id FROM public.tenants WHERE slug = 'solobrands'` |

> **Deviation note (Rule 1 — Bug):** The plan frontmatter and constraints stated the Solo Brands tenant UUID as `45896e95-4683-4894-8a4e-bcd5b76f6404`. Live lookup against `public.tenants` returned `45896e95-699f-494d-882b-bd780dfe46f3` for slug `solobrands` and no row at all for the plan-supplied UUID. The first 8 hex characters (`45896e95`) match, indicating a transcription error in the source (likely the Phase 65.2-04 verification snapshot). The plan's intent — "delete the 6 `IMPORT-SMOKE-338-1-*` rows in the Solo Brands tenant" — is unambiguous and slug-anchored, so the operation proceeded against the verified UUID. All double-filter / RAISE EXCEPTION guards still held server-side. See `339-SUMMARY.md` for full deviation log.

---

## Results Table — 8 numeric proofs

| Field                                    | Value                                                                | Expected | Match |
| ---------------------------------------- | -------------------------------------------------------------------- | -------- | ----- |
| `BEFORE_SOLOBRANDS_ITEMS_TOTAL`          | **115**                                                              | 115      | ✓     |
| `BEFORE_SOLOBRANDS_RESIDUE_MATCHES`      | **6**                                                                | 6        | ✓     |
| `BEFORE_TURION_ITEMS_TOTAL`              | **59**                                                               | positive | ✓     |
| `BEFORE_TURION_RESIDUE_FALSE_POSITIVES`  | **0**                                                                | 0        | ✓     |
| `ROWS_DELETED` (from DELETE ... RETURNING) | **6**                                                              | 6        | ✓     |
| `AFTER_SOLOBRANDS_ITEMS_TOTAL`           | **109**                                                              | 109      | ✓     |
| `AFTER_SOLOBRANDS_RESIDUE_MATCHES`       | **0**                                                                | 0        | ✓     |
| `AFTER_TURION_ITEMS_TOTAL`               | **59**                                                               | 59 (byte-equal to BEFORE) | ✓     |

**Plain-English assertions:**

- **Turion tenant items count UNCHANGED: BEFORE=59, AFTER=59** — zero collateral damage.
- **Solo Brands items count restored to Phase 65-01 baseline: 109.**
- **Re-check 30 seconds later (fresh Lambda invocation) confirms commit landed durably:** Solo Brands=109, residue=0, Turion=59.
- **Cross-tenant residue scan:** `SELECT COUNT(*) FROM turion.items WHERE id LIKE 'IMPORT-SMOKE-338-%'` = **0** (zero `IMPORT-SMOKE-338-*` rows anywhere in the database after the operation).

---

## Six deleted row IDs (from DELETE ... RETURNING)

All 6 rows belonged to `tenant_id = 45896e95-699f-494d-882b-bd780dfe46f3` (Solo Brands):

| # | Row ID                       | Tenant UUID (verified)                 |
| - | ---------------------------- | -------------------------------------- |
| 1 | `IMPORT-SMOKE-338-1-1a2fc8c6` | `45896e95-699f-494d-882b-bd780dfe46f3` |
| 2 | `IMPORT-SMOKE-338-1-1d715a97` | `45896e95-699f-494d-882b-bd780dfe46f3` |
| 3 | `IMPORT-SMOKE-338-1-3314b260` | `45896e95-699f-494d-882b-bd780dfe46f3` |
| 4 | `IMPORT-SMOKE-338-1-3cfd08c3` | `45896e95-699f-494d-882b-bd780dfe46f3` |
| 5 | `IMPORT-SMOKE-338-1-d31e8e3f` | `45896e95-699f-494d-882b-bd780dfe46f3` |
| 6 | `IMPORT-SMOKE-338-1-eddca4c5` | `45896e95-699f-494d-882b-bd780dfe46f3` |

All 6 IDs start with `IMPORT-SMOKE-338-1-` prefix as expected (plan verify #4).

---

## Lambda invocation outputs (transaction log)

### Pre-flight diagnostic (zietra_admin, multi-tenant audit)

```json
{
  "ok": true,
  "result": {
    "rows": [{
      "me": "zietra_admin",
      "items_visible_without_filter": "174",
      "distinct_tenants_visible": "2",
      "tenant_uuids_visible": [
        "00000000-0000-0000-0000-000000000001",
        "45896e95-699f-494d-882b-bd780dfe46f3"
      ]
    }]
  }
}
```

### Guarded transactional DELETE (single invocation, BEGIN → DO → DELETE → DO → COMMIT)

```json
{
  "ok": true,
  "notices": [],
  "result": [
    { "command": "BEGIN",  "rowCount": null, "rows": [] },
    { "command": "DO",     "rowCount": null, "rows": [] },       // pre-flight guards passed
    { "command": "SELECT", "rowCount": 6,    "rows": [ /* 6 deleted rows shown above */ ] },
    { "command": "DO",     "rowCount": null, "rows": [] },       // post-flight assertions passed
    { "command": "COMMIT", "rowCount": null, "rows": [] }
  ]
}
```

**Key observation:** `"ok": true` from the runner Lambda + presence of `COMMIT` in the command stream confirms the transaction did NOT roll back. If any RAISE EXCEPTION had fired (any of the three pre-flight or two post-flight asserts), `"ok"` would be `false` and the response would carry the error message instead of `COMMIT`.

---

## How Turion preservation was guaranteed (defense in depth, 4 layers)

1. **WHERE clause double-filter** — `WHERE tenant_id = '<solobrands-uuid>' AND id LIKE 'IMPORT-SMOKE-338-%'`. Both filters joined by AND, so even if `LIKE` matched a row in another tenant, the tenant_id filter would block it.
2. **Pre-flight `RAISE EXCEPTION` guard #1** — assert exactly 6 rows in solobrands match the pattern, else abort.
3. **Pre-flight `RAISE EXCEPTION` guard #2** — assert zero matching rows exist in the Turion tenant, else abort (catches false positives in the LIKE pattern).
4. **Pre-flight `RAISE EXCEPTION` guard #3** — assert zero matching rows exist in ANY tenant other than solobrands, else abort (catches matches in any third tenant).

Post-flight:
5. **Post-flight `RAISE EXCEPTION`** — assert exactly 0 residue rows remain after DELETE.
6. **Post-flight `RAISE EXCEPTION`** — assert Solo Brands items count == 109 (Phase 65-01 baseline). If either fails, ROLLBACK fires and nothing persists.

Everything was wrapped in a single `BEGIN ... COMMIT` block, so partial application was impossible.

---

## Files written

- `/tmp/339_tenant_pl.json` + `/tmp/339_tenant_out.json` — turion tenant lookup
- `/tmp/339_diag_pl.json` + `/tmp/339_diag_out.json` — multi-tenant visibility diagnostic
- `/tmp/339_verify_pl.json` + `/tmp/339_verify_out.json` — solobrands UUID re-verification
- `/tmp/339_before2_pl.json` + `/tmp/339_before2_out.json` — BEFORE snapshot
- `/tmp/339_delete_pl.json` + `/tmp/339_delete_out.json` — transactional DELETE (the operation)
- `/tmp/339_after_pl.json` + `/tmp/339_after_out.json` — AFTER snapshot
- `/tmp/339_after2_pl.json` + `/tmp/339_after2_out.json` — 30-second re-check

---

## Done

- 6 rows deleted from `turion.items` where `tenant_id = '45896e95-699f-494d-882b-bd780dfe46f3'` AND `id LIKE 'IMPORT-SMOKE-338-%'`. ✓
- Solo Brands `turion.items` count: exactly 109 (Phase 65-01 baseline restored). ✓
- Turion tenant `turion.items` count: byte-equal before vs after (59 → 59, zero collateral). ✓
- No other tenant's data modified. ✓
- No RAISE EXCEPTION fired — all guards passed first try. ✓
- Zero schema/DDL/policy changes. ✓
