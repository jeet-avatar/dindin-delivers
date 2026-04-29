---
phase: 315-fix-lead-scoring-recency-inflation-in-st
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/stats.php
autonomous: true
requirements:
  - QUICK-315-RECENCY-GATE
must_haves:
  truths:
    - "Hot leads with pageviews=0 score 0.0 across the board (no recency floor)"
    - "Hot leads with pageviews>=1 and last_seen within 7 days still receive +10 recency"
    - "Hot leads with pageviews>=1 and last_seen within 8-30 days still receive +3 recency"
    - "Existing real-engagement entries (Diego, Test 310 FP, Test 307 SG/Contact) keep their pre-fix score exactly"
    - "score_breakdown.recency == 0 for every hot_leads entry whose pageviews == 0 (was 10 in 8 of 13 entries pre-fix)"
    - "score == sum(volume + high_intent + medium_intent + time_minutes + recency + diversity - bot_penalty) == score_breakdown.total for every entry (delta=0)"
    - "Auth gate still returns 404 on missing/wrong token, 200 on correct token"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "Engagement-gated recency_bonus calculation in hot_leads scorer"
      contains: "pv > 0"
  key_links:
    - from: "stats.php hot_leads PHP scorer"
      to: "$pageviews variable from SQL aggregate"
      via: "ternary gate condition"
      pattern: "pv\\s*>\\s*0\\s*&&"
---

<objective>
Fix the recency-inflation bug in stats.php hot_leads scorer. The current `$recency_bonus` formula awards +10 to any visitor identified within 7 days, even with 0 pageviews. As a result, 8 of 13 current hot_leads score exactly 10 from the recency floor alone with zero earned engagement signal — the scorer is reporting "exists in identified_visitors recently" instead of "engaged recently".

Surgical fix: gate both ternary branches of `$recency_bonus` on `$pv > 0`. Visitors who exist in identified_visitors but never returned for a tracked pageview now contribute 0 across every breakdown component → fall out of the top-25 sort.

Purpose: hot_leads list reflects ACTUAL engagement, not "recently identified".
Output: 1-line formula change in stats.php (2 ternary conditions). Atomic single-file commit. scp deploy. Live JSON before/after diff in SUMMARY.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md
@/Users/jeet/techcloudpro/api/stats.php
</context>

<tasks>

<task type="auto">
  <name>Task 1: Gate recency_bonus on engagement (pv > 0) in stats.php hot_leads scorer + capture before/after live JSON proof</name>
  <files>/Users/jeet/techcloudpro/api/stats.php</files>
  <action>
**Goal:** Replace the unconditional `$recency` ternary in stats.php's hot_leads scoring loop with an engagement-gated version. Touch ONLY the recency line. Leave volume, high_intent, medium_intent, time_minutes, diversity, bot_penalty completely unchanged.

---

### Step 1 — Pre-fix snapshot (capture for SUMMARY before any edits)

Capture the current live hot_leads BEFORE editing. This is the "before" half of the verification diff.

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

# Full live JSON to a tmp file for diffing
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.hot_leads' > /tmp/315-hot-leads-BEFORE.json

# Compact summary table — name, pv, recency, score
cat /tmp/315-hot-leads-BEFORE.json \
    | jq -r '.[] | [.name, .pageviews, .score_breakdown.recency, .score] | @tsv'

# Count of zero-pv entries inflated by recency floor
cat /tmp/315-hot-leads-BEFORE.json \
    | jq '[.[] | select(.pageviews == 0 and .score_breakdown.recency > 0)] | length'

# Total entries
cat /tmp/315-hot-leads-BEFORE.json | jq 'length'
```

Expected pre-fix (per planning_context — verify by running):
- 13 entries total
- ~8 entries with pageviews=0 AND recency=10 → score=10
- Top score = 13 (Test 310 FP, pv=2)

Save the table output verbatim — paste into SUMMARY.

---

### Step 2 — Inspect current `$recency` line (DO NOT TRUST line numbers from 311-SUMMARY)

Find the EXACT current line in stats.php. Line numbers may have shifted since Phase 4 (Phase 5a/5b/6/7 patches all touched stats.php).

```bash
grep -n 'recency' /Users/jeet/techcloudpro/api/stats.php
grep -n '\$days !== null' /Users/jeet/techcloudpro/api/stats.php
grep -n 'days_since_seen' /Users/jeet/techcloudpro/api/stats.php
```

Locate the assignment block (currently lines ~352-353 per the captured snapshot — but RE-VERIFY via grep before editing):

```php
$recency     = ($days !== null && $days <= 7) ? 10.0
             : (($days !== null && $days <= 30) ? 3.0 : 0.0);
