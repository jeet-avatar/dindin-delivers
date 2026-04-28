# IDENTITY_SCHEMA_PROBE — Quick Task 307

**Probed at:** 2026-04-28T20:17:00Z (Hostinger MariaDB, db `u350621741_visitors`)
**Method:** mirror of Task 305's SCHEMA_PROBE pattern — token-gated PHP probe deployed temporarily, executed once, deleted.

## Probe execution — verbatim JSON output

```json
{
    "migrations": [
        {
            "step": "CREATE identified_visitors",
            "result": "OK"
        },
        {
            "step": "ALTER page_views ADD visitor_id + INDEX",
            "result": "OK"
        }
    ],
    "verify": {
        "identified_visitors_describe": [
            { "Field": "id",            "Type": "int(11)",      "Null": "NO",  "Key": "PRI", "Default": null,                       "Extra": "auto_increment" },
            { "Field": "visitor_id",    "Type": "varchar(64)",  "Null": "NO",  "Key": "UNI", "Default": null,                       "Extra": "" },
            { "Field": "email",         "Type": "varchar(255)", "Null": "NO",  "Key": "MUL", "Default": null,                       "Extra": "" },
            { "Field": "name",          "Type": "varchar(255)", "Null": "YES", "Key": "",    "Default": null,                       "Extra": "" },
            { "Field": "company",       "Type": "varchar(255)", "Null": "YES", "Key": "",    "Default": null,                       "Extra": "" },
            { "Field": "phone",         "Type": "varchar(64)",  "Null": "YES", "Key": "",    "Default": null,                       "Extra": "" },
            { "Field": "source_form",   "Type": "varchar(64)",  "Null": "NO",  "Key": "",    "Default": null,                       "Extra": "" },
            { "Field": "first_seen_ip", "Type": "varchar(45)",  "Null": "YES", "Key": "",    "Default": null,                       "Extra": "" },
            { "Field": "first_seen_at", "Type": "timestamp",    "Null": "YES", "Key": "",    "Default": "current_timestamp()",       "Extra": "" },
            { "Field": "last_seen_at",  "Type": "timestamp",    "Null": "YES", "Key": "",    "Default": "current_timestamp()",       "Extra": "on update current_timestamp()" }
        ],
        "page_views_visitor_id": [
            { "Field": "visitor_id", "Type": "varchar(64)", "Null": "YES", "Key": "MUL", "Default": null, "Extra": "" }
        ],
        "page_views_indexes": [
            {
                "Table": "page_views",
                "Non_unique": 1,
                "Key_name": "idx_visitor_id",
                "Seq_in_index": 1,
                "Column_name": "visitor_id",
                "Collation": "A",
                "Cardinality": 1,
                "Sub_part": null,
                "Packed": null,
                "Null": "YES",
                "Index_type": "BTREE",
                "Comment": "",
                "Index_comment": "",
                "Ignored": "NO"
            }
        ],
        "identified_visitors_count": 0
    }
}
```

## What was applied

| Step | DDL | Result |
|------|-----|--------|
| 1 | `CREATE TABLE IF NOT EXISTS identified_visitors (...)` — 10 columns, UNIQUE on `visitor_id`, INDEX on `email` | OK |
| 2a | `ALTER TABLE page_views ADD COLUMN visitor_id VARCHAR(64) NULL AFTER session_id` | OK |
| 2b | `ALTER TABLE page_views ADD INDEX idx_visitor_id (visitor_id)` | OK |

## Cleanup verification

- Probe file `tcp-307-schema-probe.php` removed from `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/`. Confirmed via `ssh ls`: `cannot access ...: No such file or directory`.
- `.htaccess` restored from the in-flight `.htaccess.bak.307` backup. Final regex: `^(?!admin|collect|trap|stats).*\.php$` (back to the 305-era state — no `tcp-307-schema-probe` residue).
- Local `/tmp/tcp-307-schema-probe.php` and `/tmp/tcp-analytics-htaccess-307` deleted.
- Follow-up curl to the deleted probe URL returns HTTP 200 with the site's SPA index HTML body (Apache fallback for missing files; PHP did NOT execute).

## Notes

- 10 columns confirmed live, matching the plan spec exactly.
- `visitor_id` has UNIQUE key (`UNI`) on `identified_visitors` and a non-unique secondary index (`MUL`, `idx_visitor_id`) on `page_views` — both required for the JOIN in stats.php.
- `last_seen_at` correctly inherits the `ON UPDATE CURRENT_TIMESTAMP` clause for last-seen bumping in `tcp_upsert_identified_visitor()`.
- `identified_visitors_count = 0` proves table is fresh (no stale rows from a previous run).
