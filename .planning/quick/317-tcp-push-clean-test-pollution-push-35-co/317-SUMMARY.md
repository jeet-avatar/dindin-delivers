---
phase: 317-tcp-push-clean-test-pollution-push-35-co
plan: 01
subsystem: tcp-identity-stack
tags: [tcp, php, hostinger, identity, lead-scoring, hot-leads, test-pollution, schema-migration, push, security, anti-hallucination]
dependency-graph:
  requires:
    - "311-SUMMARY (TCP Phase 4 — original hot_leads scorer + identified_visitors row population)"
    - "314-SUMMARY (skip-list regex source of truth — `_visitor.php:188-190`)"
    - "315-SUMMARY (recency-gating fix — preserved post-317; hot_leads score=0 for 0-pv rows)"
    - "316-SUMMARY (centralized _secrets.php on Hostinger — push pre-condition)"
  provides:
    - "github.com/jeet-avatar/techcloudpro origin/main with 35 prior commits live"
    - "identified_visitors.is_test TINYINT(1) NOT NULL DEFAULT 0 + idx_is_test BTREE"
    - "14 synthetic test rows flagged (REVERSIBLE — flag, never delete)"
    - "stats.php hot_leads + top_visitors + distinct_identified_people SQL filtered on iv.is_test = 0"
    - "_visitor.php tcp_upsert_identified_visitor() auto-flags synthetic emails on INSERT (DRY with skip-list regex)"
    - "tcp-analytics/_secrets.php deployed (Rule 3 fix — closes 316 dual-deploy gap)"
  affects:
    - "github.com/jeet-avatar/techcloudpro origin/main (35 prior commits + 2 new local commits pending push)"
    - "/Users/jeet/techcloudpro/api/stats.php (+13/-1 — 3 SQL filter additions + 4 doc comments)"
    - "/Users/jeet/techcloudpro/api/_visitor.php (+17/-4 — auto-flag detection + 8th INSERT placeholder)"
    - "(server-only) Hostinger /api/stats.php + /api/_visitor.php + /tcp-analytics/stats.php (single scp batch)"
    - "(server-only) Hostinger /tcp-analytics/_secrets.php (NEW — Rule 3 fix)"
    - "(server-side) MySQL u350621741_visitors.identified_visitors schema + 14 rows updated"
tech-stack:
  added: []
  patterns:
    - "Schema migration via probe-then-decide (DESCRIBE → conditional ALTER → SHOW INDEX)"
    - "Reversible cleanup via boolean flag — never DELETE; ID list captured pre-UPDATE for rollback"
    - "Dry-run BEFORE write — count + sample + counter-sample inspected against gates ζ/η before UPDATE"
    - "DRY regex — single source of truth across tcp_notify_new_lead skip-list + tcp_upsert_identified_visitor auto-flag"
    - "Auto-flag on INSERT only — UPDATE path preserves manual reclassification"
    - "Atomic per-file commits in techcloudpro (NO `git add -A`) — clean revert per layer"
    - "Push-then-verify pattern — git push origin main + post-push `git log origin/main..HEAD | wc -l == 0` proof"
    - "Probe pattern: scp probe → curl → save verbatim → DELETE → curl 404 verify (305/307/310/312/314/316 precedent)"
    - "Real-deliverable test inboxes (jeetnair.in+q317-real-...@gmail.com) instead of fabricated domains (MEMORY rule)"
key-files:
  created:
    - "/Users/jeet/doordash-p2p/.planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-SUMMARY.md (this file)"
    - "(server-only) /home/u350621741/.../tcp-analytics/_secrets.php (Rule 3 fix — copy of api/_secrets.php)"
  modified:
    - "/Users/jeet/techcloudpro/api/stats.php (+13/-1 — 3 SQL filter additions + 4 doc-comments)"
    - "/Users/jeet/techcloudpro/api/_visitor.php (+17/-4 — is_test_flag detection + 8-placeholder INSERT)"
    - "(server-side schema) MySQL identified_visitors ALTER ADD COLUMN is_test + INDEX idx_is_test"
    - "(server-side data) MySQL identified_visitors UPDATE 14 rows SET is_test = 1"
decisions:
  - "PUSH-WITH-DEFERRED-ROTATION: User authorized push of 35 techcloudpro commits despite secrets in old commits (TCP_BM_SHARED_SECRET in 63a9680, DB password Thirumala977! back to b817407). Repo is private. Phase X #1+#2 elevated to MANDATORY post-push."
  - "KEITH_VERDICT = REAL: keithav@osw.io @ ONSITE Woodwork (real corporate domain), real-name-shaped, real corporate IP 135.125.173.82, source_form=email-click (legitimate Phase 2b path from BM campaign click). Zero synthetic patterns match. 0 page_views just means he didn't browse after the click — does not flip verdict to TEST. Keith stays unflagged."
  - "FLAG-NOT-DELETE: 14 synthetic rows flagged via is_test=1, never DELETEd. Reversibility SQL preserved verbatim: UPDATE identified_visitors SET is_test = 0 WHERE id IN (1,2,3,4,5,6,8,9,11,12,14,15,16,17). Tier 1 rollback is one statement."
  - "DRY skip-list — single regex source-of-truth across tcp_notify_new_lead (skip notification on synthetic) and tcp_upsert_identified_visitor (auto-flag on INSERT). Identical 3 patterns: @(example|test|localhost).(com|org|test) regex + ^tcp-3[0-9]{2}- prefix + +test substring."
  - "UPDATE path preservation — ON DUPLICATE KEY UPDATE in tcp_upsert_identified_visitor intentionally OMITS is_test column. This means future re-submits of an already-flagged email do NOT flip is_test back to 1 (preserves manual reclassification). Cross-device canonical UPDATE branch (line 110-124) also untouched."
  - "Diego Palmieri auto-included in flag set — per STATE.md user clarification 'Diego Palmieri @ Mizkan was a synthetic E2E test, not a real prospect'. Captured via `LOWER(name) = 'diego palmieri'` clause."
  - "pageviews_with_visitor_id NOT filtered — counts cookie cardinality, not named prospect activity. Documented inline."
  - "fingerprint_only_identified NOT filtered — WHERE iv.email IS NULL excludes is_test=1 rows by definition (synthetic rows always have an email). Adding filter would be a no-op. Documented inline."
  - "Rule 3 deviation: tcp-analytics/stats.php returned HTTP 500 after first deploy because the new (post-316) version uses `require_once __DIR__ . '/_secrets.php'` but tcp-analytics/ directory had no _secrets.php (quick-316 left it as Phase X #6 follow-up). Auto-fixed by `cp /api/_secrets.php /tcp-analytics/_secrets.php` — existing tcp-analytics/.htaccess FilesMatch already denies all .php except admin/collect/trap/stats, so _secrets.php returns 403. This effectively closes 316 Phase X #6."