```

Confirm `$pv` is in scope (it is — assigned a few lines above as `$pv = (int) $r['pageviews'];`).

---

### Step 3 — Apply the fix (Edit tool — surgical, 2 conditions only)

Replace the recency assignment with the engagement-gated version. ADD `$pv > 0 &&` to BOTH ternary conditions. Nothing else changes.

**Before (verbatim, 2 lines):**
```php
            $recency     = ($days !== null && $days <= 7) ? 10.0
                         : (($days !== null && $days <= 30) ? 3.0 : 0.0);
```

**After (verbatim, 2 lines — same indentation):**
```php
            $recency     = ($pv > 0 && $days !== null && $days <= 7) ? 10.0
                         : (($pv > 0 && $days !== null && $days <= 30) ? 3.0 : 0.0);
```

Use the `Edit` tool with the exact `before`/`after` strings above (preserve leading whitespace). This is a 2-line change — no other lines touched. Do NOT modify the SQL block, the `$volume / $high_score / $med_score / $time_min / $diversity / $bot_penalty / $total` formulas, the breakdown shape, the sort, the slice, the auth gate, or any other window aggregations.

Optional but encouraged: above the changed `$recency` line, add or extend the existing comment to record the gate intent. Keep the comment to ≤2 lines so the patch stays surgical, e.g.:

```php
            // Recency bonus is engagement-gated: visitors with pv=0 (identified
            // but never returned for a tracked pageview) get 0 (was +10 — quick task 315).
```

---

### Step 4 — Local syntax check (no PHP linter on this host — use heredoc syntax check via php -l if available, else skip)

```bash
php -l /Users/jeet/techcloudpro/api/stats.php 2>&1 | head -3 || echo "php cli unavailable on local — rely on live curl as syntax oracle (305/306/311 precedent)"
```

If `php -l` reports anything other than `No syntax errors detected`, STOP and re-read the diff. Do not deploy.

---

### Step 5 — Deploy to Hostinger via scp (305-314 pattern)

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 \
    /Users/jeet/techcloudpro/api/stats.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php
```

Confirm scp prints byte count (should be slightly larger than pre-deploy due to the 2-line gate addition + optional comment).

---

### Step 6 — Post-fix live verification (capture for SUMMARY)

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

# 6a. Auth gate regression — must still return 404/404/200
curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"

# 6b. Capture post-fix hot_leads
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.hot_leads' > /tmp/315-hot-leads-AFTER.json

# 6c. Compact summary table — name, pv, recency, score
cat /tmp/315-hot-leads-AFTER.json \
    | jq -r '.[] | [.name, .pageviews, .score_breakdown.recency, .score] | @tsv'

# 6d. Zero-pv entries with recency > 0 — MUST be 0 after fix (was 8 before)
cat /tmp/315-hot-leads-AFTER.json \
    | jq '[.[] | select(.pageviews == 0 and .score_breakdown.recency > 0)] | length'

# 6e. Math integrity — for every entry: score == sum(breakdown components) == breakdown.total
cat /tmp/315-hot-leads-AFTER.json \
    | jq '[.[] | {
        email,
        score,
        breakdown_total: .score_breakdown.total,
        sum: (.score_breakdown.volume + .score_breakdown.high_intent + .score_breakdown.medium_intent + .score_breakdown.time_minutes + .score_breakdown.recency + .score_breakdown.diversity - .score_breakdown.bot_penalty),
        delta_total: ((.score - .score_breakdown.total) | fabs),
        delta_sum:   ((.score - (.score_breakdown.volume + .score_breakdown.high_intent + .score_breakdown.medium_intent + .score_breakdown.time_minutes + .score_breakdown.recency + .score_breakdown.diversity - .score_breakdown.bot_penalty)) | fabs)
      }]'

# 6f. Real-engagement entries unchanged — Diego, Test 310 FP, Test 307 entries keep their pre-fix scores
cat /tmp/315-hot-leads-AFTER.json \
    | jq '.[] | select(.email | test("diego|tcp-310-fp|tcp-307")) | {email, pageviews, recency: .score_breakdown.recency, score}'

