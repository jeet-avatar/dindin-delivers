# Next Session Prompt

> Run `/gsd:resume-work` to restore context, then work through items below.

---

## Session Summary (Mar 6, 2026)

### Completed This Session
| Task | What | Commit |
|------|------|--------|
| Quick-105 | Fix 5 UI audit bugs (BUG-01 through BUG-05) — function shadow, phone dialer, instructions no-op, pull-to-refresh, chat button | `6bbccc44`, `5d93272b` |
| Quick-106 | Jira-style project tracking in admin panel — backend API + React UI + seeder | `2527f68d`, `bdeb2556` |
| Build | All 6 apps built and distributed | TestFlight + Firebase |
| Play Store | Customer app submitted to Google Play Store production (internal → production) | vC=37 (1.0.36) |

### App Store / Play Store Status
- **iOS Customer**: `WAITING_FOR_REVIEW` (App Store) — build 1113 on TestFlight
- **Android Customer**: `IN_REVIEW` (Google Play Store) — vC=37 (1.0.36)
- **iOS Driver**: `PREPARE_FOR_SUBMISSION` — build 215 on TestFlight
- **iOS Restaurant**: `PREPARE_FOR_SUBMISSION` — build 185 on TestFlight

---

## PRIORITY 1: Fix Project Tracker Seeder (5 min)

The seeder script at `scripts/seed_project_cases.py` runs but seeds 0 cases because `pytest --collect-only -q --no-header` outputs verbose format (`<Dir>`, `<Function>`) instead of bare nodeids.

**Fix:** Change line 130 in `project_tracker.py`:
```python
# FROM:
["python", "-m", "pytest", test_dir, "--collect-only", "-q", "--no-header"],
# TO:
["python", "-m", "pytest", test_dir, "--collect-only", "-qq"],
```

Then re-run:
```bash
cd apps/web/p2p-platform/backend
source venv/bin/activate
DATABASE_URL=postgresql://jeet@localhost:5432/dollor_dev JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test python scripts/seed_project_cases.py
```

Should seed ~1495 cases.

---

## PRIORITY 2: Deploy Backend with Project Tracker

After seeder works:
1. Run tests: `JWT_SECRET_KEY=test ADMIN_SECRET_KEY=test pytest tests/ -v`
2. Push: `git push origin main`
3. Deploy staging: `gh workflow run deploy-staging.yml --ref main`
4. Smoke test staging: verify `/api/admin/project-cases/stats` returns data
5. Deploy production: `gh workflow run deploy-dollar-ai.yml`

---

## PRIORITY 3: Check App Store Reviews

- Check iOS Customer review status via ASC API
- Check Android Customer review status in Play Console
- If approved: submit iOS Driver + Restaurant for review
- If rejected: read notes, fix, rebuild

---

## PRIORITY 4: Wave 4 Low-Priority Bug Fixes (Optional, 85 min)

From Quick-104 ISSUE_TRACKER.md:
| ID | Issue | Effort |
|----|-------|--------|
| BUG-06 | Driver old ChatView uses Firebase, not REST | 20 min |
| BUG-08 | `onCategoryClick` empty lambda (Android Customer) | 10 min |
| BUG-09 | `onFoodItemClick` empty lambda (Android Customer) | 10 min |
| BUG-10 | `onEditPromotion` empty lambda (Android Partner) | 45 min |

---

## Current Build Versions

| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1113 | TestFlight Mar 6 |
| iOS | Driver | 215 | TestFlight Mar 6 |
| iOS | Restaurant | 185 | TestFlight Mar 6 |
| Android | Customer | vC=37 (1.0.36) | Firebase + Play Store Mar 6 |
| Android | Driver | vC=33 (1.0.32) | Firebase Mar 6 |
| Android | Partner | vC=29 (1.0.28) | Firebase Mar 6 |

## Test Health
- **1484 backend tests** passing (Quick-105 verified)
- **1495 total test cases** collected (pending seeder fix for project tracker)

---

## Remaining v1.5 Phases

| Phase | Status |
|-------|--------|
| 06 SSL Pinning | Done |
| 07 Play Store | Customer submitted, Driver/Partner pending |
| 08 DB Rotation | Not started |
| 09 Rideshare E2E | Not started |
| 10 Support System | Complete |

---

## Suggested Session Flow

```
/gsd:resume-work
→ Fix seeder (-qq flag), seed 1495 cases
→ Run tests, push, deploy staging+production
→ Check App Store / Play Store review status
→ If approved, submit Driver + Restaurant apps
→ Optional: Wave 4 bug fixes
→ /gsd:pause-work
```
