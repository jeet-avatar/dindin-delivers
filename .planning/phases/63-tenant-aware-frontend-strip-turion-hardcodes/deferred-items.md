# Phase 63 — Deferred Items

These items were identified during Phase 63 execution but are out of scope or
require a separate fix.

## salesforce-account.html fallback contacts (3 entries) — DEFERRED

Lines 1039-1041: `SF_CONTACTS_FALLBACK` contains hardcoded Turion-employee
contacts (T. Pierce / A. McLamb / E. Garcia) with `account: 'Turion Space (internal)'`
and `@turionspace.com` emails.

**Why deferred:** These are FALLBACKS — only shown when `window.CONTACT_DATA`
fails to load from the DB. For Solo Brands the real contacts come from
`turion.customers` rows seeded for tenant_id=45896e95-... (5 contacts seeded
in Phase 58/pitch-solobrands work). Replacing the fallback fully is a
separate concern (tenant-specific seed data already exists).

**Future fix:** Replace fallback with `window.__ZIETRA_TENANT.name + ' (internal)'`
and generic email pattern, or simply hide the fallback rows for non-Turion
tenants. ~10 min.

## Other JS-literal Turion strings — TODO if found

Any remaining `'Turion Space'` strings inside `<script>` blocks were
intentionally NOT auto-transformed (script-block contents are protected from
the regex pass to avoid breaking JS syntax). Two were converted manually in
Task 2 (ns-record.html line 1484, netsuite-setup.html line 728). If others
surface during smoke test, replace with `window.__ZIETRA_TENANT.name` /
`window.__ZIETRA_TENANT.slug.toUpperCase()` ternary.

## /architecture-rewrite (Task 3)

The original Turion architecture page (`index.html`) needs to be moved to
`/architecture.html`, with a generic tenant home built fresh for `/`. This
is Task 3 and tracked separately.

## Vendor-portal.html (Task 2b — deferred to follow-up phase)

`vendor-portal.html` represents a vendor's view of a PO from "Turion Space"
(the buying customer). The 12 Turion references there are part of the demo
narrative ("PO-2026-1148 from Turion Space" / "Turion's view of this PO" /
"Send EDI 855 acknowledgment to Turion"). The vendor portal is one-off
demo content for the Turion pitch, NOT a multi-tenant page that other
tenants would visit. It IS reachable at `/vendor/portal` on solobrands.zietra.com,
but Solo Brands hasn't published their own version. Deferred until Solo
Brands needs their own vendor portal copy.
