# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Drivers keep 100% of delivery fees and tips
**Current focus:** v1.5 Production Readiness -- Phase 12 complete, post-launch tasks in progress

## Current Position

Phase: 21 (MixMind Native Pioneer USB Export) -- IN PROGRESS
Plan: 5 of 6 complete in current phase
Status: Plan 21-06 complete: CDJ-3000 artwork pipeline — artwork_extractor (MP3/AIFF/FLAC/MP4/WAV via mutagen + Pillow quality=85 re-encoder to 80×80 + 240×240 JPEG pairs); artwork_writer (deterministic bucket/slot with 20 slots/bucket + global slot numbering per reference USB enumeration; plan's 38-per-bucket-reset was a Rule 1 bug); reference USB oracle (77 parametrized tests, MAE<10, size within 2×); wired into usb_exporter._extract_and_write_artwork() + pdb_writer.write_pdb(artwork_assignments=...). Artwork PDB table stays empty per reference observation. 116 Phase 21-06 tests pass.
Last activity: 2026-04-29 - Completed quick task 310 (`--full` Verified 5/5): TCP identity-stack Phase 3 — first-party browser fingerprinting LIVE on techcloudpro.com. New `fingerprint.js` (128 lines) async-loaded by tracker.js computes SHA-256 over 9 stable device-level signals (canvas, audio, WebGL, screen, fonts, timezone, hardware concurrency, touch, UA) — 4 privacy gates execute BEFORE any signal collection (DNT, GPC, localStorage `tcp_no_fp`, SubtleCrypto availability). Server-side defense-in-depth in collect.php: re-checks `HTTP_DNT` / `HTTP_SEC_GPC` / format regex BEFORE persisting. Schema migration via one-shot probe (mirror 305/307/308): `identified_visitors.device_fingerprint` + `page_views.device_fingerprint` (VARCHAR(64) NULL + idx_device_fingerprint BTREE). Two new helpers in _visitor.php: `tcp_lookup_by_fingerprint()` (canonical visitor_id by fp) + `tcp_backfill_fingerprint()` (idempotent fp seeding onto identified_visitors — Rule 1 bug-fix vs plan, without it lookup-by-fp would never match). collect.php wires both: backfill on every pageview where fp + valid cookie present, canonical lookup when fp + no cookie present (cookie-clear case). stats.php adds `fingerprint_only_identified` count per window. `?_tcp_no_fp=1` URL param → localStorage persistent opt-out (extended Phase 2a inline hook on index.html + tools/ai-playground.html). PrivacyPolicy.tsx Section 5 "Browser Fingerprinting" disclosure live (verbatim legal paragraph, all 3 required phrases curl-confirmed). 5 verbatim verification batteries all PASS: A schema (both ALTER OK + DESCRIBE shows new columns), B1/B2/B3 server gates (DNT→null, GPC→null, normal→stored verbatim), C cookie-clear E2E 5/5 (form-submit V1 → pageview backfills fp → cleared cookies + same fp → canonical V1 restored, identified_visitors_count=1 NOT 2, step-3 pageview attributed to V1), D stats field present in all 4 windows, E privacy policy live. 9 atomic commits in techcloudpro (2 baselines `d0d5631`+`afd6d69` + 7 patches `754e01e`/`6a51152`/`0ea07e8`/`6b6e31c`/`f219d1a`/`1f7ef7c`/`48a146e`). 3 Phase X follow-ups filed (13-month retention cron, CF cache purge, bot-fingerprint pollution mitigation). 4-tier rollback playbook documented. 3 deviations auto-fixed: Rule 1 missing fp backfill (added helper + wired), Rule 1 privacy policy section renumber 6→7/7→8, Rule 3 curl -L for trailing-slash 301 redirect. Previous activity: 2026-04-28 - Completed quick task 309 (`--full` Verified 8/8): TCP identity-stack Phase 2b — BrandMonkz sender side + TCP stub flip. End-to-end email-click identity chain LIVE with real prospect data (Diego Palmieri @ Mizkan America Inc resolved through full BM→TCP path). New BM endpoint `GET /api/email-log/:id/contact` (X-Identity-Token + timingSafeEqual + Prisma EmailLog→Contact join + null-safe 404 + no-PII logging), BM `emailTracking.ts` click handler injects `?_tcp_uid` only on apex/subdomain `techcloudpro.com` (endsWith hostname-spoof protection + safe-fail try/catch), 64-hex shared secret in AWS SM `brandmonkz/production/tcp-identity-shared-secret` plumbed via BM EC2 .env, TCP `identify-from-email.php` flipped to `TCP_IDENTITY_STUB=false` with real secret + UA fix (nginx WAF blocked default curl). 11 smoke tests + 4-step live E2E all passed. 2 deviations auto-fixed (BM .env env-var pollution from parent dir; TCP→BM cURL UA WAF block). 4 commits across 3 repos: 69641dc (BM), 63a9680 + 7158b29 (techcloudpro), fc966e24 (dollor.ai). 4 Phase X follow-ups filed. Previous activity: 2026-04-28 - Completed quick task 306: Extended TCP analytics `/tcp-analytics/stats.php` so each of the 4 time windows (today/last_7d/last_30d/all_time) returns 4 NEW aggregations alongside the existing total_pageviews/unique_sessions/by_page/by_day: by_source (referrer bucketed into 14 categories via PHP-side classify_source helper using parse_url + strpos), by_utm (top 25 (utm_source, utm_medium, utm_campaign) tuples), by_org (top 30 organizations), by_country (top 20 countries). Existing fields byte-identical (+93 insertions / 0 deletions). Live verification at https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026 (browser UA required for Cloudflare WAF) confirmed bucket sums exact across all 4 windows (125/227/1633/1633 == total_pageviews), 0 empty/null entries in by_org/by_country, all bucket names within allowed set. Real data: 1091 direct (66.8%), 440 google (27.0%), 71 other-referral, 12 bing, 10 chatgpt, 6 youtube, 2 email, 1 linkedin all-time; top org Cox Communications Inc combined 177; US 1011 / India 208 / Vietnam 66 / China 61 by country; only 4 utm tuples ever fired (chatgpt.com=5, clutch.co=4, heroagencies/agency_page=1, linkedin/netsuite-q2-2026=1) signaling a need for more campaign UTM wiring. Auto-fixed 2 blocking issues (Rule 3): no local PHP linter -> manual structural review + live curl as syntax oracle; scp `techcloudpro.com:22` timed out -> rediscovered host=`147.93.101.51` port=`65002` from prior shell history. techcloudpro commit `8ade7b6` pushed to origin/main; dollor.ai SUMMARY committed local-only per CLAUDE.md push policy. Previous activity: 2026-04-26 - Completed BrandMonkz quick tasks 301 + 302 + 303 in single session. (301) Added Follow-Ups tab to /reports page — read-only top contacts list with pagination + auto-refresh, reusing existing CampaignWizard sessionStorage handoff. Backend GET /api/follow-ups/top + frontend FollowUpsTab.tsx + ReportingPage tab switcher. 7,427 eligible contacts, top is Rajesh Manoharan @ TechCloudPro score 2170. Live at brandmonkz.com/reports. (302) Replaced LLM-from-name script generation with website-grounded research. New companyResearch.js helper with HTTP fetch + HTML→text strip + 3000-char cap + groundedness signal. Anti-hallucination prompt rules baked in. Surfaced + fixed pre-existing infra gap: ANTHROPIC_MODEL was missing from .env (default claude-3-haiku-20240307 was decommissioned). Smoke verified across 5 real companies. (303) Video wizard v2 — tightened domain candidates to kill REAL Solutions Group → real.com false-high (DEVIATION-2 closed), added Google S2 favicon API for logoUrl (Clearbit free tier dead), rewrote prompt to problem-statement framing (not sales pitch), added emailPitch field mapped to TCP catalog (AWS / NetSuite / ArthaBuild AI only). Real MP4s rendered through localhost:5002 generator for Versova + AMI Graphics. Previous activity: Completed quick task 300: Add Zocdoc free-booking widget to VishMed site. New /schedule page + ZocdocButton component wired into header, homepage hero, and contact page above the contact form. Sitemap updated. Paid /book, /telehealth, /pricing flows untouched. Two atomic commits 3367d8c + 5f7166a pushed to jeet-avatar/vishmed main. Vercel production aliased to vishmed.com — 11/11 curl checks pass (Zocdoc URL verbatim on all 3 placements with target="_blank" rel="noopener noreferrer"). Note: Vercel Git integration for standalone vishmed repo wasn't auto-triggering; executor used vercel --prod --yes fallback. Re-pointing Vercel Git integration is a separate out-of-scope item. Previous activity: Completed quick task 298: register cap + SignUp UX fix. User-reported regression ("create account is not working") traced to THREE compounding bugs: (1) cap query counted soft-deleted users, (2) orphan verifytest@techcloudpro.com consumed slot, (3) SignUp.tsx silently swallowed backend 400s. Fix: is_active+erased_at filter, hard-delete orphan, add techcloudpro.com to EXEMPT_DOMAINS, render {error} banner on SignUp. Commits 6c87e1e (backend) + 07cbcec (frontend). New bundle index-8LYSa1zx.js live. 6/6 E2E tests pass. Flagged: v4 launch readiness gap — never tested non-exempt domain near-cap.

Progress: [#################################.......] 83% (5/6 plans in phase 21)

## Completed Milestones

- **v1.0** Production Release -- shipped pre-2026-02-20
- **v1.1** Security Hardening + Stability -- shipped 2026-02-20
- **v1.2** App Store Ready -- shipped 2026-02-21
- **v1.3** Platform Hardening -- shipped 2026-02-22
- **v1.4** App Store Distribution -- shipped 2026-02-26

## Performance Metrics

**Velocity (v1.4):**
- Total phases: 5
- Total plans: 12
- Quick tasks: 67

**v1.5 Execution:**
- Total plans: 10 (across 5 phases)
- Completed: 5

**Phase 21 (MixMind Native Pioneer USB Export):**
- 21-01 Imported-Track Ingestion (completed 2026-04-18)
- 21-02 Imported-Track Analyzer (completed 2026-04-19)
- 21-03 ANLZ Writer (completed 2026-04-19) — 4 tasks, ~110 min, 5 files created, 3 modified, 31 new tests, 0 rbox imports
- 21-04 PDB Writer + USB Export Orchestrator (completed 2026-04-19) — 5 tasks, ~180 min, 16 files created, 1 modified, 81 new tests (112 Phase 21 total), 0 rbox imports, exportLibrary.db deferred (SQLCipher)
- 21-06 Artwork Pipeline (completed 2026-04-19) — 4 tasks, ~120 min, 5 files created, 5 modified, 116 tests (31 unit + 77 oracle + 8 E2E), 0 rbox imports, Pillow (HPND) added, SLOTS_PER_BUCKET corrected 38→20 (Rule 1), Artwork PDB table stays empty matching reference USB (Rule 1)


## Accumulated Context

### Roadmap Evolution

- Phase 12 added: Fix Admin Portal UI — Fix broken admin portal screens (restaurants not loading, design issues, mock dashboards), make admin portal production-ready
- Phase 8.1 inserted after Phase 8 (URGENT): Fix rideshare failure paths — no-show fee enforcement, bid race condition, payment failure recovery, no-drivers expiry flow, driver cancel handling

### Decisions

- [Phase 21]: License posture = Option C (hand-rolled ANLZ writer using construct + Deep Symmetry Kaitai spec, no rbox/GPL-3.0 dependency). PDB writer also hand-rolled. Keep existing pyrekordbox-based read path (`rekordbox.py`, `library.py`) as optional import source for users with existing Rekordbox libraries. Native export path must work end-to-end with zero Rekordbox install on the host machine.
- [Phase 21-01]: content_id prefixing scheme for imported_tracks — 'import_<sha1(abs_path)[:16]>' for folder scans, 'rbximport_<rb_content_id>' for Rekordbox-bridge. Two origins coexist without schema extension. Idempotence via UNIQUE(file_path) + INSERT OR IGNORE.
- [Phase 21-01]: WAVE_FORMAT_EXTENSIBLE detection — flag, don't drop. Warning surfaced in POST response warnings[] per-file; CDJ-3000 may refuse these but we let the user decide whether to re-encode.
- [Phase 21-01]: StateDB _DEFAULT_PATH changed to late-bound (read in __init__ at call time, not captured as function default) so tests can monkeypatch the state DB location without touching the user's real state.db. Existing tests unaffected.
- [Phase 21-03]: ANLZ writer built with construct>=2.10 (MIT) only. Zero rbox imports. `test_no_rbox_imported` regression guard installed. Plan's struct constants were verified wrong (PWAV 400 not 800, PWV3 1 byte/column not 6, PPTH len is byte count not char count) — fixed by direct inspection of `/Volumes/Untitled/PIONEER/USBANLZ/P001/00000019/ANLZ0000.DAT`.
- [Phase 21-03]: .2EX writer ships as PMAI+PPTH stub only. PWV6/PWV7/PWVC/XWVv bodies are undocumented and deferred to a later polish task within Phase 21. CDJ-3000 falls back to .EXT waveform when .2EX is minimal.
- [Phase 21-03]: Level 1 oracle is scoped to the core tags our writer emits (PPTH/PQTZ/PWAV/PCOB). PVBR (MP3 VBR index) and PWV2 (second detail waveform) are present in every reference .DAT but are documented deferred scope — their absence is NOT a Level 1 failure. Level 3 byte-equivalence is 0/20 today as expected; Phase 21 exit gate is ≥50%.
- [Phase 21-03]: Round-trip adapter (`anlz_to_writer_input`) routes duplicate PCOB tags by `cue_type` field, not positional order, so writer output is tolerant of reorderings. `_parse_anlz_tags_all` added to support duplicate-magic walking (plan originally specified only dict-valued `_parse_anlz_tags` which would silently drop one PCOB).
- [Phase 21-04]: pyrekordbox cannot parse PDB — its `db6` module reads master.db (SQLCipher), not export.pdb. Plan's tests called `Rekordbox6Database(export.pdb)` which would raise. Rule 1 bug fix: built `pdb_reader.py` as a companion parser from the same construct Structs as pdb_writer. Writer+reader form a symmetric matched set validated by round-trip through the real 1438-track reference export.
- [Phase 21-04]: exportLibrary.db is SQLCipher-encrypted (header `0d5ad2b9304f8768...`), NOT plain SQLite as the plan assumed. pyrekordbox master.db key + `pioneer`/`onelibrary`/zeros all fail with "file is not a database". Rule 4 architectural deviation: module deferred, returns `{status:"deferred"}` and writes no file. CDJ-3000X falls back to export.pdb when OneLibrary is missing; CDJ-3000 (primary Phase 21 target) ignores it entirely.
- [Phase 21-04]: exportExt.pdb written as 9 empty structural tables with strange_marker=0x03EC and page_flags=0x64 matching the reference layout. Empty rows make CDJ-3000X fall back to export.pdb for content — which is what MixMind v1 wants without dual-maintaining two data sources. Populated-row emission is a Phase 21 polish follow-up.
- [Phase 21-04]: djprofile.nxs deliberately NOT written — reference file contains the original owner's name (PII). Anonymised profile requires a product decision (default/per-user/consent flow) and is explicitly deferred.
- [Phase 21-04]: Aux file (RBFLTR/DEVSETTING/MYSETTING/MYSETTING2/DJMMYSETTING) bytes embedded as SINGLE-LINE base64 constants. A multi-line concatenated literal dropped a 0x20 space byte inside RBFLTR.DAT during dev (manifested as 231B vs expected 232B). All 5 files now SHA256-match reference.
- [Phase 21-04]: TrackRow struct size is 98 bytes (construct.sizeof()), not 92 as initially assumed. Fixed with verified-at-runtime comment; caught when row_offsets started pointing inside the previous row.
- [Phase 21-04]: test_no_rbox_imported rewritten to walk `ast.parse(source)` for `ast.Import`/`ast.ImportFrom` nodes instead of substring search — docstring prose mentioning "import rbox" as a prohibition no longer false-positives.
- [Phase 21-06]: SLOTS_PER_BUCKET = 20 with GLOBAL 1-indexed slot numbering (plan said 38 per-bucket-reset). Reference USB enumeration: bucket 00001 holds slots 1..19, 00002..00045 hold 20 each, 00046 is partial tail (900..908). Rule 1 deviation — the plan's 38 was a misreading of the handoff.
- [Phase 21-06]: artwork_id = global_slot directly (single-field Int32ul key). No bit-packing. bucket = slot // 20 + 1 is deterministic from slot alone.
- [Phase 21-06]: PDB Artwork table (page_type 9) stays empty — reference `/Volumes/Untitled/PIONEER/rekordbox/export.pdb` has `row_count(9) == 0`. CDJ firmware reconstructs JPEG path from Track row artwork_id directly. Avoids reverse-engineering a currently-undocumented row format.
- [Phase 21-06]: Pillow quality=85 + optimize=True + progressive=False — empirically within [0.5x, 2x] file-size band of Pioneer reference JPEGs, MAE < 10 on round-trip. Oracle test with 15 sampled slots passes all tolerance bars.
- [Phase 21-06]: Mutagen (GPL-2.0) already in requirements from 21-01; 21-06 only extends its usage to APIC/PICTURE/covr extraction. Commercial-distribution license audit deferred to dedicated pre-launch phase.
- [Phase 21-06]: Some reference USB artwork files have non-0xFFD8FF headers (observed bucket 00003/49-51, 00005/93 — likely Pioneer-internal obfuscation). Oracle `_is_real_jpeg()` guard filters them; our writer only emits standard JPEG SOI files.
- [Phase 08-02]: Staging and production share dolloradmin on same RDS — rotation of either secret changes password for both. Must sync other environment's secret after any rotation. Recommended future fix: separate RDS users per environment.
- [Phase 08-02]: pg8000 (pure Python) for Lambda instead of psycopg2 — no Lambda layer needed. Manual ECS force-redeploy is the proven recovery path over EventBridge auto-trigger.
- [Phase 13-03]: Prop22 reconciliation jobs as module-level functions (not nested) so they are importable for tests; CronTrigger for time-of-day precision; per-driver db.commit() isolation; rideshare takes precedence for dual-service drivers
- [Phase 13-03]: Tips excluded via existing model design: driver_payout (RideRequest) excludes tips; delivery_fee (Order) excludes tip column — no extra subtraction needed
- [Phase 13-03]: send_admin_alert() does not exist — use logger.warning() for all Prop22 escalation alerts (RESEARCH.md pitfall #6)
- [Phase 11-02]: Used custom relative time formatting instead of date-fns to keep bundle size unchanged
- [Phase 11]: Non-code changes use NON_CODE_TRANSITIONS to skip PR Created and CI Running states
- [Phase 11]: Rollback restricted to Production/Verified/Closed status CRs; creates new CR through full approval flow
- [Phase 11]: Submit endpoint auto-transitions Draft -> Submitted -> Under Review in single API call
- [Phase 12]: Kept Coupa dashboard route but removed from sidebar; dashboard rewired to /api/dashboard/stats
- [Phase quick-116]: Used Modal.confirm with inline Input for PR/CI metadata; non-code CRs skip PR/CI states
- [Phase quick-121]: Fixed 6 bugs in rideshare E2E test; production result 14/15 PASS; Rate Ride expected fail on non-completed rides
- [Phase quick-122]: 30-min null-expiry cutoff for stale rides; rideshare earnings as separate response fields for backward compat
- [Phase quick-123]: Build 1111 APPROVED (PENDING_DEVELOPER_RELEASE); 3 metadata blockers; CONDITIONAL GO for release
- [Phase quick-125]: Vendor absorbs promo discount; platform keeps flat fee. Built-in codes + DB promos
- [Phase quick-126]: 1489 tests green, promo math verified, staging deployed via CI/CD run 22888129870, CR-0002 verified
- [Phase quick-127]: Used iOS 14+ Map(coordinateRegion:annotationItems:) for device compatibility; SelfDeliveryMapPin helper struct for annotations
- [Phase quick-129]: Added secret_key auth to admin cleanup endpoints; Critical parity gap: iOS missing Promotions management screen
- [Phase quick-130]: Used status-update endpoint as delivery fallback; discovered 500 bug in delivered/complete-delivery endpoints (alias parameter mismatch + possible accounting error)
- [Phase quick-132]: Accounting block wrapped in try/except; delivery status committed BEFORE accounting to prevent 500s from blocking deliveries
- [Phase quick-133]: Delivery proof gate returns 500 when no photo uploaded - needs follow-up fix task
- [Phase quick-134]: Root cause: PostgreSQL orderstatus enum missing PENDING_DELIVERY_PROOF value; fixed by adding startup enum migration + try/except defense
- [Phase quick-135]: Used Apple Restaurant (vendor_id=40) fallback for self-delivery E2E test; Google Restaurant (134) demo-login hardcoded to vendor 40
- [Phase quick-136]: Vendor 134 credentials unavailable — used vendor 40 for both E2E delivery paths (driver pool + self-delivery)
- [Phase quick-137]: S3 delivery photo 12h cleanup via APScheduler hourly job; Partner delivery proof camera gate; 5 notification gaps identified in self-delivery flow
- [Phase quick-138]: Show arrived-at-customer button for all OUT_FOR_DELIVERY orders; backend validates self-delivery flag
- [Phase quick-142]: Self-delivery detected by driverName nil/empty; Google Maps primary nav with fallback; VendorOrder model extended for delivery metadata
- [Phase quick-143]: Docs endpoint returns 200 on staging (not production-mode) -- acceptable behavior
- [Phase quick-147]: Use .fullScreenCover for nested camera sheets to prevent SwiftUI double-dismissal
- [Phase quick-149]: Android V3Checkout promo validation is hardcoded (CRITICAL) - needs API integration
- [Phase quick-149]: iOS shared API layer has all 9 vendor promotion methods - Restaurant app only needs SwiftUI views
- [Phase quick-151]: Used HttpURLConnection PromoCodeValidator for composable-level promo API calls (no ViewModel/DI needed)
- [Phase quick-159]: Use @ViewBuilder helper for AI tab recommendation routing; default unknown types to RestaurantSettingsView
- [Phase quick-161]: Keep original fields alongside new iOS-compatible fields for backwards compatibility
- [Phase quick-79]: Android Apple Auth path mismatch is FALSE POSITIVE — Retrofit base URL resolves correctly
- [Phase quick-80]: Build 1111 is the submission build; 39/39 stress tests PASS; GO for App Store
- [Phase quick-85]: OpenAPI CI contract validator: 321 PASS, 0 FAIL, 15 EXCLUDED dead-code
- [Phase quick-89]: Stripe idempotency keys use deterministic entity IDs, not UUIDs
- [Phase quick-90]: Used typed error enums/exceptions for 409/400 handling in iOS and Android
- [Phase quick-92]: Deploy-only task -- no code changes, CI/CD only via gh workflow run
- [Phase quick-93]: require_driver auth; leave-at-door -> DELIVERED, no-leave -> DELIVERY_FAILED + refund; 5-min timer
- [Phase quick-97]: Android DeliveryAddressDict missing lat/lng was BREAKING -- fixed before Wave 2 deploy
- [Phase quick-99]: Mock stripe.Refund.create directly (not order_flow.stripe) since stripe is imported inside function body
- [Phase quick-164]: Used ComboItemInfo struct for combo references; safe decoders for backward compat
- [Phase quick-182]: Kept musai_auth.py filename to avoid breaking imports; only updated docstring
- [Phase quick-183]: Used static files in public/ instead of route handlers because output: export mode does not support route handlers
- [Phase quick-190]: SwipeToConfirmButton 80% threshold with spring snap-back; swipe IS the confirmation for Complete Ride (no secondary alert needed)
- [Phase quick-190]: TinderSwipeCard wraps entire RideRequestCard in ForEach — retain onBid tap inside card for direct access
- [Phase quick-191]: CounterOfferResponseSheet Accept+Split row restructured — SwipeToConfirmButton needs full width; Split kept as tap Button; TinderSwipeCard wraps bid cards (swipe-right=accept, swipe-left=reject)
- [Phase 08.1-01]: Non-blocking Stripe no-show block: DB commit always persists first; payment_method= resolved from saved_cards[is_default=True].id
- [Phase 08.1-02]: payment_retry_count nullable in Alembic (existing NULL rows treated as 0 via or-0 guard); MAX_RETRIES=3 hardcoded per spec; driver payout guarded with if/else on capture_failed status
- [Phase 08.1-03]: Banner placed inside ZStack with zIndex(100); viewModel.resetRide() for Try Again; 10s auto-dismiss; notification fires even when view is not visible
- [Phase 08.1-03]: Banner placed inside ZStack with zIndex(100); viewModel.resetRide() for Try Again; 10s auto-dismiss; notification fires even when view is not visible
- [Phase quick-202]: Default acceptance_rate 95.0 when driver has < 5 total rides; push warnings only when total >= 10 (avoids misleading rates for new drivers); push failure bare-except to never block cancel transaction
- [Phase quick-215]: Used _require_admin_secret() helper for reset-ride-state endpoint — consistent with all other demo endpoints
- [Phase 13]: Migration uses raw op.execute() SQL with IF NOT EXISTS for idempotency; service_type column on prop22_earning_periods for RIDESHARE vs FOOD_DELIVERY floor formula distinction
- [Phase 13-02]: RideBid has no driver GPS — used accepting_driver.current_latitude/longitude with pickup_lat fallback for prop22_acceptance_lat at matched_at
- [Phase 13-02]: get_traffic_eta_sync imported at module level in prop22_utils.py for testability; TestGetCityMinWage uses MagicMock DB (no Alembic seed in SQLite test DB)
- [Phase 13-05]: Prop22RideItem uses Decodable (not Codable) to support custom init() for dual ride_id/order_id key handling without needing encode()
- [Phase 13-05]: prop22Section() fetches Prop22 data independently via .onAppear, separate from payout history fetch
- [Phase 13-06]: Used ClipboardCheck icon (already imported from lucide-react) for Prop 22 sidebar item — no new icon libraries needed
- [Phase 09-01]: 12-step rideshare E2E test: mocked Stripe+notifications, DriverStatus.APPROVED required, tier_fee verified for ≤35 fare tier
- [Phase quick-241]: COLOR_MAP dict for Rekordbox ColorID-to-hex; genre only in AI CSV to save tokens
- [Phase quick-243]: Camelot wheel scoring + BPM % jump badges + energy arc bar chart in AI sidebar
- [Phase quick-246]: Lazy-import msgpack inside analyze_track to avoid ModuleNotFoundError before pip install
- [Phase quick-247]: Lazy msgpack import in _enrich_with_analysis; 3-point fallback in /anlz for analysis_cache
- [Phase quick-249]: 1099 dedup via Communication table template_name + year check; YTD computed on-the-fly; quarterly report to jeetnair.in@gmail.com
- [Phase 19]: Used rgba with brightness-scaled alpha for CDJ-3000 3Band waveform rendering
- [Phase 19-02]: CDJ-3000 beat grid: count bars before visibility skip for correct phrase alignment; zoomed param unused — grid identical in both views
- [Phase 19]: Borrow RB waveform_preview as fallback when MM source lacks 4-stem waveform data to prevent blank display
- [Phase 19-05]: Dual trigger approach: analysisVersion prop + custom DOM event for post-analysis re-fetch flexibility
- [Phase 20-01]: Fetch ANLZ in DJDeck separately for pad state population; deduplicate overlay by slot; map auto_cues to HotCueEntry shape
- [Phase 20-02]: Loop enforcement uses refs for RAF-tick access; useEffect bridges React state to engine refs
- [Phase 20-03]: 150ms timer threshold for CUE tap/hold discrimination; global mouse event pattern for pitch drag
- [Phase 20]: SYNC uses pitch% formula ((targetBpm/originalBpm)-1)*100; MASTER state in App.tsx for exclusivity; QUANTIZE/SLIP visual-only toggles deferred to future
- [Phase 20-05]: Offset applied inside drawBeatGrid via parameter rather than mutating beat_grid data
- [Phase quick-259]: Campaign sends use ONLY per-user verified EmailServerConfig — no env SMTP/SES fallback
- [Phase 22]: Strategy Bot Generate Video buttons navigate to /campaigns with prefill params (no new backend endpoint) — keeps existing 402/tier-gating as single source of truth
- [Phase 21-02]: POST /api/library/analyze re-uses existing AnalysisBatchRunner with source='import' — no analyzer.py changes needed; Rekordbox /api/analyze/batch path untouched.
- [Phase 21-02]: Zero new deps; allin1 deliberately NOT added per user decision (PyTorch bloat). Heuristic section_detector.py retained. If quality insufficient, follow-up phase.
- [Phase 21-02]: Integration tests marked pytest.mark.slow (~22s each); CI default filter with -m 'not slow' keeps fast suite runnable. Synthetic 10s WAV audio generated inline via numpy/soundfile, no binary fixtures committed.
- [Phase 292-quick]: Deploy Option A consent capture: committed 6 files (47d4a77) → scp backend + docker build backend + alembic upgrade head (23a_user_consents) → inode-safe dist swap + nginx restart → E2E smoke 201 + 3 rows with real IP/UA. Deviations: (a) smoke domain swap to fresh @optiona-smoke.com after hitting FREE_ACCOUNTS_PER_DOMAIN=3 cap on techcloudpro.com, (b) used python sqlite3 stdlib instead of missing sqlite3 CLI binary in container.

### Blockers

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 55 | Fix broken links in Restaurant iOS app — Help Center, Contact Support, Go to Admin Portal | 2026-03-02 | 1682b609 | [55-fix-broken-links-in-restaurant-ios-app-h](./quick/55-fix-broken-links-in-restaurant-ios-app-h/) |
| 56 | Audit and fix route collisions, duplicate routes, dead endpoint constants | 2026-03-02 | 020fcae5 | [56-audit-fix-route-collisions-duplicate-rou](./quick/56-audit-fix-route-collisions-duplicate-rou/) |
| 57 | Fix restaurant orders 404, extend history to 90 days, add earnings breakdown | 2026-03-02 | e132ec30 | [57-fix-restaurant-orders-404-extend-history](./quick/57-fix-restaurant-orders-404-extend-history/) |
| 58 | Add Phase 10 features to Android apps and build/distribute all 6 apps | 2026-03-03 | 030c8aac | [58-add-phase-10-features-to-android-apps-an](./quick/58-add-phase-10-features-to-android-apps-an/) |
| 59 | Fix 17 failing backend tests + build/distribute all 6 apps | 2026-03-03 | b536924f | [59-fix-18-failing-backend-tests-and-build-a](./quick/59-fix-18-failing-backend-tests-and-build-a/) |
| 60 | Fix delivery button error handling in iOS and Android restaurant apps | 2026-03-04 | 7786c5b7 | [60-fix-delivery-button-error-handling-in-io](./quick/60-fix-delivery-button-error-handling-in-io/) |
| 61 | Replace OpenAI chat with deterministic rule-based support agent | 2026-03-04 | 55c0d994 | [61-replace-openai-chat-with-deterministic-s](./quick/61-replace-openai-chat-with-deterministic-s/) |
| 62 | Fix vendor document upload flow E2E -- URL + camera capture | 2026-03-04 | 3a4d4992 | [62-fix-vendor-document-upload-flow-e2e-url-](./quick/62-fix-vendor-document-upload-flow-e2e-url-/) |
| 63 | Add delivery timeout safety net -- 90-min warning, 120-min auto-refund, 24h stale cleanup | 2026-03-04 | 781ab4bc | [63-add-delivery-timeout-safety-net-90min-wa](./quick/63-add-delivery-timeout-safety-net-90min-wa/) |
| 64 | Fix all 5 rideshare ride availability gaps + standardize 5s polling + build 6 apps | 2026-03-04 | 01bb0919 | [64-fix-all-5-rideshare-ride-availability-ga](./quick/64-fix-all-5-rideshare-ride-availability-ga/) |
| 65 | Deploy backend, distribute Android APKs, rebuild iOS apps to TestFlight | 2026-03-04 | 2076afff | [65-deploy-backend-distribute-android-apks-r](./quick/65-deploy-backend-distribute-android-apks-r/) |
| 66 | Rebuild all 6 apps fresh -- iOS 1107/212/182 to TestFlight, Android vC=32/29/25 to Firebase | 2026-03-04 | a6ea527c | [66-rebuild-all-6-apps-fresh-trigger-ci-secu](./quick/66-rebuild-all-6-apps-fresh-trigger-ci-secu/) |
| 67 | Rebuild all 6 apps with full CI/CD gate -- iOS 1108/213/183, Android vC=33/30/26 | 2026-03-04 | 73152d96 | [67-rebuild-all-6-apps-with-full-ci-cd-passi](./quick/67-rebuild-all-6-apps-with-full-ci-cd-passi/) |
| 69 | Pre-submission App Store rejection audit -- 42 checks, 4 blockers found | 2026-03-04 | bf106f8d | [69-pre-submission-app-store-rejection-audit](./quick/69-pre-submission-app-store-rejection-audit/) |
| 70 | Fix 4 App Store blockers -- demo 401, privacy URL, build 1108, REJECTED state | 2026-03-04 | (API-only) | [70-fix-4-app-store-blockers-for-customer-ap](./quick/70-fix-4-app-store-blockers-for-customer-ap/) |
| 71 | E2E pre-submission verification -- 30 checks, 27 PASS, 0 FAIL, 3 WARNING, GO recommendation | 2026-03-04 | 05af5b30 | [71-e2e-pre-submission-verification-for-cust](./quick/71-e2e-pre-submission-verification-for-cust/) |
| 72 | Final stress test -- 39 checks, 34 PASS, 1 FAIL (demo login 401), 4 WARNING, NO-GO | 2026-03-04 | 04c19800 | [72-final-stress-test-for-customer-app-build](./quick/72-final-stress-test-for-customer-app-build/) |
| 73 | Fix 4 non-blocking warnings -- coord validation, vendor search, demo rate limit, ASC supportUrl | 2026-03-04 | a24566f8 | [73-fix-all-4-non-blocking-warnings-from-str](./quick/73-fix-all-4-non-blocking-warnings-from-str/) |
| 75 | Deploy fare estimate fix + rebuild iOS Customer build 1109 to TestFlight | 2026-03-04 | 3530de4f | [75-deploy-fare-estimate-fix-rebuild-ios-cus](./quick/75-deploy-fare-estimate-fix-rebuild-ios-cus/) |
| 76 | Deploy auth-restored fare estimate fix, rebuild iOS Customer 1110, attach to ASC | 2026-03-04 | b13db834 | [76-deploy-auth-restored-fare-estimate-fix-r](./quick/76-deploy-auth-restored-fare-estimate-fix-r/) |
| 77 | Fix fare estimate flash/wrong price — 3 root causes, build 1111 to TestFlight + ASC | 2026-03-04 | 2bbec74d | [77-fix-fare-estimate-flash-wrong-price-3-ro](./quick/77-fix-fare-estimate-flash-wrong-price-3-ro/) |
| 78 | Reconcile pricing engines — unify order_flow.py constants, fix Android MINIMUM_FARE, deploy+distribute | 2026-03-04 | 2788fde3 | [78-reconcile-pricing-engines-fix-android-mi](./quick/78-reconcile-pricing-engines-fix-android-mi/) |
| 79 | Anti-hallucination full-stack API alignment audit — 79 endpoints, 67 PASS, 5 FAIL, 7 WARNING | 2026-03-04 | c4db7439 | [79-anti-hallucination-full-stack-api-alignm](./quick/79-anti-hallucination-full-stack-api-alignm/) |
| 80 | Stress test v2 rerun — 39/39 PASS, 0 FAIL, 0 WARNING, GO for App Store submission | 2026-03-04 | 942883e3 | [80-rerun-39-check-stress-test-against-produ](./quick/80-rerun-39-check-stress-test-against-produ/) |
| 81 | Submit iOS Customer app build 1111 to App Store review — WAITING_FOR_REVIEW | 2026-03-04 | (API-only) | [81-submit-ios-customer-app-build-1111-to-ap](./quick/81-submit-ios-customer-app-build-1111-to-ap/) |
| 82 | Fix Android Apple Auth path mismatch — FALSE POSITIVE, no changes needed | 2026-03-04 | (none) | [82-fix-android-apple-auth-path-mismatch-dol](./quick/82-fix-android-apple-auth-path-mismatch-dol/) |
| 83 | Cross-platform API sync verification — 0 real bugs, all 12 flags are false positives or cosmetic | 2026-03-04 | (none) | [83-cross-platform-api-sync-verification-rec](./quick/83-cross-platform-api-sync-verification-rec/) |
| 84 | Research API alignment guarantee strategy — OpenAPI CI validator recommended (~2-3 hrs to implement) | 2026-03-04 | (none) | [84-research-api-alignment-guarantee-strateg](./quick/84-research-api-alignment-guarantee-strateg/) |
| 85 | Implement OpenAPI CI contract validator — 321 PASS, 0 FAIL, 15 EXCLUDED, CI job added | 2026-03-04 | 57358368 | [85-implement-openapi-ci-contract-validator-](./quick/85-implement-openapi-ci-contract-validator-/) |
| 86 | Staging + production smoke test suite — 15 tests, 7 classes, shell wrapper | 2026-03-05 | d677a227 | [86-staging-production-smoke-test-suite](./quick/86-staging-production-smoke-test-suite/) |
| 87 | Food order dispute system — OrderDispute model, 4 endpoints, partial refund, 11 tests | 2026-03-05 | be84828d | [87-investigate-and-implement-wrong-food-del](./quick/87-investigate-and-implement-wrong-food-del/) |
| 88 | Gap analysis vs DoorDash/Swiggy — 74 scenarios, 43 covered, 31 gaps (8 CRITICAL) | 2026-03-05 | (research) | [88-gap-analysis-vs-doordash-swiggy-prioriti](./quick/88-gap-analysis-vs-doordash-swiggy-prioriti/) |
| 89 | Wave 1 Payment Safety — Stripe idempotency keys, refund endpoint, price change detection, vendor offline blocking | 2026-03-05 | 903a43d0 | [89-wave-1-payment-safety-stripe-idempotency](./quick/89-wave-1-payment-safety-stripe-idempotency/) |
| 90 | Wave 1 client-side handling — 409 price change, 400 vendor offline, push notifications for auto-cancel and refund | 2026-03-05 | 39758703 | [90-wave-1-client-side-handling-409-price-ch](./quick/90-wave-1-client-side-handling-409-price-ch/) |
| 91 | Build and distribute all 6 apps — iOS 1112/214/184 to TestFlight, Android vC=35/32/28 to Firebase | 2026-03-05 | b74dc56a | [91-build-and-distribute-all-6-apps-3-ios-to](./quick/91-build-and-distribute-all-6-apps-3-ios-to/) |
| 92 | Deploy Wave 1 Payment Safety backend to staging and production via CI/CD | 2026-03-05 | — | [92-deploy-wave-1-payment-safety-backend-to-](./quick/92-deploy-wave-1-payment-safety-backend-to-/) |
| 93 | Wave 2 Gap #3: Customer not at door — 5-min wait timer, leave at door, cancel with photo proof | 2026-03-05 | ec4a8607 | [93-wave-2-gap-3-customer-not-at-door-5-min-](./quick/93-wave-2-gap-3-customer-not-at-door-5-min-/) |
| 94 | Wave 2 Gap #7: Driver offline mid-delivery — stale GPS detection, auto-reassign | 2026-03-05 | 7099c15a | [94-wave-2-gap-7-driver-offline-mid-delivery](./quick/94-wave-2-gap-7-driver-offline-mid-delivery/) |
| 95 | Wave 2 Gap #15: Address validation at checkout + address-unreachable endpoint | 2026-03-05 | 56c49af5 | [95-wave-2-gap-15-address-validation-geocode](./quick/95-wave-2-gap-15-address-validation-geocode/) |
| 96 | Wave 2 Gap #17: Driver approaching notification — 500m proximity push | 2026-03-05 | 4b6396f1 | [96-wave-2-gap-17-driver-approaching-notific](./quick/96-wave-2-gap-17-driver-approaching-notific/) |
| 97 | Wave 2 pre-deploy audit — iOS OK, Android lat/lng fix, staging+prod deployed | 2026-03-05 | 9a124947 | [97-wave-2-pre-deploy-audit-check-ios-androi](./quick/97-wave-2-pre-deploy-audit-check-ios-androi/) |
| 98 | HOTFIX: Email notification loop fix — scheduler dedup, Stripe webhook idempotency | 2026-03-05 | 0ac64022 | [98-hotfix-deploy-email-notification-loop-fi](./quick/98-hotfix-deploy-email-notification-loop-fi/) |
| 99 | Wave 1+2 E2E recheck — 15 smoke + 15 lifecycle tests, all pass | 2026-03-05 | 1c247b9f | [99-recheck-wave-1-2-features-on-production-](./quick/99-recheck-wave-1-2-features-on-production-/) |
| 100 | Phase 10 Android parity -- Call Support added to Driver + Partner | 2026-03-05 | 3b2d67ba | [100-phase-10-android-parity-orderchatscreen-](./quick/100-phase-10-android-parity-orderchatscreen-/) |
| 101 | Phase 10 test coverage -- 24 new tests for chat, support, voice | 2026-03-05 | 95aa9be1 | [101-verify-phase-10-test-coverage-audit-and-](./quick/101-verify-phase-10-test-coverage-audit-and-/) |
| 102 | Full test suite verification -- 1439 passed, 0 failed, 11 skipped | 2026-03-05 | e6841e86 | [102-run-full-backend-test-suite-verify-all-t](./quick/102-run-full-backend-test-suite-verify-all-t/) |
| 103 | E2E UI audit -- 153 screens, 441 handlers, 45 E2E tests, 23 issues | 2026-03-05 | b8a63282 | [103-e2e-ui-audit-buttons-navigation-clicks-s](./quick/103-e2e-ui-audit-buttons-navigation-clicks-s/) |
| 104 | (reserved) | — | — | — |
| 105 | Fix 5 UI audit bugs (BUG-01 through BUG-05) | 2026-03-06 | 9ef5591a | [105-fix-5-ui-audit-bugs-bug-01-through-bug-0](./quick/105-fix-5-ui-audit-bugs-bug-01-through-bug-0/) |
| 106 | Jira-style project tracking in admin panel | 2026-03-06 | 809abcc6 | [106-jira-style-project-tracking-in-admin-pan](./quick/106-jira-style-project-tracking-in-admin-pan/) |
| 107 | Rebuild project tracker with rich case data | 2026-03-06 | e9203101 | [107-rebuild-project-tracker-with-rich-case-d](./quick/107-rebuild-project-tracker-with-rich-case-d/) |
| 108 | Expand project tracker seeder to collect all platforms | 2026-03-06 | 1ce6b604 | [108-expand-project-tracker-seeder-to-collect](./quick/108-expand-project-tracker-seeder-to-collect/) |
| 109 | Jira-quality project tracker -- sort, export CSV, activity log | 2026-03-06 | 56c8af61 | [109-audit-fix-project-tracker-jira-quality](./quick/109-audit-fix-project-tracker-jira-quality/) |
| 110 | Board-level project tracker verification -- 2512 cases populated | 2026-03-06 | 2feab352 | [110-board-level-project-tracker-verification](./quick/110-board-level-project-tracker-verification/) |
| 111 | Deploy project tracker to staging + production -- STATE.md bloat fix, CI/CD deploy | 2026-03-06 | 70c78845 | [111-deploy-project-tracker-staging-prod](./quick/111-deploy-project-tracker-staging-prod/) |
| 112 | Sync project tracker data to staging + production -- 2512 cases seeded + populated | 2026-03-06 | (pending) | [112-sync-project-tracker-data-staging-produc](./quick/112-sync-project-tracker-data-staging-produc/) |
| 113 | Department & team management — zero hardcoded values, DB-driven rules, full CRUD UI | 2026-03-06 | 18d08bbd | [113-dept-team-mgmt-project-tracker](./quick/113-dept-team-mgmt-project-tracker/) |
| 114 | Remove placeholder AI/voice features from iOS Customer app before App Store review | 2026-03-07 | 253f98fb | [114-remove-placeholder-ai-voice-features-fro](./quick/114-remove-placeholder-ai-voice-features-fro/) |
| 115 | Full admin portal UI audit — 26 endpoints tested, 24 PASS, 2 WARN, 0 FAIL | 2026-03-07 | e20e75ce | [115-full-admin-portal-ui-audit-verify-every-](./quick/115-full-admin-portal-ui-audit-verify-every-/) |
| 116 | Audit project tracker + change management, fix missing workflow buttons | 2026-03-07 | 0910dc55 | [116-audit-project-tracker-change-management-](./quick/116-audit-project-tracker-change-management-/) |
| 117 | Rebuild admin frontend, deploy staging + production — smoke tests green | 2026-03-07 | 892fd0e6 | [117-rebuild-admin-frontend-deploy-to-staging](./quick/117-rebuild-admin-frontend-deploy-to-staging/) |
| 118 | Enterprise approval routing — multi-step chains, delegation, SLA tracking, dept fields | 2026-03-07 | eaa11f26 | [118-enterprise-approval-routing-audit-25-cas](./quick/118-enterprise-approval-routing-audit-25-cas/) |
| 119 | Rebuild admin frontend with enterprise approval routing, deploy staging + production | 2026-03-07 | de132089 | [119-rebuild-admin-frontend-with-enterprise-a](./quick/119-rebuild-admin-frontend-with-enterprise-a/) |
| 120 | Fix change-requests 500 — missing custom_fields_json column migration, deployed | 2026-03-07 | 933252dd | [debug](./debug/resolved/change-requests-500-after-approval-routing.md) |
| 121 | Sync all 63 quick tasks into project tracker — endpoint + script + deploy staging/prod | 2026-03-07 | 2ccd124d | [120-sync-all-120-quick-tasks-into-project-tr](./quick/120-sync-all-120-quick-tasks-into-project-tr/) |
| 122 | Fix admin UI misalignment — Tailwind Preflight vs antd CSS + CSP unsafe-inline fix | 2026-03-07 | 6c32fd96 | [debug](./debug/resolved/admin-portal-ui-broken-except-cm-pt.md) |
| 123 | Rideshare E2E flow test on production + sync tasks to tracker + seed departments | 2026-03-08 | 71dee42a | [121-rideshare-e2e-flow-test-on-production-sy](./quick/121-rideshare-e2e-flow-test-on-production-sy/) |
| 124 | Fix 4 rideshare data issues — stale rides, earnings, bids filter, active count | 2026-03-08 | 433a0677 | [122-fix-4-rideshare-data-issues-stale-rides-](./quick/122-fix-4-rideshare-data-issues-stale-rides-/) |
| 125 | Enterprise App Store audit — 86 checks, 68 PASS, 3 FAIL, 10 WARNING, build 1111 APPROVED | 2026-03-09 | ed5340cd | [123-enterprise-level-apple-app-store-submiss](./quick/123-enterprise-level-apple-app-store-submiss/) |
| 126 | Wire promotion system into payment flow — promo codes, discount math, receipt/driver/vendor emails, real featured deals | 2026-03-10 | c4b60252 | [125-wire-promotion-system-into-payment-flow](./quick/125-wire-promotion-system-into-payment-flow/) |
| 127 | Test promotion system E2E and deploy to staging — 1489 tests green, CR-0002 verified | 2026-03-10 | (test+deploy) | [126-test-promotion-system-e2e-and-deploy-sta](./quick/126-test-promotion-system-e2e-and-deploy-sta/) |
| 128 | Fix 3 self-delivery gaps — leave_at_door decode, MapView + navigate, instructions callout | 2026-03-10 | 0a38c974 | [127-audit-restaurant-self-delivery-flow-maps](./quick/127-audit-restaurant-self-delivery-flow-maps/) |
| 129 | Clean up 20 stale orders, iOS Restaurant 186 to TestFlight, Android Partner vC=30, parity audit | 2026-03-10 | eccc7de3 | [129-clean-up-stale-pending-orders-build-ios-](./quick/129-clean-up-stale-pending-orders-build-ios-/) |
| 130 | E2E test 10 food orders full lifecycle on production — 10/10 delivered, 2 bugs found | 2026-03-10 | 6480d901 | [130-create-10-test-orders-e2e-lifecycle-on-p](./quick/130-create-10-test-orders-e2e-lifecycle-on-p/) |
| 132 | Fix 4 delivery flow bugs — delivered 500, photo proof, navigation, address display [CR-0006] | 2026-03-10 | 4cc8926e | [132-fix-4-delivery-flow-bugs-delivered-500-p](./quick/132-fix-4-delivery-flow-bugs-delivered-500-p/) |
| 133 | E2E delivery flow verification — 3/4 PASS, delivered-without-photo 500 found [CR-0007] | 2026-03-10 | 669202c0 | [133-e2e-delivery-flow-verification-full-life](./quick/133-e2e-delivery-flow-verification-full-life/) |
| 134 | Fix delivery proof gate 500 — missing PostgreSQL enum value + startup migration [CR-0008] | 2026-03-10 | ba34a2ca | [134-fix-delivery-proof-gate-500-when-no-phot](./quick/134-fix-delivery-proof-gate-500-when-no-phot/) |
| 135 | 2 orders E2E — self-delivery + driver delivery with photo proof, receipts sent [CR-0009] | 2026-03-10 | a7982ba6 | [135-2-orders-google-restaurant-self-delivery](./quick/135-2-orders-google-restaurant-self-delivery/) |
| 136 | E2E delivery test — driver pool + self-delivery, 610-line report, 16/16 steps PASS [CR-0010] | 2026-03-10 | 409ed671 | [136-e2e-delivery-test-google-restaurant-andr](./quick/136-e2e-delivery-test-google-restaurant-andr/) |
| 137 | S3 photo 12h retention + Android Partner delivery photo + notification audit | 2026-03-10 | 4454dd6b | [137-s3-photo-12h-retention-android-partner-d](./quick/137-s3-photo-12h-retention-android-partner-d/) |
| 138 | Fix 5 delivery notification gaps (GAP-1 through GAP-5) — backend + iOS + Android [CR-0011] | 2026-03-10 | 140f31a1 | [138-fix-5-delivery-notification-gaps-gap-1-t](./quick/138-fix-5-delivery-notification-gaps-gap-1-t/) |
| 139 | Full backend test suite — 1490 passed, 0 failed, 11 skipped, 0 regressions | 2026-03-10 | dcd9c962 | [139-run-full-backend-test-suite-fix-failures](./quick/139-run-full-backend-test-suite-fix-failures/) |
| 140 | iOS Restaurant 187 to TestFlight, Android Partner vC=31 to Firebase | 2026-03-10 | 2d20b3db | [140-build-ios-restaurant-187-to-testflight-a](./quick/140-build-ios-restaurant-187-to-testflight-a/) |
| 142 | Self-delivery navigation flow (iOS Restaurant 188 + Android Partner vC=32) | 2026-03-10 | 3ed94b04 | [142-self-delivery-navigation-flow-reusing-dr](./quick/142-self-delivery-navigation-flow-reusing-dr/) |
| 143 | Deploy backend to staging + production (Quick-138 notifications + Quick-142 vendor coords) | 2026-03-11 | e5b97b67 | [143-deploy-backend-to-staging-production-qui](./quick/143-deploy-backend-to-staging-production-qui/) |
| 144 | Create test order DOLL2026270 on production for self-delivery testing | 2026-03-11 | 50398fac | [144-create-test-order-on-production-for-self](./quick/144-create-test-order-on-production-for-self/) |
| 145 | Self-delivery ETA to customer + order timestamps on restaurant app | 2026-03-11 | e6d78252 | [145-self-delivery-eta-to-customer-order-time](./quick/145-self-delivery-eta-to-customer-order-time/) |
| 146 | Build + deploy: backend prod, iOS Restaurant 190 TestFlight, Android Partner vC=33 Firebase | 2026-03-11 | 830a02ba | [146-build-deploy-backend-to-staging-prod-ios](./quick/146-build-deploy-backend-to-staging-prod-ios/) |
| 150 | iOS Restaurant app gap closure — Promotions CRUD + 5 fixes | 2026-03-11 | 8a120f4b | [150-ios-restaurant-app-gap-closure-promotion](./quick/150-ios-restaurant-app-gap-closure-promotion/) |
| 151 | Android checkout promo code API validation (GAP 7) | 2026-03-11 | 044352e9 | [151-complete-quick-150-gap-7-replace-hardcod](./quick/151-complete-quick-150-gap-7-replace-hardcod/) |
| 152 | Fix iOS Restaurant demand forecast graph + monthly earnings display | 2026-03-12 | 81727a19 | [152-fix-ios-restaurant-demand-forecast-graph](./quick/152-fix-ios-restaurant-demand-forecast-graph/) |
| 153 | Fix earnings fallback, smart recommendations, promotions decode error | 2026-03-12 | aa22bdcd | [153-fix-earnings-fallback-smart-recommendati](./quick/153-fix-earnings-fallback-smart-recommendati/) |
| 154 | Fix promotions quick-create decode + actionable smart recommendations | 2026-03-12 | 2de6cbe7 | [154-fix-promotions-quick-create-decode-actio](./quick/154-fix-promotions-quick-create-decode-actio/) |
| 156 | Fix business hours + promotion edit + delivery photo audit — CR tickets + CI/CD | 2026-03-12 | a039a9bd | [156-fix-business-hours-promotion-edit-delive](./quick/156-fix-business-hours-promotion-edit-delive/) |
| 157 | Fix 7 iOS Restaurant bugs — promotion button, earnings, POS, legal pages | 2026-03-12 | 45fa75db | [157-fix-7-ios-restaurant-app-bugs-promotion-](./quick/157-fix-7-ios-restaurant-app-bugs-promotion-/) |
| 158 | Fix restaurant ID blank — P2P vendor ID instead of Firebase UID + sample earnings label | 2026-03-12 | f93006ad | [158-fix-restaurant-id-blank-use-p2p-vendor-i](./quick/158-fix-restaurant-id-blank-use-p2p-vendor-i/) |
| 159 | Fix AI Tab recommendation dead-ends and polish Clover POS for Apple submission | 2026-03-12 | cc578176 | [159-fix-ai-tab-recommendation-dead-ends-and-](./quick/159-fix-ai-tab-recommendation-dead-ends-and-/) |
| 160 | Populate Restaurant app with demo data for Apple review | 2026-03-12 | 9e141a51 | [160-populate-restaurant-app-with-demo-data-f](./quick/160-populate-restaurant-app-with-demo-data-f/) |
| 161 | Fix promotion suggestions JSON mismatch between backend and iOS | 2026-03-12 | 2cc46b9a | [161-fix-promotion-suggestions-json-mismatch-](./quick/161-fix-promotion-suggestions-json-mismatch-/) |
| 162 | Fix demo order seeding + AI recommendations fallback for iOS Restaurant | 2026-03-12 | be1c6620 | [162-fix-demo-order-seeding-ai-recommendation](./quick/162-fix-demo-order-seeding-ai-recommendation/) |
| 163 | Fix STATE.md bloat — deduplicate Decisions section (164K lines to ~200) | 2026-03-13 | fd0f2039 | [163-fix-state-md-bloat-deduplicate-decisions](./quick/163-fix-state-md-bloat-deduplicate-decisions/) |
| 164 | Add combo deals and bestseller features to menu system | 2026-03-13 | b00f7358 | [164-add-combo-deals-and-bestseller-features-](./quick/164-add-combo-deals-and-bestseller-features-/) |
| 165 | Deploy SSL fix + Stripe webhook secret + demo password fix to staging and production | 2026-03-13 | 4514e509 | [165-deploy-ssl-fix-stripe-webhook-secret-dem](./quick/165-deploy-ssl-fix-stripe-webhook-secret-dem/) |
| 166 | Remove bestseller from promotions and AI tab in iOS Restaurant app | 2026-03-13 | 8fc9836c | [166-remove-bestseller-from-promotions-and-ai](./quick/166-remove-bestseller-from-promotions-and-ai/) |
| 165 | Deploy SSL fix + Stripe webhook secret + demo password fix | 2026-03-13 | 94ab703d | [165-deploy-ssl-fix-stripe-webhook-secret-dem](./quick/165-deploy-ssl-fix-stripe-webhook-secret-dem/) |
| 167 | add router-level auth to all unprotected P0 endpoints | 2026-03-13 | 60b048e3 | [167-add-router-level-auth-to-all-unprotected](./quick/167-add-router-level-auth-to-all-unprotected/) |
| 167 | Add auth to unprotected P0 endpoints — rides/available + Firebase startup validation | 2026-03-13 | 60b048e3 | [167-add-router-level-auth-to-all-unprotected](./quick/167-add-router-level-auth-to-all-unprotected/) |
| 168 | Fix 3 critical DoS vulnerabilities — bounded DB queries, WS connection caps, efficient rate limiter eviction | 2026-03-13 | 67826bbb | [168-fix-3-critical-dos-vulnerabilities-cap-d](./quick/168-fix-3-critical-dos-vulnerabilities-cap-d/) |
| 169 | Fix 4 high DoS vulnerabilities — upload rate limit, IP pwd-reset limit, Redis scheduler lock, DB pool alert | 2026-03-13 | 24f022d5 | [169-fix-4-high-dos-vulnerabilities-per-user-](./quick/169-fix-4-high-dos-vulnerabilities-per-user-/) |
| 170 | Fix 4 medium DoS vulnerabilities — Stripe webhook idempotency, 10MB body limit, analytics row caps, AI function timeouts | 2026-03-13 | 255cee6a | [170-fix-medium-dos-vulnerabilities-stripe-we](./quick/170-fix-medium-dos-vulnerabilities-stripe-we/) |
| 171 | Fix earnings tab: rideshare + food combined earnings in dashboard v5, fix payout-history endpoint, iOS build 219 | 2026-03-14 | 6fb5e9d5 | [171-fix-earnings-tab-to-show-rideshare-food-](./quick/171-fix-earnings-tab-to-show-rideshare-food-/) |
| 172 | Fix driver pool notification filter (DriverStatus.ONLINE -> ACTIVE/APPROVED, is_active -> is_online); verify is_online in login + vendor is_open | 2026-03-14 | 52d8dced | [172-fix-3-online-offline-bugs-driver-notific](./quick/172-fix-3-online-offline-bugs-driver-notific/) |
| 173 | Implement bot/crawler protection: robots.txt, user-agent blocklist middleware (exempt localhost + health/robots paths), rate limit public vendor/ride endpoints, deployed to production | 2026-03-14 | be055f5c | [173-implement-bot-crawler-protection-robots-](./quick/173-implement-bot-crawler-protection-robots-/) |
| 174 | Add delivery photo proof viewer to restaurant app history tab — deliveryPhotoUrl threaded P2PVendorOrder → Order → EnhancedDashboardView 64x64 thumbnail + fullScreenCover preview | 2026-03-14 | e5b8572e | [174-add-delivery-photo-proof-viewer-to-resta](./quick/174-add-delivery-photo-proof-viewer-to-resta/) |
| 175 | Build global /handoff command + SessionStart hook — saves structured session state to ~/.claude/handoffs/, auto-injects most recent handoff (<=7 days) into new sessions | 2026-03-14 | d73670eb | [175-build-global-handoff-command-that-saves-](./quick/175-build-global-handoff-command-that-saves-/) |
| 176 | Demo payment bypass for App Store review — demo.customer@dollor.ai at vendor IDs 1/40/134 skip Stripe, auto-advance to PENDING_RESTAURANT | 2026-03-14 | e52372e8 | [176-implement-demo-payment-bypass-for-demo-o](./quick/176-implement-demo-payment-bypass-for-demo-o/) |
| 177 | Fix READY_FOR_PICKUP state machine bug (was writing PENDING_DELIVERY_DECISION), add demo delivery_decision_sent_at timer fix, add out_for_delivery "Delivering now" card to iOS restaurant app | 2026-03-15 | c7aa880d | [177-fix-order-flow-ready-for-pickup-and-deli](./quick/177-fix-order-flow-ready-for-pickup-and-deli/) |
| 182 | Take BeatMind.io fully live: Stripe live keys, Musai→BeatMind rebrand, CI/CD deploy | 2026-03-17 | 619fec86 | [182-take-beatmind-io-fully-live-switch-strip](./quick/182-take-beatmind-io-fully-live-switch-strip/) |
| 183 | Fix BeatMind professional-grade issues: favicon, OG tags, SEO, subscription fix, cleanup | 2026-03-17 | af501369 | [183-fix-beatmind-professional-grade-issues-f](./quick/183-fix-beatmind-professional-grade-issues-f/) |
| 184 | Fix OfferLetter.ai signup and forgot-password — double initCookieConsent causing duplicate banners | 2026-03-17 | 0f288f6 | [184-fix-offerletter-ai-signup-and-forgot-pas](./quick/184-fix-offerletter-ai-signup-and-forgot-pas/) |
| 185 | Fix 8 rideshare E2E bugs — auto-navigate, stale cleanup, Stripe PaymentIntent, Android re-accept, location 5s | 2026-03-17 | 11d77e50 | [185-fix-8-rideshare-e2e-bugs-auto-navigate-o](./quick/185-fix-8-rideshare-e2e-bugs-auto-navigate-o/) |
| 186 | Refactor iOS Driver App online/offline state — OnlineStatusManager singleton, AppConfig constants, eliminate split-brain bug | 2026-03-17 | fbdf26dd | [186-refactor-ios-driver-app-online-offline-s](./quick/186-refactor-ios-driver-app-online-offline-s/) |
| 187 | Fix wheelchair/accessibility ride flow — ERP alias real fields, WAV driver filter, fetchMyActiveRides, duplicate endpoint audit | 2026-03-18 | 16115a53 | [187-fix-wheelchair-accessibility-ride-flow-e](./quick/187-fix-wheelchair-accessibility-ride-flow-e/) |
| 187 | Fix wheelchair/accessibility ride flow — real fields in /api/rides/available, WAV filter for non-capable drivers, fetchMyActiveRides + /rides/driver/active endpoint | 2026-03-17 | dfec559e | [187-fix-wheelchair-accessibility-ride-flow-e](./quick/187-fix-wheelchair-accessibility-ride-flow-e/) |
| 188 | Rideshare production release: 3 E2E tests (WAV filter, Stripe rollback, driver-cancel), ride_id type verified, backend prod deploy CI/CD 23234175091, iOS Customer 1120 + Driver 226 to TestFlight | 2026-03-18 | d30e3a66 | [188-rideshare-production-release-fix-3-criti](./quick/188-rideshare-production-release-fix-3-criti/) |
| 189 | fix race condition duplicate bids in RideBid model — UniqueConstraint + SELECT FOR UPDATE + IntegrityError handler + Alembic migration, deployed to staging + production | 2026-03-18 | 3fc0a90f | [189-fix-race-condition-duplicate-bids-in-rid](./quick/189-fix-race-condition-duplicate-bids-in-rid/) |
| 189 | Fix race condition duplicate bids — UniqueConstraint(ride_request_id, driver_id) in RideBid model, SELECT FOR UPDATE duplicate check, IntegrityError HTTP 400 handler, Alembic migration, deployed to production | 2026-03-18 | ce7384dd | [189-fix-race-condition-duplicate-bids-in-rid](./quick/189-fix-race-condition-duplicate-bids-in-rid/) |
| 190 | Build SwipeToConfirmButton shared component — 2 SwiftUI views (pill + Tinder card), 8 customer + 9 driver swipe buttons, 5 iOS files | 2026-03-18 | 1421ba03 | [190-build-swipetoconfirmbutton-shared-compon](./quick/190-build-swipetoconfirmbutton-shared-compon/) |
| 191 | Android swipe-mode — TinderSwipeCard composable (driver + customer), SwipeToConfirmButton (customer), 6 driver + 10 customer swipe buttons wired, both modules BUILD SUCCESSFUL | 2026-03-18 | ea618c67 | [191-build-swipetoconfirmbutton-composable-fo](./quick/191-build-swipetoconfirmbutton-composable-fo/) |
| 192 | Fix 3 auto-payout bugs in complete_ride — NameError bid.id, idempotency guard, A4A $0.05 deduction; deployed to staging + production CI/CD run 23272879677 | 2026-03-18 | 7cd4acec | [192-automate-driver-payouts-via-stripe-conne](./quick/192-automate-driver-payouts-via-stripe-conne/) |
| 193 | Fix WAV count in quarterly compliance report — replace hardcoded 0 with live DB query (accessibility_capable OR wheelchair JSON field) | 2026-03-18 | 8e7b2100 | [193-fix-wav-count-in-quarterly-compliance-re](./quick/193-fix-wav-count-in-quarterly-compliance-re/) |
| 194 | Fix iOS silent rating and tip failure — alert on failure, submitted only on success; ratingSubmitted/tipSubmitted gated to .success branch only | 2026-03-18 | cafacbb6 | [194-fix-ios-silent-rating-and-tip-failure-sh](./quick/194-fix-ios-silent-rating-and-tip-failure-sh/) |
| 195 | Remove AlertDialog gate from Android complete-ride swipe — wire onSwipeConfirm directly to viewModel.completeRide() (matches iOS UX) | 2026-03-18 | 0839d412 | [195-android-complete-ride-dialog-gate](./quick/195-android-complete-ride-dialog-gate/) |
| 196 | Fix iOS startRide() no-show timer restart bug — capture previousTimerActive before cancel, restore flag only on API failure | 2026-03-18 | 78c8b55d | [196-ios-start-ride-timer-restart-fix](./quick/196-ios-start-ride-timer-restart-fix/) |
| 197 | Stripe pre-auth failure auto-cancels ride — CANCELLED status, pre_auth_failed, push to customer + driver, HTTP 402 | 2026-03-18 | cb567272 | [197-stripe-pre-auth-failure-auto-cancel-ride](./quick/197-stripe-pre-auth-failure-auto-cancel-ride/) |
| 198 | Account block after capture retries exhausted — has_unpaid_balance on Customer, Alembic migration, scheduler flag-set, 402 guard at ride request | 2026-03-19 | f022b8e4 | [198-account-block-after-capture-retries-exhausted](./quick/198-account-block-after-capture-retries-exhausted/) |
| 199 | Fix misleading payout push for non-onboarded drivers — "Complete your payout setup" push with earned amount instead of silence | 2026-03-19 | eea28def | [199-fix-misleading-payout-push-for-non-onboa](./quick/199-fix-misleading-payout-push-for-non-onboa/) |
| 200 | Add admin clear-unpaid-balance endpoint — GET /api/admin/customers + POST /api/admin/customers/{id}/clear-unpaid-balance, CustomersAdmin screen with Popconfirm-gated Clear Balance button | 2026-03-19 | 744cee18 | [200-add-admin-clear-unpaid-balance-endpoint](./quick/200-add-admin-clear-unpaid-balance-endpoint/) |
| 201 | Fix no-show charge failure — charge_succeeded flag, customer push + in-app notifications on both failure paths, auto-P1 SupportTicket creation in bid_routes.py | 2026-03-19 | 49369645 | [201-no-show-charge-fail-customer-notificatio](./quick/201-no-show-charge-fail-customer-notificatio/) |
| 202 | Real driver cancel rate tracking — ride_accept_count + ride_cancel_count columns, bid_routes counter increments, push warnings at 20%/30%, real acceptance_rate in earnings (default 95.0 < 5 rides) | 2026-03-19 | 6f9ba860 | [202-driver-cancel-rate-tracking](./quick/202-driver-cancel-rate-tracking/) |
| 203 | Audit + fix offerletter.ai website — remove all free wording (6 files), ## Performance Metrics

**Velocity (v1.4):**
- Total phases: 5
- Total plans: 12
- Quick tasks: 67

**v1.5 Execution:**
- Total plans: 10 (across 5 phases)
- Completed: 5
| Phase 13 P05 | 4 | 2 tasks | 1 files |
| Phase 13-prop22-driver-earnings-floor P06 | 2 | 2 tasks | 3 files |
| Phase 09 P01 | 26 | 1 tasks | 1 files |
| Phase quick-241 P01 | 37min | 2 tasks | 3 files |
| Phase quick-245 P01 | 192 | 2 tasks | 4 files |
| Phase quick-247 P01 | 2min | 2 tasks | 3 files |
| Phase Q-248 P01 | 186 | 3 tasks | 4 files |
| Phase 19 P01 | 3min | 1 tasks | 1 files |
| Phase 19 P04 | 2min | 1 tasks | 1 files |
| Phase 20 P01 | 2min | 1 tasks | 2 files |
| Phase 20 P02 | 4min | 1 tasks | 2 files |
| Phase 20 P03 | 3min | 2 tasks | 1 files |
| Phase 20 P04 | 148s | 1 tasks | 2 files |
| Phase 22 P12 | 4m | 3 tasks | 2 files |
| Phase 21 P02 | 16min | 2 tasks | 5 files |
| Phase 21 P03 | 110min | 4 tasks | 8 files |

## Accumulated Context

### Roadmap Evolution

- Phase 21 added: mixmind-native-pioneer-usb-export — Make MixMind ingest a folder of audio, analyze BPM/beatgrid/key/cues, and export a Pioneer-compatible USB (PIONEER/export.pdb + USBANLZ/*.DAT/.EXT) that plays on CDJ-3000 without Rekordbox
- Phase 12 added: Fix Admin Portal UI — Fix broken admin portal screens (restaurants not loading, design issues, mock dashboards), make admin portal production-ready
- Phase 8.1 inserted after Phase 8 (URGENT): Fix rideshare failure paths — no-show fee enforcement, bid race condition, payment failure recovery, no-drivers expiry flow, driver cancel handling

### Decisions

- [Phase 13-03]: Prop22 reconciliation jobs as module-level functions (not nested) so they are importable for tests; CronTrigger for time-of-day precision; per-driver db.commit() isolation; rideshare takes precedence for dual-service drivers
- [Phase 13-03]: Tips excluded via existing model design: driver_payout (RideRequest) excludes tips; delivery_fee (Order) excludes tip column — no extra subtraction needed
- [Phase 13-03]: send_admin_alert() does not exist — use logger.warning() for all Prop22 escalation alerts (RESEARCH.md pitfall #6)
- [Phase 11-02]: Used custom relative time formatting instead of date-fns to keep bundle size unchanged
- [Phase 11]: Non-code changes use NON_CODE_TRANSITIONS to skip PR Created and CI Running states
- [Phase 11]: Rollback restricted to Production/Verified/Closed status CRs; creates new CR through full approval flow
- [Phase 11]: Submit endpoint auto-transitions Draft -> Submitted -> Under Review in single API call
- [Phase 12]: Kept Coupa dashboard route but removed from sidebar; dashboard rewired to /api/dashboard/stats
- [Phase quick-116]: Used Modal.confirm with inline Input for PR/CI metadata; non-code CRs skip PR/CI states
- [Phase quick-121]: Fixed 6 bugs in rideshare E2E test; production result 14/15 PASS; Rate Ride expected fail on non-completed rides
- [Phase quick-122]: 30-min null-expiry cutoff for stale rides; rideshare earnings as separate response fields for backward compat
- [Phase quick-123]: Build 1111 APPROVED (PENDING_DEVELOPER_RELEASE); 3 metadata blockers; CONDITIONAL GO for release
- [Phase quick-125]: Vendor absorbs promo discount; platform keeps flat fee. Built-in codes + DB promos
- [Phase quick-126]: 1489 tests green, promo math verified, staging deployed via CI/CD run 22888129870, CR-0002 verified
- [Phase quick-127]: Used iOS 14+ Map(coordinateRegion:annotationItems:) for device compatibility; SelfDeliveryMapPin helper struct for annotations
- [Phase quick-129]: Added secret_key auth to admin cleanup endpoints; Critical parity gap: iOS missing Promotions management screen
- [Phase quick-130]: Used status-update endpoint as delivery fallback; discovered 500 bug in delivered/complete-delivery endpoints (alias parameter mismatch + possible accounting error)
- [Phase quick-132]: Accounting block wrapped in try/except; delivery status committed BEFORE accounting to prevent 500s from blocking deliveries
- [Phase quick-133]: Delivery proof gate returns 500 when no photo uploaded - needs follow-up fix task
- [Phase quick-134]: Root cause: PostgreSQL orderstatus enum missing PENDING_DELIVERY_PROOF value; fixed by adding startup enum migration + try/except defense
- [Phase quick-135]: Used Apple Restaurant (vendor_id=40) fallback for self-delivery E2E test; Google Restaurant (134) demo-login hardcoded to vendor 40
- [Phase quick-136]: Vendor 134 credentials unavailable — used vendor 40 for both E2E delivery paths (driver pool + self-delivery)
- [Phase quick-137]: S3 delivery photo 12h cleanup via APScheduler hourly job; Partner delivery proof camera gate; 5 notification gaps identified in self-delivery flow
- [Phase quick-138]: Show arrived-at-customer button for all OUT_FOR_DELIVERY orders; backend validates self-delivery flag
- [Phase quick-142]: Self-delivery detected by driverName nil/empty; Google Maps primary nav with fallback; VendorOrder model extended for delivery metadata
- [Phase quick-143]: Docs endpoint returns 200 on staging (not production-mode) -- acceptable behavior
- [Phase quick-147]: Use .fullScreenCover for nested camera sheets to prevent SwiftUI double-dismissal
- [Phase quick-149]: Android V3Checkout promo validation is hardcoded (CRITICAL) - needs API integration
- [Phase quick-149]: iOS shared API layer has all 9 vendor promotion methods - Restaurant app only needs SwiftUI views
- [Phase quick-151]: Used HttpURLConnection PromoCodeValidator for composable-level promo API calls (no ViewModel/DI needed)
- [Phase quick-159]: Use @ViewBuilder helper for AI tab recommendation routing; default unknown types to RestaurantSettingsView
- [Phase quick-161]: Keep original fields alongside new iOS-compatible fields for backwards compatibility
- [Phase quick-79]: Android Apple Auth path mismatch is FALSE POSITIVE — Retrofit base URL resolves correctly
- [Phase quick-80]: Build 1111 is the submission build; 39/39 stress tests PASS; GO for App Store
- [Phase quick-85]: OpenAPI CI contract validator: 321 PASS, 0 FAIL, 15 EXCLUDED dead-code
- [Phase quick-89]: Stripe idempotency keys use deterministic entity IDs, not UUIDs
- [Phase quick-90]: Used typed error enums/exceptions for 409/400 handling in iOS and Android
- [Phase quick-92]: Deploy-only task -- no code changes, CI/CD only via gh workflow run
- [Phase quick-93]: require_driver auth; leave-at-door -> DELIVERED, no-leave -> DELIVERY_FAILED + refund; 5-min timer
- [Phase quick-97]: Android DeliveryAddressDict missing lat/lng was BREAKING -- fixed before Wave 2 deploy
- [Phase quick-99]: Mock stripe.Refund.create directly (not order_flow.stripe) since stripe is imported inside function body
- [Phase quick-164]: Used ComboItemInfo struct for combo references; safe decoders for backward compat
- [Phase quick-182]: Kept musai_auth.py filename to avoid breaking imports; only updated docstring
- [Phase quick-183]: Used static files in public/ instead of route handlers because output: export mode does not support route handlers
- [Phase quick-190]: SwipeToConfirmButton 80% threshold with spring snap-back; swipe IS the confirmation for Complete Ride (no secondary alert needed)
- [Phase quick-190]: TinderSwipeCard wraps entire RideRequestCard in ForEach — retain onBid tap inside card for direct access
- [Phase quick-191]: CounterOfferResponseSheet Accept+Split row restructured — SwipeToConfirmButton needs full width; Split kept as tap Button; TinderSwipeCard wraps bid cards (swipe-right=accept, swipe-left=reject)
- [Phase 08.1-01]: Non-blocking Stripe no-show block: DB commit always persists first; payment_method= resolved from saved_cards[is_default=True].id
- [Phase 08.1-02]: payment_retry_count nullable in Alembic (existing NULL rows treated as 0 via or-0 guard); MAX_RETRIES=3 hardcoded per spec; driver payout guarded with if/else on capture_failed status
- [Phase 08.1-03]: Banner placed inside ZStack with zIndex(100); viewModel.resetRide() for Try Again; 10s auto-dismiss; notification fires even when view is not visible
- [Phase 08.1-03]: Banner placed inside ZStack with zIndex(100); viewModel.resetRide() for Try Again; 10s auto-dismiss; notification fires even when view is not visible
- [Phase quick-202]: Default acceptance_rate 95.0 when driver has < 5 total rides; push warnings only when total >= 10 (avoids misleading rates for new drivers); push failure bare-except to never block cancel transaction
- [Phase quick-215]: Used _require_admin_secret() helper for reset-ride-state endpoint — consistent with all other demo endpoints
- [Phase 13]: Migration uses raw op.execute() SQL with IF NOT EXISTS for idempotency; service_type column on prop22_earning_periods for RIDESHARE vs FOOD_DELIVERY floor formula distinction
- [Phase 13-02]: RideBid has no driver GPS — used accepting_driver.current_latitude/longitude with pickup_lat fallback for prop22_acceptance_lat at matched_at
- [Phase 13-02]: get_traffic_eta_sync imported at module level in prop22_utils.py for testability; TestGetCityMinWage uses MagicMock DB (no Alembic seed in SQLite test DB)
- [Phase 13-04]: Inline model imports inside route functions to avoid circular import risk; manual topup stores "METHOD:REF-NUMBER" in top_up_stripe_id for BPC §7454 audit trail; admin periods uses JOIN to Driver for name + stripe_onboarded in single query

### Blockers

None

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
9 Stripe paywall on interview.html download, expand Mac setup steps, dashboard trial-badge -> status-badge | 2026-03-20 | (website-only) | [203-audit-and-fix-offerletter-ai-website-rem](./quick/203-audit-and-fix-offerletter-ai-website-rem/) |
| 205 | Harden offerletter.ai security — Lambda DoS caps (50k/200/100), API GW throttle (10 req/day), verify-payment Lambda + DynamoDB TTL cache, server-side Stripe paywall, CSP + GTM/GA/Stripe origins | 2026-03-20 | 77e940b5 | [205-harden-offerletter-ai-security-server-si](./quick/205-harden-offerletter-ai-security-server-si/) |
| 206 | Add update bid feature to Android driver app — UpdateBidRequest model, PUT rides/bid/{bidId} endpoint, Edit Bid button on PENDING bids, UpdateBidSheet bottom sheet with live earnings preview | 2026-03-19 | 419bef2b | [206-add-update-bid-feature-to-android-driver](./quick/206-add-update-bid-feature-to-android-driver/) |
| 207 | Fix driver-rideshare-audit.html header offset 80px→116px + main-panel independent scroll; bump iOS builds Customer 1121, Driver 227, Restaurant 218; bump Android Customer vC39/1.0.38, Driver vC35/1.0.34, Partner vC34/1.0.33 | 2026-03-19 | 72d1b8db | [207-fix-driver-rideshare-audit-html-layout-h](./quick/207-fix-driver-rideshare-audit-html-layout-h/) |
| 209 | Upload interview-walkthrough.mp4 (5.1MB) + poster.jpg to S3/CloudFront, embed video player in interview.html above setup steps, re-upload + invalidate; YouTube + Google Ads at checkpoint | 2026-03-20 | 9ee11259 | [209-offerletter-ai-post-launch-upload-video-](./quick/209-offerletter-ai-post-launch-upload-video-/) |
| 143 | CRITICAL: iOS login broken — apply pending Alembic migrations via Docker entrypoint | 2026-03-20 | bec11390 | [143-critical-ios-login-broken-apply-pending-](./quick/143-critical-ios-login-broken-apply-pending-/) |
| 210 | Add BrandMonkz AI Assistant chatbot with full system knowledge — setup guide for new computers, CRM help, campaign guidance. Rajesh can ask anything. | 2026-03-21 | 8fbf1834 | [210-add-brandmonkz-ai-assistant-chatbot-with](./quick/210-add-brandmonkz-ai-assistant-chatbot-with/) |
| 211 | Fix all login audit issues P0-P2 across 6 apps — DEMO_EMAILS production gate, dead ERP allowlist removed, customer/vendor refresh endpoints, iOS guard-let encoding, Android dead Apple auth removed | 2026-03-21 | 482b0b92 | [211-fix-all-login-audit-issues-p0-p2-across-](./quick/211-fix-all-login-audit-issues-p0-p2-across-/) |
| 213 | Create Remotion explainer video for Rajesh — how to use BrandMonkz CRM | 2026-03-21 | 2b904e71 | [213-create-remotion-explainer-video-for-raje](./quick/213-create-remotion-explainer-video-for-raje/) |
| 215 | Fix demo.customer ride request blocked in production — extend /api/demo/setup + add /api/demo/reset-ride-state to clear has_unpaid_balance and cancel stuck OPEN/BIDDING rides | 2026-03-21 | 9d6e92b4 | [215-fix-demo-customer-ride-request-blocked-i](./quick/215-fix-demo-customer-ride-request-blocked-i/) |
| 217 | Build BrandMonkz campaign tutorial — HTML diagram, PDF guide, Remotion video, placement email template | 2026-03-23 | a9a4544 | [217-build-brandmonkz-campaign-tutorial-html-](./quick/217-build-brandmonkz-campaign-tutorial-html-/) |
| 218 | Fix BrandMonkz campaign text visibility and ensure AI generates and saves full email body | 2026-03-23 | d640ed2c | [218-fix-brandmonkz-campaign-text-visibility-](./quick/218-fix-brandmonkz-campaign-text-visibility-/) |
| 221 | implement full Windows tab in interview.html with phone connection, earbuds, VB-Audio, checklist, and Start Session button | 2026-03-23 | f7d1b05f | [221-implement-full-windows-tab-in-interview-](./quick/221-implement-full-windows-tab-in-interview-/) |
| 222 | add phone connection step to Mac tab in interview.html with terminal commands, URL display, and earbuds instructions | 2026-03-24 | 953fe150 | [222-add-phone-connection-step-to-mac-tab-in-](./quick/222-add-phone-connection-step-to-mac-tab-in-/) |
| 223 | Apply platform visual identity to Mac and Windows tabs — green theme for Mac, Windows-blue for Windows, platform badges, keyboard key styles, optional tags, colored Start Session buttons | 2026-03-24 | 92d1c786 | [223-apply-platform-visual-identity-to-mac-an](./quick/223-apply-platform-visual-identity-to-mac-an/) |
| 224 | Fix paywall bypass: Windows EXE download button not gated by purchase, and set Content-Disposition headers on both S3 download files | 2026-03-24 | 0f5071a1 | [224-fix-paywall-bypass-windows-exe-download-](./quick/224-fix-paywall-bypass-windows-exe-download-/) |
| 225 | Implement server-side download protection: block CloudFront from /downloads/*, Lambda generates S3 pre-signed URLs (15 min), HTML uses signed URLs, initial href="#" so real URLs never in page source | 2026-03-24 | b5db9502 | [225-implement-server-side-download-protectio](./quick/225-implement-server-side-download-protectio/) |
| 226 | Fix fake web answers (real Claude via Lambda) and API key exposure (keys in Secrets Manager, fetched at app startup, removed from Python source) | 2026-03-24 | 4aa86149 | [226-fix-fake-web-answers-real-claude-via-lam](./quick/226-fix-fake-web-answers-real-claude-via-lam/) |
| 227 | Apply 8 UI/UX improvements to interview.html and deploy to S3/CloudFront | 2026-03-25 | f564110b | [227-apply-8-ui-ux-improvements-to-interview-](./quick/227-apply-8-ui-ux-improvements-to-interview-/) |
| 228 | Secure get-app-config: require valid session_id from paid users — DynamoDB validation, license key file, activation dialog, Copy License Key UI | 2026-03-26 | 25acf05e | [228-secure-get-app-config-require-valid-sess](./quick/228-secure-get-app-config-require-valid-sess/) |
| 229 | Fix OfferLetter CloudFront invalidation — rename EXE to InterviewAssistant.exe (no space), fix GitHub Actions workflow, redeploy Lambda S3_KEY_WIN | 2026-03-26 | 03ad87f7 | [229-fix-offerletter-cloudfront-invalidation-](./quick/229-fix-offerletter-cloudfront-invalidation-/) |
| 208 | Restaurant flow audit + fix 5 gaps: vendor-arrived-at-delivery 404 (GAP-2), self-delivery auth mismatch (GAP-4), timeout push notifications (GAP-5), wrong accept endpoint (GAP-1), countdown timer (GAP-3) + swipe button migration | 2026-03-24 | 461a4de1 | [208-restaurant-flow-audit-visual-swipe-status](./quick/208-restaurant-flow-audit-visual-swipe-status/) |
| 231 | Apply Phase 2 Indigo Noir dark theme to BrandMonkz — Sidebar glass floating panel, Layout ambient blobs, new Topbar component | 2026-03-26 | 6fb0b306 | [231-apply-phase-2-indigo-noir-dark-theme-to-](./quick/231-apply-phase-2-indigo-noir-dark-theme-to-/) |
| 232 | Build all 3 Android release APKs (Customer vC=40/1.0.39 23MB, Driver vC=36/1.0.35 15MB, Partner vC=35/1.0.34 15MB) and distribute to Firebase App Distribution — jeetnair.in@gmail.com | 2026-03-25 | 99781c1f | [232-build-all-android-apks-and-distribute-to](./quick/232-build-all-android-apks-and-distribute-to/) |
| 233 | Build BrandMonkz 3-step campaign wizard (CampaignWizard.tsx replacing CreateCampaignModal.tsx) + fix AIChat dark theme + fix generate-basics backend to use description field + deploy to production | 2026-03-26 | 0977b58f | [233-build-brandmonkz-3-step-campaign-wizard-](./quick/233-build-brandmonkz-3-step-campaign-wizard-/) |
| 234 | MixMind DJ Waveform View — Layout C Pioneer CDJ-3000 style waveform with 3-band colors, beat grid, section overlays, hot/memory cues, seekTo lift | 2026-03-26 | b7671dfd | [234-mixmind-dj-waveform-view-layout-c-pioneer-cdj3000-colors](./quick/234-mixmind-dj-waveform-view-layout-c-pioneer-cdj3000-colors/) |
| 235 | Fix MixMind wf_preview tuple parsing (wf_tag is tuple[ndarray,ndarray], wf_tag[0] is amplitude 0-31→0-255) — waveform_preview was [] for all 8213 tracks; rebuilt sidecar + DMG + uploaded to S3 | 2026-03-27 | 18bfae94 | [235-fix-mixmind-wf-preview-tuple-parsing-and](./quick/235-fix-mixmind-wf-preview-tuple-parsing-and/) |
| 237 | MixMind sidecar: HEAD+206 Range streaming on /api/audio/stream + /api/debug/anlz-raw diagnostic endpoint (dumps EXT tag structure for 3-band waveform investigation) | 2026-03-27 | 406d0cc8 | [237-mixmind-sidecar-add-api-debug-anlz-raw-d](./quick/237-mixmind-sidecar-add-api-debug-anlz-raw-d/) |
| 239 | MixMind: grey out unplayable playlist tracks (no file_path) with opacity 0.35 + UNAVAILABLE badge + filter from AI context so AI never suggests unplayable tracks | 2026-03-27 | e03d2daa | [239-mixmind-grey-out-unplayable-playlist-tra](./quick/239-mixmind-grey-out-unplayable-playlist-tra/) |
| 240 | Fix MixMind BPM/key/energy display missing, beat grid first-beat-off-by-one, and 3-band waveform issues | 2026-03-27 | a4221d31 | [240-fix-mixmind-bpm-key-energy-display-missi](./quick/240-fix-mixmind-bpm-key-energy-display-missi/) |
| 238 | Fix BUG-01 through BUG-05 from ISSUE_TRACKER.md | 2026-03-27 | b5c625de | [238-fix-bug-01-through-bug-05-from-issue-tra](./quick/238-fix-bug-01-through-bug-05-from-issue-tra/) |
| 241 | Add genre/comment/color/date/label/play_count to MixMind sidecar Track + /api/library/genres + /api/library/compatible endpoints + CSV genre column | 2026-03-27 | 667125dc | [241-add-genre-comment-color-date-label-play-](./quick/241-add-genre-comment-color-date-label-play-/) |
| 242 | Add genre badge, smart genre filter chips, energy label, color dot, comment tooltip, play count, date added column to MixMind TrackTable | 2026-03-27 | 18de96ce | [242-add-genre-badge-smart-genre-filter-chips](./quick/242-add-genre-badge-smart-genre-filter-chips/) |
| 243 | Add transition quality scores (Camelot+BPM) and energy arc bar chart to MixMind AIChatSidebar | 2026-03-27 | af1de0c8 | [243-add-transition-quality-scores-and-energy](./quick/243-add-transition-quality-scores-and-energy/) |
| 244 | Build SetBuilderPanel drag-drop set builder with BPM arc, transition scores, CSV export + LeftNav + TrackTable "Add to Set" | 2026-03-27 | 48a06034 | [244-build-setbuilderpanel-drag-drop-set-buil](./quick/244-build-setbuilderpanel-drag-drop-set-buil/) |
| 245 | Compatible track highlighting, session played history, CamelotWheel SVG popup in MixMind | 2026-03-27 | 23e180fc | [245-add-compatible-track-highlighting-sessio](./quick/245-add-compatible-track-highlighting-sessio/) |
| 246 | Stem analysis pipeline foundation — analysis_cache DB, analyzer.py (Demucs + Essentia + stems_to_waveform + batch runner), 8 tests | 2026-03-27 | 74b08760 | [246-implement-mixmind-stem-analysis-pipeline](./quick/246-implement-mixmind-stem-analysis-pipeline/) |
| 247 | Analyze API routes (single/batch/cancel/status) + /anlz endpoint 4-stem + essentia enrichment | 2026-03-27 | 18ff4d18 | [247-add-analyze-routes-py-api-endpoints-sing](./quick/247-add-analyze-routes-py-api-endpoints-sing/) |
| 248 | Frontend 4-stem types, DJWaveformView stem rendering + legend, Analyze button in TrackTable, App handler | 2026-03-27 | e550d150 | [248-add-waveform4stem-essentiaresult-typescr](./quick/248-add-waveform4stem-essentiaresult-typescr/) |
| 249 | Build compliance email system — 4 email templates, scheduler hooks, admin endpoints, 1099 tracking | 2026-03-28 | a9052fcc | [249-build-compliance-email-system-4-email-te](./quick/249-build-compliance-email-system-4-email-te/) |

| 250 | Build all 6 apps — iOS 1129/235/225 to TestFlight + Android vC=42/38/37 to Firebase | 2026-03-29 | 8c188dde | [250-build-all-6-apps-3-ios-to-testflight-3-a](./quick/250-build-all-6-apps-3-ios-to-testflight-3-a/) |
| 251 | Save 255+ production test results to PRODUCTION_TESTS.md — CA/AZ/TX rides+orders, 14 bugs documented | 2026-03-30 | 69913fc0 | [251-save-all-production-test-results-to-pers](./quick/251-save-all-production-test-results-to-pers/) |
| 252 | Fix BUG-1+2: prop22 acceptance GPS sanity check — 50mi threshold, fallback to pickup coords | 2026-03-30 | 3fcff240 | [252-fix-bug-1-prop22-engaged-miles-uses-driv](./quick/252-fix-bug-1-prop22-engaged-miles-uses-driv/) |
| 253 | BUG-3 investigated: not a bug — V42/V47 offline restaurants, V136 works with correct IDs | 2026-03-30 | — | [253-fix-bug-3-food-orders-from-non-v40-vendo](./quick/253-fix-bug-3-food-orders-from-non-v40-vendo/) |
| 254 | BUG-4 investigated: not a bug — restaurant in Cupertino, all deliveries >21mi = $12.99 cap | 2026-03-30 | — | [254-investigate-bug-4-all-delivery-fees-are-](./quick/254-investigate-bug-4-all-delivery-fees-are-/) |
| 255 | Fix BUG-5: strip HTML tags in sanitize_input + use html.escape (was double-encoding) | 2026-03-30 | 61ef33e8 | [255-fix-bug-5-xss-not-sanitized-in-registrat](./quick/255-fix-bug-5-xss-not-sanitized-in-registrat/) |
| 256 | Fix BUG-6 chat alias, BUG-7 closed, BUG-10 same-coords reject, BUG-12 empty items reject | 2026-03-30 | 9166d848 | [256-fix-bug-6-chat-alias-endpoint-api-chat-m](./quick/256-fix-bug-6-chat-alias-endpoint-api-chat-m/) |
| 257 | Fix BUG-6 chat route conflict fallback + BUG-11 US geofencing for ride requests | 2026-03-31 | pending | [257-fix-bug-6-route-conflict-and-bug-11-geof](./quick/257-fix-bug-6-route-conflict-and-bug-11-geof/) |
| 258 | One-click NetSuite campaign send for BrandMonkz ($2/hr staff aug, Peter Samuel) | 2026-03-31 | 6b9e78bb | [258-build-one-click-campaign-send-for-brandm](./quick/258-build-one-click-campaign-send-for-brandm/) |
| 259 | Fix BrandMonkz campaign email to be fully multi-tenant — each tenant uses their own EmailServerConfig for campaigns | 2026-04-01 | 8c323ca9 | [259-fix-brandmonkz-campaign-email-to-be-full](./quick/259-fix-brandmonkz-campaign-email-to-be-full/) |
| 260 | Deep audit BrandMonkz CRM — routes, email sends, nginx, CORS, rate limiters (15 issues found) | 2026-04-01 | 4e7887da | [260-deep-audit-brandmonkz-crm-routes-email-s](./quick/260-deep-audit-brandmonkz-crm-routes-email-s/) |
| 261 | Throttled campaign sending — 1 email per 5 min, validation, progress tracking | 2026-04-01 | 058e1546 | [261-throttled-campaign-sending-1-email-per-5](./quick/261-throttled-campaign-sending-1-email-per-5/) |
| 262 | Campaign Builder UI — speed selector, throttled send, live progress bar | 2026-04-01 | 0f301bf4 | [262-campaign-builder-ui-speed-selector-throt](./quick/262-campaign-builder-ui-speed-selector-throt/) |
| 263 | Phase 3: Campaign analytics — click tracking, open tracking, engagement scoring | 2026-04-01 | pending | [263-phase-3-campaign-analytics-click-trackin](./quick/263-phase-3-campaign-analytics-click-trackin/) |
| 264 | Campaign wizard: sent-contact filtering and per-contact campaign history badges | 2026-04-02 | 5d03f1d1 | [264-campaign-wizard-sent-contact-filtering-a](./quick/264-campaign-wizard-sent-contact-filtering-a/) |
| 265 | write missing Playwright E2E tests for VibingTicket — fix playwright.config.cjs testDir to ./tests, then write tests/e2e/aria-bot.spec.cjs, sarah-bot.spec.cjs, auth-flow.spec.cjs, contact-newsletter.spec.cjs — run all tests and confirm pass against https://www.vibingticket.com | 2026-04-03 | 329cab1 | [265-write-missing-playwright-e2e-tests-for-v](./quick/265-write-missing-playwright-e2e-tests-for-v/) |
| 266 | fix hardcoded values on BrandMonkz campaigns page — totalCompanies fake formula + createdBy static string | 2026-04-03 | 671e7216 | [266-fix-hardcoded-values-on-brandmonkz-campa](./quick/266-fix-hardcoded-values-on-brandmonkz-campa/) |
| 267 | add upgraded avatars and camera settings panel to Zietra Meet | 2026-04-04 | 5e60ba45 | [267-add-upgraded-avatars-and-camera-settings](./quick/267-add-upgraded-avatars-and-camera-settings/) |
| 268 | trim Alex and Sarah system prompts in MongoDB — Alex 20K→1.2K, Sarah 40K→1.2K — trial chat 8-9s → 4-5s | 2026-04-05 | db-only | [268-trim-alex-and-sarah-system-prompts-in-mo](./quick/268-trim-alex-and-sarah-system-prompts-in-mo/) |
| 289 | add Google Reviews section to VishMed website showing real reviews for Dr. Pillay from Google | 2026-04-15 | 13318e84 | [289-add-google-reviews-section-to-vishmed-we](./quick/289-add-google-reviews-section-to-vishmed-we/) |
| 290 | add blog section to VishMed with 40 SEO-optimized posts across 6 categories with naturally spread historical dates | 2026-04-16 | 0d4aca9c | [290-add-blog-section-to-vishmed-with-40-seo-](./quick/290-add-blog-section-to-vishmed-with-40-seo-/) |
| 291 | Build AI Architecture Playground as free lead-gen tool on TechCloudPro | 2026-04-17 | bc42fb59 | [291-build-ai-architecture-playground-as-free](./quick/291-build-ai-architecture-playground-as-free/) |
| 292 | Deploy Option A versioned consent capture to arthaBuild production | 2026-04-20 | 47d4a77 | [292-deploy-option-a-versioned-consent-captur](./quick/292-deploy-option-a-versioned-consent-captur/) |
| 293 | Foolproof arthaBuild launch: delete-account UI, og-image, 404 page, security compliance, activate Sentry | 2026-04-20 | 2c49db0 | [293-foolproof-arthabuild-launch-delete-accou](./quick/293-foolproof-arthabuild-launch-delete-accou/) |
| 294 | arthaBuild launch hardening: MFA login enforcement + RFC 9116 security.txt + zero-assume retest | 2026-04-20 | 6ae5307 | [294-arthabuild-launch-hardening-mfa-login-en](./quick/294-arthabuild-launch-hardening-mfa-login-en/) |
| 295 | fix MFA frontend gap - Password.tsx ignores backend 403 mfa_required response | 2026-04-22 | 33cfcaa | [295-fix-mfa-frontend-gap-password-tsx-ignore](./quick/295-fix-mfa-frontend-gap-password-tsx-ignore/) |
| 296 | fix DELETE /api/user/me to require confirm=DELETE body — prevent unauthorized account erasure | 2026-04-22 | b8deeb8 | [296-fix-delete-api-user-me-to-require-confir](./quick/296-fix-delete-api-user-me-to-require-confir/) |
| 297 | fix login to reject soft-deleted users (is_active=0) — no-enumeration 401 match wrong-password | 2026-04-22 | 4c3cf15 | [297-fix-login-to-reject-soft-deleted-users-a](./quick/297-fix-login-to-reject-soft-deleted-users-a/) |
| 298 | fix register per-domain cap counting soft-deleted users + silent SignUp UX + EXEMPT TCP | 2026-04-23 | 07cbcec | [298-fix-register-per-domain-cap-counting-sof](./quick/298-fix-register-per-domain-cap-counting-sof/) |
| 299 | parseApiError helper + 20-fn refactor + SignUp password-error render + 33-test E2E proof matrix | 2026-04-23 | 028d930 | [299-shared-parseapierror-helper-comprehensiv](./quick/299-shared-parseapierror-helper-comprehensiv/) |
| 300 | Add Zocdoc free-booking widget to VishMed site (/schedule route + Header/homepage/contact CTAs + sitemap) | 2026-04-23 | 5f7166a | [300-add-zocdoc-free-booking-widget-to-vishme](./quick/300-add-zocdoc-free-booking-widget-to-vishme/) |
| 301 | brandmonkz Reports add Follow-Ups tab — read-only top contacts list reusing existing campaign send pipeline | 2026-04-26 | (pending) | [301-brandmonkz-reports-add-follow-ups-tab-re](./quick/301-brandmonkz-reports-add-follow-ups-tab-re/) |
| 302 | brandmonkz video wizard — replace LLM-from-name with website-grounded research | 2026-04-26 | (pending) | [302-brandmonkz-video-wizard-replace-llm-from](./quick/302-brandmonkz-video-wizard-replace-llm-from/) |
| 303 | brandmonkz video wizard v2 — problem-statement narration + logo + email pitch + actual render | 2026-04-26 | (pending) | [303-brandmonkz-video-wizard-v2-problem-state](./quick/303-brandmonkz-video-wizard-v2-problem-state/) |
| 305 | Build TCP analytics stats.php on techcloudpro.com — 4-window JSON, page_views table, hash_equals 404 gate | 2026-04-28 | c0d55a8 (techcloudpro) / 4c63820b (dollor.ai) | [305-build-tcp-analytics-stats-php-on-techclo](./quick/305-build-tcp-analytics-stats-php-on-techclo/) |
| 306 | Extend TCP analytics stats.php with traffic-source breakdowns (by_source/by_utm/by_org/by_country) | 2026-04-28 | 8ade7b6 (techcloudpro) / 8e907fc3 (dollor.ai) | [306-extend-tcp-analytics-stats-php-with-traf](./quick/306-extend-tcp-analytics-stats-php-with-traf/) |
| 307 | TCP identity-stack Phase 1 — form-fill identity chain. New identified_visitors table, page_views.visitor_id JOIN column, tcp_vid first-party cookie on 3 form endpoints, identified_visits block in stats.php. Cross-device email-canonical dedup proven E2E (same email → same canonical visitor_id). | 2026-04-28 | b817407 (techcloudpro) / 26ab5c59 (dollor.ai) | [307-phase-1-identity-stack-form-fill-identit](./quick/307-phase-1-identity-stack-form-fill-identit/) |
| 308 | TCP identity-stack Phase 2a — email-click receiver. New /api/identify-from-email.php (stub-mode for E2E before BM endpoint exists) + inline JS hook in index.html and ai-playground.html that strips _tcp_uid from URL after capture. Privacy: opaque emailLogId in URL, no PII, fire-and-forget. Phase 2b release-blocker: TCP_IDENTITY_STUB=true must be flipped after BM ships. | 2026-04-28 | 3c43df0 (techcloudpro) / a296b031 (dollor.ai) | [308-phase-2a-identity-stack-tcp-receiver-for](./quick/308-phase-2a-identity-stack-tcp-receiver-for/) |
| 309 | TCP identity-stack Phase 2b — BrandMonkz sender side + TCP stub flip (`--full` Verified 8/8). New BM endpoint GET /api/email-log/:id/contact (X-Identity-Token + timingSafeEqual + Prisma EmailLog→Contact + null-safe 404 + no-PII logging), BM emailTracking.ts click handler injects ?_tcp_uid only on apex/subdomain techcloudpro.com (endsWith spoof-protection + safe-fail), 64-hex secret in AWS SM brandmonkz/production/tcp-identity-shared-secret + plumbed via BM EC2 .env, TCP /api/identify-from-email.php flipped to STUB=false with real secret + UA fix. 11 smoke tests + live E2E proven with real PII (Diego Palmieri @ Mizkan America Inc). | 2026-04-28 | 69641dc (BM) / 63a9680 + 7158b29 (techcloudpro) / fc966e24 (dollor.ai) | [309-phase-2b-identity-stack-brandmonkz-sende](./quick/309-phase-2b-identity-stack-brandmonkz-sende/) |
## Session Continuity

Last session: 2026-04-28
Stopped at: Completed quick-309 (TCP identity-stack Phase 2b — BrandMonkz sender side + TCP stub flip, `--full` mode 8/8 Verified). End-to-end identity chain LIVE with real prospect data: BM `/api/email-log/<id>/contact` token-gated with timingSafeEqual + Prisma EmailLog→Contact join + null-safe 404 + no-PII logging; BM click handler at `emailTracking.ts` injects `?_tcp_uid=<emailLogId>` only on apex/subdomain `techcloudpro.com` URLs (hostname-spoof protection via `endsWith`, safe-fail try/catch); 64-hex shared secret stored in AWS SM `brandmonkz/production/tcp-identity-shared-secret` (us-east-1, account 134607809447), plumbed to BM EC2 .env, hardcoded in TCP PHP. TCP `/api/identify-from-email.php` flipped to `TCP_IDENTITY_STUB=false` + real secret + UA fix (nginx WAF blocked default curl). Live E2E proven: real BM emailLogId → Diego Palmieri @ Mizkan America Inc resolved server-side → identified_visitors row → tcp_vid cookie → page_views attribution → stats.php top_visitors surface. 11 smoke tests + 4-step live E2E all passed. 4 Phase X follow-ups filed (hardcoded TCP secret, BM rate-limit, stub dead code, identified_visitors test pollution).
Resume file: .planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md