# 6g. Side-by-side diff — counts and top scores
echo "BEFORE: $(jq 'length' /tmp/315-hot-leads-BEFORE.json) entries, top score $(jq 'map(.score) | max' /tmp/315-hot-leads-BEFORE.json)"
echo "AFTER:  $(jq 'length' /tmp/315-hot-leads-AFTER.json) entries, top score $(jq 'map(.score) | max' /tmp/315-hot-leads-AFTER.json)"
```

**Expected post-fix:**
- 6a auth gate: `404` `404` `200`
- 6c: every entry where pageviews=0 now shows recency=0 (was 10 in 8 of 13)
- 6d: must equal `0` (was 8 pre-fix)
- 6e: `delta_total` and `delta_sum` are `0` (or ≤0.01) for EVERY entry — math integrity preserved
- 6f: Diego score unchanged at 11.5 (pv=1, recency=10), Test 310 FP unchanged at 13 (pv=2, recency=10), Test 307 entries unchanged at 11.5 (pv=1, recency=10)
- 6g: top score still 13 (Test 310 FP)

If any expectation fails, STOP and investigate before declaring done.

---

### Step 7 — Atomic commit in techcloudpro repo (single file, no push per CLAUDE.md policy)

```bash
cd /Users/jeet/techcloudpro
git status --short api/stats.php
git diff api/stats.php          # confirm 2 lines changed (3 if comment added)
git add api/stats.php
git commit -m "fix(api): gate recency_bonus on pv>0 in hot_leads scorer (quick task 315)

Recency floor (+10 if last_seen within 7d, +3 if within 30d) was being
awarded to visitors with 0 pageviews — meaning anyone identified in the
last 7d showed up in hot_leads with score=10 even with zero engagement.

Both ternary branches now require \$pv > 0. Engagement-free entries fall
to score 0.0 and drop out of the top-25 sort. Real-engagement entries
(Diego, Test 310 FP, Test 307) keep their pre-fix scores unchanged.

Surgical: 2-line edit to \$recency assignment. SQL block, breakdown shape,
auth gate, sort, slice, and per-window aggregations all unchanged.

Live verification: 8 zero-pv entries (was score=10 each) now score=0;
Diego @ Mizkan unchanged at 11.5; math integrity score == breakdown.total
delta=0 for every entry.

