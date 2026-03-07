---
status: investigating
trigger: "Restaurant app ASC metadata appears completely wiped - description, keywords, screenshots, category, review details, privacy policy, build all missing"
created: 2026-03-02T00:00:00Z
updated: 2026-03-02T00:00:00Z
---

## Current Focus

hypothesis: A script (possibly /tmp/fix-copyright.py or similar) sent a PATCH to the App Store Connect API with empty/null fields, overwriting existing metadata
test: Check recent scripts in /tmp/ and git history for ASC API interactions
expecting: Find a script that sent a PATCH request to the restaurant app's appStoreVersion or appInfoLocalizations
next_action: Examine /tmp/fix-copyright.py and search for other ASC API scripts

## Symptoms

expected: Restaurant app in App Store Connect should have description, keywords, screenshots, categories, review details, privacy policy URL — all previously populated
actual: All fields are empty/null. Description=None, Keywords=None, Screenshots=0, Category=NOT SET, Review details=NONE, Build=NOT ATTACHED, Privacy policy=not set. Version 1.0 state is PREPARE_FOR_SUBMISSION, created 2026-01-27.
errors: No explicit errors — data just appears missing/wiped
reproduction: Check App Store Connect for Dollor Restaurant (com.dollorai.restaurant) — all metadata fields are empty
started: Noticed 2026-03-02. Data was previously populated. App never submitted to review.

## Eliminated

## Evidence

## Resolution

root_cause:
fix:
verification:
files_changed: []