metrics:
  duration: "~8 minutes (PLAN_START 2026-04-29T08:56:26Z → PLAN_END 2026-04-29T09:05:00Z)"
  completed: "2026-04-29T09:05:00Z"
  tasks: 3
  files: 5  # 2 modified PHP + 1 new server _secrets.php + 1 schema ALTER + 1 dollor.ai SUMMARY
---

# Quick Task 317: TCP Push 35 Commits + Clean Test Pollution Summary

## One-liner

Pushed 35 techcloudpro commits to private origin/main (Phases 1-7 identity stack + secrets refactor — IRREVERSIBLE; secret-rotation Phase X elevated to MANDATORY), then audited Keith Vanwey row (verdict REAL — `keithav@osw.io` @ ONSITE Woodwork via legitimate email-click path), added `is_test` schema column with idx_is_test BTREE, dry-run-then-flagged 14 of 15 synthetic test rows (REVERSIBLE — flag never delete), filtered `iv.is_test = 0` into 3 stats.php SQL blocks (hot_leads + top_visitors + distinct_identified_people), wired DRY auto-flag detection into `tcp_upsert_identified_visitor()` so future synthetic POSTs auto-flag on INSERT — 9 verification batteries (A-I) all PASS verbatim. Auto-fixed Rule 3 blocker mid-execution: tcp-analytics/stats.php returned 500 after deploy (no `_secrets.php` in tcp-analytics/ directory — quick-316 Phase X #6 was the latent bug); copied `_secrets.php` from api/ to tcp-analytics/, .htaccess FilesMatch already denies it (403). Hot leads dropped from 13 polluted entries to 1 real prospect (Keith) + 1 new real-deliverable verify entry. All 4 stop-and-ask gates (ε/ζ/η/θ) honored — none triggered.

## What was built

| Layer | What | Where |
|-------|------|-------|
| **Push** | 35 commits (b817407..ccc835f) → github.com/jeet-avatar/techcloudpro origin/main | private repo |
| **Audit** | Keith Vanwey classified REAL — `keithav@osw.io` real corporate domain (ONSITE Woodwork) | Phase 2 probe |
| **Schema** | `identified_visitors.is_test TINYINT(1) NOT NULL DEFAULT 0` + `idx_is_test` BTREE index | MySQL ALTER |
| **Cleanup** | 14/15 synthetic rows flagged is_test=1 (REVERSIBLE — never deleted) | MySQL UPDATE |
| **stats.php filter 1** | hot_leads SQL: `WHERE iv.is_test = 0` between LEFT JOIN and GROUP BY | api/stats.php:347 |
| **stats.php filter 2** | top_visitors per-window SQL: `AND iv.is_test = 0` added to existing WHERE | api/stats.php:242 |
| **stats.php filter 3** | distinct_identified_people SQL: same filter for consistency | api/stats.php:229 |
| **stats.php no-op 1** | pageviews_with_visitor_id intentionally NOT filtered (cookie cardinality) | doc-comment 215-217 |
| **stats.php no-op 2** | fingerprint_only_identified intentionally NOT filtered (email IS NULL excludes synthetic) | doc-comment 256-258 |
| **_visitor.php auto-flag** | INSERT path adds is_test column + DRY regex detection (3 patterns) | api/_visitor.php:135-148 |
| **_visitor.php preservation** | ON DUPLICATE KEY UPDATE does NOT touch is_test (manual reclassification survives) | api/_visitor.php:151-152 |
| **Rule 3 fix** | tcp-analytics/_secrets.php deployed (closes quick-316 Phase X #6) | server-only cp |
| **Dual-deploy** | stats.php scp'd to BOTH `/api/stats.php` AND `/tcp-analytics/stats.php` (sha256 match) | scp batch |

## KEITH_VERDICT verbatim

**KEITH_VERDICT: REAL** — Keith Vanwey @ ONSITE Woodwork is a legitimate prospect. Justification:

| Signal | Observed Value | Real or Test? |
|--------|----------------|---------------|
| Email domain | `osw.io` (ONSITE Woodwork — real corporate domain) | REAL |
| Email format | `keithav@osw.io` (firstinitial+lastname@corp.tld convention) | REAL |
| Name | "Keith Vanwey" (real-name-shaped, not "Test N", "Phase N", "Live Verify") | REAL |
| Company | "ONSITE Woodwork" (real-company-shaped) | REAL |
| source_form | `email-click` (legitimate Phase 2b BM-tracked email click — quick-309 wired this path) | REAL |
| first_seen_ip | `135.125.173.82` (public, not 127.x/192.168.x/10.x; not empty) | REAL |
| first_seen_at | `2026-04-29 00:30:47` (after quick-309 wiring → could be a real organic BM campaign click) | AMBIGUOUS but plausible |
| page_views | 0 | AMBIGUOUS — common for one-time email clicks that don't browse further |

Probe verbatim (see Battery B below for full output): `{"identified_visitors":[{"id":7,"visitor_id":"60a81223185c1e25b6ed540a7cea0622","email":"keithav@osw.io","name":"Keith Vanwey","company":"ONSITE Woodwork","source_form":"email-click","first_seen_at":"2026-04-29 00:30:47","last_seen_at":"2026-04-29 00:30:47","first_seen_ip":"135.125.173.82","last_notified_at":null}],"page_views":[],"pv_count":0}`

**Decision:** Keith stays UNFLAGGED. He is the only is_test=0 row in the all-time set (excluding new Battery H entry).

## Verification — verbatim live evidence (per CLAUDE.md protocol)

All curls use Safari UA (Cloudflare WAF blocks default curl per MEMORY rule). Every probe deployed → executed → output captured → DELETED + verified removed.

### Battery A — push verification

```
$ cd /Users/jeet/techcloudpro && git push origin main
To https://github.com/jeet-avatar/techcloudpro.git
   8ade7b6..ccc835f  main -> main

=== PUSH_EXIT_CODE: 0 ===

$ git log origin/main..HEAD --oneline | wc -l
0

$ git log -3 --oneline
ccc835f refactor(api): identify-from-email.php — load BM shared secret from _secrets.php
86b049e refactor(api): stats.php — load DB creds from _secrets.php
73d138b refactor(api): playground-render.php — load DB creds from _secrets.php
```

**PASS — gate ε NOT triggered.** Push exit 0. Post-push `git log origin/main..HEAD | wc -l == 0` confirms all 35 commits live on origin. Top of HEAD on remote is `ccc835f` (last refactor commit from quick-316).

⚠️ **ACKNOWLEDGED RISK (Phase X #1+#2 ELEVATED to MANDATORY):** old commit `63a9680` retains `TCP_BM_SHARED_SECRET = 32817b8c...` verbatim in its diff; commits back to `b817407` retain inline DB password `Thirumala977!` and DB user `u350621741_jeet977`. Repo is private but credentials are now in remote git history. Rotation invalidates them immediately — see Phase X #1+#2 below.

### Battery B — Keith Vanwey audit

```
$ scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-317-keith.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-keith.php

$ curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-keith.php"
{
    "identified_visitors": [
        {
            "id": 7,
            "visitor_id": "60a81223185c1e25b6ed540a7cea0622",
            "email": "keithav@osw.io",
            "name": "Keith Vanwey",
            "company": "ONSITE Woodwork",
            "source_form": "email-click",
            "first_seen_at": "2026-04-29 00:30:47",
            "last_seen_at": "2026-04-29 00:30:47",
            "first_seen_ip": "135.125.173.82",
            "last_notified_at": null
        }
    ],
    "page_views": [],
    "pv_count": 0
}

$ ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-keith.php"

$ curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/api/_probe-317-keith.php"
404
```

**PASS.** Keith row found (id=7), real-corporate-PII signature → REAL prospect. Probe deleted (404 confirmed).

### Battery C — schema migration

```
$ scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-317-schema.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-schema.php

$ curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-schema.php"
{
    "log": [
        {
            "step": "ALTER TABLE identified_visitors ADD is_test + idx_is_test",
            "result": "OK"
        }
    ],
    "columns_after": [
        ...
        {"Field": "is_test", "Type": "tinyint(1)", "Null": "NO", "Key": "MUL", "Default": "0", "Extra": ""}
    ],
    "idx_is_test": [
        {"Table": "identified_visitors", "Non_unique": 1, "Key_name": "idx_is_test",
         "Seq_in_index": 1, "Column_name": "is_test", "Collation": "A",
         "Cardinality": 1, "Sub_part": null, "Packed": null, "Null": "",
         "Index_type": "BTREE", "Comment": "", "Index_comment": "", "Ignored": "NO"}
    ]
}

$ curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/api/_probe-317-schema.php"
404
```

**PASS — gate θ NOT triggered.** ALTER returned OK. Post-state: 14th column `is_test tinyint(1) NOT NULL DEFAULT 0` present, `idx_is_test` BTREE index live. Probe deleted.

### Battery D — dry-run count + sample (gates ζ + η evaluation)

```
$ curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-dryrun.php"
{
    "total_rows": 15,
    "to_be_flagged_count": 14,
    "to_be_flagged_sample": [
        {"id": 1, "email": "tcp-307-contact-1777407698@example.com", "name": "Test 307 Contact",
         "source_form": "contact", "is_test": 0},
        {"id": 2, "email": "tcp-307-sg-1777407698@example.com", "name": "Test 307 SG",
         "source_form": "rag-study-guide", "is_test": 0},
        {"id": 3, "email": "tcp-308-emailclick-1777408798@example.com", "name": "Phase 2a Test",
         "source_form": "email-click", "is_test": 0},
        {"id": 4, "email": "phase2a-recheck-1777409124@example.com", "name": "Phase 2a Recheck",
         "source_form": "email-click", "is_test": 0},
        {"id": 5, "email": "task2-stub@example.com", "name": "Task2 Stub",
         "source_form": "email-click", "is_test": 0}
    ],
    "would_remain_unflagged_sample": [
        {"id": 7, "email": "keithav@osw.io", "name": "Keith Vanwey",
         "company": "ONSITE Woodwork", "source_form": "email-click", "is_test": 0}
    ]
}
```

**PASS — gates ζ + η NOT triggered.**
- Gate ζ: `to_be_flagged_count = 14` is in expected 8-20 range (not 0, not >25) ✓
- Gate η: 5-row sample shows ALL clearly synthetic — `tcp-307-*`, `tcp-308-*`, `phase2a-recheck`, `task2-stub` prefixes + `@example.com` domains + names like "Test 307 Contact", "Phase 2a Test", "Phase 2a Recheck", "Task2 Stub". Zero real-prospect signatures ✓
- Boundary math: `15 total - 14 flagged = 1 unflagged = Keith`. Counter-sample contains ONLY Keith Vanwey (the only real-PII row in the table) — proves regex doesn't over-match. ✓

### Battery E — UPDATE rows-affected + spot-check + reversibility ID list

```
$ curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-update.php"
{
    "pre_state": {"total": 15, "is_test_count": 0},
    "rows_affected": 14,
    "flagged_ids_for_reversibility": [
        {"id": 1, "email": "tcp-307-contact-1777407698@example.com", "name": "Test 307 Contact"},
        {"id": 2, "email": "tcp-307-sg-1777407698@example.com", "name": "Test 307 SG"},
        {"id": 3, "email": "tcp-308-emailclick-1777408798@example.com", "name": "Phase 2a Test"},
        {"id": 4, "email": "phase2a-recheck-1777409124@example.com", "name": "Phase 2a Recheck"},
        {"id": 5, "email": "task2-stub@example.com", "name": "Task2 Stub"},
        {"id": 6, "email": "diego.palmieri@mizkan.com", "name": "Diego Palmieri"},
        {"id": 8, "email": "tcp-310-fp-1777427416@example.com", "name": "Test 310 FP"},
        {"id": 9, "email": "jeetnair.in+phase8-contact-1777444010@gmail.com", "name": "Phase 8 Contact Test"},
        {"id": 11, "email": "jeetnair.in+phase8-pg-1777444062@gmail.com", "name": "Phase 8 PG Test"},
        {"id": 12, "email": "jeetnair.in+phase8-sg-1777444132@gmail.com", "name": "Phase 8 SG Test"},
        {"id": 14, "email": "jeetnair.in+phase8-regression-1777444179@gmail.com", "name": "Phase 8 Regression Test"},
        {"id": 15, "email": "verify-1777444487@example.com", "name": "Live Verify 1777444487"},
        {"id": 16, "email": "jeetnair.in+phase9-secrets-d-1777449524@gmail.com", "name": "Phase 9 Secrets D"},
        {"id": 17, "email": "jeetnair.in+verify-316-1777450071@gmail.com", "name": "Verify 316"}
    ],
    "flagged_id_csv": "1,2,3,4,5,6,8,9,11,12,14,15,16,17",
    "post_state": {"total": 15, "is_test_count": 14},
    "spot_check": {
        "flagged_5": [
            {"id": 1, "email": "tcp-307-contact-1777407698@example.com", "is_test": 1},
            {"id": 2, "email": "tcp-307-sg-1777407698@example.com", "is_test": 1},
            {"id": 3, "email": "tcp-308-emailclick-1777408798@example.com", "is_test": 1},
            {"id": 4, "email": "phase2a-recheck-1777409124@example.com", "is_test": 1},
            {"id": 5, "email": "task2-stub@example.com", "is_test": 1}
        ],
        "unflagged_first_10": [
            {"id": 7, "email": "keithav@osw.io", "is_test": 0}
        ]
    },
    "reversibility_sql": "UPDATE identified_visitors SET is_test = 0 WHERE id IN (1,2,3,4,5,6,8,9,11,12,14,15,16,17)"
}
```

**PASS.**
- `rows_affected = 14` matches dry-run count exactly (delta 0) ✓
- `pre_total = 15 == post_total = 15` (zero rows deleted — flag-not-delete preserved) ✓
- `post is_test_count = 14` (delta = 14 = rows_affected) ✓
- 14 IDs (1,2,3,4,5,6,8,9,11,12,14,15,16,17) preserved verbatim for Tier 1 rollback
- spot_check.flagged_5 all show is_test=1 ✓
- spot_check.unflagged_first_10 contains ONLY Keith Vanwey ✓ (id=7 — confirms boundary correct)

**Reversibility SQL preserved verbatim:**
```sql
UPDATE identified_visitors SET is_test = 0 WHERE id IN (1,2,3,4,5,6,8,9,11,12,14,15,16,17)
```

### Battery F — stats.php hot_leads + top_visitors filter (live curl post-deploy)

⚠️ **Battery F initial run on /tcp-analytics/stats.php returned HTTP 500** — Rule 3 blocker (see Deviations). Auto-fixed via `cp api/_secrets.php tcp-analytics/_secrets.php`, then retried successfully.

**Battery F.1 — hot_leads count + top 5:**

```
$ curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '{hot_leads_count: (.hot_leads | length), hot_leads_top_5: .hot_leads[0:5] | map({name, email, score})}'
{
  "hot_leads_count": 1,
  "hot_leads_top_5": [
    {
      "name": "Keith Vanwey",
      "email": "keithav@osw.io",
      "score": 0
    }
  ]
}
```

**PASS.** `hot_leads_count` dropped from 13 (pre-task) to **1** — Keith Vanwey only (the only is_test=0 row in identified_visitors at this moment). Score=0 is correct because Keith has 0 page_views (post-quick-315 recency-gating). Synthetic test rows GONE: no Test 310 FP, no Test 307 *, no Phase 8 *, no Diego Palmieri, no Live Verify, no Task2 Stub, no Verify 316.

**Battery F.2 — per-window top_visitors + distinct_identified_people:**

```
$ curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.windows | to_entries | map({window: .key, top_visitors_count: (.value.identified_visits.top_visitors | length), distinct_identified_people: .value.identified_visits.distinct_identified_people})'
[
  {"window": "today",    "top_visitors_count": 0, "distinct_identified_people": 0},
  {"window": "last_7d",  "top_visitors_count": 0, "distinct_identified_people": 0},
  {"window": "last_30d", "top_visitors_count": 0, "distinct_identified_people": 0},
  {"window": "all_time", "top_visitors_count": 0, "distinct_identified_people": 0}
]
```

**PASS.** All 4 windows show `top_visitors_count = 0` and `distinct_identified_people = 0` — synthetic test rows were the only ones with page_views in any window (Diego Palmieri had 1 pv, now flagged), and Keith has 0 pv so doesn't appear in `top_visitors` (which JOINs page_views). Both metrics consistently filtered.

### Battery G — auto-flag on INSERT (synthetic email)

```
$ TS=1777453402

$ curl -s -A "$UA" -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"Verify 317 Synthetic\",\"email\":\"verify-${TS}@example.com\",\"company\":\"Test\",\"message\":\"q317 auto-flag verify\"}" \
    "https://techcloudpro.com/api/contact.php"
{"success":true,"lead_saved":true,"email_sent":null,"crm_status":403}

$ curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-verify.php?e=verify-1777453402%40example.com"
{
    "row": {
        "id": 18,
        "email": "verify-1777453402@example.com",
        "name": "Verify 317 Synthetic",
        "source_form": "contact",
        "is_test": 1,
        "first_seen_at": "2026-04-29 09:03:24"
    }
}

$ curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq ".hot_leads[] | select(.email == \"verify-1777453402@example.com\")"
(empty — synthetic row NOT in hot_leads)
```

**PASS.** Synthetic POST → DB row id=18 has `is_test=1` (auto-flagged on INSERT). Same email NOT present in `hot_leads` (filter working end-to-end). Auto-flag detection triggered on `@example.com` regex (rule #1 of 3-pattern skip-list).

### Battery H — auto-flag on INSERT (real-deliverable, REGRESSION CHECK)

Per MEMORY rule, never fabricate domains — used `jeetnair.in+q317-real-${TS}@gmail.com` real-deliverable Gmail alias.

```
$ curl -s -A "$UA" -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"Verify 317 Real\",\"email\":\"jeetnair.in+q317-real-${TS}@gmail.com\",\"company\":\"Real Co\",\"message\":\"q317 real-flag verify\"}" \
    "https://techcloudpro.com/api/contact.php"
{"success":true,"lead_saved":true,"email_sent":null,"crm_status":403}

$ curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-verify.php?e=jeetnair.in%2Bq317-real-1777453402%40gmail.com"
{
    "row": {
        "id": 19,
        "email": "jeetnair.in+q317-real-1777453402@gmail.com",
        "name": "Verify 317 Real",
        "source_form": "contact",
        "is_test": 0,
        "first_seen_at": "2026-04-29 09:03:26"
    }
}
```

**PASS.** Real-deliverable POST → DB row id=19 has `is_test=0` (NOT flagged). Edge case proven: email contains `+` but NOT `+test` substring — `+q317-real-` does NOT match the `strpos($email_norm, '+test') !== false` rule. Email domain `gmail.com` does NOT match `@(example|test|localhost).(com|org|test)` regex. Email does NOT start with `tcp-3[0-9]{2}-`. All 3 rules return false → is_test=0 → row appears in hot_leads.

**Cross-check via hot_leads:**
```
$ curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.hot_leads | map({name, email, score})'
[
  {"name": "Keith Vanwey",     "email": "keithav@osw.io",                            "score": 0},
  {"name": "Verify 317 Real",  "email": "jeetnair.in+q317-real-1777453402@gmail.com", "score": 0}
]
```

Both unflagged real-deliverable entries appear (score=0 because both have 0 pv). Synthetic Verify 317 (Battery G) NOT present (correctly filtered).

### Battery I — regressions

```
$ curl -s -A "$UA" -o /dev/null -w "no_token=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
no_token=404
$ curl -s -A "$UA" -o /dev/null -w "wrong_token=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
wrong_token=404
$ curl -s -A "$UA" -o /dev/null -w "right_token=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
right_token=200

$ curl -s -A "$UA" -o /dev/null -w "api/_secrets.php=%{http_code}\n" "https://techcloudpro.com/api/_secrets.php"
api/_secrets.php=403
$ curl -s -A "$UA" -o /dev/null -w "tcp-analytics/_secrets.php=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/_secrets.php"
tcp-analytics/_secrets.php=403

$ curl -s -A "$UA" -o /dev/null -w "contact_smoke=%{http_code}\n" \
    -X POST -H 'Content-Type: application/json' -d '{}' "https://techcloudpro.com/api/contact.php"
contact_smoke=400

# I.4 — total identified_visitors row count (via dashboard hot_leads check)
$ curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '{hot_leads_count: (.hot_leads | length)}'
{"hot_leads_count": 2}
# Expected: 2 (Keith real + Verify 317 Real from Battery H — both unflagged real-deliverable rows)
```

**ALL 4 SUB-CHECKS PASS:**
- **I.1 — auth gate:** 404 / 404 / 200 (305-era timing-safe `hash_equals` intact) ✓
- **I.2 — _secrets.php Apache deny:** 403 in BOTH `/api/` AND `/tcp-analytics/` (post-316 Battery C extended to tcp-analytics) ✓
- **I.3 — contact.php parse smoke:** empty POST returns 400 (validation error, NOT 500 — proves PHP parses correctly after _visitor.php INSERT 8-placeholder change) ✓
- **I.4 — hot_leads cardinality:** 2 entries (Keith REAL existing + Verify 317 Real new from Battery H) — matches expected post-batch state. No DELETEs occurred (post_total in Battery E == pre_total). ✓

### Probe cleanup verification (final)

```
$ ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-*.php"
cleanup done

$ for p in keith schema dryrun update verify; do
    curl -s -A "$UA" -o /dev/null -w "_probe-317-${p}.php=%{http_code}\n" \
        "https://techcloudpro.com/api/_probe-317-${p}.php"
  done
_probe-317-keith.php=404
_probe-317-schema.php=404
_probe-317-dryrun.php=404
_probe-317-update.php=404
_probe-317-verify.php=404
```

**PASS.** All 5 probes deleted from server. All return 404.

### sha256 deploy verification

```
$ ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "sha256sum /home/u350621741/domains/techcloudpro.com/public_html/api/stats.php \
              /home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php \
              /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php"
a5e6bb1069df841e1dfa3432f5bb33ea362b1b6a255cc4544ab5f98623ec4b45  /home/u350621741/.../api/stats.php
a657635a697f1e25d89e237c6ba85d354b62c411e6cbd3a04edc5d001a51a8a5  /home/u350621741/.../api/_visitor.php
a5e6bb1069df841e1dfa3432f5bb33ea362b1b6a255cc4544ab5f98623ec4b45  /home/u350621741/.../tcp-analytics/stats.php

Local stats.php sha256:    a5e6bb1069df841e1dfa3432f5bb33ea362b1b6a255cc4544ab5f98623ec4b45
Local _visitor.php sha256: a657635a697f1e25d89e237c6ba85d354b62c411e6cbd3a04edc5d001a51a8a5
```

**PASS.** All 3 deployed files match local sha256.

## Privacy stance

This task is purely a **classification refinement** of existing data in `identified_visitors`. Zero new collection, zero new disclosure, zero new external API calls.

| Concern | Pre-317 | Post-317 |
|---------|---------|----------|
| What is collected | email, name, company, phone, source_form, IP, fingerprint | unchanged |
| Who sees it | admin via `/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (auth-gated) | unchanged |
| Retention | indefinite | unchanged |
| External shares | BM round-trip via `/api/email-log/:id/contact` (X-Identity-Token) | unchanged |
| Test pollution exposure | 13 synthetic rows leaked into hot_leads → admin saw fake names | 14 rows flagged is_test=1 → hidden from admin views |

The is_test flag itself is a **server-side classification field** — it's not exposed in any new endpoint, not surfaced to users, not used for any decision other than dashboard filtering. Auth gate unchanged (404 / 404 / 200).

## DB tables touched

| Table | Operation | Rows | Reversible? |
|-------|-----------|------|-------------|
| `identified_visitors` | ALTER ADD COLUMN is_test TINYINT(1) NOT NULL DEFAULT 0 | schema | ALTER TABLE DROP COLUMN is_test (Tier 3) |
| `identified_visitors` | ALTER ADD INDEX idx_is_test (is_test) | schema | ALTER TABLE DROP INDEX (Tier 3) |
| `identified_visitors` | UPDATE SET is_test = 1 WHERE ... | 14 rows | UPDATE SET is_test = 0 WHERE id IN (...) (Tier 1) |
| `identified_visitors` | INSERT (synthetic verify) | +1 (id=18, is_test=1) | DELETE WHERE id = 18 |
| `identified_visitors` | INSERT (real-deliverable verify) | +1 (id=19, is_test=0) | DELETE WHERE id = 19 |
| `page_views` | (read-only via JOINs) | 0 writes | n/a |

Net data growth: +2 rows (Battery G + H verifies). Zero rows deleted.

## Files changed

| Path | Repo / Server | Change | Commit |
|------|---------------|--------|--------|
| `/Users/jeet/techcloudpro/api/stats.php` | techcloudpro repo | +13/-1 (3 SQL filters + 4 doc-comments) | `169bb92` |
| `/Users/jeet/techcloudpro/api/_visitor.php` | techcloudpro repo | +17/-4 (auto-flag + 8th INSERT placeholder) | `16b07e5` |
| Hostinger `/api/stats.php` | server-only | scp deploy (sha256-matched) | (deploy, not commit) |
| Hostinger `/api/_visitor.php` | server-only | scp deploy (sha256-matched) | (deploy, not commit) |
| Hostinger `/tcp-analytics/stats.php` | server-only | scp deploy (sha256-matched) — dual-deploy per 316 #6 | (deploy, not commit) |
| Hostinger `/tcp-analytics/_secrets.php` | server-only | NEW — `cp` from /api/_secrets.php (Rule 3 fix) | (deploy, not commit) |
| MySQL `identified_visitors` | server-side | ALTER ADD COLUMN + INDEX + UPDATE 14 rows | (schema migration) |
| `.planning/quick/317-.../317-PLAN.md` | dollor.ai | (no executor edits — plan-checker output preserved) | included in dollor.ai commit |
| `.planning/quick/317-.../317-SUMMARY.md` | dollor.ai | NEW (this file) | included in dollor.ai commit |
| `.planning/STATE.md` | dollor.ai | append entry | included in dollor.ai commit |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tcp-analytics/stats.php returned HTTP 500 after first deploy**

- **Found during:** Battery F (initial run) — `curl https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` returned `http_code=500 size=0`
- **Issue:** Quick-316 refactored stats.php to use `require_once __DIR__ . '/_secrets.php'` and dual-deployed it to BOTH `/api/stats.php` AND `/tcp-analytics/stats.php` for Battery H. But quick-316 only created `_secrets.php` in `/api/`, NOT in `/tcp-analytics/`. Quick-316 Phase X #6 was filed about this (`tcp-analytics/* files still inline-secret`) — but since the post-316 deploy DID overwrite tcp-analytics/stats.php with the require_once-using version, the dual-deploy was actually broken at 316 commit time. Quick-317 simply revealed the latent bug. The /api/stats.php endpoint worked (200) because it has /api/_secrets.php. The /tcp-analytics/stats.php endpoint failed (500) because /tcp-analytics/_secrets.php didn't exist.
- **Fix:** `ssh -p 65002 cp /home/u350621741/.../api/_secrets.php /home/u350621741/.../tcp-analytics/_secrets.php`. Existing `tcp-analytics/.htaccess` `<FilesMatch "^(?!admin|collect|trap|stats).*\.php$"> Require all denied </FilesMatch>` already denies any non-admin/collect/trap/stats `.php` access — so `_secrets.php` returns 403. Verified: `curl https://techcloudpro.com/tcp-analytics/_secrets.php → 403`. After fix, retry of `tcp-analytics/stats.php?s=TcpSecureAdmin2026 → 200`.
- **Files modified:** `(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/_secrets.php` (NEW — copy of /api/_secrets.php)
- **Commit:** N/A (server-only file, not in techcloudpro repo)
- **Side effect:** This effectively closes quick-316 Phase X #6 follow-up.

### Architectural changes (Rule 4)

None. No structural changes proposed or made.

### Out-of-scope items deferred

- BrandMonkz secret rotation (Phase X #1 below)
- TCP DB password rotation (Phase X #2 below)
- Force-push history rewrite to scrub old commits (deferred indefinitely — chose rotation over rewrite per quick-316 decision)
- Hard-DELETE of is_test=1 rows (Phase X #4 — wait 30 days for false-positive observation window)
- Dashboard client-side toggle for is_test=1 (Phase X #5)

### Stop-and-ask gates

| Gate | Check | Result |
|------|-------|--------|
| ε | Push fails → STOP | NOT TRIGGERED — push exit 0 |
| ζ | Dry-run count == 0 OR > 25 → STOP | NOT TRIGGERED — count = 14 (in 8-20 range) |
| η | Dry-run sample shows real-looking rows → STOP | NOT TRIGGERED — all 5 sample rows clearly synthetic, counter-sample is only Keith |
| θ | Schema ALTER fails → STOP | NOT TRIGGERED — ALTER returned OK; column + index live |

All 4 gates honored. None triggered. Execution flowed straight through.

## ⚠️ Phase X follow-ups (MANDATORY post-push)

**#1 — ROTATE TCP_BM_SHARED_SECRET (MANDATORY — elevated post-push)**

Old commit `63a9680` (pushed in this task) retains `TCP_BM_SHARED_SECRET = 32817b8c...` verbatim in its diff. Repo is private, but credentials are now in the immutable git history on GitHub. Rotation invalidates them immediately.

Steps:
1. Generate new 64-hex secret: `openssl rand -hex 32`
2. Update AWS Secrets Manager: `brandmonkz/production/tcp-identity-shared-secret` (BM side)
3. Update Hostinger `/api/_secrets.php` (TCP side) — rotate `TCP_BM_SHARED_SECRET` constant value
4. Bounce BM EC2 to pick up new env var: `pm2 restart all` (or equivalent)
5. Verify round-trip: `curl https://api.brandmonkz.com/api/email-log/<emailLogId>/contact -H "X-Identity-Token: <NEW-SECRET>"` returns 200 with new key, 401 with old key
6. Note: TCP-only-scope honored in 317 — this rotation is OUT OF SCOPE for 317 itself (touches BM AWS) and must be done in a follow-up task that explicitly authorizes BM/AWS access.

**#2 — ROTATE TCP DB password Thirumala977! (MANDATORY — elevated post-push)**

Old commits back to `b817407` (pushed in this task) retain inline DB password `Thirumala977!` and DB user `u350621741_jeet977` verbatim. Repo is private, but credentials are now in the immutable git history on GitHub. Rotation invalidates them immediately.

Steps:
1. Log into Hostinger control panel → Databases → MySQL Databases
2. Edit user `u350621741_jeet977` → set new password
3. Update Hostinger `/api/_secrets.php` and `/tcp-analytics/_secrets.php` (after Rule 3 fix in this task) — rotate `TCP_DB_PASS` constant value
4. Smoke test: `curl https://techcloudpro.com/api/contact.php -X POST ... → expect 200 with lead_saved:true`
5. Smoke test: `curl https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026 → expect 200 with full JSON`

**#3 — Audit page_views for orphan rows (LOW priority)**

After 14 identified_visitors flagged is_test=1, their page_views (if any) remain. Diego Palmieri (id=6) had 1 pv → that page_view row is now orphaned-by-classification. Decide whether to:
- Add `page_views.is_test` column auto-derived from JOIN (more bookkeeping)
- Leave as-is (current state — pv counts in by_page/by_country/etc include synthetic test traffic)
- DELETE orphan page_views rows (irreversible — not recommended)

Current behavior is acceptable since `pageviews_with_visitor_id` is intentionally not filtered (cookie cardinality metric).

**#4 — Optional hard-DELETE is_test=1 rows after 30-day observation window**

After 30 days of is_test=1 flagging in production with zero false-positive reports, optionally hard-DELETE the flagged rows + their page_views. Provides regulatory-clean rollback (zero trace of synthetic data). Wait until 2026-05-29.

**#5 — Dashboard client-side toggle for is_test=1**

`/tcp-analytics/dashboard.html` (from quick-313) currently consumes filtered stats.php JSON — admin can't see is_test=1 rows ad-hoc. Add a "Show test rows" checkbox that triggers a separate fetch with `?include_test=1` (would require a 2nd stats.php parameter and 6 SQL blocks updated). Useful during regression testing of new tasks. Low priority.

**#6 — `tcp-analytics/*` files still inline-secret (CARRYOVER from 316 #3 — partially closed)**

This task closed the `_secrets.php`-not-found gap by copying the file. But `tcp-analytics/admin.php` and `tcp-analytics/trap.php` still have inline DB credentials per quick-316. Refactor them to require_once `_secrets.php` (now available in tcp-analytics/) in a future task.

**#7 — Pre-commit hook for techcloudpro (CARRYOVER from 316 #6)**

Add a `.git/hooks/pre-commit` that grep'd for hex secrets, password literals, and known DB strings. Would have caught the original 63a9680 / b817407 commits before they made it to history. Pattern: `grep -E "Thirumala977|32817b8c|sk-ant-api03|u350621741_jeet977"` → reject commit if hits.

## Rollback playbook (3 tiers)

### Tier 1 — Instant flag revert (REVERSIBLE)

```sql
UPDATE identified_visitors SET is_test = 0 WHERE id IN (1,2,3,4,5,6,8,9,11,12,14,15,16,17);
```

After this single statement: all 14 previously-flagged synthetic rows reappear in hot_leads + top_visitors + distinct_identified_people. stats.php SQL filter still active (looks for is_test=0) but matches all rows again. Behavior identical to pre-task. Reversibility cost: 1 SQL statement.

### Tier 2 — Code revert (PRESERVES schema + data)

```bash
cd /Users/jeet/techcloudpro
git revert 16b07e5 169bb92  # creates 2 new revert commits
git push origin main
# Then re-deploy reverted files:
scp -P 65002 -i ~/.ssh/id_ed25519 api/stats.php u350621741@147.93.101.51:.../api/stats.php
scp -P 65002 -i ~/.ssh/id_ed25519 api/stats.php u350621741@147.93.101.51:.../tcp-analytics/stats.php
scp -P 65002 -i ~/.ssh/id_ed25519 api/_visitor.php u350621741@147.93.101.51:.../api/_visitor.php
```

After this: stats.php and _visitor.php behavior pre-317 (no is_test filter, no auto-flag). Schema column survives but is unused. is_test=1 data survives but is invisible (no SQL queries it). Reversibility cost: 2 git revert commits + 3 scp deploys.

### Tier 3 — Schema rollback (CLEAN ROOM — only if regulatory requirement)

```sql
-- Only if Tier 1 + Tier 2 are insufficient and you need zero trace of is_test:
ALTER TABLE identified_visitors DROP INDEX idx_is_test;
ALTER TABLE identified_visitors DROP COLUMN is_test;
```

Plus Tier 2 code revert. After this: zero structural change visible in DB. Reversibility cost: 2 ALTER statements + Tier 2 cost. **DO NOT use this tier unless legally required** — it loses all classification work and would need to be redone if used.

## CR ticket

Skipped — TCP infrastructure precedent (305-316 quick-tasks all skipped CR per `.agents/skills/ticketed-task/SKILL.md` audit-trail-only requirement; this is consistent with prior pattern).

## Authentication gates

None. Hostinger SSH key (`~/.ssh/id_ed25519`) already installed; GitHub HTTPS auth via gh-cli already configured; no manual auth needed during execution.

## Commit hashes

| Repo | Commit | Description | Pushed? |
|------|--------|-------------|---------|
| techcloudpro | (35 prior commits up to `ccc835f`) | Phases 1-7 identity stack + secrets refactor (push payload of this task) | YES — origin/main |
| techcloudpro | `169bb92` | fix(api): filter is_test=1 rows out of stats.php hot_leads + top_visitors (quick task 317) | NO (local) |
| techcloudpro | `16b07e5` | feat(api): tcp_upsert_identified_visitor auto-flags synthetic emails (quick task 317) | NO (local) |
| dollor.ai | (this task) | docs(quick-317): TCP push 35 commits + clean test pollution from identified_visitors | NO (local — per CLAUDE.md) |

Note: per CLAUDE.md push policy, the 2 new techcloudpro commits (`169bb92` + `16b07e5`) are LOCAL ONLY by default. User can authorize pushing them in a follow-up command. Plan accepted both states (`success_criteria` documents either way).

## Live URL

`https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required for Cloudflare WAF — use Safari UA via curl)

Alternative endpoint also live (returns same JSON): `https://techcloudpro.com/api/stats.php?s=TcpSecureAdmin2026`

## Self-Check

- [x] **A1.** 35 commits pushed → `git log origin/main..HEAD | wc -l == 0` post-push (Battery A)
- [x] **A2.** Push exit code 0 captured verbatim in Battery A
- [x] **A3.** Phase X #1 + #2 marked MANDATORY (secrets in old commits now on origin)
- [x] **B1.** Keith Vanwey row found via probe (id=7, keithav@osw.io, ONSITE Woodwork)
- [x] **B2.** KEITH_VERDICT explicitly recorded: REAL with 8-signal justification
- [x] **B3.** Keith probe deleted (404 verified)
- [x] **C1.** Schema migration probe ran ALTER successfully — `is_test tinyint(1) NOT NULL DEFAULT 0` + `idx_is_test BTREE`
- [x] **C2.** Schema probe deleted (404 verified)
- [x] **D1.** Dry-run count = 14 (in expected 8-20 range — gate ζ NOT triggered)
- [x] **D2.** Dry-run 5-sample all clearly synthetic (gate η NOT triggered)
- [x] **D3.** Counter-sample = only Keith Vanwey (boundary correct)
- [x] **D4.** Dry-run probe deleted (404 verified)
- [x] **E1.** UPDATE rows_affected = 14 (matches dry-run exactly)
- [x] **E2.** post_total == pre_total = 15 (zero rows deleted — flag-not-delete preserved)
- [x] **E3.** Reversibility ID CSV preserved verbatim: `1,2,3,4,5,6,8,9,11,12,14,15,16,17`
- [x] **E4.** UPDATE probe deleted (404 verified)
- [x] **F1.** stats.php hot_leads_count dropped from 13 (pre-task) to 1 (Keith only) → 2 (after Battery H added id=19)
- [x] **F2.** All 4 windows show top_visitors_count=0 + distinct_identified_people=0 (synthetic rows filtered)
- [x] **G1.** Synthetic POST → DB row id=18 with is_test=1 (auto-flag working)
- [x] **G2.** Synthetic email NOT in hot_leads (filter + auto-flag end-to-end working)
- [x] **H1.** Real-deliverable POST → DB row id=19 with is_test=0 (regression preserved)
- [x] **H2.** Edge case verified: `+q317-real-` does NOT trigger `+test` rule (strpos correct)
- [x] **I1.** Auth gate intact: 404/404/200
- [x] **I2.** _secrets.php denied at Apache layer in BOTH /api/ AND /tcp-analytics/: 403/403
- [x] **I3.** contact.php parses correctly (empty POST → 400, not 500 — proves _visitor.php INSERT change didn't break PHP)
- [x] **I4.** No probes left on server (all 5 _probe-317-*.php return 404)
- [x] **DEPLOY.** sha256 of stats.php matches BOTH /api/ AND /tcp-analytics/; sha256 of _visitor.php matches /api/
- [x] **CODE.** stats.php has 3 active is_test=0 filters + 1 doc-comment reference
- [x] **CODE.** _visitor.php has 2 is_test_flag references + 8-placeholder INSERT
- [x] **COMMITS.** 2 atomic commits in techcloudpro: `169bb92` (stats.php only) + `16b07e5` (_visitor.php only) — NO `git add -A`
- [x] **GATES.** All 4 stop-and-ask gates (ε/ζ/η/θ) honored — none triggered
- [x] **SCOPE.** TCP-only scope: zero touches to BrandMonkz, AWS Secrets Manager, dollor.ai backend, Zietra, ArthaBuild, VishMed, MixMind, or any other repo
- [x] **DOCS.** 17 sections of SUMMARY (frontmatter, one-liner, what was built, KEITH_VERDICT, batteries A-I + sha256 + cleanup, privacy, DB tables, files, deviations, Phase X, rollback, CR, auth, commits, live URL, self-check)
- [x] **REVERSIBILITY.** Tier 1 SQL preserved verbatim; flag-not-delete strictly enforced; UPDATE path of tcp_upsert intentionally does not touch is_test

## Self-Check: PASSED