Closes recency-inflation bug filed in 311-SUMMARY context.
"
```

**Do NOT `git push`** — per CLAUDE.md policy, push only when user asks. State commit hash in SUMMARY.

---

### Out of scope (DO NOT touch this task)

These were considered and explicitly deferred — file as Phase X follow-ups in SUMMARY, NOT implemented here:
- **Option B (recency as multiplier on engagement)** — bigger redesign of the formula
- **Option C (intent-floor for form-fill / email-click events)** — would require new events plumbing
- Tuning weights of volume / high_intent / medium_intent / time_minutes / diversity / bot_penalty
- Any change to the SQL aggregate, the LIMIT 200, the LIMIT 25 slice, the sort order, or the auth gate
- Any change to per-window `identified_visits.top_visitors` (sorted by raw pageviews per window — separate lens)

The fix is **surgical**: only the `$recency` assignment changes.
  </action>
  <verify>
1. **Pre-fix snapshot saved**: `/tmp/315-hot-leads-BEFORE.json` exists with 13 entries; ~8 have pageviews=0 and recency=10 (verify with `jq '[.[] | select(.pageviews == 0 and .score_breakdown.recency > 0)] | length'`)
2. **Edit applied**: `grep -c '\$pv > 0' /Users/jeet/techcloudpro/api/stats.php` returns ≥ 2 (one per ternary branch)
3. **No collateral damage**: `grep -c 'recency_bonus\|score_breakdown\|\$volume\|\$high_score\|\$med_score\|\$time_min\|\$diversity\|\$bot_penalty\|usort.*hot_leads\|array_slice.*hot_leads.*0.*25' /Users/jeet/techcloudpro/api/stats.php` returns the same count as pre-fix (no other lines touched). At minimum: `\$volume`, `\$high_score`, `\$med_score`, `\$time_min`, `\$diversity`, `\$bot_penalty` each still present and unchanged.
4. **Deploy succeeded**: scp prints byte count to stdout (no SSH errors)
5. **Auth gate intact**: `curl ... ?s=` returns 404, `?s=WRONG` returns 404, `?s=TcpSecureAdmin2026` returns 200
6. **Zero-pv entries no longer inflated**: `jq '[.[] | select(.pageviews == 0 and .score_breakdown.recency > 0)] | length' /tmp/315-hot-leads-AFTER.json` returns `0` (was 8 pre-fix)
7. **Math integrity preserved**: for every entry in AFTER, `delta_total` and `delta_sum` ≤ 0.01 (essentially 0)
8. **Real-engagement entries unchanged**: Diego Palmieri score still 11.5 with recency=10; Test 310 FP score still 13 with recency=10; Test 307 entries still 11.5
9. **Top score unchanged**: `jq 'map(.score) | max' /tmp/315-hot-leads-AFTER.json` returns 13 (Test 310 FP)
10. **Single atomic commit**: `git log -1 --name-only` in `/Users/jeet/techcloudpro` shows exactly 1 file (`api/stats.php`)
  </verify>
  <done>
- 2-line edit to `$recency` assignment in `/Users/jeet/techcloudpro/api/stats.php` (engagement-gated on `$pv > 0`)
- File deployed to Hostinger `147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php` via scp
- Single atomic commit in techcloudpro (not pushed)
- Live JSON before/after captured to `/tmp/315-hot-leads-BEFORE.json` and `/tmp/315-hot-leads-AFTER.json` for SUMMARY paste
- All 10 verify checks pass with verbatim output captured
- No regression in auth gate, no regression in real-engagement entry scores, no change to per-window aggregations
  </done>
</task>

</tasks>

<verification>

**Phase-level checks (executor must run all and paste verbatim output in SUMMARY):**

1. **Live before/after diff** — paste the compact tables from Step 1 (BEFORE) and Step 6c (AFTER) side by side. Show specifically: entries where pageviews=0 had recency=10 BEFORE, now have recency=0 AFTER.

2. **Zero-pv inflation eliminated**:
   ```bash
   jq '[.[] | select(.pageviews == 0 and .score_breakdown.recency > 0)] | length' /tmp/315-hot-leads-BEFORE.json   # Expected: 8
   jq '[.[] | select(.pageviews == 0 and .score_breakdown.recency > 0)] | length' /tmp/315-hot-leads-AFTER.json    # Expected: 0
   ```

3. **Real-engagement entries pass-through unchanged** — paste Diego, Test 310 FP, Test 307 SG, Test 307 Contact entries from AFTER. All four MUST have recency=10 and the SAME score they had pre-fix (Diego 11.5, Test 310 FP 13, Test 307 SG 11.5, Test 307 Contact 11.5).

4. **Math integrity** — for every AFTER entry, `score == score_breakdown.total == sum(volume + high_intent + medium_intent + time_minutes + recency + diversity - bot_penalty)` with delta ≤ 0.01.

5. **Auth gate regression check** — 404 / 404 / 200 verbatim.

6. **Per-window aggregations regression check** — paste `.windows | to_entries | map({window: .key, fields: (.value | keys)})` to confirm the 9-key shape from 311-SUMMARY V6 is byte-identical (no collateral damage from this fix to per-window blocks).

</verification>

<success_criteria>

The fix is complete when ALL of the following are demonstrably true with verbatim live evidence:

- [ ] `stats.php` `$recency` assignment now requires `$pv > 0` on both ternary branches
- [ ] No other line in stats.php was modified (single semantic change, possibly + 1 comment line)
- [ ] Hostinger deployment succeeded (scp byte count printed)
- [ ] Live JSON post-fix shows 0 entries with `pageviews=0 AND recency > 0` (was 8 pre-fix)
- [ ] Live JSON post-fix shows Diego @ Mizkan score=11.5 (unchanged), Test 310 FP score=13 (unchanged), Test 307 SG/Contact score=11.5 each (unchanged)
- [ ] Math integrity holds for every AFTER entry (delta ≤ 0.01)
- [ ] Auth gate returns 404 / 404 / 200 verbatim
- [ ] Per-window block keys byte-identical to pre-fix (9 keys per window, identified_visits.top_visitors[0] still has the 7 keys from 311-SUMMARY V5)
- [ ] Single atomic commit in `/Users/jeet/techcloudpro` (not pushed)
- [ ] SUMMARY paste includes the BEFORE/AFTER side-by-side table with row count drop and recency-floor zeroing

</success_criteria>

<output>
After completion, create `.planning/quick/315-fix-lead-scoring-recency-inflation-in-st/315-SUMMARY.md` containing:

- One-liner: gate recency_bonus on pageviews > 0 to eliminate engagement-free hot_leads inflation
- The 2-line PHP diff (before/after)
- Live JSON BEFORE table (~13 entries with name, pv, recency, score)
- Live JSON AFTER table (same shape — show recency=0 on zero-pv rows; show real entries unchanged)
- All 6 verification batteries from the verification section, verbatim
- Phase X follow-ups deferred:
  - Option B: recency as multiplier on engagement (deeper redesign)
  - Option C: intent-floor for form-fill / email-click events
  - Score formula tuning after 30 days of real conversion data (carry-forward from 311-SUMMARY)
- Privacy stance: ZERO new concerns — pure formula change on existing aggregation, no new data, no external calls
- Rollback playbook: `git revert <sha>` + scp the reverted file back (Tier 1 from 311-SUMMARY pattern)
- Commit hash for techcloudpro
- Self-Check checklist (all items checked)
</output>
